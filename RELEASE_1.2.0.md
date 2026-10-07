# 1.2.0 大学基础课扩展交付记录

内容版本1.2.0；原生壳及最低壳版本1.1.0。网站、离线单文件和两个桌面包使用同一构建页面。28模型（数学13、物理13、地理2），新增6个大学模型；三维筛选4个，原22模型保持独立回归。未加入运行框架、CDN、AI、OCR、账号或新的后端服务；现有网站统计功能按原代码保留。

## 改动文件与主要函数

| 文件 | 主要内容 / 函数 |
| --- | --- |
| `university-math.js` | 纯计算：`taylorCheck/taylorCoefficients/taylorValue/taylorData`、`matrixVector/matrixDet/matrixEigen/linearData`、`gradientValue/gradientAt/gradientData/gradientMesh/gradientContours`。 |
| `university-dynamics.js` | 纯计算：`fourierValidate/fourierCoefficient/fourierTarget/fourierSum/fourierData`、`odeValidate/odeRHS/odeExact/odeSolve`。 |
| `physics.js` | 追加`rlcParameters/rlcResponse/rlcState/rlcDuration`，SI解析计算；既有阻力计算函数保持不变。 |
| `models/taylor.js`、`linear-transform.js`、`gradient.js` | 独立注册、控件、绘图、读数、三个例题及讨论。`uniTaylorDraw/Readout`、`uniLinearDraw/Readout`、`uniGradientDraw/Readout`；梯度独立曲面交互。 |
| `models/fourier.js`、`ode.js`、`rlc.js` | `drawUniversityFourier/ODE/RLC`、`universityFourierExport/ODEExport/RLCExport`；RLC声明独立播放接口并同步物理时间。 |
| `models/university-shared.js` | `uniRenderControls/uniSetParam/uniBindStage`：新模型的共享控件、指针、键盘及说明。 |
| `app.js` | `safeParams`保留数值精度；`renderLibrary/renderDemo/readout`接入大学及能力区分；`playbackDuration/standardPlayback/togglePlay/updatePlayback/frame`接入可选播放；`makePlot`为大学模型保留小数刻度；截图、时间轴及单步沿用公共入口。 |
| `geometry.js`、`models/shared.js` | 几何专用操作排除`geometryUI:false`，数学几何计算不改。 |
| `university-questions.js` | 六类有限解析、`fieldsFor/analyze/validate/steps/variationKeys`；任务先识别、完整公式边界检查、条件核对和纯计算步骤。 |
| `question-matcher.js`、`question-ui.js` | 保留四旧题，接入六新题；`currentQuestionValues/updateQuestionVariation`同步变式步骤、还原原题；题干仍仅在内存。 |
| `chart-export.js` | `exportDataDialog/svgForChart`区分静态图和物理时间，静态ODE不标秒。 |
| `models/manifest.json`、`build.py`、`index.html` | 注册六模型、统一脚本顺序、大学筛选和计数；构建兼容静态模型对象注册。 |
| `desktop/release.json`、`desktop-version.js`、`server/models.js` | 版本来源及构建生成的版本/模型白名单。 |
| `styles.css` | 新模型画布尺寸、手机排布、例题/固定步骤；未重做首页。 |
| `tests/check_university_*.cjs` | 数值、严格题解析、浏览器、实际下载及离线回归。 |
| `tests/smoke_university_desktop.cjs`、`.github/workflows/test.yml` | Windows CI启动实际打包exe，用隔离数据验证28模型、控件、保存和离线依赖。 |
| `tests/verify_university_live.cjs`、`verify_university_update.cjs` | 发布后的匿名网站/资产核验及隔离真实更新检查；结果单独记录，不纳入本地2000项。 |
| `tests/smoke_electron_update.cjs` | 根据内容版本生成下一补丁测试版本，验证更新/校验失败保留/离线重启。 |
| 现有`tests/check_*.cjs`、`README.md`、本文件 | 更新数量断言，独立旧22清单、回归说明及模型使用范围。 |

`standalone.html`由`python3 build.py`生成，没有作为源码编辑。个人收款码不入公开源码；用户的`.claude/`、`Claude outputs/`未跟踪目录保留。

## 验证与范围

本次完整回归、桌面包校验、线上匿名验证分别保存在新的`output/playwright/`目录，不使用历史TEST_REPORT的结论。数值代数恒等采用归一误差1e-9，差分及精细步长对照1e-6；图形插值、网格和跳点积分采用单独容差。随机数使用固定种子，可复现。

本机浏览器为macOS上的Chrome；390px为视口模拟。Electron更新测试在macOS上实际运行主进程/预加载/页面，以临时数据隔离，发布服务及原生确认选择为测试替身。Windows实际exe由GitHub Windows runner检查，不能视为Windows物理真机或手机真机结果。macOS窗口和线上真实更新流另行记录。

首次全量1882项中1881通过：唯一失败为旧示例计数仍断言4，已改10；该轮不是最终全通过记录。完整新一轮回归26组2000/2000通过，0失败、0环境错误，服务器已关闭；报告`output/playwright/run-20261007T021932.375786Z/summary.json`。其中大学纯数学58/58、大学动态数值/导出113/113、大学题解析139/139、新模型浏览器76/76、大学做题浏览器93/93。另`tests/smoke_electron_update.cjs`实际22/22通过，报告`output/playwright/university-electron-update/electron-update-smoke-results.json`。独立审阅25个定点题解析检查通过。最终单文件846,456 B。macOS原生窗口已核对28模型首页、梯度曲面、版本页及RLC单步同步，记录`output/playwright/university-native-macos/manual-results.json`；不等同于原生全部操作的完整回归。

## 发布与安装

[网站](https://zhixiang-classroom.pages.dev/) · [下载页](https://zhixiang-classroom.pages.dev/#downloads) · [1.2.0发布资产](https://github.com/Jasoniss8/zhixiang-classroom/releases/tag/v1.2.0) · [更新清单](https://zhixiang-classroom.pages.dev/desktop/latest.json) · [CI](https://github.com/Jasoniss8/zhixiang-classroom/actions/workflows/test.yml)

发布顺序为：本地验收与打包 → 推送源码 → 同一提交Linux及Windows CI → 固定标签 → GitHub资产上传和SHA-256核验 → Cloudflare网站/下载页/版本页面/更新清单 → 匿名验证和隔离更新。旧版内容保留；公开内容修正使用新补丁版本，不覆盖旧资产。

Mac包面向Apple芯片、macOS13+；Windows包面向Windows10/11 x64，解压整个目录后双击`Zhixiang.exe`。内置页面可离线使用；主动检查更新、下载安装包才联网。没有付费代码签名或Apple公证。
