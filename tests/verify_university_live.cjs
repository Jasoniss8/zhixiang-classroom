"use strict";
/* Run manually AFTER v1.2.0 is public. This is deliberately not check_*.cjs:
   the normal CI regression must never depend on the currently published site.
   Uses fresh anonymous contexts, no authentication and no release mutations.

   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/path/to/chrome' \
     node tests/verify_university_live.cjs
*/
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const { outputDir, loadPlaywright } = require("./runtime.cjs");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://zhixiang-classroom.pages.dev";
const VERSION = "1.2.0";
const EXPECTED = path.join(ROOT, "output/releases", "v" + VERSION, "latest.json");
const ADDED = ["taylor", "linear-transform", "fourier", "gradient", "ode", "rlc"];
const LEGACY = ["solids", "sections", "nets", "parabola", "functions", "conics", "derivative", "trig", "projectile", "pendulum", "wave", "refraction", "lens", "spring", "circular", "electric", "collision", "induction", "double-slit", "gas", "solar", "seasons"];
const runDir = path.join(outputDir, "live-university-" + new Date().toISOString().replace(/[:.]/g, "-"));
const results = [], pageErrors = [];
let browser, context, http;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const safeURL = value => {
  // GitHub's redirect target contains a signed query. Do not put it in logs.
  try { const u = new URL(value); return u.origin + u.pathname; } catch { return "invalid URL"; }
};
function check(name, passed, details) {
  results.push({ name, passed: !!passed, ...(details === undefined ? {} : { details }) });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${passed ? "" : " " + JSON.stringify(details)}`);
}
async function section(name, action) {
  try { await action(); }
  catch (error) {
    // Keep independent checks running. Any failed section still fails the process.
    const message = String(error.message).replace(/https:\/\/[^\s"']+/g, url => safeURL(url));
    check(name, false, message);
  }
}
function responseInfo(response) {
  const h = response.headers();
  return { status: response.status(), url: safeURL(response.url()),
    contentLength: h["content-length"], contentType: h["content-type"],
    cacheControl: h["cache-control"], cors: h["access-control-allow-origin"] };
}
function immutableHeader(value = "") {
  const maxAge = /(?:^|[,\s])max-age=(\d+)/i.exec(value);
  return /(?:^|[,\s])immutable(?:$|[,\s])/i.test(value) && Number(maxAge?.[1]) >= 31536000;
}

(async () => {
  fs.mkdirSync(runDir, { recursive: true });
  if (!fs.existsSync(EXPECTED)) throw new Error("缺少已准备的 output/releases/v1.2.0/latest.json；请先准备发布产物，部署完成后再运行本脚本。");
  const expected = JSON.parse(fs.readFileSync(EXPECTED, "utf8"));
  const expectedPageURL = `${SITE}/desktop/releases/${VERSION}/standalone.html`;
  if (expected.schema !== 1 || expected.version !== VERSION || expected.page?.url !== expectedPageURL)
    throw new Error("本地 expected 清单不是固定站点的 v1.2.0 正式发布清单。");
  for (const platform of ["macos", "windows"]) {
    const filename = platform === "macos" ? "Zhixiang-macOS-arm64.zip" : "Zhixiang-Windows-x64.zip";
    const item = expected.downloads?.[platform];
    if (item?.url !== `https://github.com/Jasoniss8/zhixiang-classroom/releases/download/v${VERSION}/${filename}` || !Number.isSafeInteger(item.bytes) || item.bytes <= 0 || !/^[a-f0-9]{64}$/.test(item.sha256))
      throw new Error(`本地 ${platform} 下载元数据无效。`);
  }
  if (!Number.isSafeInteger(expected.page.bytes) || expected.page.bytes < 1 || expected.page.bytes > 10 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(expected.page.sha256))
    throw new Error("本地版本页面的长度或 SHA256 无效。");
  const { chromium, request } = loadPlaywright();
  http = await request.newContext({ timeout: 45000, ignoreHTTPSErrors: false,
    extraHTTPHeaders: { "Cache-Control": "no-cache", "Accept-Encoding": "identity" } });

  await section("匿名读取正式更新清单", async () => {
    const response = await http.get(`${SITE}/desktop/latest.json`, { maxRedirects: 0 });
    const details = responseInfo(response), bytes = await response.body();
    check("latest.json 无登录、无跳转返回200", response.status() === 200, details);
    check("latest.json 大小不超过64KiB", bytes.length > 0 && bytes.length <= 65536, { bytes: bytes.length });
    const actual = JSON.parse(bytes.toString("utf8"));
    check("线上清单与本地已准备v1.2.0清单完全一致", isDeepStrictEqual(actual, expected), { actualVersion: actual.version, expectedVersion: VERSION });
    check("更新清单禁止缓存并允许跨来源读取", /(?:^|[,\s])no-store(?:$|[,\s])/i.test(details.cacheControl || "") && details.cors === "*", details);
    fs.writeFileSync(path.join(runDir, "live-latest.json"), bytes);
    await response.dispose();
  });

  await section("匿名版本页面及哈希", async () => {
    const response = await http.get(expectedPageURL, { maxRedirects: 0 });
    const details = responseInfo(response), bytes = await response.body();
    check("版本HTML按原URL直接200，无.html重定向", response.status() === 200 && response.url() === expectedPageURL, details);
    check("版本HTML实际解码字节数与清单一致", bytes.length === expected.page.bytes, { actual: bytes.length, expected: expected.page.bytes });
    check("版本HTML实际SHA256与清单一致", sha256(bytes) === expected.page.sha256, { actual: sha256(bytes), expected: expected.page.sha256 });
    check("版本HTML一年immutable缓存及CORS", immutableHeader(details.cacheControl) && details.cors === "*", details);
    await response.dispose();
  });

  await section("保留1.1.0版本页面", async () => {
    const oldURL = `${SITE}/desktop/releases/1.1.0/standalone.html`;
    const response = await http.get(oldURL, { maxRedirects: 0 }), bytes = await response.body(), details = responseInfo(response);
    check("旧1.1.0页面匿名直接200且不是当前首页回退", response.status() === 200 && /<!doctype html/i.test(bytes.toString("utf8", 0, 200)) && sha256(bytes) !== expected.page.sha256, details);
    check("旧版本页面保留immutable缓存", immutableHeader(details.cacheControl), details);
    const oldPath = path.join(ROOT, "output/releases/v1.1.0/latest.json");
    if (fs.existsSync(oldPath)) {
      const old = JSON.parse(fs.readFileSync(oldPath, "utf8"));
      check("旧版本页面仍匹配原1.1.0发布哈希和长度", bytes.length === old.page.bytes && sha256(bytes) === old.page.sha256, { actualBytes: bytes.length, expectedBytes: old.page.bytes, actualSHA256: sha256(bytes) });
    }
    await response.dispose();
  });

  await section("匿名首页与发布页面一致", async () => {
    const response = await http.get(`${SITE}/`, { maxRedirects: 0 }), bytes = await response.body(), details = responseInfo(response);
    check("首页匿名200且内容等于v1.2.0页面", response.status() === 200 && bytes.length === expected.page.bytes && sha256(bytes) === expected.page.sha256, details);
    check("首页要求重新验证缓存", /no-cache|(?:^|[,\s])max-age=0(?:$|[,\s])/i.test(details.cacheControl || ""), details);
    await response.dispose();
  });

  const assets = await Promise.allSettled(["macos", "windows"].map(platform => section(`${platform}匿名包HEAD`, async () => {
    const item = expected.downloads[platform];
    // HEAD follows GitHub's public object-store redirect, without downloading
    // the Windows archive or using a GitHub token/cookie/storage state.
    const response = await http.head(item.url, { maxRedirects: 5, timeout: 60000 });
    const details = responseInfo(response), final = new URL(response.url());
    check(`${platform}发布资产匿名HEAD返回200`, response.status() === 200, details);
    check(`${platform}下载资产长度与发布清单一致`, Number(details.contentLength) === item.bytes, { ...details, expectedBytes: item.bytes });
    check(`${platform}下载保持HTTPS且最终为GitHub官方资产域`, final.protocol === "https:" && ["github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(final.hostname), { finalURL: safeURL(response.url()) });
    await response.dispose();
  })));
  for (const result of assets) if (result.status === "rejected") check("下载资产检查执行", false, String(result.reason));

  await section("匿名浏览器模型与下载页", async () => {
    browser = await chromium.launch({ headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", ignoreHTTPSErrors: false });
    check("浏览器以空cookie匿名上下文开始", (await context.cookies()).length === 0);
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(`${SITE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.locator(".model-card").first().waitFor({ timeout: 30000 });
    const inventory = await page.evaluate(() => ({ ids: MODELS.map(m => m.id), university: MODELS.filter(m => m.level.includes("大学")).map(m => m.id), three: MODELS.filter(m => m.threeD).map(m => m.id), cats: Object.fromEntries(["math", "physics", "geography"].map(cat => [cat, MODELS.filter(m => m.cat === cat).length])) }));
    check("匿名首页显示全部28模型及原有22模型", inventory.ids.length === 28 && new Set(inventory.ids).size === 28 && LEGACY.every(id => inventory.ids.includes(id)) && await page.locator(".model-card").count() === 28, inventory);
    check("学科数量为数学13、物理13、地理2", inventory.cats.math === 13 && inventory.cats.physics === 13 && inventory.cats.geography === 2, inventory.cats);
    await page.locator("#gradeFilter").selectOption("大学");
    let visible = await page.locator(".card-open").evaluateAll(nodes => nodes.map(n => n.dataset.open).sort());
    check("大学筛选实际显示指定6模型", isDeepStrictEqual(visible, [...ADDED].sort()), visible);
    await page.locator("#gradeFilter").selectOption("all");
    await page.locator("#threeDFilter").check();
    visible = await page.locator(".card-open").evaluateAll(nodes => nodes.map(n => n.dataset.open).sort());
    check("三维筛选实际显示4模型", isDeepStrictEqual(visible, ["gradient", "nets", "sections", "solids"].sort()), visible);
    await page.locator("#gradeFilter").selectOption("大学");
    visible = await page.locator(".card-open").evaluateAll(nodes => nodes.map(n => n.dataset.open));
    check("大学与三维交集为梯度曲面", isDeepStrictEqual(visible, ["gradient"]), visible);
    await page.locator("#gradeFilter").selectOption("all");
    await page.locator("#threeDFilter").uncheck();
    await page.screenshot({ path: path.join(runDir, "live-library.png"), fullPage: true });

    for (const id of ADDED) await section(`线上模型 ${id}`, async () => {
      await page.goto(`${SITE}/#model=${id}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForFunction(id => state.model?.id === id && stageInfo?.modelId === id, id, { timeout: 15000 });
      const details = await page.evaluate(() => ({ id: state.model.id, title: document.querySelector("h1")?.textContent, formula: document.querySelector("#formula")?.textContent, metrics: document.querySelector("#metrics")?.textContent, valid: state.model.validate?.(state.p)?.valid !== false, running: state.running }));
      check(`${id}通过公开路由进入并完成有效计算`, details.id === id && details.valid && details.formula?.length > 5 && details.metrics?.length > 5 && !details.running, details);
      await page.screenshot({ path: path.join(runDir, `live-${id}.png`), fullPage: true });
    });
    await page.goto(`${SITE}/#downloads`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.locator("[data-package-download=windows]").waitFor({ timeout: 30000 });
    const links = await page.locator("[data-package-download]").evaluateAll(nodes => nodes.map(a => ({ platform: a.dataset.packageDownload, url: a.href })));
    check("下载页公开提供两个v1.2.0正式包链接", links.length === 2 && ["macos", "windows"].every(platform => links.find(item => item.platform === platform)?.url === expected.downloads[platform].url), links);
    check("下载页明确显示1.2.0版本", (await page.locator("#main").textContent()).includes(VERSION));
    await page.screenshot({ path: path.join(runDir, "live-downloads.png"), fullPage: true });
    check("匿名浏览器验收无页面脚本错误", pageErrors.length === 0, pageErrors);
  });
})().catch(error => check("线上验收启动/执行", false, String(error.message)))
  .finally(async () => {
    if (context) await context.close();
    if (browser) await browser.close();
    if (http) await http.dispose();
    fs.mkdirSync(runDir, { recursive: true });
    const report = { date: new Date().toISOString(), site: SITE, expectedVersion: VERSION,
      expectedManifest: path.relative(ROOT, EXPECTED), total: results.length,
      passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length,
      results, pageErrors,
      limitations: "Fresh anonymous Chromium context and unauthenticated HTTP. Package checks use HEAD and declared length; full ZIP bytes and their SHA256 are not downloaded/reverified here. This is not Windows/macOS native GUI testing." };
    fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(report, null, 2));
    console.log(`RESULT ${report.passed}/${report.total}; report: ${path.join(runDir, "summary.json")}`);
    if (report.failed) process.exitCode = 1;
  });
