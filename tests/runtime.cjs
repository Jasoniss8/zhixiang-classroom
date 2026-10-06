/* Shared test-only runtime. Application code has no npm dependency. */
const fs = require('node:fs');
const path = require('node:path');
const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const outputDir = process.env.TEST_OUTPUT_DIR || path.resolve(__dirname, '../output/playwright');
fs.mkdirSync(outputDir, {recursive: true});
function loadPlaywright() {
  let playwright;
  try { playwright = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'); }
  catch {
    console.error('未找到 Playwright。请运行 npm ci --prefix tests，再运行 npx --prefix tests playwright install chromium；也可设置 PLAYWRIGHT_MODULE_PATH。');
    process.exit(2);
  }
  const executable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || playwright.chromium.executablePath();
  if (!fs.existsSync(executable)) {
    console.error('找不到 Chromium。请运行 npx --prefix tests playwright install chromium，或设置 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH 为本机浏览器路径。');
    process.exit(2);
  }
  return playwright;
}
// Fullscreen layout flags change synchronously, but Chromium's native window
// restores asynchronously. Observe both before asking Playwright to resize it.
async function waitForPresentationExit(page, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  const session = await page.context().newCDPSession(page);
  let status = null;
  try {
    const {windowId} = await session.send('Browser.getWindowForTarget');
    while (true) {
      const dom = await page.evaluate(() => ({
        presenting: state.presenting,
        presentingClass: document.body.classList.contains('presenting'),
        fullscreenElement: document.fullscreenElement?.tagName || null,
      }));
      const {bounds} = await session.send('Browser.getWindowBounds', {windowId});
      status = {...dom, windowId, windowState: bounds.windowState};
      if (!dom.presenting && !dom.presentingClass && !dom.fullscreenElement && bounds.windowState === 'normal') return status;
      if (Date.now() >= deadline) throw new Error(`退出大屏后 ${timeoutMs}ms 内窗口未恢复正常：${JSON.stringify(status)}；页面 ${page.url()}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } finally {
    await session.detach();
  }
}
module.exports = {baseURL, outputDir, loadPlaywright, waitForPresentationExit};
if (require.main === module) { loadPlaywright(); console.log('Playwright 与浏览器已就绪。'); }
