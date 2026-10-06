# 知象 · 教学模型

本地静态网站，供教师演示数学、物理和地理模型。现有网页可直接访问：[知象 · 教学模型](https://zhixiang-classroom.pages.dev/)。

## 源码与授权

程序源码按 [MIT License](LICENSE) 开源。无需账号或后端，克隆后打开 `index.html` 即可使用；也可运行 `python3 build.py` 生成可离线打开的 `standalone.html`。

绿色小象 Logo 和桌面应用图标属于知象品牌素材，随源码提供仅供运行、开发与展示本项目使用，不包含在 MIT 代码许可中。个人收款码 `assets/support-qr.jpg` 不进入公开仓库；缺少该文件时“支持知象”入口会自动隐藏，也能正常构建和使用模型。需要自行配置支持入口时，把自己的二维码图片放到此路径并重新构建。请勿将他人的收款码打包进你的发布版本。

欢迎提交问题与改进；模型涉及教学简化，涉及数值与公式的改动请写明假设和验证方式。

## GitHub 回归检查修复（2026-10-06）

已拉取 `main`，触发失败的版本为 `bb7feba`。该次 [Model regression](https://github.com/Jasoniss8/zhixiang-classroom/actions/runs/37420458004) 已执行1252项，其中1250项通过；两组浏览器检查在退出大屏后调整窗口时中断，报 `Browser.setWindowBounds` 不允许改变仍处于全屏状态的窗口。应用的布局状态先恢复，Chromium 的系统窗口随后恢复，测试必须等待两个过程都完成。

修复文件与函数：

- `app.js` 的 `togglePresentation` 在进入请求完成后核对当前意图，撤销用户已经取消的迟到请求；`exitPresentation` 返回等待系统退出的 Promise，布局仍立即恢复。
- `tests/runtime.cjs` 的 `waitForPresentationExit` 同时检查应用状态、CSS、DOM 全屏元素和 Chromium 窗口状态，等待正常窗口后再允许测试调整尺寸；超时提供状态诊断，结束时断开 CDP 会话。
- `tests/check_models.cjs` 与 `tests/check_science_browser.cjs` 等待真实全屏进入/退出，继续执行全部窄屏、截图和离线检查。新增受控 Promise 回归，确认迟到请求确实进入并随后被撤销；新增三种物理/地理模型的系统退出检查。

修复后运行 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' bash tests/run_all.sh --extended`：**19组、1369/1369通过，0失败、0环境错误**；测试服务器正常关闭。结果为 `output/playwright/run-20261006T060801.082732Z/summary.json`，两个原失败组分别为209/209、84/84通过，脚本语法及 `git diff --check` 通过。已运行 `python3 build.py` 生成712,057 B单文件。上述为本机macOS/Chrome执行结果，GitHub Linux运行以 [Model regression 工作流](https://github.com/Jasoniss8/zhixiang-classroom/actions/workflows/test.yml) 的新提交结果为准。

## 做题入口（2026-10-06，本地开发版）

“做题”作为带铅笔图标的普通导航项，位于“模型库”下方，手机导航同步提供入口；已移除“上课 / 做题”切换。首页仍直接打开原有 22 个模型的模型库。做题支持粘贴一道文本题或导入 UTF-8 TXT，先匹配已有模型，再核对数值、单位和简化条件。文本最多 4000 字符，文件不超过 64 KB。没有图片识别、AI 接口或通用解题器，不生成任意新模型或完整解答。

| 题型 | 本版支持范围 | 当前模型参数范围 |
| --- | --- | --- |
| 薄透镜成像 | 已知单个凸/凹薄透镜的焦距与实物物距，观察像距、放大率与成像性质 | 焦距大小 1–20 cm；物距 0.5–60 cm |
| 理想平抛 | 单个物体水平抛出，落到水平地面；忽略空气阻力 | 初始高度 0–20 m；初速度 5–40 m/s；g 为 1.62–15 m/s² |
| 一维两球碰撞 | 已知两球质量、碰前速度和恢复系数；无外界水平冲量；球1在左、球2在右，向右为正 | 质量各 0.1–10 kg；初速度各 −10–10 m/s；e 为 0–1 |
| 二次函数图像 | 明确的数值系数式 ax²+bx+c 或 a(x−h)²+k，查看图像、顶点、对称轴 | a 为 −3–3 且不为0；h 为 −5–5；k 为 −4–5 |

识别结果列出来源与单位换算。缺项保持空白，可按原题手动补齐；条件矛盾、复合题、暂不支持的约束或超范围数值会阻止进入，不自动限幅或补默认题设。必须勾选核对确认后才能进入模型；修改题干会清除旧识别结果，修改条件会要求重新确认。规则匹配不能覆盖任意自然语言，识别正确性仍需核对。

透镜的默认物高只用于示意，不能当作题设；一维碰撞的初始间距和碰撞时刻也是演示设置，暂不匹配距离或相遇时间题。二次函数暂不匹配分段、定义域约束、交点或含参反求。抛体的 g 使用核对后的题设值，不默认替换为 9.8 或 10。

进入模型后，上方保留原题与已核对条件。调整参数会显示“当前为变式”，可“还原题目条件”或返回修改题目。文本只保存在当前页面内存，不上传、不写入本地存储；刷新后清空。收藏、课堂配置、分享链接仍沿用现有逻辑，`version:1` 格式不变，保存/分享的是模型参数，不包含原题。

四类题型的数值字段在导入、保存与分享中保留 JavaScript 数值精度，继续执行原有范围和类型校验；避免很小的二次项系数被舍入成0、近焦点物距被舍入成焦距。二次函数公式栏同步保留实际系数与顶点数值。普通模型控件仍按各自步长编辑，改变参数后属于变式。

新增源码与主要入口：

- `question-matcher.js`：`types` 定义题型及字段，`analyze` 识别与检查题意范围，`validate` 严格校验数值，`parseQuadratic` 解析有限二次式语法，不使用 `eval`。
- `question-ui.js`：`renderQuestionPage`、`renderQuestionResult`、`updateQuestionValidation`、`openQuestionModel`、`questionContextHTML`、`updateQuestionVariation` 管理输入、核对和原题状态。
- `app.js`：`mobileNav`、`setActiveNav`、`renderLibrary`、`routeFromHash` 接入入口；`openModel`、`renderDemo`、`renderReadout` 接入核对后的参数及变式提示；`safeParams` 保留四类题设字段精度，不改变 v1 格式和范围校验。
- `models/parabola.js`：`readout` 的公式与坐标保留实际参数精度；`models/lens.js` 的 `lensReadout` 显示精确物距/焦距，`drawLens` 对舍入后的标注使用约等号。
- `index.html`、`styles.css`：桌面/窄屏入口与表单样式；`build.py` 依次加载/内嵌两个新脚本，重新生成 `standalone.html`。

回归检查新增 `tests/check_question_math.cjs` 和 `tests/check_questions_browser.cjs`，覆盖单位与随机配方、缺参和范围、四类题的实际模型读数、TXT 导入、修改与还原、v1 兼容、窄屏及离线单文件。执行 `bash tests/run_all.sh --extended` 会自动包含这两组；已有 Playwright 环境下可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定本机浏览器。

首版做题功能完成时执行 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' bash tests/run_all.sh --extended`：**19 组、1358/1358 通过，0 失败、0 环境错误**。结果为 `output/playwright/run-20261005T162837.193509Z/summary.json`（目录时间为 UTC，本地日期为10月6日），自建测试服务器已关闭。其中题目数值组 97/97、浏览器组 97/97；数值组含500组随机二次式配方和500组单位转换的批量校验。已实际验证 Chrome 桌面、390px 窄屏模拟、TXT 导入、v1 导出/导入和保存、精度分享往返、无远程请求及 `file://` 离线单文件。首次发现的空格高度、结果条件误识别、否定条件和精度往返问题均已修复后重测；没有把初次失败记作通过。截图已目视检查。新脚本语法检查与 `git diff --check` 通过。

本轮未运行 Safari、手机真机或 Windows/macOS 原生壳的 GUI 验收，未执行远端 GitHub CI；不能将 Chrome 离线检查当作原生桌面验收。首版构建生成 **713,032 B** 的 `standalone.html`；后续导航调整的结果另记。

后续导航调整：移除切换组件与相关样式/事件，`index.html` 增加普通做题导航项，`app.js` 的 `mobileNav`、`setActiveNav` 处理入口与题目模型页高亮，`question-ui.js` 删除切换辅助函数，更新现有浏览器检查。重新构建单文件为 **711,403 B**。本次针对导航变更运行 `tests/check_questions_browser.cjs`：**104/104 通过**，报告 `output/playwright/questions-nav-20261006/questions-browser-results.json`；桌面及390px截图已目视检查，脚本语法和 `git diff --check` 通过。本次未重跑1358项全套，前文全套结果属于首版功能批次。

此功能目前位于本地源码及生成的单文件页，尚未发布到网站，也未重新打包 macOS/Windows 安装包。

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

## 本轮维护（2026-10-03）

模型库仍为 22 个模型，首页、模型参数和 `version:1` 课堂配置格式保持兼容。模型定义与绘图已移到各自的 `models/<id>.js`；下文旧批次中出现的 `app.js` 函数位置和测试总数仅记录当时状态，不代表当前源码位置或本轮测试结果。

### Logo 与离线体积

导航和手机顶部共用 192×192 PNG；`build.py` 只内嵌这一压缩版。macOS、Windows 的内置页面都通过同一构建程序生成，因此也使用压缩版。系统应用图标使用各自独立的图标资源；原始 Logo 归档到 `assets/original/zhixiang-logo.png`，不参与页面构建。

| 测量对象 | 压缩前 | 仅完成 Logo 压缩后 |
| --- | ---: | ---: |
| 导航 Logo | 1,391,752 B（1254×1254） | 28,720 B（192×192） |
| `standalone.html` | 2,309,836 B | 492,460 B |

仅 C1 使单文件减少 1,817,376 B，约 78.7%。已在浏览器的 1×、2× 像素密度截图中检查导航 Logo 清晰度。此表是隔离 Logo 改动的测量；完成 C1–C7 阶段时，`standalone.html` 为 651,915 B。继续加入桌面更新并完成本轮修复后，该阶段的单文件为 **667,568 B**，比本轮修改前减少约 71.1%。

C1–C7 阶段曾重建两个桌面包，并核对其内置 HTML 与当时单文件的字节内容和 SHA-256 一致，记录为 `output/playwright/desktop-build-verification.json`。该记录不替代后续桌面更新验证；当前产物已重新构建并通过发布准备复核，大小和原生验证边界见后文。

### 曲面细分与旋转

圆柱、圆锥、球的圆周分段随缩放增加，最少 48 段，最多 96 段；球的纬向分段同步变化。尺寸与精细度相同时复用网格，旋转时不重建。当前最大界面缩放 1.8× 使用 72 个圆周分段。体积和表面积仍按解析公式计算，网格只用于显示及数值交叉校验。

以下使用 `tests/benchmark_mesh.cjs` 在 Apple M4、macOS arm64、Chrome 154.0.8037.97、1440×1000 视口、1× 像素密度、4 倍 CPU 降速下测量。每组先预热 15 帧，再在每个 `requestAnimationFrame` 回调中旋转 1° 并同步绘制，记录 90 帧的绘制耗时与相邻回调间隔。测量时关闭产品自动播放；绘制耗时与帧率分别记录。

| 形状 / 缩放 | 顶点数（前→后） | 平均绘制耗时 ms（前→后） | 旋转 FPS（前→后） |
| --- | ---: | ---: | ---: |
| 圆柱 / 1× | 96→96 | 0.944→0.559 | 60.00→60.01 |
| 圆柱 / 1.8× | 96→144 | 0.739→0.749 | 60.00→60.00 |
| 圆锥 / 1× | 49→49 | 0.598→0.790 | 60.00→60.00 |
| 圆锥 / 1.8× | 49→73 | 0.529→0.489 | 60.00→60.00 |
| 球 / 1× | 914→914 | 7.934→2.487 | 60.00→60.01 |
| 球 / 1.8× | 914→2090 | 8.906→5.248 | 60.01→60.01 |

球体在 1× 与 1.8× 下的平均绘制耗时降低；小图形并非全部更快：圆柱 1.8× 从 0.739 ms 增至 0.749 ms，圆锥 1× 从 0.598 ms 增至 0.790 ms。六组测得帧率均约 60 FPS，受浏览器调度、刷新频率和主机负载影响，不能由此推断所有低性能设备的帧率或稳定性。

本次表格替代早期约 30 FPS 的初步测量。原始记录包含逐帧样本和 P95 耗时，位于 `output/playwright/mesh-performance-baseline-2026-10-02T17-10-24-353Z.json` 与 `output/playwright/mesh-performance-current-2026-10-02T17-11-10-884Z.json`。

复测时先启动本地预览，再执行 `node tests/benchmark_mesh.cjs`；比较修改前版本使用 `node tests/benchmark_mesh.cjs --baseline`，需要本机保留完整的 `output/playwright/maintenance-baseline/` 页面快照。该性能测量不属于通过 / 失败测试，也不自动并入 `run_all.sh` 的回归总数。

### 课堂分享链接与二维码

“我的课堂”的每项配置提供“复制分享链接”；模型页面也可分享当前参数。链接只包含模型 id 与经过现有规则校验的参数，使用 URL 的 `#` 部分编码，不上传服务器，不包含课堂名称、收藏、板书或运行进度。打开链接直接进入对应模型；缺失字段使用默认值，数值限幅，非法参数忽略或提示后回到有效状态。原有 JSON 导入导出仍为 `version:1`。

二维码由内置纯 JavaScript 生成，不请求 CDN 或二维码服务。链接最多 4096 字符，二维码内容最多 1800 个 UTF-8 字节；超限时提示改用链接或配置文件。复制失败时保留可手动复制的文本。离线程序和本机预览默认生成现有公开站点的链接，也可填写接收方可访问的知象网址；接收方首次打开线上分享页面需要联网，使用分享功能不会将离线软件变为联网依赖。公开站点已于 2026-10-05 同步此版本，可读取新格式分享链接中的模型参数；离线交流仍可导出课堂配置文件。

### 显示与投屏、键盘操作

“显示与投屏”可分别开启高对比度和投屏大字号，设置单独保存在本机，不写入课堂配置。Tab 聚焦参数，方向键按控件步长微调；画布或范围滑块聚焦时，空格播放 / 暂停，R 重置。数值输入框、文本框与选择框保留原本的输入操作，避免输入时误触播放或重置。原有三维键盘旋转与缩放继续可用。

画布的 `aria-label` 包含模型名称、播放状态、公式和当前读数，持续更新最多每秒一次；不使用持续播报区域打断读屏。模型和自动旋转默认不自启，并尊重 `prefers-reduced-motion`；系统切换为减少动态效果时停止当前动画，用户仍可主动播放。

### CSV 与 SVG 导出

以下 7 个模型提供“导出数据”：二次函数与抛物线、函数图像与变换、导数与切线、抛体运动、单摆、波、弹簧振子。导出窗口固定打开瞬间的参数、对照曲线和模拟时刻；之后继续播放不会混合不同时间的数据。

- CSV 使用带单位的列名；无量纲记为 `[1]`，定义域外或没有有限值的点留空。已有对照曲线使用独立列，抛体和单摆的理想 / 含阻力数据一起导出。
- 函数和波形通常导出 601 个采样点；抛体另包含各条轨迹的落地时刻，落地后的对应列留空。波导出所选时刻的空间波形。
- 单摆导出 K、U、E 能量历史，弹簧导出位移历史与适用的包络线，均取最近 12 s 的实际记录；尚未播放时只有初始点。受迫弹簧还可单独导出稳态共振曲线。
- SVG 包含矢量曲线、坐标轴、单位、图例与说明，不嵌入画布截图。导数模型可分别选择原函数 / 切线 / 割线图和导函数图；受迫振动可选择位移图或共振图。

文件名包含模型名称、图表名称与导出时间。各模型通过 `exportData` 钩子提供数据，公共导出器不重新实现运动求解。

## 最近调整（2026-09-29）

- 删除首页重复的三维推荐条、装饰标签和固定课堂脚本；讨论问题按需展开。
- 增大字号、控件和数字输入，提示放到画布外；窄屏支持直接跳到参数并返回模型。
- 气体动画加入等质量粒子弹性碰撞，运动采用独立于窗口尺寸的模拟坐标；压强仍按理想气体方程计算。体积或气体量变化时重新布置粒子，表示等温状态比较。
- 单摆显示计入初始摆角的周期与小角近似周期；完整周期由椭圆积分计算。
- 截面正视图在移动截平面时保持比例，附长度标尺；展开图标明折叠棱。
- 抛体显示重力加速度，弹簧显示速度、回复力和位移刻度；PNG 导出附模型条件，窄屏数据逐项排列。

保留原有 13 个模型及收藏、课堂配置、板书、对照曲线、截图和大屏；加入两个高中数学模型、五个高中物理模型、透镜成像和四季模型后，共 22 个模型（数学 8、物理 12、地理 2）。仍使用原生 HTML/CSS/JavaScript，课堂配置保持 v1 格式兼容读取。

## 模型库

首页直接显示“模型库”、搜索和学科筛选，移除了大幅宣传封面、口号与营销式说明。保留收藏、我的课堂、板书、截图、配置导入导出和投屏功能。卡片说明改为模型对象与操作内容。

包含原有 10 个学科模型、3 个立体几何模块，以及圆锥曲线、导数与切线、圆周运动与向心力、电场线与等势线、地球公转与四季、碰撞与动量守恒、电磁感应、双缝干涉、透镜成像。

### 常见几何体

正方体、长方体、正三棱柱、正三棱锥、正四棱锥、圆柱、圆锥和球，共 8 种几何体。可修改尺寸、观察顶点与遮挡棱线、开启透明显示，查看体积与表面积。

正三棱锥的底面为正三角形，顶点在底面中心正上方；高度可调，不应把任意高度的模型都称作正四面体。

### 正方体截面

可改变棱长、截平面位置、倾角与方向。截面由截平面与 12 条棱的交点实时求得，不是切换静态图片。包含三角形、正方形、五边形、正六边形预设，同时展示不受相机旋转影响的截面正视图。

支持点、线段和整面相切等边界状态。面积与周长来自三维坐标，不来自屏幕上的投影。几何显示为正投影，不是透视投影。

### 展开与折叠

支持正方体和长方体的一种十字形展开方式，手动调节或连续播放展开/折叠。同色面闭合后相对，各面绕共享棱旋转。展开过程总面面积不变。体积栏始终表示完全闭合后的体积，不给未闭合曲面计算“当前体积”。

### 三视图、空间角与向量（两个几何模块共用）

在原有参数栏的“观察内容”中切换；默认仍是原来的立体与尺寸，不改变模型库布局。

- **三视图**：正视从 +z 向原点、俯视从 +y 向原点、侧视从 −x 向原点。使用 `(x,y)`、`(x,−z)`、`(z,y)` 正投影，三幅图共用 cm 长度比例；相机旋转只影响主模型。遮挡棱画虚线，重合实线覆盖虚线，曲面轮廓用多边形近似。
- **由三视图匹配立体**：分别选择三幅投影，检索 8 种固定尺寸样例（a=3、b=2、h=3、r=1.5 cm），显示匹配立体或无匹配结果。不同立体可能有相同的单幅投影；本功能不推断任意组合体或内部孔洞，也不声称一般三视图总能唯一还原。
- **两棱夹角**：选择两条实际棱，`cosα=|u·v|/(|u||v|)`，取 0°–90°。异面直线比较方向向量；不使用画面上的夹角。
- **线面角**：选择棱与平面，`sinα=|u·n|/(|u||n|)`。正方体截面中的截平面也可选择；退化为点或线时移除该面并回退到有效选择。
- **二面角**：选择共享棱的两个面，以凸多面体外法向量计算内二面角 `δ=180°−acos(n₁·n₂/(|n₁||n₂|))`，可能为钝角。对不共棱的面或未指定实体内侧的截平面，只显示两平面锐夹角，不虚构内二面角。公式栏列向量分量、点积、模和代入结果。
- **空间向量**：显示空间坐标轴；可选顶点、原点 O 或当前截面交点 P、Q 等作为起终点，读出坐标、向量分量和模（cm）。重合点得到零向量，方向未定义。曲面辅助网格不作为可选棱或平面。

### 抛体与单摆的显示扩展

抛体可分别开关速度合矢量、分速度和频闪点；频闪间隔 Δt 为 0.05–1 s，默认 0.2 s。两种轨迹从 t=0 按同一 Δt 采样，到各自落地为止；不追加一个不等间隔的落地频闪点。轨迹、速度和距离的计算不受这些开关影响。

单摆新增 K(t)、U(t)、E(t)=K+U 三条能量曲线（J），直接采样原有求解状态；对照时可选含阻力摆或理想摆。曲线显示最近 12 s，并标出当前时刻。显示开关、图表对象和频闪间隔不重置运动；播放、暂停与单步和主画布共用模拟时钟。原有阻力函数与修改前的固定轨迹基准保持一致。

### 透镜成像（初中 · 高中）

位于“光的折射与全反射”旁的独立模型卡片。可选凸透镜、凹透镜；焦距大小 1–20 cm、物距 0.5–60 cm、物高 0.5–5 cm。拖动绿色物体，或聚焦画布后按左右方向键调整物距；也可精确输入数值。

使用 `1/u+1/v=1/f`、`M=−v/u`。实正虚负：实物 u>0，凸透镜 f>0、凹透镜 f<0；实像 v>0、虚像 v<0。M>0 正立、M<0 倒立。平行主轴、过光心、过物方焦点三条特殊光线会交于同一像点；凹透镜相应使用延长线。虚线仅表示光线反向延长，不表示实际光线倒着传播。

u=f 时，两条有效出射光平行，无有限位置的像，不能在屏上成像；此时第三条入射线平行透镜平面，不绘制成有限光路。接近焦点时像可超出图窗，保留真实像距和放大率读数并提示。假设薄透镜、近轴、小孔径、空气中成像，忽略像差、厚度、孔径截断与衍射；光路横纵比例不同，所有数值由 cm 坐标计算。参考 [OpenStax 薄透镜](https://openstax.org/books/university-physics-volume-3/pages/2-4-thin-lenses)。

### 弹簧振子的阻尼与受迫振动（高中）

默认仍为原理想解析模型；新增欠阻尼、临界、过阻尼和受迫选项，初始位移 x₀≥0、初速度 v₀=0。新模式求解 `mx″+bx′+kx=F₀cos(2πf驱t)`，自由振动右端为零。b=2ζ√(km)，单位 N·s/m；欠阻尼 0<ζ<1、临界 ζ=1、过阻尼 ζ>1。`physics.js` 中 RK4 每个子步≤1/240 s，与屏幕尺寸无关。质量 kg、位移 m、速度 m/s、刚度 N/m，能量 J。

位移—时间图读取同一求解状态、同一时刻，显示最近 12 s；自由振动附正负衰减边界。欠阻尼包络为 `±|x₀|exp(−ζω₀t)/√(1−ζ²)`（v₀=0），并非直接使用 ±x₀exp(−ζω₀t)。临界边界为 `±|x₀|(1+ω₀t)exp(−ω₀t)`；过阻尼使用两个负实根构成的单调衰减解。临界和过阻尼不再往复振荡。

受迫模式调整驱动力幅度 F₀（0–10 N）和驱动频率（0–5 Hz），另绘制长期稳态响应 `A(f)=F₀/√[(k−m(2πf)²)²+(b2πf)²]`；标出固有频率 `f₀=√(k/m)/(2π)` 和当前驱动频率。可用按钮设为 f₀。当 ζ<1/√2，位移响应峰在 `fᵣ=f₀√(1−2ζ²)`；阻尼更大时没有非零频率峰。零阻尼且 f=f₀、F₀>0 时没有有限稳态，图上断开渐近位置并提示；F₀=0 时响应为零。共振图是稳态响应，不能作为当前瞬态振幅。假设线性弹簧、黏性阻尼、忽略弹簧质量与干摩擦；不模拟超出胡克定律的真实形变。参考 [阻尼振动](https://openstax.org/books/university-physics-volume-1/pages/15-5-damped-oscillations)与[受迫振动](https://openstax.org/books/university-physics-volume-1/pages/15-6-forced-oscillations)。

### 扩展字段与 v1 兼容

课堂配置仍为 `version:1`，新增字段保存在原 params 对象中。几何默认 `study:'basic'`、`angleKind:'line-line'`，选棱、选面、向量起终点和三视图选择都有默认值；无效选择按当前几何回退。抛体默认三个显示开关均打开、Δt=0.2 s；单摆默认显示能量图并选择当前实际摆；弹簧默认 `springMode:'ideal'`、ζ=0.2、f驱=0.7 Hz、F₀=1 N（理想模式不使用这些驱动参数）。新字段可随课堂保存和导出恢复，历史曲线、积分进度和板书仍不存入配置。

## 圆锥曲线（高中）

支持椭圆、双曲线、抛物线与中心/顶点平移。椭圆使用 `(x−h)²/a² + (y−k)²/b² = 1`，要求 `a>b>0`；`a=b` 单独显示为圆。双曲线使用 `(x−h)²/a² − (y−k)²/b² = 1`，要求 `a,b>0`。抛物线使用 `(y−k)² = 2p(x−h)`，`p>0` 表示焦点到准线的距离，顶点到焦点距离为 `p/2`，抛物线没有中心。

图中标出焦点、顶点、准线与双曲线渐近线。拖动 P，或用参数角 / 参数 t 调整 P，可核对两焦点距离和 `2a`、距离差绝对值 `2a`，以及到焦点与对应准线的距离比 `e`。横纵轴等比例，所有距离均用数学坐标计算，长度为抽象坐标单位。

“统一定义”固定焦点 `F=(h,k)` 和半通径 `ℓ=p`，使用 `r=ℓ/(1+e cosθ)`；`e>0` 时对应准线 `x=h+ℓ/e`。`e=0` 显示半径 ℓ 的圆极限，没有有限准线；`e=1` 显示向左开的抛物线。双曲线按有符号 r 显示两支，渐近方向不作为有限点。该模式的平移控制焦点；接近 `e=1` 时中心与远端可移出固定视窗。可保留上一条曲线进行对照。

## 导数与切线（高中）

可选最高三次的多项式 `Ax³+Bx²+Cx+D`，或 `A sin x+D`、`A eˣ+D`、`A ln x+D`、`A/x+D`。系数、切点 x₀、割线增量 h 可调；拖动原函数上的 P 会联动导函数中 `(x₀,f′(x₀))`。两幅图宽屏并排、窄屏上下排列，横轴均为 `[−6,6]`；纵轴按切点附近独立缩放，超出视窗的曲线裁切。x、y 无量纲，sin 的自变量使用弧度。

紫色为切线，蓝灰虚线为割线；“h 减半”可逐步逼近 0。`h=0` 时割线商未定义，只显示切线极限。中心差分使用独立步长 δ：普通函数取 `∛ε·max(1,|x₀|)`，ln 与 1/x 取 `∛ε·|x₀|`，ε 为双精度机器精度；显示解析导数、差分导数与绝对差，避免把 h 与 δ 混淆。

`ln x` 要求 `x>0`，`1/x` 要求 `x≠0`；即使系数 A 为 0 也保留原定义域。非法切点输入被拒绝并提示；导入定义域外的配置时切线、割线及 h 减半禁用，允许改正 x₀。靠近 x=0 时提示边界，跨越 0 的割线禁用。单调区间、导数零点、极值及非极值驻点仅列当前横轴范围内，常数函数不列孤立极值。

新增参数仍保存为 `version:1`。导数模型的 x₀、h 等参数保留至 10 位小数；圆周、电场、四季、碰撞、电磁感应、双缝和透镜模型也采用 10 位小数读取；弹簧参数采用 14 位小数，以支持零阻尼的精确共振边界，其余模型保持原有 4 位小数读取方式。小于输入精度而会被舍入到 x=0 的 ln / 1/x 切点会被拒绝；x³ 在水平切线两侧同向递增，不把该驻点误判为极值或单调性的断点。

## 电磁感应（高中）

提供磁铁靠近 / 远离线圈、线圈进出匀强磁场两种情景。可调磁场强度尺度 B₀（0–1 T）、往返周期 T（2–20 s）、回路电阻 R（0.1–20 Ω），切换朝向线圈的磁极或匀强磁场方向。播放、单步或时间条选取一个往返周期中的时刻；也可点击 / 拖动时间图，画布聚焦后用左右方向键前后移动 0.05 s。到周期末端停止，再播放从头开始。

单匝闭合线圈，面积 `A=0.20×0.15=0.030 m²`，数值使用解析磁通函数及其时间导数：`ε=−dΦ/dt`、`I=ε/R`。磁通量、电动势、电流的单位分别为 Wb、V、A。绿线 Φ(t) 和橙线 ε(t) 共享时间轴和当前时刻标记，纵轴分别注明单位，不混淆物理量。正电流在正视图中逆时针；楞次定律仅解释方向，不用于估算数值大小。[法拉第定律](https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law)、[楞次定律](https://openstax.org/books/university-physics-volume-2/pages/13-2-lenzs-law)为公式参考。

磁铁模式采用教学有效磁通函数：

```text
z(t) = 0.29 + 0.21 cos(2πt/T) m
Φ(t) = sB₀A[1+(z/ℓ)²]^(−3/2)，ℓ=0.20 m
```

z 为磁铁近端到线圈平面的示意距离，范围 0.08–0.50 m；B₀ 是有效场强尺度。该函数用于展示磁通变化，并非有限条形磁铁的精确场解或实测数据。正法向 +n 从线圈指向磁铁，正视图从磁铁侧观察；N 极朝线圈时 `s=−1`，S 极时 `s=+1`。磁铁最近点的瞬时速度为 0，因此磁通量绝对值最大时，电动势恰为 0；靠近与远离使电动势反号。

线圈模式为宽 0.20 m、高 0.15 m 的矩形线圈，中心 `x(t)=0.40−0.60cos(2πt/T) m`，正向匀强磁场朝屏幕外，范围 `0≤x≤0.80 m`，`Φ=sB₀A重叠`。完全进入磁场后平移，磁通量恒定、电动势为 0；进出边界时有感应。理想锐边处磁通连续，导数的左右极限不同，瞬时 ε、I 明确显示“不定义”，曲线分段且单侧端点为空心；实际边缘场会使过渡平滑。B₀=0 时磁通恒为 0，不再有导数不定义的问题。

忽略自感、互感、导线厚度、边缘场以及感应电流对运动的反作用，外力维持给定往返运动；不模拟电路暂态。暂停和拖动表示冻结或选取既定运动的时刻，不额外模拟启停过程。示意图尺寸不能作为测量标尺，所有读数均由 SI 坐标计算。课堂配置保存两种情景、方向与参数，恢复时从 t=0 开始。

## 双缝干涉（高中）

可调波长 λ（380–750 nm）、缝间距 d（0.1–1 mm）、缝屏距离 L（0.5–5 m）、屏幕半宽 X（1–30 mm）和屏上测量位置 x。屏幕条纹与强度曲线共享以 mm 标注的横坐标；点击或拖动两者可选取 P，左右方向键以 0.1 mm 移动。缩小屏幕半宽时测量点与控件范围同步限制到 `[-X,X]`。RGB 波长配色可关闭，属于色彩示意。

假设两条无限窄狭缝发出同频、同相、等振幅相干单色光，忽略单缝衍射包络和偏振差异。在 `d≪L、|x|≪L` 的远场小角近似下，先将全部输入换算为 SI，再计算：

```text
δ ≈ dx/L
I/Imax = cos²(πdx/(λL))
Δx = λL/d
亮纹：x=mΔx；暗纹：x=(m+½)Δx，m∈ℤ
```

Imax 是两束光在亮纹处的合强度。中央亮纹为 x=0；默认 λ=550 nm、d=0.3 mm、L=1.5 m 时，间距为 2.75 mm。画面间距、测量点和强度曲线来自相同计算；不混入不同几何近似。理论说明见 [OpenStax：杨氏双缝干涉](https://openstax.org/books/university-physics-volume-3/pages/3-1-youngs-double-slit-interference)。

可选参数保证 `d/L≤0.002、|x|/L≤0.06`。读数另给出最大观察角及相对于精确几何路程差的最大相对误差。精确路程差只用于核对近似，采用有理化形式避免中心附近相减损失精度；不用于改变干涉条纹的位置。页面同时显示视窗边缘光程差误差占波长的比例，超过 λ/10 时提示缩小视窗或增大屏距：较小的相对几何误差也可能使高级次条纹明显移位。亮暗极值处仅清除机器舍入残差。像素条带使用区间平均强度，强度曲线仍为点强度；过密时提示减小屏幕半宽，避免把混叠纹当作真实条纹。380–750 nm 是本模型采用的可见光示意范围，RGB 不是光谱或人眼色度测量。

## 碰撞与动量守恒（高中）

一维两球正碰，可调质量 m₁、m₂（0.1–10 kg）、初速度 u₁、u₂（−10–10 m/s）和恢复系数 e（0–1）。球 1 初始在左，中心位置 −3 m；球 2 在右，中心位置 3 m；半径均固定为 0.25 m，质量与半径独立。向右为正，只有 `u₁>u₂` 才会碰撞，接触时刻为 `t碰=5.5/(u₁−u₂)`。同向追赶和两球都向左运动均可能相遇；同速、背向运动或左球追不上右球时明确提示“不会碰撞”，碰后栏留空。

用动量守恒和恢复系数定义直接求解，无动画步长误差：

```text
M = m₁ + m₂
P = m₁u₁ + m₂u₂
v₁ = [P − m₂e(u₁−u₂)] / M
v₂ = [P + m₁e(u₁−u₂)] / M
ΔK = ½μ(1−e²)(u₁−u₂)²，μ = m₁m₂/M
```

显示两球各自及总动量（kg·m/s）、动能（J）、碰撞前后速度（m/s）、总动量差和动能损失。读数保留 4 位有效数字，例如 `1.000`、`5.500`；不删除末尾零。内部运算使用未舍入值，不能直接相加界面中已舍入的分量；零附近仅清除机器舍入残差，零显示为 `0.000`。碰后读数是当前参数的解析预测；动画到达接触时刻后才改变速度。

e=1 时为弹性碰撞，总动能守恒；e=0 时两球接触后保持共同速度，损失的平动动能最多，转为内能、形变等，不代表总能量消失。质量必须为正，输入零或负质量会被拒绝；导入的越界参数按既有规则限幅。预设有等质量弹性、完全非弹性、同向追赶、不会碰撞。理论背景见 [OpenStax：碰撞类型](https://openstax.org/books/university-physics-volume-1/pages/9-4-types-of-collisions)。

时间图可切换速度—时间和位置—时间，切换不重置演示时刻。速度在接触瞬间跳变，虚线只标记跳变，不表示有限加速度过程；位置保持连续。时间条可来回查看，“到碰撞时刻”可直接观察接触事件，尤其适用于很慢的追赶；演示末端自动暂停，再点播放可重播。无碰撞时演示 6 s；相遇时展示至 `max(3,1.5t碰+0.5)` s，这只是观察时窗，运动方程不受其限制。

简化条件为光滑水平轨道、无空气阻力、无外界水平冲量；忽略自转、形变和碰撞持续时间，不设置墙壁。上方视窗随两球平移和缩放，球的最小绘制尺寸用于辨认，坐标与接触半径仍以物理量计算；窗口大小不改变结果。课堂配置仍为 v1，保存参数和图表类型，恢复时从 t=0 开始。

## 圆周运动与向心力（高中）

参数为质量 m（0.1–5 kg）、半径 r（0.3–5 m）和角速度 / 初始角速度 ω（0–20 rad/s）；竖直模式还可调 g（1.62–15 m/s²），选择从最高点或最低点出发。画面显示切向速度、向心加速度和径向合力方向，大小以下方读数为准，不能比较不同量纲箭头的长度。

水平模式是光滑水平面上的质点，重力与支持力抵消，用 `θ=ωt` 的解析解显示匀速圆周。读数满足 `a向=v²/r=ω²r`、`F向=mω²r`，并显示周期、频率与机械能；ω=0 时明确显示无周期。

竖直模式用无质量、不可伸长的柔绳约束质点，忽略空气阻力。角度从最低点起算，`θ″=−(g/r)sinθ`、`T=m(rω²+g cosθ)`，复用 `physics.js` 中的 RK4，内部步长不超过 1/240 s。最高点 `v临界=√(gr)`；最低点完成整周所需的临界初速度为 `√(5gr)`。临界按钮覆盖整个参数范围，初始机械能条件用于防止积分舍入误差造成假松弛。

最高点初速度低于临界值时立即提示绳松弛；途中张力将变负时，在积分步内定位 T=0 并停止。画面停止绘制后续圆周，隐藏无效向心量，不模拟松弛后的自由飞行或再次绷紧。最低点的小初速度可以产生绷紧状态下的往复摆动，不一律判为松弛。竖直模式的向心力是合力的径向分量，不等于绳张力，也不等于总合力。

## 电场线与等势线（高中）

可放置 1–3 个固定点电荷；电荷量为 −5 到 5 nC，坐标以 m 表示。电荷可拖动，也可逐个输入坐标，中心至少相距 0.35 m；导入或启用的电荷重叠时，后加入的电荷会移到空闲预设位置。q=0 表示不产生电场。预设包含单个电荷、等量同号、等量异号、电偶极子，后者仍按两个点电荷精确叠加，不使用远场近似。

展示真空中三维点电荷静电场的 z=0 截面。使用 `k=8.99×10⁹ N·m²/C²`，先将 nC 转为 C，再计算 `E=kΣqᵢ(r−rᵢ)/|r−rᵢ|³`、`V=kΣqᵢ/|r−rᵢ|`；无穷远电势为 0。点击画布测量 P，显示场强矢量、分量与大小（N/C）、电势（V）；测量点坐标也可输入。读数由解析式直接计算，不从屏幕上的曲线估计。

距任一非零电荷不超过 0.16 m 的区域避让，不用软化公式替代奇点，也不显示无穷大读数。电场线箭头从正电荷或区域外指向负电荷或区域外；线条数量不作为场强的定量标尺，电场线不是粒子轨迹。到达电荷避让区、`|E|≤10⁻⁸ N/C`、绘图区边界、累计长度 40 m 或 1400 步时终止。

场线绘图区固定为 `x∈[−6,6] m、y∈[−4.5,4.5] m`，与窗口尺寸无关。紫色虚线为等势线，使用 0.1 m 数学坐标网格插值，级别列在读数下方；场线、等势线可分别隐藏。不模拟介质、边界导体和电荷运动。

## 地球公转与四季（初中 · 高中）

沿圆轨道拖动地球、调节公转位置 λ 或播放，查看节气、示意日期、太阳直射纬度。λ 从春分起算，对应太阳黄经；黄赤交角 `ε=23.44°`，地轴在空间中保持平行，`δ=asin(sinε sinλ)`。支持俯视和高于轨道面 20° 的侧视；放大地球显示昼夜半球、晨昏线、选定纬线及当前极昼极夜范围。

选择观察地纬度 φ，联动显示几何昼长 `D=24·acos(−tanφ tanδ)/π` 和正午太阳高度 `H=90°−|φ−δ|`。超出反余弦定义域时分别按极昼、极夜处理。春秋分非极点昼长为 12 h；恰好位于南北极时，点状太阳中心全天在地平线上，显示特殊边界状态，不强行填入 12 h。夏至、冬至的直射纬度分别为 +23.44°、−23.44°。

与“太阳高度角与日影”共用 `solarPosition` 公式；“用此纬度查看日影”携带所选纬度和当前直射纬度跳转。昼夜判定、经纬线和极昼极夜范围都在球面坐标中计算，再投影绘图。

忽略轨道偏心率、岁差、章动、大气折射、太阳视半径和地形；太阳光为平行光，地球和轨道不按比例绘制。节气按太阳黄经每 15° 一项，日期按常用节气日期插值，仅作教学示意，不是任何年份的精确历表。1× 播放每秒推进 15°，不是实际公转时间。拖动按 0.1° 调整，节气位置不显示浮点残差。

## 三维操作

拖动画布旋转；滚轮或双指缩放。上方提供立体、正视、俯视、侧视按钮。点击画布后，方向键旋转，加减键缩放。自动旋转可随时暂停。R 恢复默认模型和视角。

开启板书后，拖动改为书写，不再旋转模型；关闭板书后恢复旋转。截图包含当前图形、公式和数值。主画布采用三维坐标投影与面深度排序，曲面由面片近似绘制，但体积和表面积使用解析公式。

## 课堂保存与旧版配置

本地存储只属于当前浏览器环境，不进行账号同步。相机视角、尺寸、几何体类型和三维显示选项会进入配置文件；几何与其余原有模型的数值保留四位小数；导数和新增 science 模型为十位小数；弹簧为十四位小数。板书、动画运行进度和保留的对照曲线不进入课堂配置；四季模型的当前公转位置作为参数保存。

配置文件仍采用兼容的 `version: 1` 数据格式，可导入上一版导出的知象 JSON 文件。更换 HTML 文件名、打开方式或浏览器，可能改变本地存储的归属；请先在旧版导出课堂，再在新版“我的课堂”中导入。不要依赖不同 HTML 文件之间自动共享浏览器数据。

浏览器不允许本地存储时，页面会提示，仍可使用模型和导出配置。

## 文件结构

- `index.html`：页面框架；脚本区块由 `build.py` 按清单更新，分文件版直接加载本地脚本。
- `styles.css`：页面样式、响应式布局、高对比度与大字号样式。
- `app.js`：模型库、页面状态、通用交互、收藏、课堂配置和模型生命周期调度，不再保存各模型定义。
- `model-registry.js`：`ZhixiangModels.register/get/list` 注册表，校验模型字段并提供通用生命周期默认行为。
- `models/manifest.json`：22 个模型的 id 和加载顺序。
- `models/<id>.js`：对应模型的 `id`、`cat`、`level`、`title`、`desc`、`tags`、`defaults`、`controls`，以及 `draw`、`readout` 等钩子。
- `models/shared.js`：现有模型共用的参数控制、绘图辅助、求解状态与交互控制器。
- `geometry.js`：三维几何计算、投影、网格缓存与自适应细分、展开和交互，以及独立于画布的圆锥曲线与导数计算 API。
- `physics.js`：阻力、RK4 圆周运动、一维碰撞、电磁感应、双缝干涉、电荷场与等势线、透镜、振动、太阳高度与四季的纯计算函数；不依赖窗口或画布。
- `sharing.js`：课堂参数的 URL 编解码、校验、分享弹窗和复制操作。
- `vendor/qr.js`、`vendor/QR-LICENSE.txt`：随项目打包的二维码实现及许可，不依赖 CDN。
- `accessibility.js`：显示设置、本地持久化、读数标签节流与减少动态效果处理。
- `chart-export.js`：曲线数据快照、CSV / SVG 生成与下载；调用模型的 `exportData` 钩子。
- `desktop-ui.js`：浏览器下载页与桌面“版本与更新”页面，按需获取清单或调用原生更新桥接。
- `desktop-version.js`：由 `build.py` 从 `desktop/release.json` 生成的页面版本信息，不手动编辑。
- `assets/zhixiang-logo.png`：192×192 压缩 Logo，桌面导航与手机顶部共用。
- `assets/original/zhixiang-logo.png`：Logo 原图归档，不参与页面构建。
- `assets/support-qr.jpg`：可选的个人收款码，不进入公开仓库；本地存在时支持弹窗显示，单文件版会内嵌。
- `standalone.html`：构建生成的单文件完整网站，不进入源码仓库，不直接编辑。
- `build.py`：读取模型清单、更新页面脚本区块，再合并本地样式、脚本、压缩 Logo 与可选收款码；无第三方 Python 依赖。
- `macos/build.sh`、`macos/icon.png`：生成 macOS 应用；系统图标与导航 Logo 分别维护。
- `windows/desktop/`、`windows/build.py`：Windows 入口、独立应用图标及打包程序，生成 x64 免安装 ZIP。
- `desktop/release.json`、`desktop/prepare_release.py`、`desktop/publish_release.sh`：统一版本配置、本地发布包与清单准备，以及先 GitHub 后 Cloudflare 的发布流程；准备步骤不联网发布。
- `tests/run_all.sh`、`tests/run_all.py`：统一构建、预览服务、回归与结果汇总入口。
- `tests/runtime.cjs`：Playwright 与浏览器路径检查、测试地址和结果目录配置。
- `tests/check_*.cjs`：当前数值与实际浏览器回归；`tests/package.json` 只声明测试工具依赖。
- `tests/test_browser.py`、`TEST_REPORT.md`、`tests/results.json`：历史测试脚本与记录，不能代替本轮执行。
- `.github/workflows/test.yml`：push 和 pull request 时运行完整回归并上传测试产物。
- `output/playwright/`：本机新生成的结果、截图和下载验证文件，不进入源码仓库。

### 新增或修改模型

保持原生 HTML/CSS/JavaScript 与普通脚本加载方式，支持静态托管和 `file://`。修改现有模型时编辑对应模块；新增模型时创建 `models/<id>.js`，调用 `ZhixiangModels.register({...})`，提供必需元数据与 `draw/readout`，再将 id 加入 `models/manifest.json`。按需实现 `renderControls`、`normalize`、`setParam`、`reset`、`advance`、`bind`、`thumbnail`、`exportData` 等钩子，新增模型不需要改动 `app.js` 核心分发。

完成后运行构建，再检查分文件页与单文件页：

```sh
python3 build.py
```

`build.py` 会同步 `index.html` 中 `scripts:start` / `scripts:end` 之间的脚本标签，并按同一顺序合并。不要手动编辑该脚本清单或 `standalone.html`。自定义输出位置：

```sh
python3 build.py --output ./dist/zhixiang.html
```

发布分文件版时，保留 `index.html`、`styles.css`、根目录运行脚本、`models/`、`vendor/` 和所需 `assets/` 的相对路径；不需要上传 `assets/original/`、测试和构建工具。也可只发布构建好的单文件版。macOS 与 Windows 打包程序均调用 `build.py`，模型与压缩 Logo 会一起进入内置离线页面。

## 参考与范围

模型说明弹窗列有理论参考及计算假设。新增几何体的基础体积、表面积参考 OpenStax《Prealgebra 2e》9.6；正棱锥表面积按各三角形侧面求和，截面面积按平面内多边形计算，展开图通过刚性旋转构造。

本站不是任意几何体建模软件，没有自由点线面作图、三维文件导入或无限模型生成。圆柱、圆锥、球的曲面显示存在离散面片近似。教学时以公式、单位和模型说明为准。

## 本地预览

在项目目录执行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

打开 http://127.0.0.1:8000/index.html 。停止服务器时按 Ctrl+C。

## 回归检查的运行方式

网站运行不需要 npm；开发回归需要 Python 3.9+、Node.js 22+ 与测试用浏览器。首次准备：

```sh
npm ci --prefix tests
npx --prefix tests playwright install chromium
```

执行核心检查：

```sh
bash tests/run_all.sh
```

入口依次执行 `build.py` → 启动自己的本地临时端口服务器 → `check_models.cjs` → `check_resistance_math.cjs` → `check_resistance_browser.cjs` → 关闭服务器，不占用已有的 8000 端口服务。脚本结束或检查失败时均清理自建服务器，并写入本次总数、通过、失败和环境错误。

执行全部 `check_*.cjs` 回归（先执行上述三项，再执行其余脚本）：

```sh
bash tests/run_all.sh --extended
```

Windows 可直接运行 `py -3 tests/run_all.py --extended`。每次结果写入新的 `output/playwright/run-<UTC时间戳>/`，其中 `summary.json` 为汇总，各脚本日志、截图和下载内容保存在同一批次目录。不覆盖或沿用旧 `TEST_REPORT.md` 的结论；非零退出与环境错误不会记为通过。

浏览器路径不写死：如需使用已安装的 Chrome / Chromium，设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 为其可执行文件；Playwright 安装在其他位置时，设置 `PLAYWRIGHT_MODULE_PATH` 为其包目录。缺少模块或浏览器会给出安装 / 路径提示。统一入口自动传入 `TEST_BASE_URL` 和 `TEST_OUTPUT_DIR`；单独运行 `node tests/check_models.cjs` 等浏览器脚本时，请先启动本地预览，或自行指定这两个环境变量。

`.github/workflows/test.yml` 在 push / pull request 上安装测试依赖与 Chromium，运行相同的 `--extended` 入口，并保留 `output/playwright/` 产物 14 天。工作流文件已加入；本次尚未在 GitHub 执行，不能把本地结果视作 CI 通过。

### 本轮实际执行结果（2026-10-03）

- 模型迁移前核心回归：252/252 通过。
- 两个模型试迁移后 `check_models.cjs`：208/208 通过。
- 全部模型迁移后 `check_models.cjs`：208/208 通过，与迁移前同一脚本结果一致。
- 迁移前后 132 项快照比较：零差异。
- C1–C7 阶段统一回归：963/963 通过，记录为 `output/playwright/run-20261002T171247.750936Z/summary.json`，保留作中间阶段记录。
- 该阶段最终统一入口 `bash tests/run_all.sh --extended`：**17 组、1157/1157 通过，0 失败、0 环境错误**；自建服务器已关闭。最终结果为 `output/playwright/run-20261002T192112.274797Z/summary.json`，包含桌面更新、下载页、发布生产者，以及新增的 5 项输入提示回归。

`check_maintenance_browser.cjs` 的 133 项已覆盖分享链接参数往返与输入边界、二维码独立解码、显示设置与键盘、减少动态效果、画布标签更新、真实下载的 CSV 行数 / 表头 / 单位和 SVG 内容，并包含独立数值核对。旧阻力基准和曲面网格交叉校验继续通过。已查看分享弹窗与导出的 SVG；缺少 Playwright、缺少浏览器的两种环境检查均以退出码 2 给出明确提示，没有报错堆栈。

早期全套回归发现科学模型的非法输入提示会被随后一帧的读数刷新清空。现已将输入错误保留至参数改正、重置或切换模型，并继续更新独立的物理状态提示；新增 5 项回归，电磁感应 / 双缝浏览器检查最终为 73/73。此修复没有改变物理计算函数或数值模型。下载页测试也已修正 `target="_blank"` 附件下载的事件监听归属，同时监听原页和新弹窗；最终下载页 31/31 与全部模型检查在上述同一轮通过，早期失败日志不是最终结果。

统一检查在本机 Node / Chrome 中完成；另执行了 Swift / WebKit 与 macOS 上的实际 Electron 流程，具体边界见“桌面更新已完成验证与范围”。未验证 Windows 真机、Safari 浏览器或手机真机，未执行 GitHub CI。GitHub Release 与 Cloudflare 已于 2026-10-05 发布并核验，发布后的独立检查见下方交付记录；1157 项是上述完整回归批次的结果，不与后续独立检查重复合计。

### 本轮改动文件与主要函数

| 文件 | 主要函数与改动 |
| --- | --- |
| `model-registry.js`、`models/manifest.json`、`models/<id>.js`、`models/shared.js` | `ZhixiangModels.register/get/list` 注册与校验；22 个模型分别拥有元数据、`draw/readout` 及所需生命周期钩子，共享旧控制器保留在 `shared.js`。先迁移两个模型验证，再迁移其余模型。 |
| `app.js` | `modelById`、`safeParams`、`readout`、`drawThumbnail`、`renderControls`、`setParam`、`resetSolver`、`updateSimulation`、`drawStage` 改为调用注册模型的钩子；`renderClasses`、`renderDemo`、`routeFromHash` 接入分享、导出与显示功能，保持课堂配置版本。 |
| `geometry.js` | `curvedResolution` 控制圆周 / 纬向分段与上限；`solidMesh` 缓存曲面网格，`createSolidMesh` 生成对应精度的面片；绘制复用投影结果，`solidData` 仍给出解析体积 / 面积。 |
| `sharing.js`、`vendor/qr.js`、`vendor/QR-LICENSE.txt` | `shareBaseURL`、`encodeShareHash`、`decodeShareParams`、`makeShareLink`、`shareQR`、`updateSharePreview`、`showShareLink` 处理参数链接、地址与长度校验、二维码和复制反馈；二维码实现与许可随包提供。 |
| `accessibility.js`、`styles.css` | `applyDisplayPreferences`、`displayDialog`、`isEditingModelInput`、`updateCanvasDescription`、`contrastInk`、`accessibleCanvasContext` 提供独立保存的显示设置、输入保护、画布标签节流及图线 / 文字显示；样式增加高对比度、大字与新增弹窗适配。 |
| `chart-export.js`、7 个模型模块 | `functionChartData`、`derivativeChartData`、`projectileChartData`、`pendulumChartData`、`waveChartData`、`springChartData` 提供数据；`csvForChart`、`svgForChart`、`exportDataDialog`、`downloadChart` 负责快照、格式和实际下载；模型通过 `exportData` 接入。 |
| `index.html`、`build.py`、Logo 资源、`macos/build.sh`、`macos/icon.png` | `build` 读取清单、同步页面脚本区块并按顺序内嵌资源；压缩导航 Logo，归档原图，macOS 系统图标改用独立源图。`standalone.html` 和两种桌面内置页面由构建生成。 |
| `tests/run_all.sh`、`tests/run_all.py`、`tests/runtime.cjs`、`tests/package*.json` | `main` 负责构建、自建服务器、顺序运行、计数与清理；`loadPlaywright` 检查模块 / 浏览器并给出安装提示；测试依赖与应用运行依赖分开。 |
| `tests/check_*.cjs`、`tests/benchmark_mesh.cjs`、`.github/workflows/test.yml` | 回归脚本使用统一地址 / 输出目录；新增维护功能、下载内容和曲面检查，保留既有数值断言；性能脚本记录硬件、节流和逐帧样本；CI 在 push / pull request 执行相同入口。 |
| `README.md` | 更新当前目录、模型扩展方式、功能限制、体积与性能实测、回归方法和本轮结果；旧模型说明与历史记录保留。 |

## 历史回归记录说明

下方各模型增补批次的测试数量、文件位置和执行环境保留作历史记录；包括最末的 830 项结果在内，均不是本轮 C1–C7 的最终结果。当前运行方式和本轮进展以上节为准。旧理论核对参考 [OpenStax 气体动理论](https://openstax.org/books/chemistry/pages/9-5-the-kinetic-molecular-theory) 与 [非线性单摆周期](https://openstax.org/books/calculus-volume-2/pages/6-4-working-with-taylor-series)，模型参数面板也保留相应资料。

## 访问统计与后台

网站 `https://zhixiang-classroom.pages.dev/` 匿名统计页面浏览、模型打开（含入口：卡片、分享链接、课堂、做题）、功能按钮（大屏、保存课堂、截图、导出参数/数据、复制分享链接、板书、做题提交、下载桌面版）和搜索词（停顿 1.5 秒后记录，最多 40 字）。站长在 `/admin/` 用密码登录查看趋势、模型排行、功能使用、来源、设备和搜索词，并可导出按天汇总的 CSV。

隐私边界：
- 只在 `https` 的正式域名上发送；`file://`、本地预览、单文件版和桌面版都不发送。浏览器开启 Do Not Track 或 Global Privacy Control 时不发送。
- 不使用 cookie，不保存 IP 或 User-Agent 原文。访客数按“当日随机盐 + IP + UA”的哈希去重，盐每天更换并删除旧盐，跨天无法关联。
- 不上传参数值、题目文本、课堂名称、收藏或板书。服务端只接受白名单内的事件类型、页面、功能名和模型 id。
- 原始事件保留 180 天。

结构：
- `analytics.js`：前端上报（`navigator.sendBeacon`），由 `build.py` 放在 `app.js` 之前。
- `functions/api/event.js`：接收事件；`functions/api/admin/*`：登录、退出、登录状态、统计、CSV；`_middleware.js` 统一校验同源与会话。
- `server/`：共享逻辑（白名单、PBKDF2、会话签名、访客哈希、锁定、统计）。`server/models.js` 由 `build.py` 从模型清单生成。
- `admin/`：后台页面，原生 JS 和手写 SVG，不加载外部资源；`desktop/prepare_release.py` 把它复制进 `dist/` 并加上禁止缓存、禁止索引、禁止嵌入和 CSP 响应头。
- `schema.sql`：D1 表结构。

登录安全：密码只以 PBKDF2-SHA256（10 万次迭代）哈希存于 Cloudflare Secret `ADMIN_PASSWORD_HASH`；会话为 HMAC 签名的 `HttpOnly; Secure; SameSite=Strict` cookie，12 小时过期，密钥为 Secret `SESSION_SECRET`。同一来源连续输错 5 次锁定 15 分钟。更换 `SESSION_SECRET` 可让所有登录立即失效。

### 一次性配置（Cloudflare）

```sh
npx wrangler d1 create zhixiang-analytics
npx wrangler d1 execute zhixiang-analytics --remote --file schema.sql
python3 tools/hash-password.py
```

1. 在 Cloudflare 控制台 → Workers 和 Pages → `zhixiang-classroom` → 设置 → 绑定，添加 D1 数据库，变量名填 `DB`，选 `zhixiang-analytics`。
2. 同一项目 → 设置 → 变量和机密，添加两个“密钥”类型变量：`ADMIN_PASSWORD_HASH`、`SESSION_SECRET`，值取自 `hash-password.py` 的输出。密码建议至少 12 个字符；改密码时重新运行脚本并替换 `ADMIN_PASSWORD_HASH`。
3. 重新部署后打开 `https://zhixiang-classroom.pages.dev/admin/`。

### 本地预览与测试

`node tests/admin-dev-server.cjs 8788` 在本机用真实的 Functions 代码和内存 SQLite 模拟线上，打开 `http://127.0.0.1:8788/admin/`，本地密码为 `local admin password`（仅本地开发）。加 `--seed` 会生成演示用的虚构数据，不能当作真实统计。

`tests/check_analytics_server.cjs` 用 `node:sqlite` 替身覆盖接口校验、隐私、登录锁定、会话与统计；`tests/check_analytics_browser.cjs` 覆盖网站上报内容、请勿追踪，以及后台登录、仪表盘、窄屏与深色模式。两者由 `tests/run_all.sh --extended` 自动收集。

## 桌面下载、更新与发布

网站的 `#downloads` 页面使用 `desktop/latest.json` 显示 macOS Apple 芯片版和 Windows x64 版的下载信息。安装包存放在 GitHub Release，页面与更新清单使用 Cloudflare Pages；下载包无需 GitHub、Cloudflare 或 ChatGPT 账号。桌面模型运行仍可离线；主动检查或下载更新时需要联网。

桌面更新区分页面与原生壳。页面更新在下载后核对大小和 SHA-256，再载入新页面；壳版本低于 `minimumShellVersion` 时，转向完整桌面包下载。更新不改变 `version:1` 课堂配置格式。跨设备或更换应用前仍建议先导出课堂备份。

浏览器导航和页脚提供“下载桌面版”；清单未发布、请求失败或内容无效时，页面显示具体提示并保持下载按钮禁用，不拼接尚未验证的安装包地址。桌面导航改为“版本与更新”，显示内容版本和程序版本，点击“检查更新”后才由原生程序发起请求。旧桌面壳没有更新入口，需要先下载本次完整包；之后兼容的模型和页面变更可通过页面更新获得。

页面更新经用户确认后安装，失败保留当前版本；启动时只检查本机缓存，缓存损坏或不兼容则回到内置页面。Windows 保持固定 `zhixiang://app/index.html` 来源；macOS 在原始本地文件 URL 下装载更新内容，以沿用现有收藏、课堂和显示设置。未保存的板书、参数和动画进度不会作为更新状态迁移，应先保存课堂。

### 桌面更新改动文件与主要函数

| 文件 | 主要函数与作用 |
| --- | --- |
| `desktop-ui.js` | `desktopVersionParts`、`compareDesktopVersions`、`validateDownloadManifest` 验证版本与下载地址；`desktopManifestURL`、`loadDesktopDownloads` 限时按需读取清单；`checkDesktopUpdates`、`renderDownloads` 区分浏览器下载页和桌面更新页，防止重复检查。 |
| `desktop-version.js`、`desktop/release.json`、`build.py` | `build` 从单一版本配置生成页面版本常量，纳入分文件加载与单文件构建；页面、发布清单和原生壳共用同一版本来源。 |
| `app.js`、`index.html`、`styles.css` | `renderLibrary`、`mobileNav`、`routeFromHash` 接入 `#downloads` 路由和桌面状态，增加导航 / 页脚入口、下载卡片与窄屏样式；原模型库入口保留。 |
| `models/shared.js` | `clearScienceInputError`、`updateScienceNotice` 分别管理输入错误和动态物理提示，避免读数刷新清空错误；`bindScienceStage`、`setLegacyParam`、`resetLegacySolver` 在合法操作和重置时清理旧错误。物理计算函数未改。 |
| `windows/desktop/update-service.cjs` | `validVersion`、`compareVersions`、`validateManifest`、`permittedRequest` 固定版本规则与发布地址；`fetchHTTPS` 限时、限量读取；`verifyPage` 校验大小、SHA-256 和 HTML；`createUpdateService` 内的 `recover/check/install/readPage` 管理本地缓存、原子安装与失败回退。无 Electron 依赖，可独立数值 / 文件测试。 |
| `windows/desktop/main.cjs`、`windows/desktop/preload.cjs` | `createWindow` 设置隔离页面与固定协议；`trustedSender` 验证调用来源；`performUpdateCheck`、`checkForUpdates` 处理原生确认、版本提示及刷新。预加载只暴露 `getInfo/checkForUpdates` 两项固定调用，不接收页面传来的路径或下载地址。 |
| `macos/DesktopUpdater.swift` | `DesktopVersion`、`DesktopUpdatePolicy.validate/verify` 验证版本与页面；`DesktopPageCache.read/install` 校验并原子保存缓存；`DesktopBoundedDownload` 处理原生限时 / 限量网络读取和重定向条件。 |
| `macos/ZhixiangApp.swift` | `loadCurrentPage` 通过原始文件 URL 加载内置或缓存页面；`isLocalAppURL`、`userContentController` 限制桥接来源；`checkForUpdates`、`checkUpdatesFromMenu` 提供原生更新操作；导航失败时恢复内置页面。 |
| `windows/build.py`、`windows/package*.json`、`macos/build.sh` | 打包版本配置、更新服务和桥接文件，写入对应壳版本；Windows 构建依赖包含用于本机验证的 Electron，macOS 同时编译更新器。 |
| `desktop/prepare_release.py`、`desktop/publish_release.sh` | `read_config`、`check_file_size`、`verify_native_packages` 校验生产者边界及两包内容；`manifest_for`、`expected_payload`、`verify_release`、`stage_dist`、`prepare` 生成版本产物和部署白名单；发布脚本核对公开 GitHub 资产后才部署网站。 |
| `tests/check_desktop_update.cjs`、`tests/check_downloads_browser.cjs`、`tests/check_release.cjs`、`tests/check_release.py` | 覆盖独立更新服务、真实下载页交互，以及本地发布夹具与生产者 / 消费端一致性；`waitForContextDownload` 在点击前监听原页与新弹窗的实际下载事件；由完整回归入口收集。 |
| `tests/check_em_optics_browser.cjs` | 新增 5 项输入错误回归，核对错误跨帧保留、合法操作 / 重置 / 切换后的清理，以及动态物理提示仍可显示；最终 73 项均通过。 |
| `tests/check_macos_update.sh`、两个 Swift 检查文件、`tests/smoke_electron_update.cjs` | 分别验证 macOS 更新策略及真实 WebKit 存储、实际 Electron 主进程 / 预加载 / 页面更新流程；需具备相应本机运行环境，单独执行。 |

### 桌面更新已完成验证与范围

下表是已完成的不同层次验证。该阶段最终全套为 **1157/1157 通过**，统一记录为 `output/playwright/run-20261002T192112.274797Z/summary.json`；不能将下表与全套数量直接相加，Windows 服务、下载页和发布生产者已纳入该全套。Swift / WebKit 与实际 Electron 流程单独运行。

| 检查 | 已执行结果 | 实际覆盖与边界 |
| --- | ---: | --- |
| macOS 更新策略 / 缓存 | 45/45 | 在 macOS 编译运行实际 Swift 更新器，验证版本、日期、地址、大小、校验和、缓存与下载响应准入；请求响应使用本地夹具，没有连接正式更新服务器。 |
| macOS WebKit 存储 | 4/4 | 使用真实 `WKWebView` 和临时非持久数据存储，核对原文件 URL 装载更新、回退与新建视图后的课堂 / 显示数据连续性；不读写用户真实课堂。 |
| Windows 更新服务 | 72/72 | 在本机 Node 中运行实际更新服务，测试注入的下载响应、本地缓存与文件异常；不代表 Windows 系统 GUI 验证。 |
| 下载页浏览器 | 31/31 | Chrome 实际页面交互、窄屏和错误状态；版本清单及原生桥接使用夹具，不代表公开下载地址已发布。 |
| 发布生产者与脚本 | 86/86 | 临时 ZIP / ASAR、版本与字节上限、地址规则、重复版本、发布顺序；GitHub / Cloudflare 命令用本地替身，并用实际 Windows 解析器读取生产清单。 |
| Electron 实际进程 | 22/22 | 在 macOS 启动真实 Electron 主进程、预加载和渲染页面，实际点击更新、检查 SHA 失败保留旧版、重启加载缓存与课堂保留；HTTPS 响应和原生确认选择使用替身。 |

对应记录：macOS 为 `output/playwright/macos-update-20261003-014541/update-checks.txt`、`storage-checks.txt`；Electron 为 `output/playwright/electron-update-smoke-results.json`；Windows 服务、下载页和发布生产者的最终记录分别为 `output/playwright/run-20261002T192112.274797Z/` 中的 `desktop-update-results.json`、`downloads-browser-results.json`、`release-results.json`。

macOS 的两组检查使用 `bash tests/check_macos_update.sh`；Electron 使用 `node tests/smoke_electron_update.cjs`，需先安装 `tests/` 与 `windows/` 的开发依赖，运行程序可由 `ELECTRON_EXECUTABLE_PATH` 指定。两者是独立本机检查，不由通用 Linux CI 自动运行。上述模拟响应测试与 2026-10-05 的线上服务核验分别记录；仍未在 Windows 真机或完整 macOS 应用中走完公开服务更新流程。

### 单一版本配置

`desktop/release.json` 是版本与发布地址的来源：

- `version`：页面和发布版本，本轮为 `1.1.0`；对应 GitHub 标签 `v1.1.0` 和页面路径 `desktop/releases/1.1.0/standalone.html`。
- `shellVersion`：本次完整桌面包内的原生壳版本，本轮为 `1.1.0`。
- `minimumShellVersion`：运行该页面所需的最低壳版本，本轮为 `1.1.0`。后续仅更新模型时可只提升 `version`，保留兼容的壳版本和最低壳版本；修改壳接口且旧壳不兼容时，应同步提升最低壳版本，并重新提供完整包。
- `publishedAt`、`notes`：发布日期与简洁的改动记录；`websiteURL`、`manifestURL`、`repository` 和 `downloads` 声明发布位置与平台信息。

版本采用三段 ASCII 数字，每段最多 6 位，不允许前导零。更新说明最多 12 项，每项最多 240 个 UTF-16 字符单位（与 JavaScript 字符串长度一致），禁止除 Tab、换行和回车外的 C0 控制字符；页面最多 10 MiB、清单最多 64 KiB、每个完整包最多 2 GiB。准备脚本会在发布前按原生更新器的相同规则拒绝超限内容。

网站固定为 `https://zhixiang-classroom.pages.dev/`、GitHub 仓库固定为 `Jasoniss8/zhixiang-classroom`，两个下载文件名固定为 `Zhixiang-macOS-arm64.zip` 与 `Zhixiang-Windows-x64.zip`。修改这些地址或文件名，需要同时调整并重建 Windows / macOS 更新器；仅修改发布配置会被准备脚本拒绝，避免生成原生程序不接受的清单。

已经准备或发布的同一版本不覆盖不同内容；任何页面或安装包变化都应提升 `version`。页面按版本永久缓存，更新清单使用 `no-store`，两者允许跨来源读取。`desktop/prepare_release.py` 将这些规则写入 `dist/_headers`，采用 [Cloudflare Pages 响应头配置](https://developers.cloudflare.com/pages/configuration/headers/)。同时生成 `dist/_redirects` 的版本页面 200 代理规则，维持清单中的固定 `.html` 地址，避免 Pages 的无扩展名重定向被原生更新器拒绝；页面内容和 SHA-256 不变。

### 构建与准备（不发布）

先安装 Windows 打包依赖（首次执行 `npm ci --prefix windows`），然后按顺序运行：

```sh
python3 build.py
bash macos/build.sh
python3 windows/build.py
python3 desktop/prepare_release.py
```

macOS 构建需要 macOS 和 Xcode 命令行工具。准备脚本仅使用 Python 标准库，验证两个 ZIP、内置页面与当前 `standalone.html` 一致，以及原生壳版本与版本配置一致；发现旧包、损坏包或版本不符时停止。

本轮生成 `output/releases/v1.1.0/`，包含 `Zhixiang-macOS-arm64.zip`、`Zhixiang-Windows-x64.zip`、`standalone.html`、`latest.json` 和 `SHA256SUMS.txt`。清单记录页面与两个下载包的 HTTPS 地址、大小及 SHA-256；平台信息含架构与最低系统。相同版本再次准备只有逐字节一致时才继续，否则要求升版本。准备后可单独复核：

```sh
python3 desktop/prepare_release.py --verify-only
```

`dist/` 只保留本次首页、`desktop/latest.json`、`_headers`、`_redirects` 及各版本的 `desktop/releases/<version>/standalone.html`；既有版本页面保留，其他任意文件不复制进去。下载页使用 `#downloads` 单页路由，无需额外 HTML 文件。源码、测试记录、原始 Logo 和本机凭据不进入部署目录；可选收款码仍按已有构建规则内嵌到页面，不额外上传原图。

发布流程可做离线回归，无需真实 GitHub 登录、浏览器或网络：

```sh
node tests/check_release.cjs
```

入口调用 `tests/check_release.py` 的临时小包夹具，检查生产者参数边界、ZIP / ASAR 内容、版本不可覆盖、部署白名单，以及 GitHub 上传失败时不得部署 Cloudflare；外部命令使用本地替身。随后用实际 Windows 更新器解析生成的边界清单，检查生产者与消费端一致。结果写入当前 `TEST_OUTPUT_DIR` 的 `release-results.json`；未设置时使用 `output/playwright/`。完整回归入口会自动收集该检查，Windows 无 POSIX Bash 时明确跳过发布脚本替身部分。

### 当前发布产物（1.1.0）

本轮两种原生包和单文件已重建，并完成 `python3 desktop/prepare_release.py --verify-only`。准备脚本已核对压缩包完整性、内置页面一致性、壳版本、发布清单与部署目录内容。

| 产物 | 字节数 |
| --- | ---: |
| `standalone.html` | 667,568 |
| `output/releases/v1.1.0/Zhixiang-macOS-arm64.zip` | 1,173,691 |
| `output/releases/v1.1.0/Zhixiang-Windows-x64.zip` | 158,329,183 |

以上产物已于 2026-10-05 发布。GitHub 四个公开资产的大小、SHA-256 和下载地址均与本地发布记录一致；Cloudflare 首页、版本页面及更新清单也与本地产物逐字节一致。

### v1.1.0 发布记录（2026-10-05）

[桌面下载页](https://zhixiang-classroom.pages.dev/#downloads) 和 [GitHub v1.1.0 Release](https://github.com/Jasoniss8/zhixiang-classroom/releases/tag/v1.1.0) 已公开，无需登录即可读取。两个安装包分别为 [Windows x64](https://github.com/Jasoniss8/zhixiang-classroom/releases/download/v1.1.0/Zhixiang-Windows-x64.zip) 和 [macOS Apple 芯片版](https://github.com/Jasoniss8/zhixiang-classroom/releases/download/v1.1.0/Zhixiang-macOS-arm64.zip)。本次最终 Cloudflare 部署为 `https://49017965.zhixiang-classroom.pages.dev`，正式使用上述稳定域名；发布日志为 `output/playwright/publish-v1.1.0-20261005-proxy.log`。

| 发布后检查 | 结果 | 核验范围与记录 |
| --- | ---: | --- |
| 匿名发布资产与页面核验 | 36/36 | GitHub 仓库 / Release 公开，四个资产的元数据摘要、大小、下载地址匹配；实际读取 Cloudflare 首页、清单、版本 HTML，核对字节、SHA-256、缓存和跨域响应。记录：`output/playwright/published-desktop-check-20261005T090933.562584Z.json`。 |
| 正式线上更新服务 | 4/4 | 在 macOS 的隔离临时目录运行实际 Windows 更新服务，从正式 HTTPS 服务检查并下载页面，验证大小 / SHA-256，重新初始化时断开网络依赖并恢复缓存；未接触用户真实课堂数据。记录：`output/playwright/live-desktop-update-results.json`。 |
| 匿名线上浏览器 | 6/6 | 下载页显示 1.1.0 及正确双平台地址，1440px / 390px 页面正常、窄屏无横向溢出，首页保留 22 个模型且无脚本异常。记录：`output/playwright/published-downloads-browser-results.json`；截图：`published-downloads-1440.png`、`published-downloads-390.png`，位于同一目录。 |
| 发布生产者增量回归 | 89/89 | 补充 `_redirects` 的版本 HTML 200 代理、缺失 / 错误规则拒绝、同版本幂等与发布字节不变检查。记录：`output/playwright/release-html-proxy/release-results.json`。此轮使用本地发布命令替身，与真实发布结果分开记录。 |

Cloudflare 的版本 `.html` 地址已验证直接返回 200，保持原生更新器要求的固定 URL；清单为 `no-store`，版本页面为一年不可变缓存。发布过程没有改动页面、清单或安装包字节；清单内 `publishedAt` 保留准备时的 `2026-10-03`，GitHub 实际公开时间为 `2026-10-05`。

1157 项完整回归记录保留不变，以上为随后单独执行的发布检查。匿名核验未重新下载两个完整安装包，而是核对 GitHub 提供的资产 SHA-256 / 大小与本地文件；实际在线下载校验覆盖了更新 HTML。Windows 真机、Safari 浏览器和手机真机仍未验证，线上窄屏检查是在桌面 Chrome 中模拟。Windows 包未做证书签名，macOS 包未做 Developer ID 签名 / 公证；仍不能把服务层与模拟确认测试视为两种系统的完整原生 GUI 更新验收。

### 发布到 GitHub 与 Cloudflare

准备和校验完成后，由有发布权限的用户主动执行下面的命令。它会公开发布，不是预览或检查命令：

```sh
bash desktop/publish_release.sh
```

脚本先检查 GitHub 登录、仓库为公开仓库、安装包与部署目录完整、目标标签尚不存在；随后创建 GitHub Release 草稿并上传两个桌面包、发布清单和校验文件，上传成功后公开。再通过 [GitHub Release 资产元数据](https://docs.github.com/en/rest/releases/assets) 校验公开状态、文件大小、SHA-256 和下载地址，全部匹配后才把 `dist/` 部署到 Cloudflare Pages 的 `zhixiang-classroom` 项目、`main` 分支，避免先公开无效下载链接。

首次使用需分别通过 `gh auth login` 和 `npx --yes wrangler@4.143.0 login` 登录相应账号。脚本不提交或推送源码，也不覆盖已有 GitHub 标签或 Release。GitHub 已发布成功而 Cloudflare 部署失败时，可仅重试网站部署：

```sh
bash desktop/publish_release.sh --deploy-only
```

此模式仍核对现有公开 Release 的所有发布文件，任何不匹配都会停止；不会修改 GitHub 资产。上传中断留下草稿时，先检查草稿内容，再处理该版本，不用覆盖选项绕过校验。

公开页面：[知象 · 教学模型](https://zhixiang-classroom.pages.dev/)。本次发布与实际核验范围见上方 2026-10-05 记录。后续不要只上传一个首页而遗漏更新清单、版本页面或 `_redirects`。`dist/`、`output/`、桌面安装包与本机托管记录均不提交到源码仓库。

旧网址与新网址的本地收藏、课堂配置各自独立；需要迁移时，在旧网页导出课堂 JSON，再在新网页导入。

## 新增数学模型回归

```sh
node tests/check_advanced_math.cjs
node tests/check_advanced_browser.cjs
```

数值检查无第三方依赖，使用固定随机种子；圆锥曲线检查标准方程、半焦距、离心率及定义恒等，绝对误差要求小于 `1e-9`。导数检查每种函数 2000 个随机点（含接近定义域边界的点），中心差分误差按 `|数值−解析|/max(1,|解析|)<2e-7` 判定；解析公式比较按相同归一化尺度使用 `2e-15` 容差，避免奇点附近大数的一次舍入被误报。

浏览器检查使用与 `tests/check_models.cjs` 相同的 Playwright 配置，覆盖实际拖动、e=0/e=1、两支双曲线、非法定义域、h 逼近 0、高精度系数和输入显示、v1 保存恢复、板书、含对照曲线的 PNG 导出、大屏、320–1440px 布局及离线单文件。结果写入 `output/playwright/advanced-math-results.json` 和 `advanced-browser-results.json`；历史报告不能代替本次执行结果。

### 数学模型增补时的执行记录（2026-09-30，历史）

使用 macOS 上的 Node.js、Playwright 和已安装的 Chrome 执行，构建命令为 `python3 build.py`。

| 检查 | 结果 |
| --- | --- |
| `tests/check_advanced_math.cjs` | 30/30 通过 |
| `tests/check_advanced_browser.cjs` | 54/54 通过 |
| `tests/check_models.cjs` | 173/173 通过 |
| `tests/check_resistance_math.cjs` | 15/15 通过 |
| `tests/check_resistance_browser.cjs` | 29/29 通过 |

圆锥曲线标准模式各取 1500 个随机点，统一定义另核对 4257 个有限点，最大绝对误差约 `1.46e-11`，低于 `1e-9`。导数五类函数共取 10000 个随机点，最大归一化差分误差约 `2.53e-9`，低于 `2e-7`。浏览器运行未记录脚本异常，离线单文件未发起网络请求；桌面、窄屏与实际导出的 PNG 已检查。

本次未运行历史 `tests/test_browser.py`，未在 Windows 真机、Safari 或手机真机执行测试，也未重新打包桌面程序或发布线上网站。上述布局检查使用 Chrome 的视口模拟，不等同于真机验证。

### 数学模型增补的文件与函数改动

- `geometry.js`：新增 `ZhixiangMathTools` 纯计算 API，包括 `conicGeometry`、`conicPoint`、`conicMeasurements`、`derivativeDomain`、`derivativeValue`、`derivativeAnalytic`、`centralDerivative`、`derivativeReadings`、`derivativeAnalysis`。
- `app.js`：新增两个模型的数据定义，以及 `normalizeMathParams`、`mathNumber`、`mathSigned`、`mathPointText`、`conicEquation`、`derivativeFormula`、`mathReadout`、`mathControlSpecs`、`renderMathControls`、`updateMathNotice`、`traceConic`、`mathMarker`、`drawConics`、`derivativeYRange`、`drawDerivative`、`bindMathStage`、`exportMathImage`。更新 `safeParams`、`readout`、`renderControls`、`renderDemo`、`renderReadout`、`syncParam`、`setParam`、`drawStage`、`drawThumbnail`、`showAbout`、`exportImage`、`action`，并新增模型选择控件的 change 事件处理。
- `index.html`：更新模型总数与数学分类数量。
- `styles.css`：新增两个模型专用的公式、读数、参数输入和窄屏画布样式。
- `tests/check_models.cjs`：更新模型数量断言；新增 `tests/check_advanced_math.cjs` 和 `tests/check_advanced_browser.cjs`，分别检查独立数学计算和实际页面交互。
- `README.md`：补充模型说明、参数约定、验证方法、结果和改动清单。`physics.js` 未修改；`standalone.html` 由 `build.py` 生成。

## 物理与地理模型回归（2026-09-30）

新增的纯数值检查不需要第三方依赖；浏览器检查使用前文的 Playwright / Chrome 环境变量，并需先启动本地服务器。

```sh
python3 build.py
node tests/check_science_math.cjs
node tests/check_science_browser.cjs
```

数值检查使用固定随机种子，覆盖 1000 组水平圆周恒等式、竖直圆周能量守恒、最高点及最低点临界值、松弛事件定位与减半步长收敛、低速往复摆动、小半径大重力的临界运动；电场检查 1200 组叠加、`E=−∇V`、场线方向与终止、奇点和单电荷等势圆；四季检查春秋分、夏冬至、南北极和极圈、球面坐标、昼长及与日影公式的一致性。

浏览器检查操作实际控件、播放和拖动，覆盖 1–3 个电荷、四种预设、重叠拒绝、零电荷、奇点读数、圆周松弛停止、临界速度恢复、四季视角与节气日期、日影跳转、v1 文件实际下载与导入、板书、PNG 下载、大屏、320/390/768/1024/1440px 布局，以及分文件与离线版网络请求。打开新模型立即归位，避免上一页平滑滚动在拖动期间改变画布位置；数学拖动检查等待画布完成绘制后再定位点。

### 物理与地理批次执行结果（历史）

在 macOS 上用 Node.js、已安装的 Chrome 和 Playwright 执行。以下为物理与地理模型增补后的结果，取代上面的数学批次历史记录。

| 检查 | 结果 |
| --- | --- |
| `tests/check_science_math.cjs` | 40/40 通过 |
| `tests/check_science_browser.cjs` | 81/81 通过 |
| `tests/check_models.cjs` | 188/188 通过 |
| `tests/check_advanced_math.cjs` | 30/30 通过 |
| `tests/check_advanced_browser.cjs` | 54/54 通过 |
| `tests/check_resistance_math.cjs` | 15/15 通过 |
| `tests/check_resistance_browser.cjs` | 29/29 通过 |

共 437 项检查通过。新结果保存在 `output/playwright/science-math-results.json`、`science-browser-results.json`，原模型结果保存在同目录的 `current-results.json`、`advanced-*-results.json` 和 `resistance-*-results.json`。首次浏览器回归发现的拖动定位问题已复现、修正并重新检查，没有把首次失败记作通过。

默认竖直圆周连续 60 s 的最大能量绝对误差约 `6.89×10⁻⁹ J`；半径 0.3 m、g=15 m/s² 的两种临界起点连续 60 s 不误报松弛，最大相对能量误差约 `6.86×10⁻⁸`。电场与独立电势梯度的最大归一化差约 `7.86×10⁻¹⁰`。单电荷等势圆的最大半径插值误差约 0.00215 m；这是曲线绘图的网格误差，场强和电势读数不使用该插值。

春秋分非极点昼长为 12 h；夏至 / 冬至直射纬度为 ±23.44°，北纬 31° 的昼长分别约 14.0134 h 和 9.98659 h。逐时太阳高度采样与解析昼长的最大差约 0.00290 h，小于采样间隔。正午高度与原模型公式差约 `2.13×10⁻¹⁴°`。

`node --check app.js`、`node --check physics.js` 与新增浏览器脚本语法检查已通过；`python3 build.py` 已重新生成离线单文件。浏览器检查未记录脚本异常，离线版没有网络请求；已查看新模型的桌面、窄屏截图及实际导出的 PNG。

本次未运行历史 `tests/test_browser.py`，未在 Windows、Safari 或手机真机上测试，未重建桌面安装包，也未部署线上网站。浏览器视口模拟不等同于真机测试。

### 物理与地理批次改动文件与函数

- `physics.js`：新增 `circularTension`、`circularInitial`、`circularAdvance`、`circularData`，复用原有 `pendulumStep`；新增 `electricCharges`、`electricField`、`traceFieldLine`、`electricFieldLines`、`equipotentialContours`；新增公共太阳公式 `solarPosition`、`daylight`、`seasonData`、`earthSurface`。原有阻力和单摆计算函数保留。
- `app.js`：新增 `SCIENCE_MODELS` 的三个模型定义，以及 `normalizeScienceParams`、`scienceReadout`、`scienceControlSpecs`、`renderScienceControls`、`updateScienceNotice`、`drawCircular`、`electricLevels`、`electricPlotData`、`drawElectric`、`scienceDot`、`scienceProject`、`globeCurve`、`drawSeasonGlobe`、`drawSeasons`、`bindScienceStage`。
- `app.js` 现有接入点：更新 `safeParams`、`solarData`、`readout`、`renderControls`、`openModel`、`standardPlayback`、`renderDemo`、`renderReadout`、`syncParam`、`setParam`、`resetSolver`、`updateSimulation`、`updatePlayback`、`togglePlay`、`drawStage`、`drawThumbnail`、`exportImage`、`action` 及预设 / select / checkbox 事件处理；截图沿用 `exportMathImage`，保存格式仍为 v1。
- `index.html`：总数改为 18，物理 8、地理 2；首页结构保持原样。
- `styles.css`：新增科学模型画布、读数、控件样式及窄屏 / 容器宽度适配。
- `tests/check_science_math.cjs`、`tests/check_science_browser.cjs`：新增数值和实际页面回归；`tests/check_models.cjs` 更新总数与分类断言，`tests/check_advanced_browser.cjs` 更新总数并稳定拖动前的绘制等待。
- `README.md`：更新模型说明、单位、假设、限制、函数清单及本次测试记录。`geometry.js` 沿用上次数学模型实现，本次未改；`standalone.html` 仅由构建生成。

## 碰撞模型回归（2026-09-30，历史记录）

```sh
python3 build.py
node tests/check_collision_math.cjs
node tests/check_collision_browser.cjs
```

数值脚本无第三方依赖，浏览器脚本沿用前文的 Playwright / Chrome 配置，并需启动本地预览服务器。此次在 macOS 的 Node.js、Chrome 上重新运行了下列检查；这是加入碰撞模型后的结果，前两个批次记录保留作历史参考。

| 检查 | 结果 |
| --- | --- |
| `tests/check_collision_math.cjs` | 25/25 通过 |
| `tests/check_collision_browser.cjs` | 41/41 通过 |
| `tests/check_models.cjs` | 193/193 通过 |
| `tests/check_advanced_math.cjs` | 30/30 通过 |
| `tests/check_advanced_browser.cjs` | 54/54 通过 |
| `tests/check_science_math.cjs` | 40/40 通过 |
| `tests/check_science_browser.cjs` | 81/81 通过 |
| `tests/check_resistance_math.cjs` | 15/15 通过 |
| `tests/check_resistance_browser.cjs` | 29/29 通过 |

共 508 项检查通过。碰撞数值检查包含 6000 组固定种子的随机参数，核对动量、相反冲量、恢复系数定义、能量损失、接触时刻的位置连续及碰后不穿透；另检查弹性、完全非弹性、零总动量、100:1 质量比、同向追赶、反向运动、同速不相遇、极小正相对速度、非法质量及伽利略变换。

随机样本中，动量 / 相反冲量的最大绝对误差约 `4.26×10⁻¹⁴ kg·m/s`（阈值 `1e-10`），恢复系数速度关系的最大误差约 `7.11×10⁻¹⁵ m/s`（阈值 `1e-11`），动能差与约化质量损失公式的最大差约 `3.91×10⁻¹³ J`（阈值 `1e-9`）。四位有效数字仅用于显示，不用于上述守恒检查。

浏览器检查实际操作播放、单步、时间条两端、重播、碰撞时刻跳转、两类时间图、参数边界、四个预设、课堂保存和 v1 文件下载 / 导入、板书、PNG 下载、大屏和讨论解答。320、390、768、1024、1440px 均无横向溢出，同一时刻的数值不随窗口大小改变。浏览器没有脚本异常，单文件没有网络请求。已查看桌面、窄屏、位置图和实际导出图片。

本轮首次执行中，修正了测试的折叠解答操作、一个处于二进制舍入边界的格式样本，以及更新数量时误改的旧角度断言，随后完整复跑相关脚本。结果写入 `output/playwright/collision-math-results.json`、`collision-browser-results.json`，其他结果仍使用各自的 `*-results.json`；上表只列最终实际运行结果。

`app.js`、`physics.js` 及两个新增测试脚本已通过 `node --check`，`git diff --check` 无格式错误，已执行 `python3 build.py`。本次未运行历史 Python 浏览器脚本，未在 Windows、Safari 或手机真机测试，未重建桌面安装包、推送代码或发布线上网站。

### 碰撞模型改动文件与函数

- `physics.js`：新增常量 `COLLISION_GEOMETRY`，以及 `collisionSolution`（参数验证、碰撞时刻、解析速度、动量与动能）和 `collisionState`（分段匀速位置、速度与状态）。现有模型计算保留。
- `app.js`：新增碰撞模型定义与资料、`collisionNumber`、`collisionDuration`、`collisionReadout`、`drawCollision`；更新 `scienceReadout`、`renderScienceControls`、`updateScienceNotice`、`standardPlayback`、`renderReadout`、`setParam`、`updateSimulation`、`updatePlayback`、`togglePlay`、`drawStage`、`drawThumbnail`、`action` 及预设、时间条、图表选择事件。截图、课堂保存、v1 读取沿用既有路径。
- `index.html`：模型总数为 19、物理数量为 9，并更新分文件资源的缓存版本。
- `styles.css`：新增碰撞画布高度、跳转按钮布局、时间条和大屏最小高度。
- `tests/check_collision_math.cjs`、`tests/check_collision_browser.cjs`：新增数值与实际页面检查。`tests/check_models.cjs`、`tests/check_advanced_browser.cjs`、`tests/check_science_browser.cjs`：更新总数 / 分类数量断言。
- `README.md`：补充模型公式、单位、适用范围和本次结果。`geometry.js` 本次未改，`standalone.html` 由构建生成。

## 电磁感应与双缝干涉回归（2026-09-30，上批次记录）

```sh
python3 build.py
node tests/check_em_optics_math.cjs
node tests/check_em_optics_browser.cjs
```

数值检查不需要第三方依赖；浏览器脚本沿用前文的 Playwright / Chrome 配置，并需先启动本地预览。以下为本批次在 macOS、Node.js 和 Chrome 中实际重新执行的结果，不能用更早的 `TEST_REPORT.md` 或 `tests/results.json` 代替。

| 检查 | 结果 |
| --- | --- |
| `tests/check_em_optics_math.cjs` | 43/43 通过 |
| `tests/check_em_optics_browser.cjs` | 68/68 通过 |
| `tests/check_models.cjs` | 203/203 通过 |
| `tests/check_advanced_math.cjs` | 30/30 通过 |
| `tests/check_advanced_browser.cjs` | 54/54 通过 |
| `tests/check_science_math.cjs` | 40/40 通过 |
| `tests/check_science_browser.cjs` | 81/81 通过 |
| `tests/check_collision_math.cjs` | 25/25 通过 |
| `tests/check_collision_browser.cjs` | 41/41 通过 |
| `tests/check_resistance_math.cjs` | 15/15 通过 |
| `tests/check_resistance_browser.cjs` | 29/29 通过 |

共 629 项检查通过。新增数值检查包括固定种子的 5000 组电磁感应参数、3000 组双缝参数，以及零场、转向时刻、锐边事件、参数非法值、亮暗级次、单位换算、控制变量和像素平均亮度。

- ε 与独立中心差分的最大绝对差约 `1.04×10⁻¹¹ V`，阈值 `1e-8 V`；各连续时间段的独立中点积分 `∫εdt=−ΔΦ` 最大误差约 `2.00×10⁻¹¹ Wb`，阈值 `1e-8 Wb`。
- 干涉强度周期性最大误差约 `4.52×10⁻¹⁴`，阈值 `1e-12`；像素强度解析平均与独立积分的最大差约 `2.15×10⁻⁸`，阈值 `1e-7`。同时检查小角下的高级次条纹误差提示，避免用小的相对光程差误差代表强度也准确。
- 浏览器实际操作两种感应情景、极性切换、播放 / 单步 / 重播、时间条和时间图、双缝测量点拖动与键盘、参数边界、波长配色、密纹提示、课堂保存与 v1 文件导入导出、板书、PNG 下载、大屏、讨论解答和资料弹窗。检查实际条纹像素的亮暗位置与强度峰一致。
- 320、390、768、1024、1440 px 宽度均无横向溢出，同一参数与时刻的物理读数保持一致。已查看桌面、窄屏、匀强磁场图和两个模型实际导出的 PNG；修正了缩小屏幕半宽后的端点标签，并对小数刻度使用科学计数法以保留窄屏空间。
- 本轮旧模型回归覆盖三维旋转、截面、展开、收藏、课堂配置以及理想 / 含阻力对照。新模型单文件可通过 `file://` 打开，没有 HTTP 请求；浏览器没有脚本异常或远程运行依赖。

新增结果位于 `output/playwright/em-optics-math-results.json` 和 `em-optics-browser-results.json`，其他脚本仍写各自的 `*-results.json`。`app.js`、`physics.js`、两个新增测试脚本通过 `node --check`，`git diff --check` 无格式错误；已运行 `python3 build.py`。

未执行历史 Python 浏览器脚本，未测试 Windows、Safari 或手机真机，未重建桌面应用包、发布线上网站或推送 Git。以上窄屏结果来自 Chrome 的视口测试。

### 本批次改动文件与函数

- `physics.js`：新增 `INDUCTION_GEOMETRY`、`inductionEvents`、`inductionState`、`doubleSlitParameters`、`doubleSlitAt`、`doubleSlitPixelIntensity`、`wavelengthColor`，并导出供页面和数值测试共用。
- `app.js`：新增两项 `SCIENCE_MODELS` 定义与参考资料，新增 `playbackDuration`、`inductionTraces`、`drawInductionCurrent`、`drawInduction`、`drawDoubleSlit`。更新 `normalizeScienceParams`、`scienceReadout`、`scienceControlSpecs`、`renderScienceControls`、`updateScienceNotice`、`standardPlayback`、`renderReadout`、`setParam`、`updateSimulation`、`updatePlayback`、`togglePlay`、`bindScienceStage`、`drawStage`、`drawThumbnail` 及预设、时间条、情景选择的事件处理。截图与 v1 课堂配置沿用原有路径。
- `index.html`：模型总数 21、物理 11，更新资源缓存版本；保留首页布局。
- `styles.css`：新增两个模型的画布高度、时间条、大屏及窄屏适配，沿用既有色彩与控件。
- `tests/check_em_optics_math.cjs`、`tests/check_em_optics_browser.cjs`：新增数值、实际交互和离线回归。`tests/check_models.cjs`、`tests/check_advanced_browser.cjs`、`tests/check_science_browser.cjs`、`tests/check_collision_browser.cjs`：更新总数与分类数量断言。
- `README.md`：补充模型参数、公式、方向约定、简化条件、误差、交互与回归结果。`geometry.js` 本批次未改；`standalone.html` 仅由 `build.py` 生成。

## 几何、运动显示、透镜与阻尼振动回归（2026-09-30）

新增检查：

```sh
python3 build.py
node tests/check_extensions_math.cjs
node tests/check_extensions_browser.cjs
```

浏览器脚本沿用前文的 `PLAYWRIGHT_MODULE_PATH`、`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 配置，并连接本地预览。数值测试不需要浏览器或第三方运行库。

- `tests/fixtures/resistance-display-baseline.json` 在添加显示功能前保存：包含 6 个阻力计算函数的 SHA-256、3 组抛体轨迹、3 组有阻尼/理想单摆状态。回归逐位对比，不用本次修改后的结果覆盖基准。
- 空间向量与面法向随机检查的最大残差约 `4.44e-16`；1500 组薄透镜方程残差约 `2.36e-16 cm⁻¹`，三条光线或延长线交点偏差约 `1.42e-14 cm`，均低于 `1e-9`。
- 5 组自由阻尼条件的 RK4 结果与独立解析解对比，位移/速度最大绝对偏差约 `2.22e-7`（对应量分别以 m、m/s 计，阈值 `2e-6`）。高频振子减半步长后误差从约 `1.32e-5` 降到 `8.13e-7`；受迫稳态位移最大偏差约 `6.15e-10 m`。另检查自由能量不增加、包络、临界/过阻尼不振荡、共振与零驱动力。
- 浏览器实际操作三视图选择、测角、截面退化、向量选点、抛体显示开关与频闪间隔、单摆能量对象、透镜物体拖动与焦点边界、四种振动模式及共振按钮。验证暂停冻结画布和历史曲线，显示开关不重置抛体或单摆。
- 320、390、768、1024、1440 px 视口检查无横向溢出，数学/物理读数不随窗口改变。已查看三视图、二面角、透镜、能量图、受迫振动的桌面和窄屏截图，以及包含多行公式与板书的实际 PNG 导出。v1 课堂保存、文件导入导出、大屏和 `file://` 离线打开均有实际操作检查。

回归中修复了删除旧绘图函数时带走电磁感应缓存声明的问题，以及时间条数值已四舍五入显示为零时 Home 键不能精确归零的问题。最终结果以本节下方和 `output/playwright/extensions-regression-status.json` 为准；早期失败日志不是通过记录。

### 本批次文件与函数

| 文件 | 主要新增或修改内容 |
| --- | --- |
| `geometry.js` | 新增 `geoStudyMesh/Points/Faces/Edges`、`normalizeGeometryParams`、`geoAngleData`、`geoVectorData`、`geoOrthoPoint`、`geoMergeProjection`、`geoOrthographic`、`geoProjectionBank`、`geoReconstruction`、`geoStudyReadout/Controls`、`syncGeometrySelections`、`drawGeoProjection`、`geoArrow3`、`drawGeoStudy`。更新 `GEOMETRY_MODELS`、`geometryReadout`、`geoVisibleControls`、`renderGeometryControls`、`drawGeometryStage`；导出 `ZhixiangGeometryTools` 供独立验证。 |
| `physics.js` | 新增并导出 `lensData`、`lensRays`、`oscillatorParameters`、`oscillatorInitial`、`oscillatorAdvance`、`oscillatorReadings`、`oscillatorEnvelope`、`oscillatorResponse`。原抛体、单摆阻力函数不变。 |
| `app.js` | 新增透镜模型定义；新增 `motionDisplayControls`、`recordPendulumEnergy`、`trimHistory`、`drawTimeGraph`、`normalizeSpringParams`、`springSpecs`、`renderSpringControls`、`springCurrentData`、`springReadout`、`advanceSpring`、`drawResonance`、`lensReadout`、`drawLens`。更新 `safeParams`、`setParam`、`resetSolver`、`updateSimulation`、`drawProjectile`、`drawPendulum`（原场景保留为 `drawPendulumScene`）、`drawSpring`、科学模型控制/读数、`bindScienceStage`、`drawStage`、`drawThumbnail`、`exportImage/MathImage` 及参数/选择/键盘事件。原 `springData` 理想解析函数保留。 |
| `styles.css` | 多行公式、几何观察分区、单摆/弹簧曲线和透镜画布的桌面与窄屏高度；沿用现有颜色、控件和首页布局。 |
| `index.html` | 初始模型总数 22、物理 12；分文件资源缓存版本更新。 |
| `tests/check_extensions_math.cjs`、`tests/check_extensions_browser.cjs`、`tests/fixtures/resistance-display-baseline.json` | 新增独立数值检查、实际交互回归和修改前阻力基准。 |
| `tests/check_models.cjs`、`tests/check_advanced_browser.cjs`、`tests/check_science_browser.cjs`、`tests/check_collision_browser.cjs`、`tests/check_em_optics_browser.cjs` | 更新总数 22、物理 12 的断言，保留原有检查。 |
| `README.md` | 更新模型说明、单位、符号、参数默认值、边界、适用范围和本批次结果。 |

`standalone.html` 仅通过 `python3 build.py` 生成，没有直接编辑。未改技术栈、运行依赖或课堂配置版本。

### 最终实际执行结果

| 检查 | 结果 |
| --- | --- |
| `tests/check_extensions_math.cjs` | 72/72 通过 |
| `tests/check_extensions_browser.cjs` | 124/124 通过 |
| `tests/check_models.cjs` | 208/208 通过 |
| `tests/check_advanced_math.cjs` | 30/30 通过 |
| `tests/check_advanced_browser.cjs` | 54/54 通过 |
| `tests/check_science_math.cjs` | 40/40 通过 |
| `tests/check_science_browser.cjs` | 81/81 通过 |
| `tests/check_collision_math.cjs` | 25/25 通过 |
| `tests/check_collision_browser.cjs` | 41/41 通过 |
| `tests/check_resistance_math.cjs` | 15/15 通过 |
| `tests/check_resistance_browser.cjs` | 29/29 通过 |
| `tests/check_em_optics_math.cjs` | 43/43 通过 |
| `tests/check_em_optics_browser.cjs` | 68/68 通过 |

共 **830/830** 项通过。新增数值 72 项、交互 124 项；原有回归 634 项。执行环境为 macOS、Node.js、Chrome。新旧模型均未记录浏览器脚本异常；新功能的单文件离线检查没有 HTTP 请求。

`app.js`、`geometry.js`、`physics.js` 和新增测试脚本通过 `node --check`；`git diff --check` 无格式错误；已运行 `python3 build.py` 生成单文件。结果与截图保存在 `output/playwright/`，其中 `extensions-math-results.json`、`extensions-browser-results.json` 和 `extensions-regression-status.json` 为本批次记录。

未运行历史 Python 浏览器脚本；未测试 Windows、Safari 或手机真机，未重建 Windows/macOS 桌面包、发布线上网站或推送 Git。窄屏测试来自 Chrome 视口模拟。
