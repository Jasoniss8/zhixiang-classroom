'use strict';
const {contextBridge, ipcRenderer} = require('electron');
// Sandboxed preload exposes two fixed requests, no paths, URLs or raw IPC.
if (process.isMainFrame && location.protocol === 'zhixiang:' && location.host === 'app' &&
    (location.pathname === '/' || location.pathname === '/index.html')) {
  contextBridge.exposeInMainWorld('zhixiangDesktop', Object.freeze({
    getInfo: () => ipcRenderer.invoke('zhixiang:get-info'),
    checkForUpdates: () => ipcRenderer.invoke('zhixiang:check-updates'),
  }));
}
