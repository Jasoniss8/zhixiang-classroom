'use strict';

const {app, BrowserWindow, Menu, protocol, session, shell, ipcMain, dialog} = require('electron');
const path = require('node:path');
const {APP_URL, isAppURL, isReleaseDownload, createUpdateService} = require('./update-service.cjs');
const release = require('./release.json');
const EXTERNAL_HOSTS = new Set(['openstax.org', 'gml.noaa.gov', 'www.hko.gov.hk', 'zhixiang-classroom.pages.dev']);
let mainWindow = null, updater = null, updateTask = null;

protocol.registerSchemesAsPrivileged([
  {scheme: 'zhixiang', privileges: {standard: true, secure: true, supportFetchAPI: true}},
]);

function openReference(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        (EXTERNAL_HOSTS.has(url.hostname) || isReleaseDownload(raw))) {
      void shell.openExternal(url.href).catch(() => {});
    }
  } catch { /* Do not navigate the application to malformed destinations. */ }
}
function nativeMessage(options) {
  return mainWindow && !mainWindow.isDestroyed()
    ? dialog.showMessageBox(mainWindow, options) : dialog.showMessageBox(options);
}
async function performUpdateCheck() {
  try {
    const result = await updater.check();
    if (result.status === 'up-to-date') {
      const message = `当前 ${result.version} 已是可用的最新版本。`;
      await nativeMessage({type: 'info', title: '检查更新', message, buttons: ['知道了']});
      return {status: 'up-to-date', message, version: result.version};
    }
    if (result.status === 'shell-required') {
      const message = `版本 ${result.version} 需要更新桌面程序。`;
      const choice = await nativeMessage({type: 'info', title: '检查更新', message,
        detail: `${result.manifest.notes.join('\n')}\n\n将用系统浏览器打开知象 GitHub 发布包。请解压完整文件夹；收藏与课堂仍使用本机原有数据。`,
        buttons: ['下载完整安装包', '稍后'], defaultId: 0, cancelId: 1, noLink: true});
      if (choice.response === 0) openReference(result.manifest.downloads.windows.url);
      return {status: choice.response === 0 ? 'shell-required' : 'cancelled', message, version: result.version};
    }
    const choice = await nativeMessage({type: 'info', title: '发现更新', message: `发现版本 ${result.version}。`,
      detail: `${result.manifest.notes.join('\n')}\n\n下载并校验后将刷新页面。请先保存当前课堂参数；未保存的动画进度和板书不会保留。收藏与已保存课堂不受影响。`,
      buttons: ['下载并更新', '稍后'], defaultId: 0, cancelId: 1, noLink: true});
    if (choice.response !== 0) return {status: 'cancelled', message: '已取消更新，继续使用当前版本。', version: updater.info().version};
    const installed = await updater.install(result.manifest);
    await nativeMessage({type: 'info', title: '更新完成', message: `已更新到 ${installed.version}。`, detail: '关闭提示后刷新模型页面。', buttons: ['打开新版本']});
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reloadIgnoringCache();
    }, 100);
    return {status: 'updated', message: `已更新到 ${installed.version}。`, version: installed.version};
  } catch {
    const message = '无法完成检查或更新。请确认网络连接后重试；当前版本与课堂配置已保留。';
    await nativeMessage({type: 'error', title: '检查更新', message, buttons: ['知道了']});
    return {status: 'error', message, version: updater.info().version};
  }
}
function checkForUpdates() {
  if (updateTask) return updateTask;
  updateTask = performUpdateCheck().finally(() => { updateTask = null; });
  return updateTask;
}
function trustedSender(event) {
  return mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents &&
    event.senderFrame && event.senderFrame === event.sender.mainFrame && isAppURL(event.senderFrame.url);
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1220, height: 820, minWidth: 760, minHeight: 580,
    title: '知象 · 教学模型', backgroundColor: '#f8faf7', icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  mainWindow = win;
  win.webContents.setWindowOpenHandler(({url}) => { openReference(url); return {action: 'deny'}; });
  win.webContents.on('will-navigate', (event, details) => {
    if (isAppURL(details.url)) return;
    event.preventDefault(); openReference(details.url);
  });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.on('closed', () => { if (mainWindow === win) mainWindow = null; });
  void win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('cn.zhixiang.classroom');
  updater = createUpdateService({userData: app.getPath('userData'), builtinFile: path.join(__dirname, 'app.html'), release});
  protocol.handle('zhixiang', request => {
    if (!isAppURL(request.url)) return new Response('Not found', {status: 404});
    if (request.method !== 'GET') return new Response('Method not allowed', {status: 405});
    return new Response(updater.readPage(), {
      headers: {
        'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'",
      },
    });
  });
  for (const [channel, handler] of [['zhixiang:get-info', () => updater.info()], ['zhixiang:check-updates', checkForUpdates]]) {
    ipcMain.handle(channel, (event, ...args) => {
      if (!trustedSender(event) || args.length !== 0) throw new Error('不允许的桌面请求。');
      return handler();
    });
  }
  // Renderer pages stay offline. Only the main-process updater can request the
  // fixed publisher, and only after an explicit menu or bridge invocation.
  session.defaultSession.webRequest.onBeforeRequest(
    {urls: ['http://*/*', 'https://*/*']}, (_details, callback) => callback({cancel: true}),
  );
  session.defaultSession.on('will-download', (_event, item) => item.setSaveDialogOptions({defaultPath: item.getFilename()}));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label: '文件', submenu: [{role: 'quit', label: '退出知象'}]},
    {label: '编辑', submenu: [
      {role: 'undo', label: '撤销'}, {role: 'redo', label: '重做'}, {type: 'separator'},
      {role: 'cut', label: '剪切'}, {role: 'copy', label: '复制'}, {role: 'paste', label: '粘贴'}, {role: 'selectAll', label: '全选'},
    ]},
    {label: '视图', submenu: [
      {role: 'resetZoom', label: '实际大小'}, {role: 'zoomIn', label: '放大'}, {role: 'zoomOut', label: '缩小'},
      {type: 'separator'}, {role: 'togglefullscreen', label: '全屏'},
    ]},
    {label: '帮助', submenu: [{label: '检查更新…', click: () => { void checkForUpdates(); }}]},
  ]));
  createWindow();
});
app.on('window-all-closed', () => app.quit());
