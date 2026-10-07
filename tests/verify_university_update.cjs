"use strict";
/* Manual post-deployment verification; intentionally excluded from check_*.cjs.
   Uses the production Node update service and its real, pinned HTTPS transport.
   The previous built-in page and every user-data file are copied into a fresh
   temporary directory. No Electron/native GUI or real user profile is opened.

   Run only after the official v1.2.0 manifest/page are public:
     node tests/verify_university_update.cjs
*/
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { isDeepStrictEqual } = require("node:util");
const { outputDir } = require("./runtime.cjs");
const U = require("../windows/desktop/update-service.cjs");

const ROOT = path.resolve(__dirname, "..");
const VERSION = "1.2.0", PREVIOUS = "1.1.0", SHELL = "1.1.0";
const expectedPath = path.join(ROOT, "output/releases/v1.2.0/latest.json");
const previousManifestPath = path.join(ROOT, "output/releases/v1.1.0/latest.json");
const previousPagePath = path.join(ROOT, "output/releases/v1.1.0/standalone.html");
const runDir = path.join(outputDir, "live-university-update-" + new Date().toISOString().replace(/[:.]/g, "-"));
const results = [], requests = [];
let temporary = null, oldSourceHash = null, expected = null, cleanupSucceeded = false;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
function check(name, passed, details) {
  results.push({ name, passed: !!passed, ...(details === undefined ? {} : { details }) });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${passed ? "" : " " + JSON.stringify(details)}`);
  assert(passed, name);
}
function temporaryFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const file = path.join(directory, item.name);
    return item.isDirectory() ? temporaryFiles(file) : item.name.endsWith(".tmp") ? [path.relative(directory, file)] : [];
  });
}

(async () => {
  fs.mkdirSync(runDir, { recursive: true });
  for (const file of [expectedPath, previousManifestPath, previousPagePath])
    if (!fs.existsSync(file)) throw new Error(`缺少本地发布档案：${path.relative(ROOT, file)}。请保留1.1.0页面并准备1.2.0产物后再验收。`);
  expected = U.validateManifest(JSON.parse(fs.readFileSync(expectedPath, "utf8")));
  const oldManifest = U.validateManifest(JSON.parse(fs.readFileSync(previousManifestPath, "utf8")));
  check("本地档案是1.1.0→1.2.0且1.1.0壳可接受", oldManifest.version === PREVIOUS && expected.version === VERSION && U.compareVersions(SHELL, expected.minimumShellVersion) >= 0,
    { from: oldManifest.version, to: expected.version, shell: SHELL, minimumShell: expected.minimumShellVersion });
  const builtinBytes = fs.readFileSync(previousPagePath);
  U.verifyPage(builtinBytes, oldManifest.page);
  oldSourceHash = sha256(builtinBytes);
  check("旧内置页面匹配真实1.1.0发布哈希", oldSourceHash === oldManifest.page.sha256 && builtinBytes.length === oldManifest.page.bytes,
    { bytes: builtinBytes.length, sha256: oldSourceHash });

  temporary = fs.mkdtempSync(path.join(os.tmpdir(), "zhixiang-live-university-update-"));
  const builtinFile = path.join(temporary, "builtin-1.1.0.html");
  fs.writeFileSync(builtinFile, builtinBytes);
  const userData = path.join(temporary, "isolated-profile");
  fs.mkdirSync(userData);
  check("用户目录严格位于新建临时目录", path.dirname(userData) === temporary && !path.relative(temporary, userData).startsWith(".."));
  // This is an unrelated-file preservation probe, NOT an Electron Local Storage
  // database or a claim that actual classroom storage is exercised by this test.
  const sentinelFile = path.join(userData, "unrelated-file-probe.json");
  const sentinelBytes = Buffer.from(JSON.stringify({ purpose: "isolated update preservation probe", version: 1, marker: crypto.randomBytes(12).toString("hex") }));
  fs.writeFileSync(sentinelFile, sentinelBytes);
  const release = { schema: 1, version: PREVIOUS, shellVersion: SHELL, minimumShellVersion: SHELL };
  const liveFetch = async (url, options) => {
    // Forward unchanged to the production transport: no fixture responses,
    // redirects, tokens, cookies, custom trust store or altered validation.
    requests.push({ url, maxBytes: options.maxBytes, timeoutMs: options.timeoutMs });
    return U.fetchHTTPS(url, options);
  };
  const updater = U.createUpdateService({ userData, builtinFile, release, fetch: liveFetch });
  check("模拟旧内容1.1.0与原生壳1.1.0", isDeepStrictEqual(updater.info(), { platform: "windows", version: PREVIOUS, shellVersion: SHELL }), updater.info());
  check("服务初始化不联网且读取旧内置页面", requests.length === 0 && updater.readPage().equals(builtinBytes));
  check("应用资源URL契约保持原origin", U.APP_URL === "zhixiang://app/index.html" && U.isAppURL(U.APP_URL));

  const available = await updater.check();
  check("真实官方HTTPS清单提供1.2.0页面更新", available.status === "available" && available.version === VERSION,
    { status: available.status, version: available.version });
  check("实际收到的清单与已准备发布产物完全一致", isDeepStrictEqual(available.manifest, expected));
  check("检查只请求固定官方清单且保留限时限大小", requests.length === 1 && requests[0].url === U.MANIFEST_URL && requests[0].maxBytes === U.MAX_MANIFEST_BYTES && requests[0].timeoutMs === U.TIMEOUT_MS, requests);

  const installed = await updater.install(available.manifest);
  const updatedBytes = updater.readPage();
  check("真实HTTPS下载经生产服务校验后安装1.2.0", installed.version === VERSION && installed.shellVersion === SHELL, installed);
  check("安装页面实际字节数及SHA256匹配发布清单", updatedBytes.length === expected.page.bytes && sha256(updatedBytes) === expected.page.sha256,
    { actualBytes: updatedBytes.length, expectedBytes: expected.page.bytes, actualSHA256: sha256(updatedBytes) });
  check("安装只从固定版本路径下载且保留10MiB上限", requests.length === 2 && requests[1].url === expected.page.url && requests[1].maxBytes === U.MAX_PAGE_BYTES && requests[1].timeoutMs === U.TIMEOUT_MS, requests);
  const activeFile = path.join(userData, "updates/active.json");
  const installedFile = path.join(userData, "updates/releases", VERSION, "standalone.html");
  check("原子安装提交页面和一致的活动指针", fs.readFileSync(installedFile).equals(updatedBytes) && isDeepStrictEqual(U.validateManifest(JSON.parse(fs.readFileSync(activeFile, "utf8"))), expected));
  check("成功安装后无遗留临时文件", temporaryFiles(path.join(userData, "updates")).length === 0);
  check("旧内置页及用户目录独立文件保持原样", fs.readFileSync(builtinFile).equals(builtinBytes) && fs.readFileSync(sentinelFile).equals(sentinelBytes));

  let offlineAttempts = 0;
  const offlineFetch = async () => { offlineAttempts++; throw new Error("Offline verification: network disabled"); };
  const restarted = U.createUpdateService({ userData, builtinFile, release, fetch: offlineFetch });
  check("离线重新建立服务自动恢复1.2.0缓存且不联网", offlineAttempts === 0 && restarted.info().version === VERSION && restarted.info().shellVersion === SHELL, restarted.info());
  check("离线重新读取完整页面仍通过实际哈希检查", restarted.readPage().length === expected.page.bytes && sha256(restarted.readPage()) === expected.page.sha256 && offlineAttempts === 0);
  let rejectedOfflineCheck = false;
  try { await restarted.check(); } catch { rejectedOfflineCheck = true; }
  check("离线手动检查失败保留已安装1.2.0", rejectedOfflineCheck && offlineAttempts === 1 && restarted.info().version === VERSION && sha256(restarted.readPage()) === expected.page.sha256);

  // Fault only a second disposable profile. The successfully installed profile
  // and both archived release files remain intact throughout this check.
  const corruptUserData = path.join(temporary, "corrupt-profile");
  fs.cpSync(userData, corruptUserData, { recursive: true });
  fs.writeFileSync(path.join(corruptUserData, "updates/releases", VERSION, "standalone.html"), "damaged test cache");
  const beforeRecovery = offlineAttempts;
  const recovered = U.createUpdateService({ userData: corruptUserData, builtinFile, release, fetch: offlineFetch });
  check("损坏缓存在离线启动时回退真实1.1.0内置页", recovered.info().version === PREVIOUS && recovered.readPage().equals(builtinBytes) && offlineAttempts === beforeRecovery);
  check("损坏隔离副本不影响成功升级的原测试目录", restarted.info().version === VERSION && sha256(restarted.readPage()) === expected.page.sha256 && fs.readFileSync(sentinelFile).equals(sentinelBytes));
  check("保留发布档案未被写入", sha256(fs.readFileSync(previousPagePath)) === oldSourceHash);
})().catch(error => {
  if (!results.length || results.at(-1).passed) results.push({ name: "线上更新服务验收未完成", passed: false, details: String(error.message) });
  console.error(String(error.message));
  process.exitCode = 1;
}).finally(() => {
  try { if (temporary) fs.rmSync(temporary, { recursive: true, force: true }); cleanupSucceeded = true; }
  catch (error) { results.push({ name: "清理隔离测试目录", passed: false, details: String(error.message) }); process.exitCode = 1; }
  fs.mkdirSync(runDir, { recursive: true });
  const report = { date: new Date().toISOString(), hostPlatform: process.platform, testKind: "production-node-update-service-over-live-HTTPS",
    fromVersion: PREVIOUS, toVersion: VERSION, shellVersion: SHELL,
    productionUserDataTouched: false, isolatedTemporaryUserData: true, cleanupSucceeded,
    total: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length,
    requests, results, expectedPage: expected?.page,
    limitations: "Runs the Windows shell's production Node update service on this host. No Electron/native windows, IPC/dialogs, macOS Swift updater, Windows OS GUI or real browser classroom storage are exercised. Offline verification recreates the service and reads verified cached HTML; it does not render a native app." };
  fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(report, null, 2));
  console.log(`RESULT ${report.passed}/${report.total}; report: ${path.join(runDir, "summary.json")}`);
  if (report.failed) process.exitCode = 1;
});
