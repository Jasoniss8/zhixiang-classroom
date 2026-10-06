# 网站访问统计与后台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Cloudflare Pages 上为知象网站加入匿名使用统计，以及只有站长能用密码登录的 `/admin/` 仪表盘。

**Architecture:** 前端 `analytics.js` 用 `sendBeacon` 上报到 Pages Function `/api/event`，写入 D1。`/api/admin/*` 由 `_middleware.js` 校验 HMAC 签名会话；密码为 PBKDF2 哈希，存于 Cloudflare Secret。后台为静态 `admin/` 页面，原生 JS 和手写 SVG。共享服务端逻辑放在 `server/`（不在 `functions/` 下，避免被当成路由），由 wrangler 打包。

**Tech Stack:** 原生 JS（ES 模块，Web Crypto）、Cloudflare Pages Functions、D1（SQLite）、Node 22 `node:sqlite` 做测试替身、Playwright。

规格：`docs/superpowers/specs/2026-10-06-admin-analytics-design.md`

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `schema.sql` | D1 建表 |
| `server/http.js` | `json()`、`empty()`、`sameOrigin(request)`、安全响应头 |
| `server/crypto.js` | `sha256Hex`、`hmacHex`、`safeEqual`、`verifyPassword`、base64 工具 |
| `server/visitor.js` | `dayKey(ts)`（Asia/Shanghai）、`dailySalt(db, day)`、`visitorHash(db, request, ts)`、`deviceOf(ua)` |
| `server/models.js` | 由 `build.py` 生成：`MODELS = [{id,title,cat}]` |
| `server/events.js` | `parseEvent(body)` → `{type,key,extra}` 或 `null`；白名单 |
| `server/session.js` | `createSession(secret, now)`、`readSession(request, secret, now)`、cookie 字符串 |
| `server/lockout.js` | `lockState(db, who, now)`、`recordFailure`、`clearFailures` |
| `server/stats.js` | `rangeOf(name, now)`、`collectStats(db, range)`、`exportCSV(db, range)`、`prune(db, now)` |
| `functions/api/event.js` | `onRequestPost` |
| `functions/api/admin/_middleware.js` | 校验来源 + 会话（`login` 除外） |
| `functions/api/admin/login.js`、`logout.js`、`stats.js`、`export.js` | 管理接口 |
| `admin/index.html`、`admin/admin.css`、`admin/admin.js` | 后台页面 |
| `analytics.js` | 前端上报 |
| `tools/hash-password.py` | 生成 `ADMIN_PASSWORD_HASH` |
| `tests/fake-d1.cjs` | 基于 `node:sqlite` 的 D1 接口替身（`prepare().bind().run/first/all`、`batch`） |
| `tests/check_analytics_server.cjs` | 服务端单元测试 |
| `tests/check_analytics_browser.cjs` | 前端上报与后台页面浏览器测试 |

修改：`app.js`（`openModel` 增加 `via` 参数、渲染时上报 view）、`build.py`（脚本列表与 `server/models.js`）、`desktop/prepare_release.py`（dist 白名单、`_headers`）、`desktop/publish_release.sh`（在项目根目录部署）、`tests/check_release.*`、README 与“模型说明”弹窗。

---

### Task 1: D1 替身与 schema

**Files:** Create `schema.sql`, `tests/fake-d1.cjs`

- [ ] 写 `schema.sql`（与规格一致的三张表 + 索引）。
- [ ] 写 `tests/fake-d1.cjs`：`createD1()` 读取 `schema.sql` 建内存库；`prepare(sql)` 返回对象，`bind(...args)` 返回新语句，`first()`/`all()`→`{results}`/`run()`→`{meta:{changes}}` 均返回 Promise；`batch(stmts)` 顺序执行。
- [ ] 提交。

### Task 2: 加密、访客、事件白名单

**Files:** Create `server/crypto.js`, `server/visitor.js`, `server/events.js`, `server/models.js`; Modify `build.py`; Test `tests/check_analytics_server.cjs`

- [ ] 测试先行：
  - `verifyPassword` 用 Python `hashlib.pbkdf2_hmac` 生成的已知向量，正确返回 true、错误返回 false，格式错误返回 false。
  - `dayKey` 在 UTC 16:00 前后切换上海日期。
  - 同一 IP+UA 同日哈希相同、次日不同，旧盐被删除。
  - `deviceOf`：iPhone→mobile，iPad→tablet，Mac Chrome→desktop。
  - `parseEvent`：合法 `view/model_open/feature/search` 通过；未知 type、未知模型、超长 `q`、非法 `ref` 拒绝或截断。
  - `server/models.js` 的 id 列表与 `models/manifest.json` 完全一致。
- [ ] 运行 `node tests/check_analytics_server.cjs`，确认失败。
- [ ] 实现；`build.py` 从各 `models/<id>.js` 提取 `title`、`cat` 生成 `server/models.js`。
- [ ] 测试通过后提交。

