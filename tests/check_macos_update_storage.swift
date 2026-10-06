import AppKit
import WebKit

// Uses an ephemeral WebKit data store and a temporary fixture, never classroom data.
final class StorageCheck: NSObject, WKNavigationDelegate {
    let page: URL
    let store = WKWebsiteDataStore.nonPersistent()
    var view: WKWebView!
    var phase = 0
    var failures = 0
    init(page: URL) { self.page = page; super.init(); newView() }
    func newView() {
        let config = WKWebViewConfiguration(); config.websiteDataStore = store
        view = WKWebView(frame: NSRect(x: 0, y: 0, width: 500, height: 400), configuration: config)
        view.navigationDelegate = self
    }
    func check(_ name: String, _ ok: Bool) { print("\(ok ? "PASS" : "FAIL") \(name)"); if !ok { failures += 1 } }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        switch phase {
        case 0:
            webView.evaluateJavaScript("localStorage.setItem('zhixiang-lab-v1',JSON.stringify({version:1,favorites:['wave'],classes:[{title:'旧课堂',model:'wave'}]})); localStorage.setItem('zhixiang-display-v1','legacy'); true") { value, error in
                self.check("旧 file 页面写入课堂与显示设置", error == nil && value as? Bool == true)
                self.phase = 1; self.simulate()
            }
        case 1:
            webView.evaluateJavaScript("JSON.parse(localStorage.getItem('zhixiang-lab-v1')).classes[0].title==='旧课堂' && localStorage.getItem('zhixiang-display-v1')==='legacy' && document.body.textContent==='updated'") { value, error in
                self.check("更新内容在原 file URL 读取旧课堂", error == nil && value as? Bool == true)
                webView.evaluateJavaScript("localStorage.setItem('zhixiang-display-v1','updated'); true") { _, _ in
                    self.phase = 2; self.view.loadFileURL(self.page, allowingReadAccessTo: self.page)
                }
            }
        case 2:
            webView.evaluateJavaScript("localStorage.getItem('zhixiang-display-v1')==='updated' && JSON.parse(localStorage.getItem('zhixiang-lab-v1')).favorites[0]==='wave' && document.body.textContent==='builtin'") { value, error in
                self.check("回退内置页面保留更新后的存储", error == nil && value as? Bool == true)
                self.phase = 3; self.newView(); self.simulate()
            }
        default:
            webView.evaluateJavaScript("localStorage.getItem('zhixiang-display-v1')==='updated' && document.body.textContent==='updated'") { value, error in
                self.check("新 WebView 直接载入缓存仍使用同一存储", error == nil && value as? Bool == true)
                print("RESULT \(4-self.failures)/4"); exit(self.failures == 0 ? 0 : 1)
            }
        }
    }
    func simulate() {
        let response = URLResponse(url: page, mimeType: "text/html", expectedContentLength: -1, textEncodingName: "utf-8")
        view.loadSimulatedRequest(URLRequest(url: page), response: response, responseData: Data("<!doctype html><body>updated</body>".utf8))
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { print("FAIL \(error)"); exit(1) }
}
@main struct Main {
    static func main() throws {
        let app = NSApplication.shared; app.setActivationPolicy(.prohibited)
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("zhixiang-storage-test-" + UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let page = directory.appendingPathComponent("standalone.html")
        try Data("<!doctype html><body>builtin</body>".utf8).write(to: page)
        let check = StorageCheck(page: page)
        check.view.loadFileURL(page, allowingReadAccessTo: page)
        DispatchQueue.main.asyncAfter(deadline: .now() + 30) { print("FAIL WebKit 存储测试超时"); exit(1) }
        withExtendedLifetime(check) { app.run() }
    }
}
