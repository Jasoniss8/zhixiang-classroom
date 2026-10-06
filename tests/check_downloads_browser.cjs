const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { baseURL, outputDir, loadPlaywright } = require("./runtime.cjs");
const release = require("../desktop/release.json");
const root = path.resolve(__dirname, ".."),
  results = [],
  errors = [];
let browser;
function check(name, passed, details) {
  results.push({ name, passed: !!passed, details });
  console.log(
    `${passed ? "PASS" : "FAIL"} ${name}${passed ? "" : " " + JSON.stringify(details)}`,
  );
}
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
// A target=_blank attachment may belong to a short-lived popup rather than
// its opener. Subscribe before clicking, across existing and newly created
// pages, and remove all listeners when the first actual download arrives.
function waitForContextDownload(context, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const listeners = new Map();
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      context.off("page", attach);
      context.off("close", closed);
      for (const [page, listener] of listeners) page.off("download", listener);
    };
    const attach = (page) => {
      if (listeners.has(page)) return;
      const listener = (download) => { cleanup(); resolve(download); };
      listeners.set(page, listener);
      page.on("download", listener);
    };
    const closed = () => { cleanup(); reject(new Error("下载前浏览器上下文已关闭。")); };
    context.on("page", attach);
    context.on("close", closed);
    for (const page of context.pages()) attach(page);
    timer = setTimeout(() => { cleanup(); reject(new Error("未收到原页面或下载弹窗的 download 事件。")); }, timeoutMs);
  });
}
(async () => {
  browser = await loadPlaywright().chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  let requests = 0;
  const fixture = { ...release, downloads: {} };
  for (const platform of ["macos", "windows"])
    fixture.downloads[platform] = {
      url: `https://github.com/${release.repository}/releases/download/v${release.version}/${release.downloads[platform].filename}`,
      sha256: "0".repeat(64),
      bytes: 1000000,
    };
  await page.route("**/desktop/latest.json", (route) => {
    requests++;
    return route.fulfill({ json: fixture });
  });
  await page.goto(baseURL + "/index.html");
  check(
    "模型库不主动联网检查桌面版本",
    requests === 0 && (await page.locator(".model-card").count()) === 22,
  );
  await page.locator(".sidebar [data-nav=downloads]").click();
  await page.locator("[data-package-download=macos]").waitFor();
  check(
    "导航进入下载页且标题明确",
    (await page.locator("h1").textContent()) === "下载桌面版" &&
      (await page.locator("#pageCrumb").textContent()) === "下载桌面版",
  );
  check(
    "两个平台下载指向固定公开仓库",
    await page
      .locator("[data-package-download]")
      .evaluateAll(
        (links, prefix) =>
          links.length === 2 && links.every((a) => a.href.startsWith(prefix)),
        `https://github.com/${release.repository}/releases/download/v${release.version}/`,
      ),
  );
  check(
    "Mac明确Apple芯片与最低系统",
    await page
      .locator(".desktop-download-grid")
      .textContent()
      .then(
        (t) =>
          t.includes("Apple 芯片") &&
          t.includes("macOS 13") &&
          t.includes("暂不提供 Intel"),
      ),
  );
  check(
    "Windows明确x64与完整解压",
    await page
      .locator(".desktop-download-grid")
      .textContent()
      .then(
        (t) =>
          t.includes("x64") &&
          t.includes("Windows 10 / 11") &&
          t.includes("完整解压"),
      ),
  );
  check(
    "显示离线使用和旧版首次更新步骤",
    await page
      .locator(".desktop-instructions")
      .textContent()
      .then(
        (t) => t.includes("可离线使用") && t.includes("已有旧桌面版需要先下载"),
      ),
  );
  await page.screenshot({
    path: path.join(outputDir, "desktop-downloads-1440.png"),
    fullPage: true,
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    check(
      `${width}px下载页不横向溢出`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    if (width === 390)
      await page.screenshot({
        path: path.join(outputDir, "desktop-downloads-390.png"),
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseURL + "/index.html#downloads");
  await page.locator("[data-package-download=windows]").waitFor();
  check(
    "下载页支持hash直达和刷新",
    (await page.locator("h1").textContent()) === "下载桌面版",
  );
  check(
    "语义版本按数值比较，不按字符串",
    await page.evaluate(
      () =>
        compareDesktopVersions("1.10.0", "1.9.9") > 0 &&
        compareDesktopVersions("1.1.0", "1.1.0") === 0,
    ),
  );
  for (const kind of [
    "external",
    "credentials",
    "http",
    "wrongRepo",
    "negativeSize",
    "checksum",
    "malformedVersion",
    "oldVersion",
  ]) {
    const bad = JSON.parse(JSON.stringify(fixture));
    if (kind === "external")
      bad.downloads.macos.url = "https://example.com/app.zip";
    if (kind === "credentials")
      bad.downloads.macos.url = bad.downloads.macos.url.replace(
        "https://",
        "https://user@",
      );
    if (kind === "http")
      bad.downloads.macos.url = bad.downloads.macos.url.replace(
        "https:",
        "http:",
      );
    if (kind === "wrongRepo")
      bad.downloads.macos.url = bad.downloads.macos.url.replace(
        release.repository,
        "other/project",
      );
    if (kind === "negativeSize") bad.downloads.macos.bytes = -1;
    if (kind === "checksum") bad.downloads.macos.sha256 = "bad";
    if (kind === "malformedVersion") bad.version = "1.2";
    if (kind === "oldVersion") bad.version = "0.1.0";
    check(
      `拒绝无效下载信息 ${kind}`,
      await page.evaluate((value) => {
        try {
          validateDownloadManifest(value);
          return false;
        } catch {
          return true;
        }
      }, bad),
    );
  }
  fixture.notes = ['<img src=x onerror="window.injected=true">'];
  await page.locator("#refreshDesktopDownloads").click();
  await page.waitForFunction(() =>
    document.querySelector("#desktopReleaseNotes").textContent.includes("<img"),
  );
  check(
    "版本说明按文本显示",
    await page.evaluate(
      () =>
        !window.injected && !document.querySelector("#desktopReleaseNotes img"),
    ),
  );
  const archivePath = path.join(root, "output/macos/知象-macOS.zip");
  // The CI repository has no generated native archive. A deterministic ZIP fixture
  // still checks the browser download; local runs use the actual generated Mac ZIP.
  const archive = fs.existsSync(archivePath)
    ? fs.readFileSync(archivePath)
    : Buffer.from("504b0506000000000000000000000000000000000000", "hex");
  fixture.downloads.macos = {
    ...fixture.downloads.macos,
    bytes: archive.length,
    sha256: sha(archive),
  };
  await context.route("https://github.com/**/releases/download/**", (route) =>
    route.fulfill({
      body: archive,
      contentType: "application/zip",
      headers: {
        "content-disposition": `attachment; filename="${release.downloads.macos.filename}"`,
      },
    }),
  );
  await page.locator("#refreshDesktopDownloads").click();
  await page.waitForFunction(
    (hash) =>
      document.querySelector(".download-checksum code")?.textContent === hash,
    sha(archive),
  );
  const [download] = await Promise.all([
    waitForContextDownload(context),
    page.locator("[data-package-download=macos]").click(),
  ]);
  const destination = path.join(outputDir, download.suggestedFilename());
  await download.saveAs(destination);
  check(
    "下载按钮实际下载ZIP且字节与SHA一致",
    download.suggestedFilename() === release.downloads.macos.filename &&
      sha(fs.readFileSync(destination)) === sha(archive),
    { actualArchive: fs.existsSync(archivePath), bytes: archive.length, popupDownload: download.page() !== page },
  );
  await page.unroute("**/desktop/latest.json");
  await page.route("**/desktop/latest.json", (route) =>
    route.fulfill({ status: 404, body: "not published" }),
  );
  await page.reload();
  await page.waitForFunction(() =>
    document
      .querySelector("#desktopDownloadStatus")
      .textContent.includes("尚未发布"),
  );
  check(
    "未发布时说明原因且不展示死下载链接",
    (await page.locator("[data-package-download]").count()) === 0,
  );
  await page.unroute("**/desktop/latest.json");
  await page.route("**/desktop/latest.json", (route) => route.abort());
  await page.locator("#refreshDesktopDownloads").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#desktopDownloadStatus")
      .textContent.includes("无法连接"),
  );
  check(
    "断网提示并可重试",
    await page.locator("#refreshDesktopDownloads").isEnabled(),
  );
  await page.unroute("**/desktop/latest.json");
  await page.route("**/desktop/latest.json", (route) =>
    route.fulfill({ body: "x".repeat(65537) }),
  );
  await page.locator("#refreshDesktopDownloads").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#desktopDownloadStatus")
      .textContent.includes("过大"),
  );
  check(
    "下载清单限制64KB",
    (await page.locator("[data-package-download]").count()) === 0,
  );
  await page.locator(".sidebar [data-nav=all]").click();
  check(
    "下载页返回模型库仍为22模型",
    (await page.locator(".model-card").count()) === 22,
  );
  const native = await context.newPage();
  native.on("pageerror", (e) => errors.push(e.message));
  let nativeRequests = 0;
  native.on("request", (r) => {
    if (r.url().includes("/desktop/latest.json")) nativeRequests++;
  });
  await native.addInitScript(() => {
    window.updateClicks = 0;
    window.zhixiangDesktop = {
      getInfo: async () => ({
        platform: "windows",
        version: "1.1.0",
        shellVersion: "1.1.0",
      }),
      checkForUpdates: async () => {
        window.updateClicks++;
        return { status: "current", message: "当前已是最新版本。" };
      },
    };
  });
  await native.goto(baseURL + "/index.html#downloads");
  await native.waitForFunction(() =>
    document
      .querySelector("#desktopCurrentVersion")
      .textContent.includes("1.1.0"),
  );
  check(
    "桌面桥接显示版本与更新入口",
    (await native.locator("h1").textContent()) === "版本与更新" &&
      (await native
        .locator(".sidebar [data-nav=downloads]")
        .textContent()
        .then((t) => t.includes("版本与更新"))),
  );
  check(
    "桌面版本页不自动检查或联网",
    nativeRequests === 0 &&
      (await native.evaluate(() => window.updateClicks === 0)),
  );
  await native.locator("#checkDesktopUpdates").click();
  await native.waitForFunction(() =>
    document.querySelector("#desktopUpdateStatus").textContent.includes("最新"),
  );
  check(
    "检查按钮调用固定桥接方法并显示结果",
    await native.evaluate(() => window.updateClicks === 1),
  );
  await native.evaluate(() => {
    window.zhixiangDesktop.checkForUpdates = async () => {
      throw new Error("offline");
    };
  });
  await native.locator("#checkDesktopUpdates").click();
  await native.waitForFunction(() =>
    document.querySelector("#desktopUpdateStatus").textContent.includes("失败"),
  );
  check(
    "原生更新失败不阻断应用且按钮恢复",
    await native.locator("#checkDesktopUpdates").isEnabled(),
  );
  await native.screenshot({
    path: path.join(outputDir, "desktop-update-panel.png"),
    fullPage: true,
  });
  await native.close();
  await page.goto("file://" + path.join(root, "standalone.html"));
  check(
    "离线单文件仍直接运行22模型",
    (await page.locator(".model-card").count()) === 22,
  );
  check("下载与更新页面无脚本异常", errors.length === 0, errors);
})()
  .catch((e) => check("下载与更新浏览器检查完成", false, e.stack))
  .finally(async () => {
    await browser?.close();
    fs.writeFileSync(
      path.join(outputDir, "downloads-browser-results.json"),
      JSON.stringify(
        { date: new Date().toISOString(), results, errors },
        null,
        2,
      ),
    );
    console.log(
      `RESULT ${results.filter((r) => r.passed).length}/${results.length}`,
    );
    if (results.some((r) => !r.passed)) process.exitCode = 1;
  });
