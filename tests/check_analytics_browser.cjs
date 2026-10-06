/* Website reporting (opt-in host, payload privacy, DNT) and the admin page against the real Functions. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('./runtime.cjs').loadPlaywright();
const { baseURL, outputDir: out } = require('./runtime.cjs');
const { createServer, DEV_PASSWORD } = require('./admin-dev-server.cjs');
fs.mkdirSync(out, { recursive: true });
const results = [], errors = [];
let browser, admin;
const check = (name, passed, details) => {
  results.push({ name, passed: !!passed, details });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${passed ? '' : ' ' + JSON.stringify(details)}`);
};
const launch = () => chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });

async function site() {
  // Default: a local host never reports.
  const plain = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const quiet = await plain.newPage(), sent = [];
  quiet.on('request', (r) => { if (r.url().includes('/api/event') || r.method() === 'POST') sent.push(r.url()); });
  await quiet.goto(baseURL + '/index.html');
  await quiet.locator('[data-open=projectile]').click();
  await quiet.waitForTimeout(300);
  check('本地主机默认不上报', sent.length === 0, sent);
  await plain.close();

  // Opt-in test endpoint captures exactly what the website would send.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await context.addInitScript(() => { window.__ZHIXIANG_ANALYTICS_TEST__ = { endpoint: '/__analytics' }; });
  const events = [];
  await context.route('**/__analytics', async (route) => {
    events.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 204 });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const waitFor = async (predicate, label) => {
    for (let i = 0; i < 40 && !events.some(predicate); i++) await page.waitForTimeout(50);
    return events.some(predicate) || (console.log('missing', label, JSON.stringify(events)), false);
  };
  await page.goto(baseURL + '/index.html');
  check('首页上报 view home', await waitFor((e) => e.type === 'view' && e.page === 'home', 'home'));
  await page.locator('[data-filter=physics]').click();
  await page.waitForTimeout(200);
  check('筛选不重复计入浏览', events.filter((e) => e.type === 'view').length === 1, events);
  await page.locator('[data-open=projectile]').click();
  check('卡片打开模型带入口 card', await waitFor((e) => e.type === 'model_open' && e.model === 'projectile' && e.via === 'card', 'card'));
  check('模型页上报 view model', await waitFor((e) => e.type === 'view' && e.page === 'model', 'model view'));
  const download = page.waitForEvent('download');
  await page.locator('[data-action=screenshot]').click();
  await download;
  check('截图计入功能并带模型', await waitFor((e) => e.type === 'feature' && e.name === 'screenshot' && e.model === 'projectile', 'screenshot'));
  await page.locator('[data-action=ink]').click();
  await page.locator('[data-action=ink]').click();
  await page.waitForTimeout(150);
  check('板书只在开启时计入一次', events.filter((e) => e.name === 'ink').length === 1, events.filter((e) => e.name === 'ink'));
  await page.locator('[data-action=share]').click();
  check('导出参数计入功能', await waitFor((e) => e.type === 'feature' && e.name === 'export_params', 'share'));
  await page.keyboard.press('Escape');
  await page.goto(baseURL + '/index.html#model=lens&params=' + encodeURIComponent(JSON.stringify({ focal: 12 })));
  check('分享链接打开模型带入口 link', await waitFor((e) => e.type === 'model_open' && e.model === 'lens' && e.via === 'link', 'link'));
  await page.goto(baseURL + '/index.html');
  await page.locator('#searchInput').fill('抛物线');
  check('搜索停顿后上报一次', await waitFor((e) => e.type === 'search' && e.q === '抛物线', 'search'));
  await page.locator('#searchInput').fill('抛');
  await page.waitForTimeout(1700);
  check('单字搜索不上报', !events.some((e) => e.type === 'search' && e.q === '抛'));
  await page.locator('.nav-main [data-nav=questions]').click();
  const text = '凸透镜焦距10cm，物距30cm，求像距。';
  await page.locator('#questionText').fill(text);
  await page.locator('#questionForm').evaluate((form) => form.requestSubmit());
  check('做题提交计入功能', await waitFor((e) => e.type === 'feature' && e.name === 'question_submit', 'question'));
  await page.locator('#questionConfirm').check();
  await page.locator('#openQuestionModel').click();
  check('做题打开模型带入口 question', await waitFor((e) => e.type === 'model_open' && e.via === 'question', 'question open'));
  const payload = JSON.stringify(events);
  check('上报内容不含题目文本或参数值', !payload.includes('焦距') && !payload.includes('focal') && !payload.includes('objectDistance') && !payload.includes('"p"'), events);
  check('上报字段只来自白名单', events.every((e) => Object.keys(e).every((k) => ['type', 'page', 'ref', 'model', 'via', 'name', 'q'].includes(k))), events);
  await context.close();

  const dnt = await browser.newContext();
  await dnt.addInitScript(() => {
    window.__ZHIXIANG_ANALYTICS_TEST__ = { endpoint: '/__analytics' };
    Object.defineProperty(Navigator.prototype, 'doNotTrack', { get: () => '1' });
  });
  const blocked = [];
  await dnt.route('**/__analytics', (route) => { blocked.push(1); return route.fulfill({ status: 204 }); });
  const dntPage = await dnt.newPage();
  await dntPage.goto(baseURL + '/index.html');
  await dntPage.locator('[data-open=lens]').click();
  await dntPage.waitForTimeout(300);
  check('浏览器开启“请勿追踪”时不上报', blocked.length === 0);
  await dnt.close();
}

