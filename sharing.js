"use strict";
const SHARE_HASH_LIMIT = 4096;
const PUBLIC_SHARE_BASE = "https://zhixiang-classroom.pages.dev/";
let shareTarget = null;
function shareBaseURL() {
  const local =
    !/^https?:$/.test(location.protocol) ||
    ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(location.hostname);
  const url = new URL(local ? PUBLIC_SHARE_BASE : location.href);
  url.hash = "";
  url.search = "";
  return url.href;
}
function encodeShareHash(model, params) {
  const m = modelById(model);
  if (!m) throw new Error("模型不存在。");
  const p = safeParams(m, params),
    delta = {};
  for (const key of Object.keys(m.defaults))
    if (p[key] !== m.defaults[key]) delta[key] = p[key];
  const bytes = new TextEncoder().encode(JSON.stringify(delta));
  const encoded = btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const hash = new URLSearchParams({ model, p: encoded }).toString();
  if (hash.length > SHARE_HASH_LIMIT)
    throw new Error("参数链接过长，请改用导出配置文件。");
  return hash;
}
function decodeShareParams(args) {
  let params = null;
  if (args.has("p")) {
    const encoded = args.get("p");
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error("无效编码");
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    params = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      ),
    );
  } else if (args.has("params")) params = JSON.parse(args.get("params"));
  if (params !== null && (typeof params !== "object" || Array.isArray(params)))
    throw new Error("参数应为对象");
  return params;
}
function makeShareLink(model, params, base = shareBaseURL()) {
  const url = new URL(base);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password)
    throw new Error("请填写 http 或 https 的知象页面网址。");
  url.hash = encodeShareHash(model, params);
  if (url.href.length > SHARE_HASH_LIMIT)
    throw new Error("链接超过 4096 字符，请导出配置文件。");
  return url.href;
}
function shareQR(link) {
  const matrix = ZhixiangQR.encode(link),
    n = matrix.length,
    size = n + 8;
  let path = "";
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x + 4} ${y + 4}h1v1h-1z`;
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="课堂参数分享二维码" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><path d="${path}" fill="black"/></svg>`;
}
function updateSharePreview() {
  const input = $("#shareURL"),
    error = $("#shareError"),
    qr = $("#shareQR");
  if (!input || !shareTarget) return false;
  qr.innerHTML = "";
  error.textContent = "";
  try {
    input.value = makeShareLink(
      shareTarget.model,
      shareTarget.params,
      $("#shareBase").value.trim(),
    );
    $("#copyShareButton").disabled = false;
    try {
      qr.innerHTML = shareQR(input.value);
    } catch (e) {
      error.textContent = e.message;
    }
    return true;
  } catch (e) {
    input.value = "";
    $("#copyShareButton").disabled = true;
    error.textContent = e.message;
    return false;
  }
}
async function showShareLink(
  model = state.model?.id,
  params = state.p,
  title = null,
  copy = false,
) {
  if (!modelById(model)) return;
  shareTarget = { model, params: safeParams(modelById(model), params) };
  openDialog(
    "分享课堂参数",
    `<p>${esc(title || modelById(model).title)}。链接仅包含模型与参数，不包含板书、收藏和个人课堂名称。</p><label for="shareBase">接收方可访问的知象页面网址</label><input id="shareBase" class="share-base" type="url" value="${esc(shareBaseURL())}"><p class="control-note">离线或本机预览使用已发布站点；接收方首次打开需要联网。参数留在 # 后，不上传服务器。</p><label for="shareURL">分享链接</label><textarea id="shareURL" readonly rows="3"></textarea><p id="shareError" role="status"></p><div id="shareQR" class="share-qr"></div><div class="dialog-actions"><button id="copyShareButton" class="button primary" data-share-copy>复制分享链接</button><button class="button secondary" data-action="close-dialog">关闭</button></div>`,
  );
  if (updateSharePreview() && copy)
    await copyText($("#shareURL").value, $("#shareURL"));
}
document.addEventListener("input", (e) => {
  if (e.target.id === "shareBase") updateSharePreview();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.classShare) {
    const c = store.classes.find((item) => item.id === b.dataset.classShare);
    if (c) showShareLink(c.model, c.p, c.title, true);
  }
  if (b.hasAttribute("data-share-copy") && updateSharePreview())
    copyText($("#shareURL").value, $("#shareURL"));
});
