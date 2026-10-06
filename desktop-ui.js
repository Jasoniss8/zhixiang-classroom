"use strict";
/* Download metadata is fetched only while this page is open. Native updates are
   handled by the application; the renderer never supplies a URL or file path. */
let desktopDownloadRequest = 0;
let desktopUpdateBusy = false;

function desktopVersionParts(value) {
  return typeof value === "string" &&
    /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(value)
    ? value.split(".").map(Number)
    : null;
}
function compareDesktopVersions(a, b) {
  const x = desktopVersionParts(a),
    y = desktopVersionParts(b);
  if (!x || !y) throw new Error("版本号无法读取。");
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return Math.sign(x[i] - y[i]);
  return 0;
}
function validateDownloadManifest(value) {
  const release = window.ZhixiangRelease;
  if (
    !value ||
    value.schema !== 1 ||
    !desktopVersionParts(value.version) ||
    !desktopVersionParts(value.minimumShellVersion) ||
    !Array.isArray(value.notes) ||
    value.notes.length > 20 ||
    value.notes.some((n) => typeof n !== "string" || n.length > 500)
  )
    throw new Error("下载版本信息格式不正确，请稍后重试。");
  if (compareDesktopVersions(value.version, release.version) < 0)
    throw new Error("新版下载文件尚未发布，请稍后重试。");
  const safe = { version: value.version, notes: value.notes, downloads: {} };
  for (const platform of ["macos", "windows"]) {
    const item = value.downloads?.[platform],
      config = release.downloads[platform];
    const expected = `https://github.com/${release.repository}/releases/download/v${value.version}/${config.filename}`;
    if (
      !item ||
      item.url !== expected ||
      !Number.isSafeInteger(item.bytes) ||
      item.bytes <= 0 ||
      item.bytes > 2 * 1024 ** 3 ||
      !/^[a-f0-9]{64}$/.test(item.sha256)
    )
      throw new Error("下载文件信息不完整，请稍后重试。");
    safe.downloads[platform] = {
      url: item.url,
      bytes: item.bytes,
      sha256: item.sha256,
    };
  }
  return safe;
}
function desktopFileSize(bytes) {
  return bytes >= 1024 ** 2
    ? `${(bytes / 1024 ** 2).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}
function desktopManifestURL() {
  // Static hosting uses a same-origin manifest. file:// uses the fixed public site.
  return /^https?:$/.test(location.protocol)
    ? new URL("desktop/latest.json", new URL(".", location.href)).href
    : window.ZhixiangRelease.manifestURL;
}
async function loadDesktopDownloads() {
  const request = ++desktopDownloadRequest;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const status = document.getElementById("desktopDownloadStatus");
  if (!status) return;
  status.textContent = "正在读取下载版本…";
  for (const platform of ["macos", "windows"]) {
    const slot = document.getElementById(`desktopDownload-${platform}`);
    if (slot)
      slot.innerHTML =
        '<button class="button primary" disabled>等待下载信息</button>';
  }
  const retry = document.getElementById("refreshDesktopDownloads");
  if (retry) retry.disabled = true;
  try {
    const response = await fetch(desktopManifestURL(), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 404)
      throw new Error("下载文件尚未发布，请稍后重试。");
    if (!response.ok) throw new Error("暂时无法读取下载版本，请稍后重试。");
    const reader = response.body?.getReader();
    let source;
    if (reader) {
      const chunks = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65536) {
          await reader.cancel();
          throw new Error("下载版本信息过大，已停止读取。");
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      source = new TextDecoder().decode(bytes);
    } else source = await response.text();
    if (source.length > 65536)
      throw new Error("下载版本信息过大，已停止读取。");
    const manifest = validateDownloadManifest(JSON.parse(source));
    if (request !== desktopDownloadRequest || state.view !== "downloads")
      return;
    status.textContent = `当前发布版本 ${manifest.version}。下载后可离线使用；下载文件托管于 GitHub。`;
    document.getElementById("desktopReleaseNotes").innerHTML = manifest.notes
      .map((n) => `<li>${esc(n)}</li>`)
      .join("");
    for (const platform of ["macos", "windows"]) {
      const item = manifest.downloads[platform],
        slot = document.getElementById(`desktopDownload-${platform}`);
      slot.innerHTML = `<a class="button primary" data-package-download="${platform}" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${icon("download")}下载 ${platform === "macos" ? "Mac" : "Windows"} 版 <span>${desktopFileSize(item.bytes)}</span></a><details class="download-checksum"><summary>文件校验值（SHA-256）</summary><code>${item.sha256}</code></details>`;
    }
  } catch (error) {
    if (request !== desktopDownloadRequest || state.view !== "downloads")
      return;
    status.textContent =
      error.name === "AbortError"
        ? "读取版本超时。请检查网络后重试。"
        : error instanceof SyntaxError
          ? "下载版本信息无法读取，请稍后重试。"
          : error instanceof TypeError
            ? "无法连接下载服务。请检查网络后重试；已有桌面版仍可离线使用。"
            : error.message;
  } finally {
    clearTimeout(timer);
    if (request === desktopDownloadRequest && retry?.isConnected)
      retry.disabled = false;
  }
}
async function checkDesktopUpdates() {
  if (desktopUpdateBusy || !window.zhixiangDesktop?.checkForUpdates) return;
  desktopUpdateBusy = true;
  const button = document.getElementById("checkDesktopUpdates"),
    status = document.getElementById("desktopUpdateStatus");
  if (button) button.disabled = true;
  if (status) status.textContent = "正在检查更新，请查看应用弹窗…";
  try {
    const result = await window.zhixiangDesktop.checkForUpdates();
    if (status?.isConnected)
      status.textContent = result?.message || "检查已完成。";
    const info = await window.zhixiangDesktop.getInfo();
    if (document.getElementById("desktopCurrentVersion"))
      document.getElementById("desktopCurrentVersion").textContent =
        `内容版本 ${info.version} · 程序版本 ${info.shellVersion}`;
  } catch {
    if (status?.isConnected)
      status.textContent = "检查更新失败，当前版本仍可使用。请检查网络后重试。";
  } finally {
    desktopUpdateBusy = false;
    if (button?.isConnected) button.disabled = false;
  }
}
function renderDownloads() {
  const release = window.ZhixiangRelease,
    native = !!window.zhixiangDesktop;
  const heading = native ? "版本与更新" : "下载桌面版";
  let content = `<section class="desktop-page" aria-labelledby="desktopPageTitle"><div class="library-heading"><div><h1 id="desktopPageTitle">${heading}</h1><p>独立窗口使用，模型内置，断网也能上课。</p></div></div>`;
  if (native) {
    content += `<section class="desktop-update-panel"><h2>当前版本</h2><p id="desktopCurrentVersion">正在读取版本…</p><button class="button primary" id="checkDesktopUpdates" ${desktopUpdateBusy ? "disabled" : ""}>${icon("reset")}检查更新</button><p id="desktopUpdateStatus" role="status" aria-live="polite">只在你检查或下载更新时联网。</p><p>发现新版后，确认“下载并更新”即可更新模型和页面。更新会重新打开当前页面；课堂配置和收藏保留，未保存的参数或板书请先保存。</p><p>需要升级桌面程序时，会提示下载完整安装包。</p></section><section class="desktop-instructions"><h2>其他设备</h2><p><a class="button secondary" href="${esc(release.websiteURL)}#downloads" target="_blank" rel="noopener noreferrer">${icon("download")}打开桌面版下载页</a></p></section>`;
  } else {
    content += `<div class="desktop-download-status"><p id="desktopDownloadStatus" role="status" aria-live="polite">正在读取下载版本…</p><button class="button secondary" id="refreshDesktopDownloads">重新读取版本</button></div><div class="desktop-download-grid">`;
    for (const platform of ["macos", "windows"]) {
      const item = release.downloads[platform];
      content += `<section class="desktop-download-card"><h2>${esc(item.label)}</h2><p class="desktop-platform">${esc(item.architecture)}</p><p>${esc(item.minimumOS)}</p><div id="desktopDownload-${platform}" class="desktop-download-action"><button class="button primary" disabled>等待下载信息</button></div><ol>${platform === "macos" ? "<li>解压 ZIP，将“知象.app”拖到“应用程序”。</li><li>打开知象；首次可能需要右键选择“打开”。</li><li>此下载适用于 Apple 芯片，暂不提供 Intel 版。</li>" : "<li>将 ZIP 完整解压到一个固定文件夹。</li><li>双击 Zhixiang.exe，保留旁边的文件。</li><li>无需安装 Python 或单独打开浏览器。</li>"}</ol><p class="desktop-signing">应用尚未进行开发者签名认证，系统可能显示来源提示。</p></section>`;
    }
    content += `</div><section class="desktop-instructions"><h2>使用与更新</h2><ul><li>下载和检查更新需要联网；数学、物理、地理模型可离线使用。</li><li>在桌面版导航栏的“版本与更新”中点击“检查更新”。</li><li>已有旧桌面版需要先下载本次新版，之后才能使用检查更新。</li><li>网页与桌面版分别保存收藏和课堂。换设备时，用“我的课堂”导出、导入配置。</li><li>Windows 与 Mac 均不收集课堂配置；分享链接只包含你选择的模型参数。</li></ul><h2>版本说明</h2><ul id="desktopReleaseNotes"><li>发布后显示版本说明。</li></ul></section>`;
  }
  document.getElementById("main").innerHTML =
    mobileNav() + content + "</section>";
  if (native) {
    document
      .getElementById("checkDesktopUpdates")
      .addEventListener("click", checkDesktopUpdates);
    window.zhixiangDesktop
      .getInfo()
      .then((info) => {
        const label = document.getElementById("desktopCurrentVersion");
        if (label)
          label.textContent = `内容版本 ${info.version} · 程序版本 ${info.shellVersion}`;
      })
      .catch(() => {
        const label = document.getElementById("desktopCurrentVersion");
        if (label) label.textContent = "无法读取版本，请重新打开应用。";
      });
  } else {
    document
      .getElementById("refreshDesktopDownloads")
      .addEventListener("click", loadDesktopDownloads);
    void loadDesktopDownloads();
  }
}
