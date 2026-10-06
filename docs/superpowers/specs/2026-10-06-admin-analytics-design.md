# 网站访问统计与后台：设计

日期：2026-10-06　状态：待用户审阅

## 目标

站长（仅 1 人）登录 `https://zhixiang-classroom.pages.dev/admin`，查看网站访问量、模型打开次数和功能使用情况。

不做：多用户、角色权限、实时推送、地区统计、桌面版/单文件版/本地预览统计、第三方统计服务、外部 CDN。

## 约束

- 网站是 Cloudflare Pages 直接上传部署（`desktop/publish_release.sh` 中 `wrangler pages deploy dist`），线上首页是 `standalone.html` 单文件。
- 前端保持原生 HTML/CSS/JS；后端只用 Pages Functions + D1，无 npm 运行依赖。
- 仓库公开：密码、密钥不进代码库。

## 架构

```
网页 analytics.js ──sendBeacon POST──▶ /api/event ──▶ D1: events
/admin/（静态页） ──fetch──▶ /api/admin/{login,logout,stats,export} ──▶ D1
                              ▲ functions/api/admin/_middleware.js 校验会话
```

### 新增文件

| 文件 | 作用 |
|---|---|
| `analytics.js` | 前端上报；由 `build.py` 打进分文件页和单文件页。 |
| `functions/api/event.js` | 接收事件、校验、写入 D1。 |
| `functions/api/admin/_middleware.js` | 除 `login` 外，校验会话 cookie。 |
| `functions/api/admin/login.js`、`logout.js` | 登录、退出。 |
| `functions/api/admin/stats.js` | 返回某时间段的汇总 JSON。 |
| `functions/api/admin/export.js` | 导出 CSV（按天 × 事件类型汇总，不导出原始行）。 |
| `functions/_lib/*.js` | 共享：白名单、PBKDF2 校验、会话签名、访客哈希、D1 查询。 |
| `admin/index.html`、`admin/admin.css`、`admin/admin.js` | 登录页与仪表盘。 |
| `schema.sql` | D1 建表语句。 |
| `tools/hash-password.py` | 本地生成密码哈希（交互输入，不回显、不写文件）。 |

## 前端上报（analytics.js）

**启用条件**（全部满足才发送）：`location.protocol === "https:"`、`location.hostname === "zhixiang-classroom.pages.dev"`、非桌面应用（`IS_DESKTOP_APP` 为假）、`navigator.doNotTrack !== "1"` 且 `navigator.globalPrivacyControl !== true`。否则所有调用为空操作。测试可在页面脚本加载前设置 `window.__ZHIXIANG_ANALYTICS_TEST__ = { endpoint }`，跳过主机名和协议条件（DNT/GPC 条件仍生效）。

**接口**：`ZhixiangAnalytics.track(type, fields)`，内部用 `navigator.sendBeacon("/api/event", JSON)`；失败静默，不影响页面。同一事件 1 秒内重复只发一次。

**事件**

| type | 字段 | 触发点 |
|---|---|---|
| `view` | `page`：`home`/`model`/`questions`/`favorites`/`classes`/`downloads`；`ref`：首次进入时 `document.referrer` 的主机名 | 首次加载、路由变化 |
| `model_open` | `model`：模型 id；`via`：`card`/`link`/`class`/`question`/`other` | `openModel` |
| `feature` | `name`：`present`/`save`/`screenshot`/`export_params`/`export_data`/`share`/`ink`/`question_submit`/`download_desktop` | 对应按钮动作 |
| `search` | `q`：去空白后 2–40 字 | 搜索框停顿 1.5 秒；同一词每次页面会话只报一次 |

设备类型由服务端从 UA 粗分：`desktop`/`tablet`/`mobile`。不发送参数值、题目文本、课堂名称、收藏内容。

## 服务端接收（/api/event）

- 仅接受 `POST`，`Content-Length` ≤ 1024，`Origin`（或缺失时 `Referer`）必须是站点自身；否则 400/403。
- `type`、`page`、`via`、`name` 按白名单；`model` 必须在 `models/manifest.json` 列表中（构建时生成到 `functions/_lib/models.js`）；`ref` 只保留合法主机名、≤ 100 字；`q` 去掉控制字符。
- 访客哈希：`SHA-256(当日盐 ‖ CF-Connecting-IP ‖ User-Agent)` 取前 16 个十六进制字符。当日盐随机生成，存在 `salts` 表，读取时删除早于今天的盐。不存 IP、不存 UA 原文。
- 简易限流：同一访客哈希每分钟超过 60 条直接返回 204 并丢弃。
- 成功返回 204。

