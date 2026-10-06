import AppKit
import WebKit

final class ZhixiangApp: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, WKScriptMessageHandlerWithReply {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var bundledPage: URL!
    private var release: BundledRelease!
    private var currentVersion = ""
    private var checkingUpdate = false
    private var displayingCache = false
    private var cache: DesktopPageCache!
    private let bridgeSource = """
    (() => {
      const call = method => window.webkit.messageHandlers.zhixiangDesktop.postMessage(method);
      Object.defineProperty(window, 'zhixiangDesktop', {value: Object.freeze({
        getInfo: () => call('getInfo'),
        checkForUpdates: () => call('checkForUpdates')
      }), writable: false, configurable: false});
    })();
    """

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard let page = Bundle.main.url(forResource: "standalone", withExtension: "html") else {
            let alert = NSAlert()
            alert.messageText = "无法打开知象"
            alert.informativeText = "应用缺少离线页面。请重新下载完整的知象应用。"
            alert.runModal()
            NSApp.terminate(nil)
            return
        }

        bundledPage = page
        do {
            guard let releaseURL = Bundle.main.url(forResource: "release", withExtension: "json") else { throw DesktopUpdateError(message: "缺少版本信息。") }
            release = try JSONDecoder().decode(BundledRelease.self, from: Data(contentsOf: releaseURL))
            guard release.schema == 1 else { throw DesktopUpdateError(message: "版本信息无效。") }
            _ = try DesktopVersion(release.version); _ = try DesktopVersion(release.shellVersion)
            currentVersion = release.version
            let support = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            cache = DesktopPageCache(directory: support.appendingPathComponent("cn.zhixiang.classroom", isDirectory: true))
        } catch {
            showAlert("无法打开知象", error.localizedDescription)
            NSApp.terminate(nil); return
        }
        installMenu()

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "zhixiangDesktop")
        configuration.userContentController.addUserScript(WKUserScript(source: bridgeSource, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1220, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "知象 · 教学模型"
        window.minSize = NSSize(width: 760, height: 580)
        window.center()
        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // The web content stays offline, including updated content. Native URLSession
        // is used only after the user explicitly requests an update check.
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "zhixiang-offline", encodedContentRuleList: "[{\"trigger\":{\"url-filter\":\"^https?://\"},\"action\":{\"type\":\"block\"}}]") { [weak self] rules, error in
            guard let self else { return }
            guard let rules else {
                self.showAlert("无法打开知象", "无法启用离线页面限制，请重新打开应用。")
                NSApp.terminate(nil); return
            }
            self.webView.configuration.userContentController.add(rules)
            self.loadCurrentPage()
        }
    }

    private func showAlert(_ title: String, _ message: String) {
        let alert = NSAlert(); alert.messageText = title; alert.informativeText = message
        alert.addButton(withTitle: "好"); alert.runModal()
    }

    private func isLocalAppURL(_ url: URL?) -> Bool {
        guard let url, url.isFileURL, url.host == nil || url.host == "", url.query == nil else { return false }
        return url.standardizedFileURL.path == bundledPage.standardizedFileURL.path
    }

    private func loadCurrentPage() {
        do {
            if let cached = try cache.read(bundledVersion: release.version, shellVersion: release.shellVersion) {
                currentVersion = cached.manifest.version; displayingCache = true
                // Preserve the exact original file URL and WKWebsiteDataStore: no new
                // origin, localStorage migration, classroom edits, or bundle mutation.
                let response = URLResponse(url: bundledPage, mimeType: "text/html", expectedContentLength: cached.data.count, textEncodingName: "utf-8")
                webView.loadSimulatedRequest(URLRequest(url: bundledPage), response: response, responseData: cached.data)
                return
            }
        } catch {
            showAlert("已使用内置版本", "本地更新缓存无法通过校验。收藏和课堂配置会继续保留。")
        }
        currentVersion = release.version; displayingCache = false
        webView.loadFileURL(bundledPage, allowingReadAccessTo: bundledPage)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        guard displayingCache else { return }
        displayingCache = false; currentVersion = release.version
        webView.loadFileURL(bundledPage, allowingReadAccessTo: bundledPage)
        showAlert("已使用内置版本", "更新页面无法打开，已回退。收藏和课堂配置会继续保留。")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, isLocalAppURL(message.frameInfo.request.url),
              isLocalAppURL(message.webView?.url), message.frameInfo.securityOrigin.protocol == "file",
              let method = message.body as? String else {
            replyHandler(nil, "仅本机知象页面可以调用此功能。"); return
        }
        switch method {
        case "getInfo":
            replyHandler(["platform": "macos", "version": currentVersion, "shellVersion": release.shellVersion], nil)
        case "checkForUpdates":
            checkForUpdates { result in replyHandler(result, nil) }
        default:
            replyHandler(nil, "不支持的桌面操作。")
        }
    }

    @objc private func checkUpdatesFromMenu() { checkForUpdates { _ in } }

    private func checkForUpdates(completion: @escaping ([String: String]) -> Void) {
        guard !checkingUpdate else { completion(["status": "busy", "message": "正在检查更新，请稍候。"]); return }
        checkingUpdate = true
        let finish: ([String: String]) -> Void = { result in
            self.checkingUpdate = false
            self.window.title = "知象 · 教学模型"
            completion(result)
        }
        let fail: (Error) -> Void = { error in
            let message = "检查或下载未完成，当前离线版本仍可使用。\n" + error.localizedDescription
            self.showAlert("更新未完成", message)
            finish(["status": "error", "message": message])
        }
        window.title = "知象 · 正在检查更新"
        DesktopBoundedDownload(url: DesktopUpdatePolicy.manifestURL, limit: DesktopUpdatePolicy.maxManifestBytes) { result in
            do {
                let manifest = try JSONDecoder().decode(DesktopManifest.self, from: result.get())
                try DesktopUpdatePolicy.validate(manifest)
                guard try DesktopVersion(manifest.version) > DesktopVersion(self.currentVersion) else {
                    self.showAlert("已是最新版本", "当前版本 " + self.currentVersion)
                    finish(["status": "up-to-date", "message": "当前已是最新版本。", "version": self.currentVersion]); return
                }
                if try DesktopVersion(manifest.minimumShellVersion) > DesktopVersion(self.release.shellVersion) {
                    let packageURL = try DesktopUpdatePolicy.macPackageURL(manifest)
                    let alert = NSAlert(); alert.messageText = "需要更新知象应用"
                    alert.informativeText = "新版本 " + manifest.version + " 需要新版桌面程序。可下载正式安装包后替换现有应用；课堂配置保存在本机。"
                    alert.addButton(withTitle: "打开下载页面"); alert.addButton(withTitle: "稍后")
                    if alert.runModal() == .alertFirstButtonReturn {
                        NSWorkspace.shared.open(packageURL)
                    }
                    finish(["status": "shell-update-required", "message": "请下载新版桌面程序。", "version": manifest.version]); return
                }
                let alert = NSAlert(); alert.messageText = "发现新版本 " + manifest.version
                alert.informativeText = manifest.notes.joined(separator: "\n") + "\n\n下载后将校验并重新载入。收藏和已保存课堂会保留；未保存的板书与动画进度会清空。"
                alert.addButton(withTitle: "下载并更新"); alert.addButton(withTitle: "取消")
                guard alert.runModal() == .alertFirstButtonReturn else {
                    finish(["status": "cancelled", "message": "已取消更新，继续使用当前版本。", "version": self.currentVersion]); return
                }
                self.window.title = "知象 · 正在下载更新"
                DesktopBoundedDownload(url: URL(string: manifest.page.url)!, limit: manifest.page.bytes) { result in
                    do {
                        let data = try result.get()
                        try self.cache.install(data, manifest: manifest)
                        self.showAlert("更新已完成", "新版本已校验并保存到本机，即将重新载入。")
                        finish(["status": "updated", "message": "已更新，即将重新载入。", "version": manifest.version])
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { self.loadCurrentPage() }
                    } catch { fail(error) }
                }.start()
            } catch { fail(error) }
        }.start()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    private func installMenu() {
        let mainMenu = NSMenu()
        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "关于知象", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        let updateItem = appMenu.addItem(withTitle: "检查更新…", action: #selector(checkUpdatesFromMenu), keyEquivalent: "")
        updateItem.target = self
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "退出知象", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let editItem = NSMenuItem()
        mainMenu.addItem(editItem)
        let editMenu = NSMenu(title: "编辑")
        editMenu.addItem(withTitle: "剪切", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "复制", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "粘贴", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "全选", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu
        NSApp.mainMenu = mainMenu
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == "blob", navigationAction.sourceFrame.isMainFrame, isLocalAppURL(navigationAction.sourceFrame.request.url) {
            decisionHandler(.download)
        } else if url.scheme == "http" || url.scheme == "https" {
            if DesktopUpdatePolicy.canOpenExternal(url) { NSWorkspace.shared.open(url) }
            decisionHandler(.cancel)
        } else {
            decisionHandler(isLocalAppURL(url) ? .allow : .cancel)
        }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(
        _ download: WKDownload,
        decideDestinationUsing response: URLResponse,
        suggestedFilename: String,
        completionHandler: @escaping (URL?) -> Void
    ) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = suggestedFilename
        panel.canCreateDirectories = true
        panel.beginSheetModal(for: window) { result in
            completionHandler(result == .OK ? panel.url : nil)
        }
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url,
           DesktopUpdatePolicy.canOpenExternal(url) {
            NSWorkspace.shared.open(url)
        }
        return nil
    }
}

@main
struct ZhixiangMain {
    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.regular)
        let delegate = ZhixiangApp()
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
