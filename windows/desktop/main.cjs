'use strict';

const { app, BrowserWindow, Menu, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const APP_URL = 'zhixiang://app/index.html';
const APP_FILE = path.join(__dirname, 'app.html');
const EXTERNAL_HOSTS = new Set(['openstax.org', 'gml.noaa.gov']);

protocol.registerSchemesAsPrivileged([
  { scheme: 'zhixiang', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function isAppURL(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'zhixiang:' && url.hostname === 'app' &&
      (url.pathname === '/' || url.pathname === '/index.html');
  } catch {
    return false;
  }
}

function openReference(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:' && EXTERNAL_HOSTS.has(url.hostname)) {
      void shell.openExternal(url.href);
    }
  } catch {
    // Ignore malformed destinations rather than navigating the app away.
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1220,
    height: 820,
    minWidth: 760,
    minHeight: 580,
    title: '知象 · 教学模型',
    backgroundColor: '#f8faf7',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openReference(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, details) => {
    if (isAppURL(details.url)) return;
    event.preventDefault();
    openReference(details.url);
  });
  void win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('cn.zhixiang.classroom');

  protocol.handle('zhixiang', request => {
    if (!isAppURL(request.url)) return new Response('Not found', { status: 404 });
    return new Response(fs.readFileSync(APP_FILE), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  });

  // The app is self-contained. Only explicitly opened reference links use the system browser.
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (_details, callback) => callback({ cancel: true }),
  );
  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ defaultPath: item.getFilename() });
  });

  const menu = Menu.buildFromTemplate([
    { label: '文件', submenu: [{ role: 'quit', label: '退出知象' }] },
    { label: '编辑', submenu: [
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' },
      { role: 'selectAll', label: '全选' },
    ] },
    { label: '视图', submenu: [
      { role: 'resetZoom', label: '实际大小' },
      { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '全屏' },
    ] },
  ]);
  Menu.setApplicationMenu(menu);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
