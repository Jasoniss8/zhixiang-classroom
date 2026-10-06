'use strict';

// No Electron dependency: the transport and filesystem can be injected in tests.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');

const APP_URL = 'zhixiang://app/index.html';
const SITE = 'https://zhixiang-classroom.pages.dev';
const MANIFEST_URL = SITE + '/desktop/latest.json';
const REPOSITORY_DOWNLOAD = 'https://github.com/Jasoniss8/zhixiang-classroom/releases/download/';
const MAX_PAGE_BYTES = 10 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 64 * 1024;
const TIMEOUT_MS = 15000;

function validVersion(value) {
  return typeof value === 'string' && /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(value);
}
function compareVersions(a, b) {
  if (!validVersion(a) || !validVersion(b)) throw new Error('版本号格式无效。');
  const aa = a.split('.').map(Number), bb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] > bb[i] ? 1 : -1;
  return 0;
}
function isAppURL(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'zhixiang:' && u.host === 'app' && !u.username && !u.password &&
      (u.pathname === '/' || u.pathname === '/index.html');
  } catch { return false; }
}
function isReleaseDownload(raw) {
  return typeof raw === 'string' && new RegExp('^https://github\\.com/Jasoniss8/zhixiang-classroom/releases/download/v(0|[1-9]\\d{0,5})\\.(0|[1-9]\\d{0,5})\\.(0|[1-9]\\d{0,5})/Zhixiang-(Windows-x64|macOS-arm64)\\.zip$').test(raw);
}
function validateManifest(input) {
  if (!input || input.schema !== 1 || !validVersion(input.version) || !validVersion(input.minimumShellVersion)) throw new Error('更新清单版本无效。');
  if (typeof input.publishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(input.publishedAt) || !Number.isFinite(Date.parse(input.publishedAt)) || new Date(input.publishedAt).toISOString().slice(0, 10) !== input.publishedAt.slice(0, 10)) throw new Error('更新发布日期无效。');
  if (!Array.isArray(input.notes) || input.notes.length > 12 || input.notes.some(n => typeof n !== 'string' || n.length > 240 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(n))) throw new Error('更新说明无效。');
  const page = input.page;
  if (!page || page.url !== `${SITE}/desktop/releases/${input.version}/standalone.html` || !Number.isSafeInteger(page.bytes) || page.bytes <= 0 || page.bytes > MAX_PAGE_BYTES || typeof page.sha256 !== 'string' || !/^[a-f\d]{64}$/i.test(page.sha256)) throw new Error('页面下载地址或校验信息无效。');
  const downloads = {};
  for (const platform of ['windows', 'macos']) {
    const item = input.downloads?.[platform];
    if (!item) continue;
    const filename = platform === 'windows' ? 'Zhixiang-Windows-x64.zip' : 'Zhixiang-macOS-arm64.zip';
    if (item.url !== `${REPOSITORY_DOWNLOAD}v${input.version}/${filename}`) throw new Error('完整安装包地址无效。');
    if (item.bytes !== undefined && (!Number.isSafeInteger(item.bytes) || item.bytes <= 0 || item.bytes > 2 * 1024 * 1024 * 1024)) throw new Error('完整安装包大小无效。');
    if (item.sha256 !== undefined && (typeof item.sha256 !== 'string' || !/^[a-f\d]{64}$/i.test(item.sha256))) throw new Error('完整安装包校验信息无效。');
    downloads[platform] = {...item};
  }
  return {schema: 1, version: input.version, minimumShellVersion: input.minimumShellVersion, publishedAt: input.publishedAt, notes: [...input.notes], page: {url: page.url, sha256: page.sha256.toLowerCase(), bytes: page.bytes}, downloads};
}
function permittedRequest(raw) {
  return raw === MANIFEST_URL || /^https:\/\/zhixiang-classroom\.pages\.dev\/desktop\/releases\/(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\/standalone\.html$/.test(raw);
}
function fetchHTTPS(raw, {maxBytes, timeoutMs = TIMEOUT_MS} = {}) {
  if (!permittedRequest(raw) || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > MAX_PAGE_BYTES) return Promise.reject(new Error('不允许的更新请求。'));
  return new Promise((resolve, reject) => {
    let done = false, timer;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(value);
    };
    const req = https.get(raw, {headers: {'user-agent': 'Zhixiang-Desktop-Update', accept: '*/*', 'accept-encoding': 'identity'}}, res => {
      // Never follow redirects: update files must stay on the fixed publisher.
      if (res.statusCode !== 200) { res.resume(); finish(new Error(`更新服务器返回 ${res.statusCode}。`)); req.destroy(); return; }
      const declared = res.headers['content-length'];
      if (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) { res.destroy(); finish(new Error('更新文件超过大小限制。')); return; }
      const chunks = []; let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > maxBytes) { finish(new Error('更新文件超过大小限制。')); res.destroy(); return; }
        chunks.push(chunk);
      });
      res.on('end', () => finish(null, Buffer.concat(chunks)));
      res.on('error', error => finish(error));
      res.on('aborted', () => finish(new Error('下载中断，请稍后重试。')));
    });
    timer = setTimeout(() => { finish(new Error('检查更新超时，请检查网络后重试。')); req.destroy(); }, timeoutMs);
    req.on('error', error => finish(error));
  });
}
function verifyPage(bytes, info) {
  if (!Buffer.isBuffer(bytes) || bytes.length !== info.bytes || bytes.length > MAX_PAGE_BYTES || crypto.createHash('sha256').update(bytes).digest('hex') !== info.sha256) throw new Error('下载校验失败，保留当前版本。');
  const prefix = bytes.subarray(0, 512).toString('utf8');
  if (!/^\s*(?:<!doctype html>|<html[\s>])/i.test(prefix)) throw new Error('更新内容不是有效页面，保留当前版本。');
  return bytes;
}
function createUpdateService({userData, builtinFile, release, fetch = fetchHTTPS, filesystem = fs}) {
  if (!validVersion(release.version) || !validVersion(release.shellVersion)) throw new Error('内置版本信息无效。');
  const root = path.join(userData, 'updates'), activeFile = path.join(root, 'active.json');
  let active = {version: release.version, file: builtinFile, builtin: true};
  let lastCheck = null;
  const pagePath = version => path.join(root, 'releases', version, 'standalone.html');
  function recover() {
    active = {version: release.version, file: builtinFile, builtin: true};
    try {
      const stat = filesystem.statSync(activeFile);
      if (stat.size > MAX_MANIFEST_BYTES) return info();
      const manifest = validateManifest(JSON.parse(filesystem.readFileSync(activeFile, 'utf8')));
      if (compareVersions(manifest.version, release.version) <= 0 || compareVersions(release.shellVersion, manifest.minimumShellVersion) < 0) return info();
      const file = pagePath(manifest.version), fileInfo = filesystem.statSync(file);
      if (fileInfo.size !== manifest.page.bytes) return info();
      verifyPage(filesystem.readFileSync(file), manifest.page);
      active = {version: manifest.version, file, builtin: false};
    } catch { /* Missing or damaged update: start the packaged page, offline. */ }
    return info();
  }
  function info() { return {platform: 'windows', version: active.version, shellVersion: release.shellVersion}; }
  function readPage() {
    try { return filesystem.readFileSync(active.file); }
    catch { recover(); return filesystem.readFileSync(active.file); }
  }
  async function check() {
    const bytes = await fetch(MANIFEST_URL, {maxBytes: MAX_MANIFEST_BYTES, timeoutMs: TIMEOUT_MS});
    if (!Buffer.isBuffer(bytes) || bytes.length > MAX_MANIFEST_BYTES) throw new Error('更新清单超过大小限制。');
    const manifest = validateManifest(JSON.parse(bytes.toString('utf8')));
    lastCheck = manifest;
    if (compareVersions(manifest.version, active.version) <= 0) return {status: 'up-to-date', version: active.version, manifest};
    if (compareVersions(release.shellVersion, manifest.minimumShellVersion) < 0) {
      if (!manifest.downloads.windows) throw new Error('更新需要新的桌面程序，但未提供完整下载地址。');
      return {status: 'shell-required', version: manifest.version, manifest};
    }
    return {status: 'available', version: manifest.version, manifest};
  }
  async function install(manifest) {
    // Only install a validated manifest obtained by this service's latest check.
    if (!manifest || manifest !== lastCheck) throw new Error('请先检查更新。');
    if (compareVersions(manifest.version, active.version) <= 0 || compareVersions(release.shellVersion, manifest.minimumShellVersion) < 0) throw new Error('此版本不能作为页面更新安装。');
    const bytes = verifyPage(await fetch(manifest.page.url, {maxBytes: MAX_PAGE_BYTES, timeoutMs: TIMEOUT_MS}), manifest.page);
    const final = pagePath(manifest.version), dir = path.dirname(final);
    filesystem.mkdirSync(dir, {recursive: true});
    const nonce = crypto.randomBytes(12).toString('hex'), temporary = final + '.' + nonce + '.tmp', stateTemp = activeFile + '.' + nonce + '.tmp';
    function writeDurably(file, value) {
      const fd = filesystem.openSync(file, 'wx', 0o600);
      try { filesystem.writeFileSync(fd, value); filesystem.fsyncSync(fd); }
      finally { filesystem.closeSync(fd); }
    }
    try {
      writeDurably(temporary, bytes);
      verifyPage(filesystem.readFileSync(temporary), manifest.page);
      // On Windows rename replaces the destination atomically; older version
      // directories remain untouched. Commit the pointer only after the page.
      filesystem.renameSync(temporary, final);
      writeDurably(stateTemp, JSON.stringify(manifest));
      filesystem.renameSync(stateTemp, activeFile);
      active = {version: manifest.version, file: final, builtin: false};
      return info();
    } finally {
      for (const file of [temporary, stateTemp]) try { filesystem.unlinkSync(file); } catch {}
    }
  }
  recover(); // Local files only; startup never checks the network.
  return Object.freeze({info, check, install, readPage, recover});
}
module.exports = {APP_URL, MANIFEST_URL, MAX_PAGE_BYTES, MAX_MANIFEST_BYTES, TIMEOUT_MS, validVersion, compareVersions, isAppURL, isReleaseDownload, validateManifest, fetchHTTPS, verifyPage, createUpdateService};
