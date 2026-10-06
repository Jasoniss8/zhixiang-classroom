import Foundation
import CryptoKit

@main struct UpdateChecks {
    static func main() throws {
        var checks = 0, failed = 0
        func check(_ label: String, _ value: Bool) { checks += 1; if !value { failed += 1 }; print("\(value ? "PASS" : "FAIL") \(label)") }
        func rejects(_ label: String, _ body: () throws -> Void) { do { try body(); check(label, false) } catch { check(label, true) } }
        let html = Data("<!doctype html><meta charset=utf-8><body>离线更新</body>".utf8)
        let hash = SHA256.hash(data: html).map { String(format: "%02x", $0) }.joined()
        func manifest(version: String = "1.2.0", minimum: String = "1.1.0", url: String? = nil, bytes: Int? = nil, sha: String? = nil, package: String? = nil) -> DesktopManifest {
            DesktopManifest(schema: 1, version: version, minimumShellVersion: minimum, publishedAt: "2026-10-03", notes: ["测试离线更新"], page: .init(url: url ?? DesktopUpdatePolicy.pageURL(version: version), sha256: sha ?? hash, bytes: bytes ?? html.count), downloads: ["macos": .init(url: package ?? DesktopUpdatePolicy.packageURL(version: version), sha256: nil, bytes: nil)])
        }
        check("版本按数字而非字符串比较", try DesktopVersion("1.10.0") > DesktopVersion("1.9.9"))
        for value in ["1.0", "01.0.0", "1.0.0-beta", "1.0.-1", "1.0.0/../2", "9999999.0.0"] { rejects("拒绝非法版本 \(value)") { _ = try DesktopVersion(value) } }
        try DesktopUpdatePolicy.verify(html, manifest: manifest()); check("有效页面通过字节与 SHA256 校验", true)
        for url in ["http://zhixiang-classroom.pages.dev/desktop/releases/1.2.0/standalone.html", "https://evil.example/desktop/releases/1.2.0/standalone.html", "https://zhixiang-classroom.pages.dev/elsewhere.html", "https://zhixiang-classroom.pages.dev/desktop/releases/1.2.0/standalone.html?redirect=evil", "https://zhixiang-classroom.pages.dev@evil.example/desktop/releases/1.2.0/standalone.html"] {
            rejects("拒绝非固定发布页面地址") { try DesktopUpdatePolicy.validate(manifest(url: url)) }
        }
        rejects("拒绝超过10MB页面") { try DesktopUpdatePolicy.validate(manifest(bytes: DesktopUpdatePolicy.maxPageBytes + 1)) }
        rejects("拒绝零长度页面") { try DesktopUpdatePolicy.validate(manifest(bytes: 0)) }
        rejects("拒绝外部安装包地址") { try DesktopUpdatePolicy.validate(manifest(package: "https://evil.example/setup.zip")) }
        rejects("拒绝截断页面") { try DesktopUpdatePolicy.verify(html.dropLast(), manifest: manifest()) }
        rejects("拒绝错误 SHA256") { try DesktopUpdatePolicy.verify(html, manifest: manifest(sha: String(repeating: "0", count: 64))) }
        rejects("拒绝校验值格式错误") { try DesktopUpdatePolicy.verify(html, manifest: manifest(sha: "not-a-hash")) }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("zhixiang-update-tests-" + UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let cache = DesktopPageCache(directory: directory)
        check("首次启动无缓存直接使用内置版本", try cache.read(bundledVersion: "1.1.0", shellVersion: "1.1.0") == nil)
        try cache.install(html, manifest: manifest())
        let saved = try Data(contentsOf: cache.file)
        let loaded = try cache.read(bundledVersion: "1.1.0", shellVersion: "1.1.0")
        check("原子缓存可读取校验后的新页面", loaded?.data == html && loaded?.manifest.version == "1.2.0")
        rejects("坏下载不能安装") { try cache.install(Data("bad".utf8), manifest: manifest()) }
        check("安装失败保留原缓存完整字节", try Data(contentsOf: cache.file) == saved)
        check("更高内置版本不被旧缓存降级", try cache.read(bundledVersion: "1.3.0", shellVersion: "1.1.0") == nil)
        check("旧壳不会读取需要新壳的缓存", try cache.read(bundledVersion: "1.1.0", shellVersion: "1.0.0") == nil)
        try Data("damaged".utf8).write(to: cache.file)
        rejects("损坏缓存可识别并交由主程序回退") { _ = try cache.read(bundledVersion: "1.1.0", shellVersion: "1.1.0") }
        check("接受有效ISO日期与时间", DesktopUpdatePolicy.validDate("2026-10-03") && DesktopUpdatePolicy.validDate("2026-10-03T06:20:45Z") && DesktopUpdatePolicy.validDate("2026-10-03T06:20:45.125Z"))
        check("拒绝不存在日期及非ISO字符串", !DesktopUpdatePolicy.validDate("2026-02-30") && !DesktopUpdatePolicy.validDate("tomorrow") && !DesktopUpdatePolicy.validDate("2026-13-03") && !DesktopUpdatePolicy.validDate("2026-10-03T28:10:00Z"))
        let noPackage = DesktopManifest(schema: 1, version: "1.2.0", minimumShellVersion: "1.2.0", publishedAt: "2026-10-03", notes: [], page: manifest().page, downloads: [:])
        rejects("缺少macOS下载不能拼接安装包地址") { _ = try DesktopUpdatePolicy.macPackageURL(noPackage) }
        for url in ["https://openstax.org/books/calculus", "https://gml.noaa.gov/grad/solcalc/", "https://www.hko.gov.hk/en/gts/time/24solarterms.htm", DesktopUpdatePolicy.packageURL(version: "1.2.0")] {
            check("允许已知HTTPS参考和正式发布链接", DesktopUpdatePolicy.canOpenExternal(URL(string: url)!))
        }
        for url in ["https://evil.example/", "http://openstax.org/", "file:///etc/passwd", "javascript:alert(1)", "https://github.com/else/project/releases/download/v1.2.0/install.zip", "https://openstax.org@evil.example/"] {
            check("拒绝未知外链或scheme", !DesktopUpdatePolicy.canOpenExternal(URL(string: url)!))
        }
        let badNotes = DesktopManifest(schema: 1, version: "1.2.0", minimumShellVersion: "1.1.0", publishedAt: "2026-10-03", notes: [String(repeating: "长", count: 241)], page: manifest().page, downloads: [:])
        rejects("拒绝超长更新说明") { try DesktopUpdatePolicy.validate(badNotes) }
        // Invoke delegate admission checks with suspended tasks: no requests leave the process.
        let session = URLSession(configuration: .ephemeral), url = DesktopUpdatePolicy.manifestURL
        defer { session.invalidateAndCancel() }
        let task = session.dataTask(with: url)
        let downloader = DesktopBoundedDownload(url: url, limit: 128, completion: { _ in })
        let redirect = HTTPURLResponse(url: url, statusCode: 302, httpVersion: "HTTP/1.1", headerFields: [:])!
        var redirected: URLRequest?
        downloader.urlSession(session, task: task, willPerformHTTPRedirection: redirect, newRequest: URLRequest(url: URL(string: "https://evil.example/x")!)) { redirected = $0 }
        check("重定向不能离开固定HTTPS地址", redirected == nil)
        let exact = DesktopBoundedDownload(url: url, limit: 128, completion: { _ in })
        exact.urlSession(session, task: task, willPerformHTTPRedirection: redirect, newRequest: URLRequest(url: url)) { redirected = $0 }
        check("同一清单地址重定向可接受", redirected?.url == url)
        var allowed = true
        let oversized = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Length": "129"])!
        exact.urlSession(session, dataTask: task, didReceive: oversized) { allowed = $0 == .allow }
        check("响应头超限在接收前拒绝", !allowed)
        let missing = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: [:])!
        exact.urlSession(session, dataTask: task, didReceive: missing) { allowed = $0 == .allow }
        check("404清单拒绝作为成功更新", !allowed)
        var streamRejected = false, streamFinished = false
        let stream = DesktopBoundedDownload(url: url, limit: 128, completion: { result in
            if case .failure = result { streamRejected = true }
            streamFinished = true
        })
        stream.urlSession(session, dataTask: task, didReceive: Data(repeating: 0, count: 129))
        stream.urlSession(session, task: task, didCompleteWithError: nil)
        let deadline = Date().addingTimeInterval(2)
        while !streamFinished && Date() < deadline { RunLoop.current.run(until: Date().addingTimeInterval(0.02)) }
        check("未知长度响应流超过上限也会拒绝", streamFinished && streamRejected)
        print("RESULT \(checks-failed)/\(checks)")
        if failed > 0 { exit(1) }
    }
}
