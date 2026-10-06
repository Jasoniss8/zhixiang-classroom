'use strict';
// Pure Node checks. No Electron launch, network, app data or Windows build.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), vm = require('node:vm'), https = require('node:https');
const {EventEmitter} = require('node:events');
const U = require('../windows/desktop/update-service.cjs');
const root = path.resolve(__dirname, '..'), out = process.env.TEST_OUTPUT_DIR || path.join(root, 'output/playwright');
const results = [], temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'zhixiang-update-test-'));
function check(name, passed, details) { results.push({name, passed: !!passed, details}); console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${passed ? '' : ' ' + JSON.stringify(details)}`); }
function throws(fn) { try {fn(); return false;} catch {return true;} }
async function rejects(fn) {try {await fn(); return false;} catch {return true;} }
const page = Buffer.from('<!doctype html><html><body>离线教学版本</body></html>');
function manifest(version = '1.2.0', minimumShellVersion = '1.1.0', bytes = page) {
  return {schema: 1, version, minimumShellVersion, publishedAt: '2026-10-03', notes: ['更新模型。'],
    page: {url: `https://zhixiang-classroom.pages.dev/desktop/releases/${version}/standalone.html`, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')},
    downloads: {windows: {url: `https://github.com/Jasoniss8/zhixiang-classroom/releases/download/v${version}/Zhixiang-Windows-x64.zip`}}};
}
const release = {version: '1.1.0', shellVersion: '1.1.0'}, builtinFile = path.join(temporary, 'app.html');
fs.writeFileSync(builtinFile, '<!doctype html><html>内置版</html>');
let responseManifest = manifest(), responsePage = page, failNetwork = false, requests = [];
const fetch = async (url, options) => {
  requests.push({url, options});
  if (failNetwork) throw new Error('offline');
  return url === U.MANIFEST_URL ? Buffer.from(JSON.stringify(responseManifest)) : responsePage;
};
const userData = path.join(temporary, 'profile');
let update;
(async () => {
  for (const [a, b, result] of [['1.2.0', '1.1.9', 1], ['1.1.0', '1.1.0', 0], ['1.9.9', '2.0.0', -1], ['1.10.0', '1.2.0', 1]]) check(`版本逐段比较 ${a}/${b}`, U.compareVersions(a, b) === result);
  for (const version of ['../2', 'v1.0.0', '1.0.0-beta', '01.0.0', '1.0', '1.0.0\n', '9999999.0.0']) check('拒绝非法版本 ' + JSON.stringify(version), !U.validVersion(version));
  for (const url of [U.APP_URL, U.APP_URL + '#model=wave', 'zhixiang://app/']) check('稳定应用地址 ' + url, U.isAppURL(url));
  for (const url of ['file:///app.html', 'zhixiang://evil/index.html', 'zhixiang://user@app/index.html', 'zhixiang://app:9/index.html', 'zhixiang://app/../other.html']) check('拒绝伪装页面地址 ' + url, !U.isAppURL(url));
  check('允许固定仓库安装包', U.isReleaseDownload(manifest().downloads.windows.url));
  for (const url of ['https://github.com/attacker/zhixiang-classroom/releases/download/v1.2.0/Zhixiang-Windows-x64.zip', manifest().downloads.windows.url + '?next=evil', manifest().downloads.windows.url.replace('https:', 'http:')]) check('拒绝外来安装包地址', !U.isReleaseDownload(url));
  check('合法更新清单', U.validateManifest(manifest()).version === '1.2.0');
  for (const [label, change] of [
    ['清单版本', m => m.schema = 9], ['日期', m => m.publishedAt = '2026-02-30'], ['说明类型', m => m.notes = 'text'],
    ['跨域页面', m => m.page.url = 'https://example.com/app.html'], ['版本路径', m => m.page.url = m.page.url.replace('1.2.0', '1.3.0')],
    ['重定向查询', m => m.page.url += '?redirect=evil'], ['页面大小', m => m.page.bytes = U.MAX_PAGE_BYTES + 1],
    ['校验和', m => m.page.sha256 = '1234'], ['仓库', m => m.downloads.windows.url = m.downloads.windows.url.replace('Jasoniss8', 'other')],
  ]) {const m = manifest(); change(m); check('拒绝无效' + label, throws(() => U.validateManifest(m)));}
  update = U.createUpdateService({userData, builtinFile, release, fetch});
  check('启动只读本地，不联网', requests.length === 0 && update.info().version === '1.1.0');
  check('桥接信息无本地路径', JSON.stringify(update.info()) === JSON.stringify({platform: 'windows', version: '1.1.0', shellVersion: '1.1.0'}));
  check('内置页可离线读取', update.readPage().equals(fs.readFileSync(builtinFile)));
  for (const version of ['1.0.9', '1.1.0']) {responseManifest = manifest(version); check('旧版或相同版不更新 ' + version, (await update.check()).status === 'up-to-date');}
  responseManifest = manifest('1.2.0', '1.2.0');
  check('更高壳版本要求完整安装包', (await update.check()).status === 'shell-required');
  responseManifest = manifest('1.2.0', '1.2.0'); delete responseManifest.downloads.windows;
  check('缺少完整包时明确失败', await rejects(() => update.check()));
  responseManifest = manifest();
  const available = await update.check();
  check('发现新页面版本', available.status === 'available' && available.version === '1.2.0');
  check('只查固定 HTTPS 清单且有限时/限大小', requests.every(r => r.url === U.MANIFEST_URL && r.options.maxBytes === U.MAX_MANIFEST_BYTES && r.options.timeoutMs === U.TIMEOUT_MS));
  check('未检查或复制清单不得安装', await rejects(() => update.install({...available.manifest})));
  failNetwork = true;
  check('联网失败时保留内置版本', await rejects(() => update.check()) && update.info().version === '1.1.0');
  failNetwork = false;
  responsePage = Buffer.from('bad');
  check('下载大小错误拒绝安装', await rejects(() => update.install(available.manifest)) && update.info().version === '1.1.0');
  responsePage = Buffer.alloc(page.length, 32);
  check('相同大小的错误 SHA 拒绝安装', await rejects(() => update.install(available.manifest)) && update.info().version === '1.1.0');
  responsePage = page;
  check('页面包校验后成功安装', (await update.install(available.manifest)).version === '1.2.0');
  const firstPage = path.join(userData, 'updates/releases/1.2.0/standalone.html'), pointer = path.join(userData, 'updates/active.json');
  check('安装页与指针存在且内容正确', fs.readFileSync(firstPage).equals(page) && JSON.parse(fs.readFileSync(pointer)).version === '1.2.0');
  check('更新后壳版本不变', update.info().shellVersion === '1.1.0' && update.readPage().equals(page));
  check('仅页面下载有 10MB 限制', requests.at(-1).options.maxBytes === U.MAX_PAGE_BYTES && requests.at(-1).url === manifest().page.url);
  const beforeRestart = requests.length;
  update = U.createUpdateService({userData, builtinFile, release, fetch});
  check('重启恢复校验后的页面且不联网', update.info().version === '1.2.0' && requests.length === beforeRestart);
  responseManifest = manifest('1.3.0');
  const faultFS = new Proxy(fs, {get(target, key) {if (key === 'renameSync') return (from, to) => {if (to === pointer) throw new Error('disk full'); return target.renameSync(from, to);}; return target[key];}});
  const broken = U.createUpdateService({userData, builtinFile, release, fetch, filesystem: faultFS});
  const newer = await broken.check();
  check('提交状态失败不切换当前页', await rejects(() => broken.install(newer.manifest)) && broken.info().version === '1.2.0');
  check('原子指针失败保留上一版本与内容', JSON.parse(fs.readFileSync(pointer)).version === '1.2.0' && fs.readFileSync(firstPage).equals(page));
  check('失败删除临时文件', !fs.readdirSync(path.dirname(pointer)).some(n => n.endsWith('.tmp')) && !fs.readdirSync(path.join(userData, 'updates/releases/1.3.0')).some(n => n.endsWith('.tmp')));
  const second = await update.check(); await update.install(second.manifest);
  check('后续更新保留旧文件', update.info().version === '1.3.0' && fs.readFileSync(firstPage).equals(page));
  const currentPage = path.join(userData, 'updates/releases/1.3.0/standalone.html'); fs.writeFileSync(currentPage, 'broken');
  check('启动发现损坏更新回退内置', U.createUpdateService({userData, builtinFile, release, fetch}).info().version === '1.1.0');
  fs.writeFileSync(pointer, '{invalid');
  check('状态 JSON 损坏回退内置', U.createUpdateService({userData, builtinFile, release, fetch}).readPage().equals(fs.readFileSync(builtinFile)));
  const hostile = manifest('../evil'); fs.writeFileSync(pointer, JSON.stringify(hostile));
  check('状态路径注入被拒绝并回退', U.createUpdateService({userData, builtinFile, release, fetch}).info().version === '1.1.0');
  check('非 HTML 即使校验正确也拒绝', throws(() => {const data = Buffer.from('{"not":"html"}'); U.verifyPage(data, manifest('1.4.0', '1.1.0', data).page);}));
  check('HTTPS 传输拒绝任意地址', await rejects(() => U.fetchHTTPS('https://example.com/', {maxBytes: 1024})));
  const originalGet = https.get;
  try {
    function mockTransport(mode) {
      https.get = (_url, _options, callback) => {
        const request = new EventEmitter(); request.destroy = () => {};
        if (mode === 'timeout') return request;
        queueMicrotask(() => {
          const response = new EventEmitter(); response.statusCode = mode === 'redirect' ? 302 : 200; response.headers = {};
          response.resume = response.destroy = () => {};
          callback(response);
          if (mode === 'large') response.emit('data', Buffer.alloc(2048));
          else if (mode === 'abort') response.emit('aborted');
          else {response.emit('data', Buffer.from('{}')); response.emit('end');}
        });
        return request;
      };
    }
    for (const mode of ['redirect', 'large', 'abort', 'timeout']) {mockTransport(mode); check('HTTPS 实际策略拒绝 ' + mode, await rejects(() => U.fetchHTTPS(U.MANIFEST_URL, {maxBytes: 1024, timeoutMs: 10})));}
    mockTransport('success'); check('HTTPS 有界下载返回 Buffer', (await U.fetchHTTPS(U.MANIFEST_URL, {maxBytes: 1024})).toString() === '{}');
  } finally {https.get = originalGet;}
  const main = fs.readFileSync(path.join(root, 'windows/desktop/main.cjs'), 'utf8'), preload = fs.readFileSync(path.join(root, 'windows/desktop/preload.cjs'), 'utf8');
  check('应用 origin 保持 zhixiang://app/index.html', U.APP_URL === 'zhixiang://app/index.html' && main.includes('win.loadURL(APP_URL)') && !main.includes('setPath('));
  check('壳保留隔离/沙箱且固定 preload', main.includes('nodeIntegration: false, contextIsolation: true, sandbox: true') && main.includes("preload: path.join(__dirname, 'preload.cjs')"));
  check('IPC 验证主 frame 与当前窗口且不接受参数', main.includes('event.senderFrame === event.sender.mainFrame') && main.includes('event.sender === mainWindow.webContents') && main.includes('args.length !== 0'));
  let exposed, invoked = [];
  const context = {require: name => {if (name !== 'electron') throw Error('require'); return {contextBridge: {exposeInMainWorld: (name, api) => exposed = {name, api}}, ipcRenderer: {invoke: (...args) => {invoked.push(args); return Promise.resolve({status: 'ok'});}}};}, process: {isMainFrame: true}, location: {protocol: 'zhixiang:', host: 'app', pathname: '/index.html'}};
  vm.runInNewContext(preload, context);
  await exposed.api.getInfo('ignored'); await exposed.api.checkForUpdates('https://evil/');
  check('预加载桥仅两项固定无参数 IPC', exposed.name === 'zhixiangDesktop' && JSON.stringify(Object.keys(exposed.api).sort()) === JSON.stringify(['checkForUpdates', 'getInfo']) && JSON.stringify(invoked) === JSON.stringify([['zhixiang:get-info'], ['zhixiang:check-updates']]));
  for (const [label, changed] of [['子 frame', {process: {isMainFrame: false}}], ['外来 origin', {location: {protocol: 'https:', host: 'evil', pathname: '/index.html'}}]]) {exposed = null; vm.runInNewContext(preload, {...context, ...changed}); check(label + ' 无桌面 bridge', exposed === null);}
  check('构建复制统一版本信息和更新模块', fs.readFileSync(path.join(root, 'windows/build.py'), 'utf8').includes("package['version'] = release['shellVersion']") && fs.readFileSync(path.join(root, 'windows/build.py'), 'utf8').includes("'preload.cjs', 'update-service.cjs'"));
})().catch(e => check('更新服务检查未完成', false, e.stack)).finally(() => {
  fs.rmSync(temporary, {recursive: true, force: true}); fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, 'desktop-update-results.json'), JSON.stringify({date: new Date().toISOString(), results, limitations: 'Pure Node tests; Electron/Windows GUI and live publisher not exercised.'}, null, 2));
  console.log(`RESULT ${results.filter(r => r.passed).length}/${results.length}`);
  if (results.some(r => !r.passed)) process.exitCode = 1;
});
