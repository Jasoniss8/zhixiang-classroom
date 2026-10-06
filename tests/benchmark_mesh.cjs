/* Optional C4 measurement, not a pass/fail test and not part of run_all.
 * node tests/benchmark_mesh.cjs             current split-file app
 * node tests/benchmark_mesh.cjs --baseline  archived pre-maintenance app
 * Both require the normal local test server (TEST_BASE_URL overrides its URL).
 * Browser selection and missing-dependency messages come from runtime.cjs.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { baseURL, outputDir, loadPlaywright } = require('./runtime.cjs');
const { chromium } = loadPlaywright();
const baseline = process.argv.includes('--baseline');
const unknown = process.argv.slice(2).filter(arg => arg !== '--baseline');
if (unknown.length) {
  console.error('用法：node tests/benchmark_mesh.cjs [--baseline]');
  process.exit(2);
}
const mode = baseline ? 'baseline' : 'current';
const pagePath = baseline ? '/output/playwright/maintenance-baseline/index.html' : '/index.html';
const viewport = { width: 1440, height: 1000 };
const cpuSlowdown = 4, frames = 90, warmupFrames = 15;
const errors = [];
let browser;
(async () => {
  if (baseline && !fs.existsSync(path.resolve(__dirname, '../output/playwright/maintenance-baseline/index.html'))) {
    throw new Error('未找到修改前快照 output/playwright/maintenance-baseline/index.html；基线测量需要完整原始分文件页面。');
  }
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const response = await page.goto(baseURL + pagePath);
  if (!response?.ok()) throw new Error(`页面加载失败：${response?.status()} ${baseURL + pagePath}`);
  await page.waitForFunction(() => typeof drawStage === 'function' && typeof solidMesh === 'function');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
  const rows = [];
  for (const shape of ['cylinder', 'cone', 'sphere']) {
    for (const scale of [1, 1.8]) {
      const row = await page.evaluate(async ({ shape, scale, frames, warmupFrames }) => {
        openModel('solids', { ...modelById('solids').defaults, shape, scale, yaw: -35, pitch: 24 });
        state.running = state.geoSpin = state.geoFold = false;
        // Drain the one initial page draw before measuring our own rAF sequence.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const warmup = () => new Promise(resolve => requestAnimationFrame(() => {
          state.p.yaw += 1;
          drawStage();
          resolve();
        }));
        for (let i = 0; i < warmupFrames; i++) await warmup();
        state.p.yaw = -35;
        const durations = [], timestamps = [];
        for (let i = 0; i < frames; i++) {
          await new Promise(resolve => requestAnimationFrame(timestamp => {
            state.p.yaw += 1;
            const start = performance.now();
            drawStage();
            durations.push(performance.now() - start);
            timestamps.push(timestamp);
            resolve();
          }));
        }
        const sorted = [...durations].sort((a, b) => a - b);
        const intervals = timestamps.slice(1).map((value, i) => value - timestamps[i]);
        const canvas = document.querySelector('#simCanvas');
        const bounds = canvas.getBoundingClientRect();
        return {
          shape, scale, vertices: solidMesh(state.p).vertices.length,
          drawMs: durations.reduce((a, b) => a + b, 0) / durations.length,
          drawP95Ms: sorted[Math.ceil(sorted.length * .95) - 1],
          fps: (frames - 1) * 1000 / (timestamps.at(-1) - timestamps[0]),
          measuredFrames: durations.length,
          canvasCSS: [bounds.width, bounds.height],
          drawSamplesMs: durations,
          frameIntervalsMs: intervals,
        };
      }, { shape, scale, frames, warmupFrames });
      rows.push(row);
      console.log(`${mode} ${shape} ×${scale}: ${row.vertices} 顶点，${row.drawMs.toFixed(3)} ms / 绘制，${row.fps.toFixed(2)} FPS`);
    }
  }
  if (errors.length) throw new Error('测量期间页面异常：' + errors.join('; '));
  const result = {
    date: new Date().toISOString(), mode, url: baseURL + pagePath,
    browserVersion: browser.version(), platform: os.platform(), architecture: os.arch(),
    cpuModel: os.cpus()[0]?.model, cpuSlowdown, viewport: [viewport.width, viewport.height],
    deviceScaleFactor: 1, frames, warmupFrames,
    methodology: '每个案例预热15帧，在requestAnimationFrame回调中每帧转动1°并同步drawStage，测90帧绘制时间与相邻rAF间隔。关闭产品自动播放；CPU节流4倍。FPS受浏览器调度、屏幕刷新及主机负载影响，不能据此断言所有低性能设备的帧率。',
    rows,
  };
  const stamp = result.date.replace(/[:.]/g, '-');
  const target = path.join(outputDir, `mesh-performance-${mode}-${stamp}.json`);
  fs.writeFileSync(target, JSON.stringify(result, null, 2));
  console.log('测量记录：' + target);
})().catch(error => {
  console.error('性能测量未完成：' + error.message);
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
});
