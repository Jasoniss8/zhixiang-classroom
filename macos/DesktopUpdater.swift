import Foundation
import CryptoKit

struct DesktopUpdateError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}
struct DesktopVersion: Comparable {
    let parts: [Int]
    init(_ text: String) throws {
        guard text.range(of: #"^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$"#, options: .regularExpression) != nil else {
            throw DesktopUpdateError(message: "版本号格式无效。")
        }
        parts = text.split(separator: ".").map { Int($0)! }
    }
    static func < (a: Self, b: Self) -> Bool { a.parts.lexicographicallyPrecedes(b.parts) }
}
struct BundledRelease: Decodable {
    let schema: Int
    let version: String
    let shellVersion: String
}
struct DesktopManifest: Codable {
    struct Page: Codable { let url: String; let sha256: String; let bytes: Int }
    struct Download: Codable { let url: String; let sha256: String?; let bytes: Int? }
    let schema: Int
    let version: String
    let minimumShellVersion: String
    let publishedAt: String
    let notes: [String]
    let page: Page
    let downloads: [String: Download]
}
enum DesktopUpdatePolicy {
    static let manifestURL = URL(string: "https://zhixiang-classroom.pages.dev/desktop/latest.json")!
    static let maxPageBytes = 10 * 1024 * 1024
    static let maxManifestBytes = 64 * 1024
    static func pageURL(version: String) -> String { "https://zhixiang-classroom.pages.dev/desktop/releases/\(version)/standalone.html" }
    static func packageURL(version: String) -> String { "https://github.com/Jasoniss8/zhixiang-classroom/releases/download/v\(version)/Zhixiang-macOS-arm64.zip" }
    static func validDate(_ value: String) -> Bool {
        guard value.range(of: #"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z)?$"#, options: .regularExpression) != nil else { return false }
        let datePart = String(value.prefix(10))
        let day = DateFormatter(); day.locale = Locale(identifier: "en_US_POSIX"); day.timeZone = TimeZone(secondsFromGMT: 0)
        day.dateFormat = "yyyy-MM-dd"; day.isLenient = false
        guard let parsed = day.date(from: datePart), day.string(from: parsed) == datePart else { return false }
        if value.count == 10 { return true }
        let iso = ISO8601DateFormatter(); iso.formatOptions = value.contains(".") ? [.withInternetDateTime, .withFractionalSeconds] : [.withInternetDateTime]
        guard let instant = iso.date(from: value) else { return false }
        return day.string(from: instant) == datePart
    }
    static func canOpenExternal(_ url: URL) -> Bool {
        guard url.scheme == "https", url.user == nil, url.password == nil, url.port == nil || url.port == 443 else { return false }
        if ["openstax.org", "gml.noaa.gov", "www.hko.gov.hk", "zhixiang-classroom.pages.dev"].contains(url.host ?? "") { return true }
        guard url.host == "github.com", url.query == nil, url.fragment == nil else { return false }
        return url.path.range(of: #"^/Jasoniss8/zhixiang-classroom/releases/download/v[0-9]+\.[0-9]+\.[0-9]+/Zhixiang-(macOS-arm64|Windows-x64)\.zip$"#, options: .regularExpression) != nil
    }
    static func macPackageURL(_ manifest: DesktopManifest) throws -> URL {
        guard let download = manifest.downloads["macos"], download.url == packageURL(version: manifest.version), let url = URL(string: download.url) else {
            throw DesktopUpdateError(message: "更新清单缺少有效的 macOS 安装包地址。")
        }
        return url
    }
    static func validate(_ manifest: DesktopManifest) throws {
        guard manifest.schema == 1 else { throw DesktopUpdateError(message: "更新清单版本不受支持。") }
        _ = try DesktopVersion(manifest.version)
        _ = try DesktopVersion(manifest.minimumShellVersion)
        guard manifest.page.url == pageURL(version: manifest.version),
              manifest.page.bytes > 0, manifest.page.bytes <= maxPageBytes,
              manifest.page.sha256.range(of: #"^[a-fA-F0-9]{64}$"#, options: .regularExpression) != nil,
              manifest.notes.count <= 12,
              manifest.notes.allSatisfy({ $0.utf16.count <= 240 && !$0.unicodeScalars.contains(where: { $0.value <= 8 || $0.value == 11 || $0.value == 12 || (14...31).contains($0.value) }) }),
              validDate(manifest.publishedAt) else {
            throw DesktopUpdateError(message: "更新清单中的地址、大小或校验值无效。")
        }
        if let download = manifest.downloads["macos"], download.url != packageURL(version: manifest.version) {
            throw DesktopUpdateError(message: "安装包地址不属于知象的正式发布地址。")
        }
    }
    static func verify(_ data: Data, manifest: DesktopManifest) throws {
        try validate(manifest)
        guard data.count == manifest.page.bytes else { throw DesktopUpdateError(message: "页面下载不完整，已保留原版本。") }
        let hash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard hash == manifest.page.sha256.lowercased() else { throw DesktopUpdateError(message: "页面校验失败，已保留原版本。") }
        guard let html = String(data: data, encoding: .utf8), html.lowercased().contains("<!doctype html") else {
            throw DesktopUpdateError(message: "下载内容不是有效的离线页面。")
        }
    }
}
struct InstalledDesktopPage: Codable {
    let manifest: DesktopManifest
    let data: Data
}
struct DesktopPageCache {
    let directory: URL
    var file: URL { directory.appendingPathComponent("page-update.json") }
    func read(bundledVersion: String, shellVersion: String) throws -> InstalledDesktopPage? {
        guard FileManager.default.fileExists(atPath: file.path) else { return nil }
        let attributes = try FileManager.default.attributesOfItem(atPath: file.path)
        guard let size = attributes[.size] as? NSNumber, size.intValue <= 15 * 1024 * 1024 else {
            throw DesktopUpdateError(message: "本地更新缓存损坏，将使用内置页面。")
        }
        let cached = try JSONDecoder().decode(InstalledDesktopPage.self, from: Data(contentsOf: file))
        try DesktopUpdatePolicy.verify(cached.data, manifest: cached.manifest)
        guard try DesktopVersion(cached.manifest.version) > DesktopVersion(bundledVersion),
              try DesktopVersion(cached.manifest.minimumShellVersion) <= DesktopVersion(shellVersion) else { return nil }
        return cached
    }
    func install(_ data: Data, manifest: DesktopManifest) throws {
        try DesktopUpdatePolicy.verify(data, manifest: manifest)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let record = InstalledDesktopPage(manifest: manifest, data: data)
        // One atomically replaced record binds metadata and bytes; no partially committed pair.
        try JSONEncoder().encode(record).write(to: file, options: .atomic)
    }
}

// No session is created on app launch. Each explicit check uses a bounded ephemeral session.
final class DesktopBoundedDownload: NSObject, URLSessionDataDelegate {
    private let allowedURL: URL
    private let limit: Int
    private let completion: (Result<Data, Error>) -> Void
    private var data = Data()
    private var failure: Error?
    private var session: URLSession?
    private var redirects = 0
    init(url: URL, limit: Int, completion: @escaping (Result<Data, Error>) -> Void) {
        self.allowedURL = url; self.limit = limit; self.completion = completion
    }
    func start() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 20
        configuration.timeoutIntervalForResource = 45
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
        self.session = session
        var request = URLRequest(url: allowedURL)
        request.setValue("application/json, text/html", forHTTPHeaderField: "Accept")
        session.dataTask(with: request).resume()
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        redirects += 1
        guard request.url?.absoluteString == allowedURL.absoluteString, redirects <= 3 else {
            failure = DesktopUpdateError(message: "更新地址发生非预期跳转，已停止下载。")
            completionHandler(nil); return
        }
        completionHandler(request)
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let response = response as? HTTPURLResponse, response.statusCode == 200,
              response.url?.absoluteString == allowedURL.absoluteString,
              response.expectedContentLength <= Int64(limit) else {
            failure = DesktopUpdateError(message: "更新暂不可用或文件超过大小限制。")
            completionHandler(.cancel); return
        }
        completionHandler(.allow)
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive bytes: Data) {
        guard data.count + bytes.count <= limit else {
            failure = DesktopUpdateError(message: "下载超过大小限制，已保留原版本。")
            dataTask.cancel(); return
        }
        data.append(bytes)
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        let result: Result<Data, Error> = (failure ?? error).map { .failure($0) } ?? .success(data)
        session.finishTasksAndInvalidate(); self.session = nil
        DispatchQueue.main.async { self.completion(result) }
    }
}