### Task 3: `/api/event`

**Files:** Create `server/http.js`, `functions/api/event.js`

- [ ] 测试：非 POST 由路由处理（只导出 `onRequestPost`）；跨来源 403；超 1024 字节 413；非法 JSON 400；合法事件写入一行并返回 204，`day/visitor/device` 正确；同访客 1 分钟第 61 条丢弃。
- [ ] 实现并通过；提交。

### Task 4: 密码登录、会话、锁定

**Files:** Create `server/session.js`, `server/lockout.js`, `functions/api/admin/_middleware.js`, `login.js`, `logout.js`, `tools/hash-password.py`

- [ ] 测试：正确密码 200 并设置 `zx_admin` cookie（含 `HttpOnly; Secure; SameSite=Strict; Path=/api/admin`）；错误返回 401 和 `remaining`；第 5 次错误后 429 和 `retryAfter`≈900；锁定期间正确密码也 429；成功后清除失败记录；篡改/过期 cookie 被中间件拒绝 401；无 cookie 访问 `stats` 401；跨来源 POST 403；缺少 Secret 时 500 且不泄露细节；logout 设置 `Max-Age=0`。
- [ ] `tools/hash-password.py`：`getpass` 读两次，必须一致且 ≥ 1 字符；输出 `pbkdf2_sha256$100000$<salt>$<hash>`；另打印一个 `secrets.token_urlsafe(48)` 作为 `SESSION_SECRET` 建议值。测试用 `subprocess` 喂入密码，验证输出能被 `verifyPassword` 接受。
- [ ] 实现并通过；提交。

### Task 5: 统计与导出

**Files:** Create `server/stats.js`, `functions/api/admin/stats.js`, `functions/api/admin/export.js`

- [ ] 测试：插入固定事件后，`range=7d` 返回 `totals`（views、visitors、opens、present 及上一时段对比）、`trend`（按日补零）、`models`、`features`、`referrers`（前 8）、`devices`、`searches`（前 20）、`modelTrend`（`?model=` 时）；`today` 按小时；180 天前数据被清理；CSV 首行表头、按日 × 类型汇总、对含逗号/引号字段转义；非法 range 400。
- [ ] 实现并通过；提交。

### Task 6: 前端上报

**Files:** Create `analytics.js`; Modify `app.js`, `build.py`, `index.html`（由 build 重写）

- [ ] `analytics.js`：`ZhixiangAnalytics.track(type, fields)`；启用条件见规格（含 `__ZHIXIANG_ANALYTICS_TEST__`）；1 秒去重；`view` 只在页面类型变化时发送；捕获阶段 click 监听映射功能按钮；`submit#questionForm`→`question_submit`；`#searchInput` 停顿 1.5 秒上报。
- [ ] `app.js`：`openModel(id, params, question, via)`，卡片 `card`、课堂 `class`、哈希路由 `link`、做题 `question`、其他 `other`；`renderLibrary`/`renderDemo` 末尾调用 `track("view", …)`。
- [ ] `build.py`：`analytics.js` 放在 `app.js` 之前。
- [ ] 运行现有全套回归确认不受影响；提交。

### Task 7: 后台页面

**Files:** Create `admin/index.html`, `admin/admin.css`, `admin/admin.js`

- [ ] 登录视图、仪表盘视图（规格所述全部区块），SVG 折线与条形，悬停提示，范围切换，学科筛选，模型展开与单模型趋势，CSV 下载，退出；401 时回到登录；窄屏单列；深色模式。
- [ ] 提交。

### Task 8: 浏览器测试

**Files:** Create `tests/check_analytics_browser.cjs`

- [ ] 网站：默认（127.0.0.1）无 `/api/event` 请求；注入测试配置后，打开卡片、分享链接、做题、大屏、截图、搜索各产生正确事件，载荷不含参数值和题目文本；DNT 时无请求。
- [ ] 后台：`page.route('/api/admin/**')` 提供假数据；错误密码提示剩余次数；锁定倒计时；仪表盘数值、范围切换重新请求、375px 单列、深色模式、无控制台错误。
- [ ] 通过；提交。

### Task 9: 发布流程与隐私说明

**Files:** Modify `desktop/prepare_release.py`, `desktop/publish_release.sh`, `tests/check_release.cjs`/`.py`, `app.js`（`showAbout`）, `README.md`

- [ ] `stage_dist` 复制 `admin/` 三个文件；`verify_dist` 白名单加入它们；`HEADERS` 增加 `/admin/*`：`Cache-Control: no-store`、`X-Robots-Tag: noindex`、`X-Frame-Options: DENY`、`Content-Security-Policy`。
- [ ] `publish_release.sh` 在 `wrangler pages deploy` 前 `cd "$project_root"`。
- [ ] 更新发布测试。
- [ ] 隐私说明与 README（含一次性配置步骤）。
- [ ] `python3 build.py`；全套回归 `tests/run_all.sh --extended` 全部通过；提交。
