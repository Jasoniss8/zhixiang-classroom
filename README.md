# 知象 · 教学模型

本地静态网站，供教师演示数学、物理和地理模型。现有网页可直接访问：[知象 · 教学模型](https://zhixiang-classroom.pages.dev/)。

## 源码与授权

程序源码按 [MIT License](LICENSE) 开源。无需账号或后端，克隆后打开 `index.html` 即可使用；也可运行 `python3 build.py` 生成可离线打开的 `standalone.html`。

绿色小象 Logo 和桌面应用图标属于知象品牌素材，随源码提供仅供运行、开发与展示本项目使用，不包含在 MIT 代码许可中。个人收款码 `assets/support-qr.jpg` 不进入公开仓库；缺少该文件时“支持知象”入口会自动隐藏，也能正常构建和使用模型。需要自行配置支持入口时，把自己的二维码图片放到此路径并重新构建。请勿将他人的收款码打包进你的发布版本。

欢迎提交问题与改进；模型涉及教学简化，涉及数值与公式的改动请写明假设和验证方式。

## 理想与含阻力对照

抛体与单摆参数面板中可选择“理想与含阻力对照”。橙色虚线为理想结果，绿色为含阻力结果，使用相同初值、时间与数学比例。抛体比较飞行时间、射程和最高点；单摆比较当前摆角、速率、机械能和耗散量。

- 抛体使用 Fᴅ = −½ρCᴅA|v|v，可调物体质量（kg）、空气密度（kg/m³）、无量纲阻力系数与迎风面积（m²）。默认仅为教学参数；月球预设为空气密度零。
- 单摆使用 θ″ = −(g/L)sinθ − (b/m)θ̇，切向阻尼力 F = −bv，b 的单位为 kg/s。强阻尼时可能不再往复摆动；页面不把无阻尼周期当作有阻尼的恒定周期。
- 两种计算均用四阶 Runge–Kutta，内部步长不超过 1/240 s。physics.js 中的计算不依赖窗口或画布尺寸。
- 阻力为简化模型，不代表实测轨迹。抛体不计算风、升力、旋转或变化的空气密度；单摆阻尼不代表完整轴摩擦模型。模型说明附 OpenStax 参考资料。
- 旧版 v1 课堂配置仍默认按理想模型打开；新配置在原有参数对象中保存 motionMode 与阻力参数，不改变存储版本。

## 使用

保持目录结构不变，打开 `index.html` 即可使用分文件版本。运行 `python3 build.py` 后打开生成的 `standalone.html`，它包含全部样式、脚本与图形代码，不依赖外部脚本、字体、图片或 API。

网站可离线使用，也可部署到静态托管。收藏与课堂仍保存在当前浏览器，不会自动同步到另一设备或新网址；迁移前请导出备份。

### 桌面版

- macOS：运行 `bash macos/build.sh` 后打开 `output/macos/知象.app`，或解压生成的 ZIP 使用。应用内置离线页面，不需要启动本地服务器。首次打开若系统提示来源未验证，可在 Finder 中右键应用并选择“打开”。
- Windows：运行 `npm install --prefix windows` 和 `python3 windows/build.py` 后，解压 `output/windows/知象-Windows-免安装.zip`，双击 `Zhixiang.exe`。这是独立窗口的 Windows x64 桌面程序，内置 Electron 运行环境和全部模型；使用时不需要打开浏览器、安装 Python 或联网。请保留 exe 旁边的整个文件夹。程序尚未进行 Windows 代码签名，系统可能提示来源未验证。

桌面版与普通浏览器、本地单文件页各自保存收藏和课堂配置。换设备或换打开方式前，先在“我的课堂”导出备份，再导入新环境。修改页面后可运行 `python3 windows/build.py` 和 `bash macos/build.sh` 重建对应包；Windows 打包前需运行 `npm install --prefix windows`，但软件使用时不需要 npm。Mac 构建需要 macOS 与 Xcode 命令行工具。

## 最近调整（2026-09-29）

- 删除首页重复的三维推荐条、装饰标签和固定课堂脚本；讨论问题按需展开。
- 增大字号、控件和数字输入，提示放到画布外；窄屏支持直接跳到参数并返回模型。
- 气体动画加入等质量粒子弹性碰撞，运动采用独立于窗口尺寸的模拟坐标；压强仍按理想气体方程计算。体积或气体量变化时重新布置粒子，表示等温状态比较。
- 单摆显示计入初始摆角的周期与小角近似周期；完整周期由椭圆积分计算。
- 截面正视图在移动截平面时保持比例，附长度标尺；展开图标明折叠棱。
- 抛体显示重力加速度，弹簧显示速度、回复力和位移刻度；PNG 导出附模型条件，窄屏数据逐项排列。

保留全部 13 个模型、收藏、课堂配置、板书、对照曲线、截图和大屏。仍使用原生 HTML/CSS/JavaScript，课堂配置保持 v1 格式兼容读取。

## v2 模型库

首页直接显示“模型库”、搜索和学科筛选，移除了大幅宣传封面、口号与营销式说明。保留收藏、我的课堂、板书、截图、配置导入导出和投屏功能。卡片说明改为模型对象与操作内容。

在原有 10 个模型之外新增 3 个数学模块，共 13 个模型入口。

### 常见几何体

正方体、长方体、正三棱柱、正三棱锥、正四棱锥、圆柱、圆锥和球，共 8 种几何体。可修改尺寸、观察顶点与遮挡棱线、开启透明显示，查看体积与表面积。

正三棱锥的底面为正三角形，顶点在底面中心正上方；高度可调，不应把任意高度的模型都称作正四面体。

### 正方体截面

可改变棱长、截平面位置、倾角与方向。截面由截平面与 12 条棱的交点实时求得，不是切换静态图片。包含三角形、正方形、五边形、正六边形预设，同时展示不受相机旋转影响的截面正视图。

支持点、线段和整面相切等边界状态。面积与周长来自三维坐标，不来自屏幕上的投影。几何显示为正投影，不是透视投影。

### 展开与折叠

支持正方体和长方体的一种十字形展开方式，手动调节或连续播放展开/折叠。同色面闭合后相对，各面绕共享棱旋转。展开过程总面面积不变。体积栏始终表示完全闭合后的体积，不给未闭合曲面计算“当前体积”。

## 三维操作

拖动画布旋转；滚轮或双指缩放。上方提供立体、正视、俯视、侧视按钮。点击画布后，方向键旋转，加减键缩放。自动旋转可随时暂停。R 恢复默认模型和视角。

开启板书后，拖动改为书写，不再旋转模型；关闭板书后恢复旋转。截图包含当前图形、公式和数值。主画布采用三维坐标投影与面深度排序，曲面由面片近似绘制，但体积和表面积使用解析公式。

## 课堂保存与旧版配置

本地存储只属于当前浏览器环境，不进行账号同步。相机视角、尺寸、几何体类型和三维显示选项会进入配置文件；恢复时数值最多保留四位小数。板书、动画进度和对照曲线不进入课堂配置。

配置文件仍采用兼容的 `version: 1` 数据格式，可导入上一版导出的知象 JSON 文件。更换 HTML 文件名、打开方式或浏览器，可能改变本地存储的归属；请先在旧版导出课堂，再在新版“我的课堂”中导入。不要依赖不同 HTML 文件之间自动共享浏览器数据。

浏览器不允许本地存储时，页面会提示，仍可使用模型和导出配置。

## 文件结构

- `index.html`：页面框架，加载同目录脚本与样式。
- `styles.css`：页面样式和响应式布局。
- `app.js`：原有学科模型、模型库和课堂功能。
- `geometry.js`：三维几何计算、投影、展开和交互。
- `assets/zhixiang-logo.png`：提供的绿色小象 Logo 原图；桌面导航和手机顶部共用。
- `assets/support-qr.jpg`：可选的个人收款码，不进入公开仓库；本地存在时支持弹窗显示，单文件版会内嵌。
- `standalone.html`：构建生成的单文件完整网站，不进入源码仓库。
- `build.py`：将分文件版本合并为单文件；无第三方 Python 依赖。
- `windows/desktop/`：Windows 桌面程序入口与图标；应用从内置页面启动，不访问网站。
- `windows/build.py`：生成 Windows x64 桌面程序和免安装 ZIP。
- `tests/test_browser.py`：历史 Python 回归程序，已移除写死的 Linux 浏览器路径。
- `tests/check_models.cjs`：浏览器与数值回归程序，不使用测试框架；需要本机已有 Playwright。
- `output/playwright/`：本机运行结果与范围说明，不进入源码仓库。

修改源码后执行：

```bash
python build.py
```

自定义输出位置：

```bash
python build.py --output ./dist/zhixiang.html
```

部署时，可以把 `index.html`、`styles.css`、`geometry.js`、`physics.js`、`app.js` 和 `assets` 目录保持相对路径上传到静态托管，或把单文件版作为首页。构建程序会将 Logo 一并嵌入单文件，离线使用无需单独携带图片。

## 参考与范围

模型说明弹窗列有理论参考及计算假设。新增几何体的基础体积、表面积参考 OpenStax《Prealgebra 2e》9.6；正棱锥表面积按各三角形侧面求和，截面面积按平面内多边形计算，展开图通过刚性旋转构造。

本站不是任意几何体建模软件，没有自由点线面作图、三维文件导入或无限模型生成。圆柱、圆锥、球的曲面显示存在离散面片近似。教学时以公式、单位和模型说明为准。

## 本地预览

在项目目录执行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

打开 http://127.0.0.1:8000/index.html 。停止服务器时按 Ctrl+C。

## 本次回归的运行方式

先构建单文件并启动上面的本地服务器。在另一个终端中，用已经安装的 Playwright 运行：

```sh
node tests/check_models.cjs
```

如果 Playwright 不在默认模块路径，可设置 `PLAYWRIGHT_MODULE_PATH` 为本机 Playwright 包目录。若其配套 Chromium 不可用，可设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 为已安装的 Chrome 或 Chromium 可执行文件。两者均只用于检查，不属于网站的运行依赖。

本次理论核对使用 [OpenStax 气体动理论](https://openstax.org/books/chemistry/pages/9-5-the-kinetic-molecular-theory) 与 [非线性单摆周期](https://openstax.org/books/calculus-volume-2/pages/6-4-working-with-taylor-series)。模型条件与参考链接也可在页面参数面板中查看。


## 静态部署

当前公开网站：[知象 · 教学模型](https://zhixiang-classroom.pages.dev/)。使用 Cloudflare Pages 静态托管，访客无需 Cloudflare 或 ChatGPT 账号。

Pages 项目为 `zhixiang-classroom`，生产分支为 `main`。修改源码后，在已登录此 Cloudflare 账户的电脑上执行：

```sh
python3 build.py
python3 build.py --output dist/index.html
npx --yes wrangler@4.143.0 pages deploy dist --project-name zhixiang-classroom --branch main --commit-dirty=true
```

首次在其他电脑发布时，先运行 `npx --yes wrangler@4.143.0 login`。Wrangler 仅用于上传，不属于网站运行依赖。项目已存在，后续更新不需要再次创建项目。发布方式见 [Cloudflare Direct Upload 文档](https://developers.cloudflare.com/pages/get-started/direct-upload/)。

`dist` 仅包含合并后的 `index.html`；测试记录、源码目录与本机登录凭据不会上传。`standalone.html` 仍用于离线使用。`dist`、单文件版、桌面安装包与本机托管记录均不提交到源码仓库；公开分享请使用上述 Cloudflare 网址。

旧网址与新网址的本地收藏、课堂配置各自独立；需要迁移时，在旧网页导出课堂 JSON，再在新网页导入。

新增检查：`node tests/check_resistance_math.cjs`；`tests/check_resistance_browser.cjs` 使用与现有回归相同的 Playwright 路径与 Chrome 启动配置，检查零阻力、旧配置、新配置下载导入、320–1440px 显示和实际 PNG 导出。
