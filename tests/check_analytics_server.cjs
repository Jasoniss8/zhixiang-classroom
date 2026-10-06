/* Analytics Pages Functions: validation, privacy, login, sessions and statistics. */
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createD1 } = require('./fake-d1.cjs');
const results = [];
function check(name, passed, details) {
  results.push({ name, passed: Boolean(passed), details });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${passed ? '' : ' ' + JSON.stringify(details)}`);
}
const root = path.resolve(__dirname, '..');
const load = (file) => import(path.join(root, file));
const SITE = 'https://zhixiang-classroom.pages.dev';
function pbkdf2(password, iterations = 100000, salt = nodeCrypto.randomBytes(16)) {
  const hash = nodeCrypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2_sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function cryptoAndVisitors() {
  const { verifyPassword, safeEqual } = await load('server/crypto.js');
  const { dayKey, visitorHash, deviceOf } = await load('server/visitor.js');
  const stored = pbkdf2('correct horse');
  check('PBKDF2 正确密码通过（与 Node 实现一致）', await verifyPassword('correct horse', stored));
  check('PBKDF2 错误密码拒绝', !(await verifyPassword('correct hors', stored)));
  check('PBKDF2 格式错误拒绝', !(await verifyPassword('x', 'plain')) && !(await verifyPassword('x', 'pbkdf2_sha256$10$AA==$AA==')) && !(await verifyPassword('x', undefined)));
  check('safeEqual 区分长度与内容', safeEqual('abc', 'abc') && !safeEqual('abc', 'abd') && !safeEqual('abc', 'ab'));
  const before = Date.UTC(2026, 9, 6, 15, 59), after = Date.UTC(2026, 9, 6, 16, 1);
  check('按上海时间切换日期', dayKey(before) === '2026-10-06' && dayKey(after) === '2026-10-07', [dayKey(before), dayKey(after)]);
  const db = createD1();
  const req = (ip, ua = 'UA') => new Request(SITE + '/api/event', { headers: { 'CF-Connecting-IP': ip, 'User-Agent': ua } });
  const a1 = await visitorHash(db, req('1.2.3.4'), before), a2 = await visitorHash(db, req('1.2.3.4'), before + 1000);
  const b = await visitorHash(db, req('5.6.7.8'), before);
  const next = await visitorHash(db, req('1.2.3.4'), after + 86400000);
  check('同日同 IP+UA 访客哈希相同', a1 === a2 && /^[0-9a-f]{16}$/.test(a1), a1);
  check('不同 IP 访客哈希不同', a1 !== b);
  check('次日访客哈希变化', next !== a1);
  const salts = (await db.prepare('SELECT day FROM salts').all()).results.map((r) => r.day);
  check('旧日盐已删除，只保留当天', salts.length === 1 && salts[0] === '2026-10-08', salts);
  check('设备分类', deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)') === 'mobile' && deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0)') === 'tablet' && deviceOf('Mozilla/5.0 (Linux; Android 14; SM-X710)') === 'tablet' && deviceOf('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile') === 'mobile' && deviceOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130') === 'desktop');
}

async function events() {
  const { parseEvent } = await load('server/events.js');
  const { MODELS } = await load('server/models.js');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'models/manifest.json'), 'utf8'));
  check('server/models.js 与 manifest 一致且有中文名', JSON.stringify(MODELS.map((m) => m.id)) === JSON.stringify(manifest) && MODELS.every((m) => m.title && ['math', 'physics', 'geography'].includes(m.cat)));
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  check('view 合法并清理来源主机', eq(parseEvent({ type: 'view', page: 'home', ref: 'MP.Weixin.QQ.com' }), { type: 'view', key: 'home', extra: 'mp.weixin.qq.com' }));
  check('view 非法来源置空', parseEvent({ type: 'view', page: 'model', ref: 'evil.com/<script>' }).extra === null);
  check('view 未知页面拒绝', parseEvent({ type: 'view', page: 'admin' }) === null);
  check('model_open 合法', eq(parseEvent({ type: 'model_open', model: 'projectile', via: 'card' }), { type: 'model_open', key: 'projectile', extra: 'card' }));
  check('model_open 未知入口归为 other', parseEvent({ type: 'model_open', model: 'lens', via: 'x' }).extra === 'other');
  check('model_open 未知模型拒绝', parseEvent({ type: 'model_open', model: 'nope' }) === null);
  check('feature 白名单', parseEvent({ type: 'feature', name: 'present', model: 'lens' }).extra === 'lens' && parseEvent({ type: 'feature', name: 'rm -rf' }) === null);
  check('search 截断为 40 字并去控制字符', (() => { const r = parseEvent({ type: 'search', q: ' 抛物\u0007线'.repeat(30) }); return r && [...r.key].length === 40 && !/[\u0000-\u001f]/.test(r.key); })());
  check('search 过短拒绝', parseEvent({ type: 'search', q: '抛' }) === null && parseEvent({ type: 'search', q: 5 }) === null);
  check('未知类型与非对象拒绝', parseEvent({ type: 'x' }) === null && parseEvent(null) === null && parseEvent([]) === null);
}

function post(url, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request(SITE + url, { method: 'POST', body: text, headers: { Origin: SITE, 'Content-Type': 'application/json', 'CF-Connecting-IP': '9.9.9.9', 'User-Agent': 'Mozilla/5.0 (iPhone)', ...headers } });
}

async function eventEndpoint() {
  const { onRequestPost } = await load('functions/api/event.js');
  const env = { DB: createD1() };
  const call = (req) => onRequestPost({ request: req, env });
  const rows = async () => (await env.DB.prepare('SELECT * FROM events ORDER BY id').all()).results;
  check('跨来源上报 403', (await call(post('/api/event', { type: 'view', page: 'home' }, { Origin: 'https://evil.example' }))).status === 403);
  check('无 Origin 时用 Referer 判断', (await call(post('/api/event', { type: 'view', page: 'home' }, { Origin: '', Referer: SITE + '/#model=lens' }))).status === 204);
  check('超过 1024 字节 413', (await call(post('/api/event', { type: 'search', q: 'x'.repeat(2000) }))).status === 413);
  check('非法 JSON 400', (await call(post('/api/event', '{bad'))).status === 400);
  check('非白名单事件 400', (await call(post('/api/event', { type: 'view', page: 'nope' }))).status === 400);
  const ok = await call(post('/api/event', { type: 'model_open', model: 'lens', via: 'card', params: { focal: 10 }, text: '题目原文' }));
  const all = await rows(), last = all[all.length - 1];
  check('合法事件 204 并写入一行', ok.status === 204 && last.type === 'model_open' && last.key === 'lens' && last.extra === 'card' && last.device === 'mobile' && /^\d{4}-\d{2}-\d{2}$/.test(last.day) && /^[0-9a-f]{16}$/.test(last.visitor), last);
  check('不保存 IP、UA、参数或题目文本', !JSON.stringify(all).includes('9.9.9.9') && !JSON.stringify(all).includes('iPhone') && !JSON.stringify(all).includes('题目原文') && !JSON.stringify(all).includes('focal'));
  check('响应禁止缓存与索引', ok.headers.get('Cache-Control') === 'no-store' && ok.headers.get('X-Robots-Tag') === 'noindex');
  for (let i = 0; i < 70; i++) await call(post('/api/event', { type: 'view', page: 'home' }, { 'CF-Connecting-IP': '7.7.7.7' }));
  const flood = (await rows()).filter((r) => r.type === 'view' && r.key === 'home').length;
  check('同一访客每分钟最多记录 60 条', flood === 61, flood);
}

// Simulates Pages routing: /api/admin/_middleware.js then the route module.
async function adminApp(env) {
  const middleware = await load('functions/api/admin/_middleware.js');
  const routes = {};
  for (const name of ['login', 'logout', 'session', 'stats', 'export']) {
    const file = path.join(root, 'functions/api/admin', name + '.js');
    if (fs.existsSync(file)) routes['/api/admin/' + name] = await import(file);
  }
  return (request) => middleware.onRequest({ request, env, next: () => {
    const mod = routes[new URL(request.url).pathname];
    const handler = mod && (request.method === 'POST' ? mod.onRequestPost : mod.onRequestGet);
    return handler ? handler({ request, env }) : new Response(null, { status: 405 });
  } });
}
const cookieOf = (res) => (res.headers.get('Set-Cookie') || '').split(';')[0];
const get = (url, headers = {}) => new Request(SITE + url, { headers: { 'CF-Connecting-IP': '9.9.9.9', 'User-Agent': 'UA', ...headers } });

async function adminAuth() {
  const env = { DB: createD1(), ADMIN_PASSWORD_HASH: pbkdf2('long admin pass phrase'), SESSION_SECRET: 's'.repeat(48) };
  const app = await adminApp(env);
  const login = (password, headers) => app(post('/api/admin/login', { password }, headers));
  const ok = await login('long admin pass phrase');
  const setCookie = ok.headers.get('Set-Cookie') || '';
  check('正确密码登录 200 并设置会话 cookie', ok.status === 200 && /^zx_admin=\d{13}\.[0-9a-f]{64}; /.test(setCookie), setCookie);
  check('会话 cookie 属性安全', ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/api/admin', 'Max-Age=43200'].every((a) => setCookie.includes(a)), setCookie);
  const cookie = cookieOf(ok);
  check('携带会话可访问后台接口', (await app(get('/api/admin/logout', { Cookie: cookie }))).status === 405);
  check('session 接口报告登录状态', (await (await app(get('/api/admin/session', { Cookie: cookie }))).json()).signedIn === true && (await (await app(get('/api/admin/session'))).json()).signedIn === false);
  check('无会话访问 401', (await app(get('/api/admin/stats'))).status === 401);
  const tampered = cookie.replace(/.$/, (c) => (c === '0' ? '1' : '0'));
  check('篡改会话 401', (await app(get('/api/admin/stats', { Cookie: tampered }))).status === 401);
  const { createSession } = await load('server/session.js');
  const expired = (await createSession(env.SESSION_SECRET, Date.now() - 13 * 3600 * 1000)).split(';')[0];
  check('过期会话 401', (await app(get('/api/admin/stats', { Cookie: expired }))).status === 401);
  const otherKey = (await createSession('k'.repeat(48), Date.now())).split(';')[0];
  check('其他密钥签名的会话 401', (await app(get('/api/admin/stats', { Cookie: otherKey }))).status === 401);
  check('跨来源登录 403', (await login('long admin pass phrase', { Origin: 'https://evil.example' })).status === 403);
  const tries = [];
  for (let i = 0; i < 4; i++) { const r = await login('wrong', { 'CF-Connecting-IP': '4.4.4.4' }); tries.push([r.status, (await r.json()).remaining]); }
  check('错误密码 401 并返回剩余次数', JSON.stringify(tries) === JSON.stringify([[401, 4], [401, 3], [401, 2], [401, 1]]), tries);
  const fifth = await login('wrong', { 'CF-Connecting-IP': '4.4.4.4' }), fifthBody = await fifth.json();
  check('第 5 次错误锁定 15 分钟', fifth.status === 429 && fifthBody.retryAfter === 900, fifthBody);
  const during = await login('long admin pass phrase', { 'CF-Connecting-IP': '4.4.4.4' });
  check('锁定期间正确密码也被拒绝', during.status === 429 && (await during.json()).retryAfter > 0);
  check('锁定只影响该来源', (await login('long admin pass phrase', { 'CF-Connecting-IP': '5.5.5.5' })).status === 200);
  await login('wrong', { 'CF-Connecting-IP': '6.6.6.6' });
  await login('long admin pass phrase', { 'CF-Connecting-IP': '6.6.6.6' });
  check('登录成功清除失败记录', !(await env.DB.prepare('SELECT * FROM login_attempts WHERE fails > 0').all()).results.length);
  check('空密码或非字符串按错误处理', (await app(post('/api/admin/login', { password: 123 }, { 'CF-Connecting-IP': '3.3.3.3' }))).status === 401);
  const out = await app(post('/api/admin/logout', {}, { Cookie: cookie }));
  check('退出清除 cookie', out.status === 200 && /^zx_admin=;/.test(out.headers.get('Set-Cookie')) && out.headers.get('Set-Cookie').includes('Max-Age=0'));
  const bare = await adminApp({ DB: env.DB });
  const missing = await bare(post('/api/admin/login', { password: 'x' }));
  const missingText = await missing.text();
  check('未配置密钥 500 且不泄露细节', missing.status === 500 && missingText === '{"error":"not_configured"}', missingText);
  const tool = execFileSync('python3', [path.join(root, 'tools/hash-password.py')], { input: 'tool pass phrase 1\ntool pass phrase 1\n', encoding: 'utf8' });
  const hashLine = tool.split('\n').find((l) => l.startsWith('ADMIN_PASSWORD_HASH=')).slice('ADMIN_PASSWORD_HASH='.length);
  const secretLine = tool.split('\n').find((l) => l.startsWith('SESSION_SECRET='));
  const { verifyPassword } = await load('server/crypto.js');
  check('hash-password.py 输出可被服务端验证', await verifyPassword('tool pass phrase 1', hashLine) && !(await verifyPassword('tool pass phrase', hashLine)) && secretLine.length > 60);
  let mismatch = false;
  try { execFileSync('python3', [path.join(root, 'tools/hash-password.py')], { input: 'a\nb\n', stdio: 'pipe' }); } catch { mismatch = true; }
  check('hash-password.py 两次不一致时拒绝', mismatch);
}

async function adminStats() {
  const { dayKey } = await load('server/visitor.js');
  const { rangeOf } = await load('server/stats.js');
  const env = { DB: createD1(), ADMIN_PASSWORD_HASH: pbkdf2('long admin pass phrase'), SESSION_SECRET: 's'.repeat(48) };
  const app = await adminApp(env);
  const cookie = cookieOf(await app(post('/api/admin/login', { password: 'long admin pass phrase' })));
  const now = Date.now(), DAY = 86400000;
  const insert = env.DB.raw.prepare('INSERT INTO events (ts, day, type, key, extra, visitor, device) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const add = (ago, type, key, extra, visitor, device = 'desktop') => insert.run(now - ago, dayKey(now - ago), type, key, extra, visitor, device);
  // Current 7 days: 4 views from 3 visitor-days, 3 opens, 1 present; previous 7 days: 1 view; plus a 200-day-old row.
  add(0, 'view', 'home', 'mp.weixin.qq.com', 'v1', 'mobile');
  add(0, 'view', 'model', null, 'v1', 'mobile');
  add(0, 'view', 'home', null, 'v2');
  add(DAY, 'view', 'home', 'github.com', 'v1', 'tablet');
  add(0, 'model_open', 'projectile', 'card', 'v1');
  add(0, 'model_open', 'projectile', 'link', 'v2');
  add(DAY, 'model_open', 'lens', 'card', 'v1');
  add(0, 'feature', 'present', 'projectile', 'v1');
  add(0, 'search', '=抛物线,"x"', null, 'v2');
  add(0, 'search', '=抛物线,"x"', null, 'v1');
  add(9 * DAY, 'view', 'home', null, 'v9');
  add(200 * DAY, 'view', 'home', null, 'old');
  const res = await app(get('/api/admin/stats?range=7d', { Cookie: cookie }));
  const s = await res.json();
  check('stats 需要登录', (await app(get('/api/admin/stats?range=7d'))).status === 401);
  check('stats 汇总数值', res.status === 200 && s.totals.views === 4 && s.totals.visitors === 3 && s.totals.opens === 3 && s.totals.present === 1, s.totals);
  check('stats 上一时段对比', s.totals.previous.views === 1 && s.totals.previous.visitors === 1, s.totals.previous);
  check('stats 趋势按日补零共 7 点', s.trend.length === 7 && s.trend[6].label === dayKey(now) && s.trend[6].views === 3 && s.trend[6].opens === 2 && s.trend[5].views === 1 && s.trend[0].views === 0, s.trend);
  check('stats 模型排行含全部模型并排序', s.models.length === 22 && s.models[0].id === 'projectile' && s.models[0].opens === 2 && s.models[0].title === '平抛与斜抛运动' && s.models[1].id === 'lens');
  check('stats 功能列出全部白名单', s.features.find((f) => f.name === 'present').count === 1 && s.features.length === 9);
  check('stats 来源与直接访问', s.referrers.length === 2 && s.direct === 2, { r: s.referrers, d: s.direct });
  check('stats 设备', s.devices.desktop === 1 && s.devices.mobile === 2 && s.devices.tablet === 1, s.devices);
  check('stats 搜索词', s.searches.length === 1 && s.searches[0].count === 2);
  check('stats 清理 180 天前数据', !(await env.DB.prepare("SELECT * FROM events WHERE visitor = 'old'").all()).results.length);
  const today = await (await app(get('/api/admin/stats?range=today', { Cookie: cookie }))).json();
  check('today 按 24 小时', today.trend.length === 24 && today.trend.reduce((a, p) => a + p.views, 0) === 3 && today.totals.previous.views === 1);
  const one = await (await app(get('/api/admin/stats?range=7d&model=projectile', { Cookie: cookie }))).json();
  check('单模型趋势', one.modelTrend.id === 'projectile' && one.modelTrend.points[6].opens === 2 && one.modelTrend.points[6].views === 0);
  check('未知模型不返回趋势', s.modelTrend === null && (await (await app(get('/api/admin/stats?range=7d&model=x', { Cookie: cookie }))).json()).modelTrend === null);
  check('非法范围 400', (await app(get('/api/admin/stats?range=1y', { Cookie: cookie }))).status === 400);
  const r30 = rangeOf('30d', now);
  check('30 天范围首尾与上一时段衔接', r30.days.length === 30 && r30.to === dayKey(now) && r30.previous.to === dayKey(now - 30 * DAY));
  const csv = await app(get('/api/admin/export?range=7d', { Cookie: cookie }));
  const bytes = new Uint8Array(await csv.arrayBuffer()), text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
  check('CSV 需要登录', (await app(get('/api/admin/export?range=7d'))).status === 401);
  check('CSV 表头、BOM 与下载文件名', csv.headers.get('Content-Type').startsWith('text/csv') && text.startsWith('﻿日期,类型,项目,次数\r\n') && /attachment; filename="zhixiang-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv"/.test(csv.headers.get('Content-Disposition')));
  check('CSV 汇总且转义公式和引号', text.includes(`,search,"'=抛物线,""x""",2`) && text.includes(',model_open,projectile,2') && !text.includes('v1'), text);
}

(async () => {
  await cryptoAndVisitors();
  await events();
  await eventEndpoint();
  await adminAuth();
  await adminStats();
})().catch((error) => check('服务端测试运行完成', false, String(error && error.stack || error))).finally(() => {
  const out = require('./runtime.cjs').outputDir;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'analytics-server-results.json'), JSON.stringify({ date: new Date().toISOString(), results }, null, 2));
  console.log(`RESULT ${results.filter((r) => r.passed).length}/${results.length}`);
  if (results.some((r) => !r.passed)) process.exitCode = 1;
});
