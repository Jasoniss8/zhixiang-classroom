'use strict';
/* Real Electron main/preload/renderer smoke test on macOS. Publisher responses
   and native confirmation dialogs are stubbed; all app storage is temporary. */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {_electron} = require('playwright');
const root = path.resolve(__dirname, '..');
const executablePath = process.env.ELECTRON_EXECUTABLE_PATH || path.join(root, 'windows/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const out = process.env.TEST_OUTPUT_DIR || path.join(root, 'output/playwright');
const release = JSON.parse(fs.readFileSync(path.join(root, 'desktop/release.json')));
const baseVersion = release.version;
const nextParts = baseVersion.split('.').map(Number);
const nextVersion = [nextParts[0], nextParts[1], nextParts[2]+1].join('.');
const badVersion = [nextParts[0], nextParts[1], nextParts[2]+2].join('.');
const results = [], errors = [], requests = [];
let electron, page, temporary;
function check(name, passed, details) { results.push({name, passed: !!passed, details}); console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${passed ? '' : ' ' + JSON.stringify(details)}`); }
async function launch(stage) {
  electron = await _electron.launch({executablePath, args: [path.join(stage, 'bootstrap.cjs')], timeout: 45000});
  page = await electron.firstWindow();
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  await page.waitForFunction(() => window.zhixiangDesktop && document.querySelector('#modelGrid'), {timeout: 20000});
  return page;
}
async function info() { return page.evaluate(() => window.zhixiangDesktop.getInfo()); }
async function showUpdates() {
  await page.locator('[data-nav="downloads"]').first().click();
  await page.locator('#checkDesktopUpdates').waitFor();
}
(async () => {
  if (process.platform !== 'darwin' && !process.env.ELECTRON_EXECUTABLE_PATH) throw new Error('此烟雾脚本默认使用已安装的 macOS Electron；其他平台请设置 ELECTRON_EXECUTABLE_PATH。');
  if (!fs.existsSync(executablePath)) throw new Error('缺少 Electron 运行程序；请先安装 windows/ 的开发依赖。');
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'zhixiang-electron-smoke-'));
  const stage = path.join(temporary, 'stage'), profile = path.join(temporary, 'profile');
  fs.mkdirSync(stage); fs.mkdirSync(profile); fs.mkdirSync(path.join(profile, 'session')); fs.mkdirSync(out, {recursive: true});
  for (const name of ['main.cjs', 'preload.cjs', 'update-service.cjs', 'package.json', 'icon.png']) fs.copyFileSync(path.join(root, 'windows/desktop', name), path.join(stage, name));
  fs.copyFileSync(path.join(root, 'standalone.html'), path.join(stage, 'app.html'));
  fs.copyFileSync(path.join(root, 'desktop/release.json'), path.join(stage, 'release.json'));
  const bootstrap = `
'use strict';
const {app, dialog} = require('electron');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), https = require('node:https');
const {EventEmitter} = require('node:events');
app.setPath('userData', ${JSON.stringify(profile)});
app.setPath('sessionData', ${JSON.stringify(path.join(profile, 'session'))});
global.__updateSmoke = {mode:'success', calls:[], dialogs:[]};
const body = fs.readFileSync(path.join(__dirname, 'app.html'));
https.get = (url, options, callback) => {
  const state = global.__updateSmoke;
  state.calls.push(String(url));
  const req = new EventEmitter(); req.destroy = () => {};
  queueMicrotask(() => {
    const version = state.mode === 'badSha' ? ${JSON.stringify(badVersion)} : ${JSON.stringify(nextVersion)};
    const pageURL = 'https://zhixiang-classroom.pages.dev/desktop/releases/'+version+'/standalone.html';
    const manifest = {schema:1,version,minimumShellVersion:'1.1.0',publishedAt:'2026-10-03',notes:['隔离烟雾检查。'],page:{url:pageURL,bytes:body.length,sha256:state.mode==='badSha'?'0'.repeat(64):crypto.createHash('sha256').update(body).digest('hex')},downloads:{windows:{url:'https://github.com/Jasoniss8/zhixiang-classroom/releases/download/v'+version+'/Zhixiang-Windows-x64.zip'}}};
    if (url !== 'https://zhixiang-classroom.pages.dev/desktop/latest.json' && url !== pageURL) {req.emit('error',new Error('Unexpected network request'));return;}
    const value = url.endsWith('/latest.json') ? Buffer.from(JSON.stringify(manifest)) : body;
    const response = new EventEmitter(); response.statusCode=200; response.headers={'content-length':String(value.length)};
    response.resume = response.destroy = () => {};
    callback(response); response.emit('data', value); response.emit('end');
  });
  return req;
};
dialog.showMessageBox = async (...args) => { const options=args.at(-1); global.__updateSmoke.dialogs.push({title:options.title,message:options.message,buttons:options.buttons}); return {response:0,checkboxChecked:false}; };
require('./main.cjs');
`;
  fs.writeFileSync(path.join(stage, 'bootstrap.cjs'), bootstrap);
  await launch(stage);
  check('真实 Electron preload IPC 返回版本', JSON.stringify(await info()) === JSON.stringify({platform:'windows', version:baseVersion, shellVersion:release.shellVersion}), await info());
  check('真实 Electron 启动完整 28 模型', await page.evaluate(() => MODELS.length === 28 && document.querySelectorAll('.model-card').length === 28));
  check('启动不访问更新服务', await electron.evaluate(() => global.__updateSmoke.calls.length === 0));
  check('使用独立临时 userData', await electron.evaluate(({app}, expected) => app.getPath('userData') === expected, profile));
  check('真实协议 origin 和页面路径', page.url() === 'zhixiang://app/index.html#view=all' || await page.evaluate(() => location.protocol==='zhixiang:' && location.host==='app' && location.pathname==='/index.html'));
  await page.evaluate(() => openModel('wave'));
  await page.locator('[data-action="save"]').click();
  await page.locator('#classTitle').fill('Electron 隔离课堂');
  await page.locator('[data-action="confirm-save"]').click();
  const classroom = await page.evaluate(() => localStorage.getItem('zhixiang-lab-v1'));
  check('真实 UI 保存课堂', JSON.parse(classroom).classes.some(c => c.title==='Electron 隔离课堂' && c.model==='wave'));
  await showUpdates();
  check('CSP 下版本页面与检查按钮正常', (await page.locator('#desktopCurrentVersion').textContent()).includes(baseVersion) && await page.locator('#checkDesktopUpdates').isEnabled());
  check('打开版本页仍未主动联网', await electron.evaluate(() => global.__updateSmoke.calls.length === 0));
  const navigated = page.waitForEvent('domcontentloaded');
  await page.locator('#checkDesktopUpdates').click();
  await navigated;
  await page.waitForFunction(async expected => (await window.zhixiangDesktop.getInfo()).version === expected, nextVersion);
  check('真实按钮经主进程下载并更新到下一补丁版本', (await info()).version === nextVersion);
  check('实际检查仅清单和页面两次请求', await electron.evaluate((_electron, version) => JSON.stringify(global.__updateSmoke.calls)===JSON.stringify(['https://zhixiang-classroom.pages.dev/desktop/latest.json','https://zhixiang-classroom.pages.dev/desktop/releases/'+version+'/standalone.html']),nextVersion));
  check('原生确认选项包含下载并更新', await electron.evaluate(() => global.__updateSmoke.dialogs.some(d=>d.buttons.includes('下载并更新'))));
  check('更新后 origin 保持不变', await page.evaluate(() => location.protocol==='zhixiang:' && location.host==='app' && location.pathname==='/index.html'));
  check('刷新后课堂存储逐字一致', await page.evaluate(value => localStorage.getItem('zhixiang-lab-v1')===value,classroom));
  check('更新后的页面和 bridge 均可用', await page.evaluate(() => MODELS.length=== 28 && !!document.querySelector('#checkDesktopUpdates')));
  await page.screenshot({path:path.join(out,'electron-update-smoke.png'),fullPage:true});
  await electron.evaluate(() => {global.__updateSmoke.mode='badSha';});
  await page.locator('#checkDesktopUpdates').click();
  await page.waitForFunction(() => document.querySelector('#desktopUpdateStatus')?.textContent.includes('无法完成'));
  check('SHA 失败保留已安装版本', (await info()).version === nextVersion);
  check('下载失败仍保留课堂', await page.evaluate(value => localStorage.getItem('zhixiang-lab-v1')===value,classroom));
  check('失败未产生新版本状态', JSON.parse(fs.readFileSync(path.join(profile,'updates/active.json'))).version===nextVersion);
  await electron.close(); electron=null;
  await launch(stage);
  check('重启离线直接采用已验证缓存', (await info()).version===nextVersion && await electron.evaluate(() => global.__updateSmoke.calls.length===0));
  check('进程重启后课堂配置仍存在', await page.evaluate(value=>localStorage.getItem('zhixiang-lab-v1')===value,classroom));
  check('新进程依旧 28 模型', await page.evaluate(()=>MODELS.length=== 28));
  check('更新与重启页面无脚本异常',errors.length===0,errors);
  check('renderer 无 HTTP 请求',requests.length===0,requests);
})().catch(error=>check('Electron 烟雾检查未完成',false,error.stack)).finally(async()=>{
  if(electron)await electron.close().catch(()=>{});
  if(temporary)fs.rmSync(temporary,{recursive:true,force:true});
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'electron-update-smoke-results.json'),JSON.stringify({date:new Date().toISOString(),platform:process.platform,results,errors,requests,limitations:'Actual Electron main/preload/renderer on macOS, not Windows hardware. HTTPS publisher and native confirmation choices were stubbed. Temporary userData only.'},null,2));
  console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);
  if(results.some(r=>!r.passed))process.exitCode=1;
});