async function adminPage() {
  const { server, env } = await createServer();
  admin = server;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { dayKey } = await import(path.resolve(__dirname, '../server/visitor.js'));
  const insert = env.DB.raw.prepare('INSERT INTO events (ts, day, type, key, extra, visitor, device) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  for (let i = 0; i < 12; i++) insert.run(now - i * 1000, dayKey(now), 'view', 'home', i % 3 ? null : 'mp.weixin.qq.com', 'v' + (i % 5), i % 4 ? 'desktop' : 'mobile');
  for (let i = 0; i < 7; i++) insert.run(now - i * 1000, dayKey(now), 'model_open', i < 5 ? 'projectile' : 'lens', 'card', 'v1', 'desktop');
  insert.run(now, dayKey(now), 'feature', 'present', 'projectile', 'v1', 'desktop');
  insert.run(now, dayKey(now), 'search', '<img src=x onerror=alert(1)>', null, 'v1', 'desktop');

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage(), consoleErrors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/status of (401|429)/.test(m.text())) consoleErrors.push(m.text()); });
  const response = await page.goto(origin + '/admin/');
  check('后台页面带 CSP', (response.headers()['content-security-policy'] || '').includes("default-src 'self'"));
  await page.locator('#password').waitFor();
  check('未登录显示登录页', await page.locator('#login').isVisible() && !(await page.locator('#dashboard').isVisible()));
  await page.locator('#password').fill('wrong password');
  await page.locator('#loginButton').click();
  await page.locator('#loginMessage', { hasText: '还可尝试 4 次' }).waitFor();
  check('错误密码提示剩余次数', true);
  await page.locator('#password').fill(DEV_PASSWORD);
  await page.locator('#loginButton').click();
  await page.locator('#dashboard').waitFor();
  await page.locator('#kpiViews', { hasText: '12' }).waitFor();
  check('登录后显示真实汇总', await page.locator('#kpiOpens').innerText() === '7' && await page.locator('#kpiPresent').innerText() === '1');
  check('趋势图绘制 SVG 折线', await page.locator('#trendChart path.line').count() === 2);
  check('模型排行按次数排序', (await page.locator('#modelList li .name').first().innerText()) === '平抛与斜抛运动');
  check('搜索词按文本显示，不执行 HTML', await page.locator('#searchList span').first().innerText().then((t) => t.startsWith('<img')) && await page.locator('#searchList img').count() === 0);
  check('来源含直接访问和微信', await page.locator('#sourceList').innerText().then((t) => t.includes('直接访问') && t.includes('mp.weixin.qq.com')));
  const statsRequest = page.waitForRequest((r) => r.url().includes('/api/admin/stats?range=today'));
  await page.locator('[data-range=today]').click();
  await statsRequest;
  await page.locator('#updated', { hasText: '今天' }).waitFor();
  check('切换到今天按小时显示', await page.locator('#trendChart .axis', { hasText: ':00' }).count() > 0);
  await page.locator('#modelList [data-model=projectile]').click();
  await page.locator('#modelDrill:not([hidden])').waitFor();
  check('点击模型显示单模型趋势', (await page.locator('#drillTitle').innerText()).includes('平抛与斜抛运动'));
  await page.locator('[data-cat=geography]').click();
  check('学科筛选', (await page.locator('#modelList li').count()) === 2);
  check('CSV 链接跟随时间范围', (await page.locator('#exportCSV').getAttribute('href')) === '/api/admin/export?range=today');
  const csv = await page.evaluate(() => fetch('/api/admin/export?range=today').then((r) => r.text()));
  check('登录后可下载 CSV', csv.includes('日期,类型,项目,次数') && csv.includes('model_open,projectile,5'));
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(200);
  const columns = await page.evaluate(() => getComputedStyle(document.querySelector('.grid.two')).gridTemplateColumns.split(' ').length);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('375px 单列且无横向滚动', columns === 1 && !overflow, { columns, overflow });
  await page.screenshot({ path: path.join(out, 'admin-mobile.png'), fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  check('深色模式背景', await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(20, 26, 23)');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: path.join(out, 'admin-dashboard.png'), fullPage: true });
  await page.locator('#logout').click();
  await page.locator('#login').waitFor();
  check('退出后回到登录页且会话失效', !(await page.evaluate(() => fetch('/api/admin/session').then((r) => r.json()))).signedIn);
  // A successful login cleared earlier failures, so the fifth failure locks.
  for (let i = 0; i < 4; i++) {
    await page.locator('#password').fill('wrong ' + i);
    await page.locator('#loginButton').click();
    await page.locator('#loginMessage', { hasText: `还可尝试 ${4 - i} 次` }).waitFor();
  }
  await page.locator('#password').fill('wrong again');
  await page.locator('#loginButton').click();
  await page.locator('#loginMessage', { hasText: '已锁定' }).waitFor();
  check('连续输错后锁定并倒计时', await page.locator('#loginButton').isDisabled() && /\d+:\d{2}/.test(await page.locator('#loginMessage').innerText()));
  check('后台无脚本异常与控制台错误', consoleErrors.length === 0, consoleErrors);
  await context.close();
}

(async () => {
  browser = await launch();
  await site();
  await adminPage();
  check('浏览器无脚本异常', errors.length === 0, errors);
})()
  .catch((error) => check('分析浏览器检查完成', false, String(error && error.stack || error)))
  .finally(async () => {
    await browser?.close();
    admin?.close();
    fs.writeFileSync(path.join(out, 'analytics-browser-results.json'), JSON.stringify({ date: new Date().toISOString(), results, errors }, null, 2));
    console.log(`RESULT ${results.filter((r) => r.passed).length}/${results.length}`);
    if (results.some((r) => !r.passed)) process.exitCode = 1;
  });
