'use strict';
/*
 * Local stand-in for Cloudflare Pages: serves the site and admin/ statically and
 * routes /api/* to the real Functions with an in-memory D1 (node:sqlite).
 *
 *   node tests/admin-dev-server.cjs [port] [--seed]
 *
 * The local admin password is "local admin password" (development only).
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { createD1 } = require('./fake-d1.cjs');

const root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const DEV_PASSWORD = 'local admin password';

function devHash(password) {
  const salt = nodeCrypto.randomBytes(16);
  const hash = nodeCrypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return `pbkdf2_sha256$100000$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function seed(db) {
  const { dayKey } = await import(path.join(root, 'server/visitor.js'));
  const { MODELS } = await import(path.join(root, 'server/models.js'));
  const insert = db.raw.prepare('INSERT INTO events (ts, day, type, key, extra, visitor, device) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const features = ['present', 'save', 'screenshot', 'export_params', 'share', 'ink', 'question_submit', 'download_desktop'];
  const refs = [null, null, null, 'mp.weixin.qq.com', 'github.com', 'www.baidu.com'];
  const devices = ['desktop', 'desktop', 'desktop', 'mobile', 'tablet'];
  const words = ['抛物线', '截面', '透镜', '电磁感应', '单摆', '四季'];
  let rand = 7;
  const random = () => ((rand = (rand * 16807) % 2147483647) / 2147483647);
  const now = Date.now();
  for (let day = 0; day < 95; day++) {
    const base = 20 + Math.round(30 * Math.sin(day / 5) ** 2) + (day % 7 < 2 ? -10 : 8);
    for (let n = 0; n < base; n++) {
      const ts = now - day * 86400000 - Math.floor(random() * 86400000 * (day ? 1 : 0.4));
      const visitor = 'v' + Math.floor(random() * base * 0.7);
      const device = devices[Math.floor(random() * devices.length)];
      insert.run(ts, dayKey(ts), 'view', random() < 0.6 ? 'home' : 'model', refs[Math.floor(random() * refs.length)], visitor, device);
      if (random() < 0.7) {
        const m = MODELS[Math.floor(random() ** 2 * MODELS.length)];
        insert.run(ts, dayKey(ts), 'model_open', m.id, 'card', visitor, device);
      }
      if (random() < 0.2) insert.run(ts, dayKey(ts), 'feature', features[Math.floor(random() ** 1.5 * features.length)], null, visitor, device);
      if (random() < 0.06) insert.run(ts, dayKey(ts), 'search', words[Math.floor(random() * words.length)], null, visitor, device);
    }
  }
}

async function createServer({ seeded = false, env: overrides = {} } = {}) {
  const env = { DB: createD1(), ADMIN_PASSWORD_HASH: devHash(DEV_PASSWORD), SESSION_SECRET: nodeCrypto.randomBytes(32).toString('hex'), ...overrides };
  if (seeded) await seed(env.DB);
  const load = (file) => import(path.join(root, file));
  const middleware = await load('functions/api/admin/_middleware.js');
  const routes = {
    '/api/event': await load('functions/api/event.js'),
    '/api/admin/login': await load('functions/api/admin/login.js'),
    '/api/admin/logout': await load('functions/api/admin/logout.js'),
    '/api/admin/session': await load('functions/api/admin/session.js'),
    '/api/admin/stats': await load('functions/api/admin/stats.js'),
    '/api/admin/export': await load('functions/api/admin/export.js'),
  };
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname.startsWith('/api/')) {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
        headers.set('CF-Connecting-IP', req.socket.remoteAddress || '');
        const request = new Request(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
        const mod = routes[url.pathname];
        const handler = () => {
          const fn = mod && (req.method === 'POST' ? mod.onRequestPost : req.method === 'GET' ? mod.onRequestGet : null);
          return fn ? fn({ request, env }) : new Response(null, { status: 405 });
        };
        const response = url.pathname.startsWith('/api/admin/') ? await middleware.onRequest({ request, env, next: handler }) : await handler();
        const out = {};
        response.headers.forEach((v, k) => (out[k] = v));
        res.writeHead(response.status, out);
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      let file = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
      if (file === '' || file.endsWith('/')) file += 'index.html';
      const full = path.join(root, file);
      if (!full.startsWith(root + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
        res.writeHead(404).end('Not found');
        return;
      }
      const headers = { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' };
      if (file.startsWith('admin/')) headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
      res.writeHead(200, headers);
      fs.createReadStream(full).pipe(res);
    } catch (error) {
      res.writeHead(500).end(String(error && error.stack || error));
    }
  });
  return { server, env, DEV_PASSWORD };
}

module.exports = { createServer, DEV_PASSWORD };

if (require.main === module) {
  const port = Number(process.argv.find((a) => /^\d+$/.test(a)) || 8788);
  createServer({ seeded: process.argv.includes('--seed') }).then(({ server }) =>
    server.listen(port, '127.0.0.1', () => console.log(`后台本地预览：http://127.0.0.1:${port}/admin/  本地密码：${DEV_PASSWORD}`)),
  );
}