## 数据库（D1，绑定名 `DB`）

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,          -- 毫秒时间戳
  day TEXT NOT NULL,            -- 'YYYY-MM-DD'，按 Asia/Shanghai
  type TEXT NOT NULL,
  key TEXT,                     -- page / model / name / q
  extra TEXT,                   -- via / ref
  visitor TEXT NOT NULL,
  device TEXT NOT NULL
);
CREATE INDEX events_day_type ON events(day, type);
CREATE TABLE salts (day TEXT PRIMARY KEY, salt TEXT NOT NULL);
CREATE TABLE login_attempts (who TEXT PRIMARY KEY, fails INTEGER NOT NULL, locked_until INTEGER NOT NULL);
```

`stats` 每次查询时顺带删除 180 天前的 `events` 行。

## 登录与会话

- Secret `ADMIN_PASSWORD_HASH`：`pbkdf2_sha256$100000$<盐 base64>$<哈希 base64>`，由 `tools/hash-password.py` 生成。
- Secret `SESSION_SECRET`：≥ 32 字节随机串。
- `POST /api/admin/login {password}`：
  - `who` = 当日访客哈希（同上算法）。若 `locked_until > now` 返回 429 和剩余秒数。
  - Web Crypto PBKDF2 计算后常量时间比较。失败 `fails+1`，到 5 次锁 15 分钟并清零；返回剩余次数。成功删除该记录。
  - 成功设置 cookie `zx_admin=<过期时间>.<HMAC-SHA256>`：`HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=43200`。
- 中间件校验签名和过期时间；失败返回 401，前端回到登录页。
- `POST /api/admin/logout` 清除 cookie。所有 admin 接口检查 `Origin`，防 CSRF。
- 更换 `SESSION_SECRET` 使所有会话立即失效；改密码只需更新 `ADMIN_PASSWORD_HASH`。

## 后台页面（/admin/）

静态页，原生 JS，图表手写 SVG。沿用网站绿色，支持系统深色模式，窄屏单列。

- **登录视图**：居中卡片，知象 Logo、密码框、登录按钮；错误时显示剩余次数；锁定时显示倒计时。
- **仪表盘视图**：
  - 顶栏：时间范围（今天 / 7 天 / 30 天 / 90 天）、导出 CSV、退出。
  - 4 张汇总卡：浏览量、访客（按日去重后求和）、模型打开、大屏模式，含较上一同等时段的变化百分比。
  - 访问趋势：浏览量与模型打开双折线，悬停显示当天数值；“今天”按小时显示。
  - 模型排行：横向条形，学科筛选，默认前 5、可展开全部；点击某模型显示其每日趋势。
  - 功能使用、来源（前 8）、设备占比、搜索词（前 20）。
- `stats` 返回一次性 JSON，前端只渲染，不做二次聚合以外的计算。

`_headers` 为 `/admin/*` 和 `/api/*` 增加：`Cache-Control: no-store`、`X-Robots-Tag: noindex`、`X-Frame-Options: DENY`、`Content-Security-Policy: default-src 'self'; frame-ancestors 'none'`。网站上不放后台链接。

## 对现有项目的修改

- `app.js` 等：在路由、`openModel`、相关 `action` 处调用 `ZhixiangAnalytics.track`；不改变原有行为。
- `build.py`：加入 `analytics.js`；生成 `functions/_lib/models.js`。
- `desktop/prepare_release.py`：`stage_dist` 复制 `admin/` 三个文件；`HEADERS` 增加上述规则；`verify_dist` 白名单同步。
- `desktop/publish_release.sh`：部署前 `cd "$project_root"`，使 `wrangler` 识别 `functions/`。
- “模型说明与参考资料”弹窗和 README 增加隐私说明：统计什么、不统计什么、DNT/GPC 生效、桌面版不统计；把原“不上传”的表述改为准确说法（题目文本、课堂、参数仍不上传）。
- 上线随下一次版本发布（`desktop/release.json` 提升版本）。

## 一次性配置（站长在 Cloudflare 操作）

1. `npx wrangler d1 create zhixiang-analytics`，再 `npx wrangler d1 execute zhixiang-analytics --remote --file schema.sql`。
2. Pages 项目 → 设置 → 绑定：D1，变量名 `DB`。
3. `python3 tools/hash-password.py` 生成哈希；Pages → 设置 → 变量和机密：添加 `ADMIN_PASSWORD_HASH`、`SESSION_SECRET`（加密类型）。
4. 部署后访问 `/admin/` 登录。

## 测试

- `tests/check_analytics_server.cjs`：用 `node:sqlite` 模拟 D1，直接调用各 Function 的 `onRequest`。覆盖白名单与长度、来源校验、限流、访客哈希按日变化、盐清理、PBKDF2 正确/错误、锁定与倒计时、cookie 签名/过期/篡改、未登录 401、stats 聚合数值、180 天清理、CSV。
- `tests/check_analytics_browser.cjs`：
  - 网站：本地主机下不发请求；通过测试注入的配置启用后，各事件字段正确，且不含参数值、题目文本。DNT 时不发送。
  - 后台：用路由拦截提供假 API，检查登录错误/锁定提示、仪表盘渲染、时间范围切换、窄屏单列、深色模式、控制台无错误。
- 现有全套回归必须保持通过；`check_release` 更新以覆盖新的 dist 白名单和头部。
- 本地手动联调：`npx wrangler pages dev dist` 加本地 D1。线上验证在站长完成配置并部署后进行。
