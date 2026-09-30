
'use strict';
/* 知象 · 教学模型 | Zero-dependency, offline-first teaching simulations.
   All formulas use SI units unless a control explicitly states otherwise.
   No network calls, analytics, accounts, cookies, or hidden data collection. */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const SUPPORT_QR_SRC = 'assets/support-qr.jpg';
if (SUPPORT_QR_SRC) {
 const supportImage = new Image();
 supportImage.onload = () => { document.documentElement.dataset.supportReady = 'true'; };
 supportImage.src = SUPPORT_QR_SRC;
}
const IS_DESKTOP_APP = location.protocol === 'zhixiang:' || location.pathname.includes('.app/Contents/Resources/standalone.html');
const STORAGE_CONTEXT = IS_DESKTOP_APP ? '知象应用' : '浏览器';
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const rad = x => x*Math.PI/180, deg=x=>x*180/Math.PI;
const fmt = (v,d=2) => Number.isFinite(v) ? (Math.abs(v)<Math.pow(10,-d)/2 ? 0:v).toFixed(d).replace(/\.?0+$/,'').replace(/^$/,'0') : '—';
const num = (v,d=2) => Number.isFinite(v)?Number(v.toFixed(d)).toString():'—';
const signed = v => v<0?`− ${num(Math.abs(v))}`:`+ ${num(v)}`;
const ICONS={
 classroom:'<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M7 8h10M7 11h6M12 16v5m-4 0h8"/>',
 math:'<path d="M4 3v17h17M7 16c2-9 5-10 7-5s4 6 7-5"/>',
 physics:'<path d="M4 4h16M8 4l8 12M6 17a10 10 0 0 0 6 3"/><circle cx="17" cy="18" r="3"/>',
 earth:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 solid:'<path d="m12 3 9 5-9 5-9-5Zm-9 5v9l9 5 9-5V8M12 13v9"/>',
 cube:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
 rotate:'<path d="M20 7v5h-5M4 17v-5h5M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 heart:'<path d="M20.7 4.9a5.4 5.4 0 0 0-7.6 0L12 6l-1.1-1.1a5.4 5.4 0 0 0-7.6 7.6L12 21l8.7-8.5a5.4 5.4 0 0 0 0-7.6Z"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 11h18"/>',
 atom:'<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1"/>',
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2.5M12 17h.01"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
 back:'<path d="M20 12H5m6-6-6 6 6 6"/>',
 play:'<path d="m8 4 12 8-12 8Z"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 reset:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
 fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 shrink:'<path d="M3 8h5V3m8 0v5h5M3 16h5v5m8 0v-5h5"/>',
 pencil:'<path d="m16 3 5 5L8 21H3v-5ZM13 6l5 5"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
 camera:'<path d="M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v13H3V7a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',
 compare:'<rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/>',
 save:'<path d="M4 3h13l4 4v14H3V3Zm3 0v6h10V3M7 21v-8h10v8"/>',
 share:'<path d="M12 15V3m-4 4 4-4 4 4M5 11H3v10h18V11h-2"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
 sliders:'<path d="M3 7h5m5 0h8M3 17h10m5 0h3"/><circle cx="10.5" cy="7" r="2.5"/><circle cx="15.5" cy="17" r="2.5"/>',
 book:'<path d="M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-1-10 1Z"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 step:'<path d="m6 5 10 7-10 7ZM20 5v14"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2m-3-7 1.5-1.5M5 19l1.5-1.5m-3-14L5 5m14 14 1.5 1.5"/>'
};
function icon(name){return `<i data-icon="${name}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.spark}</svg></i>`;}
function hydrateIcons(root=document){$$('i[data-icon]:empty',root).forEach(el=>el.innerHTML=icon(el.dataset.icon).match(/<svg[\s\S]*<\/svg>/)[0]);}
const CATS={math:{name:'数学',color:'#578659',bg:'#eff4e9'},physics:{name:'物理',color:'#bd905b',bg:'#f8f1e8'},geography:{name:'地理',color:'#8a82b4',bg:'#f1f0f7'}};
const SOURCES={
 drag:['OpenStax · Drag Forces','https://openstax.org/books/college-physics/pages/5-2-drag-forces'],
 damping:['OpenStax · Damped Oscillations','https://openstax.org/books/university-physics-volume-1/pages/15-5-damped-oscillations'],
 geometry:['OpenStax · Volume and Surface Area','https://openstax.org/books/prealgebra-2e/pages/9-6-solve-geometry-applications-volume-and-surface-area'],
 trig:['OpenStax · Unit Circle: Sine and Cosine Functions','https://openstax.org/books/precalculus-2e/pages/5-2-unit-circle-sine-and-cosine-functions'],
 collisions:['OpenStax · The Kinetic-Molecular Theory','https://openstax.org/books/chemistry/pages/9-5-the-kinetic-molecular-theory'],
 kinetic:['OpenStax · Kinetic Theory of Gases','https://openstax.org/books/college-physics-2e/pages/13-4-kinetic-theory-atomic-and-molecular-explanation-of-pressure-and-temperature'],
 functions:['OpenStax · Transformation of Functions','https://openstax.org/books/algebra-and-trigonometry-2e/pages/3-5-transformation-of-functions'],
 solar:['NOAA · Solar Position Calculator / 角度定义','https://gml.noaa.gov/grad/solcalc/azel.html'],
 solarLimits:['NOAA · Solar Calculation Details / 模型局限','https://gml.noaa.gov/grad/solcalc/calcdetails.html'],
 gas:['OpenStax · The Ideal Gas Law','https://openstax.org/books/college-physics-2e/pages/13-3-the-ideal-gas-law'],
 projectile:['OpenStax · Projectile Motion','https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion'],
 pendulumPeriod:['OpenStax · Period of a Pendulum','https://openstax.org/books/calculus-volume-2/pages/6-4-working-with-taylor-series'],
 pendulum:['OpenStax · Pendulums','https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums'],
 wave:['OpenStax · Mathematics of Waves','https://openstax.org/books/university-physics-volume-1/pages/16-2-mathematics-of-waves'],
 optics:['OpenStax · Refraction','https://openstax.org/books/university-physics-volume-3/pages/1-3-refraction'],
 spring:['OpenStax · Simple Harmonic Motion','https://openstax.org/books/university-physics-volume-1/pages/15-1-simple-harmonic-motion']
};
// Control definition: [key, symbol, Chinese label, min, max, step, unit].
const MODELS=[
{id:'parabola',cat:'math',level:'初中 · 高中',title:'二次函数与抛物线',desc:'调整顶点与系数，观察开口和平移。',tags:'抛物线 二次函数 顶点 对称轴 平移 开口',time:false,compare:true,
 defaults:{a:1,h:0,k:0},controls:[['a','a','开口与伸缩',-3,3,.1,''],['h','h','水平平移',-5,5,.1,''],['k','k','竖直平移',-4,5,.1,'']],
 presets:[['标准抛物线',{a:1,h:0,k:0}],['向右上平移',{a:1,h:2,k:1}],['开口向下',{a:-.7,h:0,k:3}]],
 hint:'拖动图中的顶点，或调节右侧滑块。',question:'保持 a、k 不变，只增大 h，抛物线会向左还是向右移动？',answer:'h 增大，图像向右平移；h 减小，图像向左平移。顶点始终位于 (h, k)。a ≠ 0 时，|a| 越大，同一高度差处的开口越窄。',
 note:'y = a(x − h)² + k。a = 0 时退化为常数函数，不再是抛物线；此时不显示唯一顶点或对称轴。坐标轴等比例。',sources:['functions']},
{id:'functions',cat:'math',level:'高中',title:'函数图像与变换',desc:'比较 8 类函数的平移、伸缩与翻折。',tags:'函数 一次 正弦 余弦 指数 对数 反比例 平方根 绝对值',time:false,compare:true,
 defaults:{kind:'sin',a:1,b:1,h:0,k:0},controls:[['a','A','纵向伸缩 / 翻折',-3,3,.1,''],['b','B','横向压缩',.2,3,.1,''],['h','h','水平平移',-4,4,.1,''],['k','k','竖直平移',-4,4,.1,'']],
 presets:[['标准图像',{a:1,b:1,h:0,k:0}],['纵向拉伸',{a:2,b:1,h:0,k:0}],['关于 x 轴翻折',{a:-1,b:1,h:0,k:0}]],
 hint:'先选基础函数，再比较伸缩和平移；虚线表示渐近线。',question:'对正弦函数，将 B 从 1 变成 2，一个完整波形的宽度会发生什么变化？',answer:'B 增大到 2，正弦图像在水平方向压缩为原来的一半，周期由 2π 变成 π。注意：横向变换作用在自变量内部。对数与反比例函数还要检查定义域。',
 note:'统一使用 y = A·f(B(x−h)) + k；B > 0。ln 的输入必须大于 0，√ 的输入不能为负，1/x 的输入不能为 0。图像在不连续点断开，不跨越渐近线连线。',sources:['functions']},
{id:'solar',cat:'geography',level:'高中',title:'太阳高度角与日影',desc:'调整纬度与太阳时，计算高度角和影长。',tags:'地理 太阳 太阳角 高度角 正午 纬度 季节 日影 直射',time:true,
 defaults:{lat:31,dec:0,hour:12,pole:2},controls:[['lat','φ','观察地纬度',-90,90,1,'°'],['dec','δ','太阳直射纬度',-23.44,23.44,.01,'°'],['hour','t','地方真太阳时',0,24,.1,'h'],['pole','H','立杆高度',.5,5,.1,'m']],
 presets:[['春秋分',{dec:0,hour:12}],['北半球夏至',{dec:23.44,hour:12}],['北半球冬至',{dec:-23.44,hour:12}]],
 hint:'太阳—立杆竖直截面示意，不代表东西南北方位。',question:'同一地点的正午，北半球夏至和冬至，哪一天的影子更短？所有纬度都一样吗？',answer:'先比较太阳高度角，再判断影长：太阳在地平线上方时，高度角越大，影子越短。不能把北半球的结论套到南半球；回归线之间还要考虑太阳直射位置。',
 note:'α = asin(sinφ sinδ + cosφ cosδ cosω)，ω = 15°(t−12)。正午高度 αₙ = 90°−|φ−δ|；地平线上方时 L = H/tanα。时间为地方真太阳时，不是北京时间或手机时间。未计算经度、时区、均时差、大气折射、地形或太阳视半径，不能用于精密日出日落预报。δ 由滑块直接给定，季节预设为理想化数值。播放为加速演示：1× 倍速时每秒推进 0.5 小时地方真太阳时。',sources:['solar','solarLimits']},
{id:'gas',cat:'physics',level:'初中 · 高中',title:'理想气体与分子运动',desc:'改变温度和体积，观察分子运动与压强。',tags:'气体 理想气体 分子 运动 温度 压强 体积 热力学',time:true,
 defaults:{temp:300,vol:20,moles:.5},controls:[['temp','T','绝对温度',100,800,10,'K'],['vol','V','气体体积',5,30,.5,'L'],['moles','n','物质的量',.1,1,.05,'mol']],
 presets:[['室温示意',{temp:300,vol:20,moles:.5}],['升温对比',{temp:600,vol:20,moles:.5}],['等温压缩',{temp:300,vol:10,moles:.5}]],
 hint:'二维慢放示意；粒子与壁面、粒子之间均为弹性碰撞。',question:'温度和气体量不变，把容器体积减半，压强会怎样变化？',answer:'由 pV = nRT 可知，温度和气体量不变时，体积减半，压强加倍。升温会提高分子均方根速率，比例为 √T，而不是 T。',
 note:'宏观计算使用 pV = nRT，R = 8.314462618 J/(mol·K)。均方根速率 vᵣₘₛ = √(3RT/M)，采用理想氮气 M = 0.028 kg/mol。粒子动画为二维等质量硬圆盘示意，采用高斯速度分量、弹性壁面反射和两体弹性碰撞；半径、粒子数量与动画时间均为教学缩放，不是真实分子尺度。动画使用固定模拟坐标，窗口大小不影响运动。压强来自三维理想气体状态方程，并非二维碰撞统计。改变体积或气体量会重新布置粒子；温度保持给定值，表示等温状态比较，不模拟活塞的连续压缩过程。',sources:['gas','kinetic','collisions']},
{id:'projectile',cat:'physics',level:'高中',title:'平抛与斜抛运动',desc:'观察抛体轨迹，对照有无空气阻力的射程。',tags:'物理 平抛 斜抛 抛体 速度 加速度 重力 分解 空气阻力 理想 实际 对照',time:true,compare:true,environment:true,choices:{motionMode:['ideal','compare']},
 defaults:{v:20,angle:45,height:0,g:9.8,motionMode:'ideal',mass:.15,rho:1.225,cd:.47,area:.0042},controls:[['v','v₀','初速度',5,40,.5,'m/s'],['angle','θ','发射仰角',0,85,1,'°'],['height','h₀','初始高度',0,20,.5,'m'],['g','g','重力加速度',1.62,15,.01,'m/s²'],['mass','m','物体质量',.05,2,.05,'kg'],['rho','ρ','空气密度',0,1.5,.025,'kg/m³'],['cd','Cᴅ','阻力系数',0,1.2,.01,''],['area','A','迎风面积',.001,.02,.0001,'m²']],
 presets:[['45° 斜抛',{v:20,angle:45,height:0,g:9.8,rho:1.225}],['水平抛出',{v:15,angle:0,height:15,g:9.8,rho:1.225}],['月球真空',{v:20,angle:45,height:0,g:1.62,rho:0}]],
 hint:'圆点为等时间间隔；对照模式中，橙色虚线为理想轨迹，绿色为含阻力轨迹。',question:'抛体到达最高点时，竖直速度为 0，那么它的加速度也是 0 吗？',answer:'不是。忽略空气阻力时，加速度仍为竖直向下的 g。含空气阻力时，最高点仍有水平速度，因此还存在反向的水平阻力加速度；两个方向的运动不再相互独立。',
 note:'理想模型：x = v₀cosθ·t，y = h₀ + v₀sinθ·t − ½gt²。含阻力模型：Fᴅ = −½ρCᴅA|v|v，a = (0,−g) + Fᴅ/m；用四阶 Runge–Kutta 积分，步长 ≤ 1/240 s，细化最高点与落地时刻。两种轨迹使用同初值、同一时间与同一等比例坐标；各自落地后停止，不模拟碰撞。ρ（kg/m³）、Cᴅ（无量纲）、A（m²）及 m（kg）可调，ρ 或 Cᴅ 为零时回到理想结果。此处采用静止、恒密度空气与恒定阻力系数，不计风、旋转、升力、浮力、地球曲率或自转。二次阻力是简化模型，不是实测轨迹；低速微粒等情况不适用。重力设置与空气密度独立，月球预设为真空。45° 射程最大仅适用于无阻力、起落同高和相同初速度。',sources:['projectile','drag']},
{id:'pendulum',cat:'physics',level:'高中',title:'单摆与能量转化',desc:'比较无阻尼与有阻尼的摆动和能量变化。',tags:'物理 单摆 摆长 周期 重力 动能 势能 能量 阻尼 理想 实际 对照',time:true,environment:true,choices:{motionMode:['ideal','compare']},
 defaults:{length:1.5,angle:15,g:9.8,mass:1,motionMode:'ideal',damping:.15},controls:[['length','L','摆长',.5,3,.1,'m'],['angle','θ₀','初始摆角',5,60,1,'°'],['g','g','重力加速度',1.62,15,.01,'m/s²'],['mass','m','摆球质量',.1,2,.1,'kg'],['damping','b','线性阻尼系数',0,.6,.01,'kg/s']],
 presets:[['小角度摆动',{length:1.5,angle:15,g:9.8,mass:1}],['摆长加倍',{length:3,angle:15,g:9.8,mass:1}],['大角度观察',{length:1.5,angle:60,g:9.8,mass:1}]],
 hint:'使用完整的 sinθ 回复项；对照时橙色虚线为无阻尼摆，绿色为有阻尼摆。',question:'只把摆球质量变成原来的 2 倍，单摆摆动会明显变慢吗？',answer:'在理想模型中，质量不改变周期。若切向阻力 F = −bv 且 b 保持不变，衰减率 b/m 随质量改变；不能把无阻尼结论直接套到有阻尼模型。大摆角下，小角度周期公式也不再精确。',
 note:'理想：θ″ = −(g/L)sinθ。含线性阻尼：θ″ = −(g/L)sinθ − (b/m)θ̇，对应切向力 F = −bv；b 单位 kg/s（等价于 N·s/m）。两种摆从相同角度静止释放，在相同时间和比例下计算；四阶 Runge–Kutta 步长 ≤ 1/240 s。U = mgL(1−cosθ)，K = ½mL²θ̇²，dE/dt = −bL²θ̇²；已耗散能量为初始机械能减当前机械能。b = 0 时两种结果重合。T₀ = 2π√(L/g) 仅为小角近似；椭圆积分周期 T 只对应无阻尼摆，不能作为有阻尼摆的恒定周期。阻尼为线性黏性近似，不是轴摩擦与空气阻力的完整实测模型；强阻尼下可能不再往复摆动。不计驱动力、绳质量，摆球视为质点。',sources:['pendulum','pendulumPeriod','damping']},
{id:'trig',cat:'math',level:'高中',title:'单位圆与三角函数',desc:'对应圆上点的坐标与正弦、余弦值。',tags:'数学 三角 正弦 余弦 单位圆 角度 弧度',time:true,
 defaults:{angle:45,omega:45},controls:[['angle','θ','当前角度',0,360,1,'°'],['omega','ω','转动角速度',10,120,5,'°/s']],
 presets:[['30° 特殊角',{angle:30}],['45° 特殊角',{angle:45}],['120° 第二象限',{angle:120}]],
 hint:'拖动圆上的点；橙线表示 sinθ，绿线表示 cosθ。',question:'点从第一象限转到第二象限，sinθ、cosθ 的正负分别怎样变化？',answer:'单位圆上点的坐标是 (cosθ, sinθ)。第二象限纵坐标为正，所以 sinθ > 0；横坐标为负，所以 cosθ < 0。一个完整旋转对应 360° = 2π rad。',
 note:'单位圆半径为 1；坐标 (cosθ, sinθ)。角度控件以度为单位，内部三角函数计算转换为弧度。图中右侧横轴为角度，纵轴为 sinθ；度数与圆坐标不共用单位。',sources:['trig']},
{id:'wave',cat:'physics',level:'高中',title:'波的传播与振动',desc:'观察波形传播与单个质点的振动。',tags:'波 波长 波速 频率 振幅 质点 横波 机械波',time:true,
 defaults:{amp:.65,lambda:3,freq:.5},controls:[['amp','A','振幅',.1,1,.05,'m'],['lambda','λ','波长',1,6,.1,'m'],['freq','f','频率',.2,2,.1,'Hz']],
 presets:[['标准行波',{amp:.65,lambda:3,freq:.5}],['提高频率',{amp:.65,lambda:3,freq:1}],['增大振幅',{amp:1,lambda:3,freq:.5}]],
 hint:'追踪橙色质点：它上下振动，不随波形向右平移。',question:'波峰一直向右移动，橙色质点也会跟着一直向右走吗？',answer:'不会。这里是理想横向行波：介质质点在各自平衡位置附近上下振动，向右传播的是振动状态。波速 v = fλ。',
 note:'y(x,t) = A sin[2π(x/λ − ft)]，沿 +x 方向传播，无衰减。质点横坐标固定。纵横轴单位都是 m，但为便于观察采用不同绘图比例。频率、波长可独立调整，表示不同传播条件；在确定介质和条件下，波速通常由介质决定。',sources:['wave']},
{id:'refraction',cat:'physics',level:'初中 · 高中',title:'光的折射与全反射',desc:'调整折射率和入射角，观察光路。',tags:'光学 光 折射 反射 全反射 临界角 折射率',time:true,
 defaults:{n1:1,n2:1.5,angle:40},controls:[['n1','n₁','上方介质折射率',1,2.4,.01,''],['n2','n₂','下方介质折射率',1,2.4,.01,''],['angle','θ₁','入射角（相对法线）',0,85,1,'°']],
 presets:[['空气 → 玻璃',{n1:1,n2:1.5,angle:40}],['玻璃 → 空气',{n1:1.5,n2:1,angle:30}],['观察全反射',{n1:1.5,n2:1,angle:55}]],
 hint:'所有角度都相对竖直法线测量；光线宽度不代表实际强度。',question:'为什么只有光从折射率较大的介质射向较小的介质时，才可能发生全反射？',answer:'根据 n₁sinθ₁ = n₂sinθ₂，当 n₁ > n₂ 且入射角大于临界角 asin(n₂/n₁) 时，不再存在实数折射角，出现全反射。临界角处折射光沿界面传播。',
 note:'采用斯涅尔定律 n₁sinθ₁ = n₂sinθ₂。n₁ > n₂ 时 θc = asin(n₂/n₁)。超过临界角只绘制全反射光，不绘制不存在的折射光。界面平直、介质均匀透明，未模拟偏振、吸收、频散或菲涅耳强度；动画为方向示意，不表示真实光速。',sources:['optics']},
{id:'spring',cat:'physics',level:'高中',title:'弹簧振子与简谐运动',desc:'观察位移、回复力和机械能的变化。',tags:'物理 弹簧 简谐 振动 回复力 胡克定律 动能 势能',time:true,
 defaults:{mass:1,stiff:20,amp:.6},controls:[['mass','m','振子质量',.2,3,.1,'kg'],['stiff','k','弹簧劲度系数',5,80,1,'N/m'],['amp','A','初始振幅',.1,1,.05,'m']],
 presets:[['标准振子',{mass:1,stiff:20,amp:.6}],['更重的振子',{mass:2,stiff:20,amp:.6}],['更硬的弹簧',{mass:1,stiff:60,amp:.6}]],
 hint:'橙色箭头为回复力，绿色为速度；下方刻度表示位移。',question:'位移最大时，弹簧的回复力最大，物体的速度也最大吗？',answer:'不是。位移最大处速度为零，弹性势能最大；平衡位置回复力为零，而速度最大。回复力改变速度，不能把力的大小直接当作速度的大小。',
 note:'理想水平弹簧：x = A cos(√(k/m)t)，v = −A√(k/m)sin(√(k/m)t)，F = −kx，T = 2π√(m/k)。K = ½mv²，U = ½kx²。无摩擦、无阻尼、弹簧质量忽略、形变在胡克定律适用范围内。改变参数会重新从最大位移处静止释放。',sources:['spring']}
];
MODELS.unshift(...GEOMETRY_MODELS);
const FUNCTIONS={linear:{name:'一次函数 f(x) = x',f:x=>x,formula:'x'},sin:{name:'正弦函数 f(x) = sin x',f:Math.sin,formula:'sin(x)'},cos:{name:'余弦函数 f(x) = cos x',f:Math.cos,formula:'cos(x)'},exp:{name:'指数函数 f(x) = eˣ',f:Math.exp,formula:'eˣ'},log:{name:'对数函数 f(x) = ln x',f:x=>x>0?Math.log(x):NaN,formula:'ln(x)'},reciprocal:{name:'反比例函数 f(x) = 1/x',f:x=>Math.abs(x)>1e-7?1/x:NaN,formula:'1/x'},abs:{name:'绝对值函数 f(x) = |x|',f:Math.abs,formula:'|x|'},sqrt:{name:'平方根函数 f(x) = √x',f:x=>x>=0?Math.sqrt(x):NaN,formula:'√x'}};
function modelById(id){return MODELS.find(m=>m.id===id);}
function safeParams(m,p){const out={...m.defaults}; if(!p||typeof p!=='object')return out; m.controls.forEach(([key,s,label,min,max,step])=>{if(typeof p[key]==='number'&&Number.isFinite(p[key]))out[key]=Number(clamp(p[key],min,max).toFixed(4));});if(m.id==='functions'&&Object.hasOwn(FUNCTIONS,p.kind))out.kind=p.kind;for(const [key,values] of Object.entries(m.choices||{}))if(values.includes(p[key]))out[key]=p[key];for(const key of m.bools||[])if(typeof p[key]==='boolean')out[key]=p[key];return out;}
const STORAGE_KEY='zhixiang-lab-v1';
let storageOK=true;
function loadStore(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return{favorites:Array.isArray(data.favorites)?data.favorites.filter(id=>modelById(id)):[],classes:Array.isArray(data.classes)?data.classes.filter(s=>s&&modelById(s.model)&&typeof s.title==='string').slice(0,150).map(s=>({id:String(s.id),model:s.model,title:s.title.slice(0,80),p:safeParams(modelById(s.model),s.p),date:String(s.date||'')})):[]};}catch{return{favorites:[],classes:[]};}}
let store=loadStore();
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store));storageOK=true;return true;}catch{storageOK=false;toast('本机未允许保存；请导出备份，以免关闭后丢失。');return false;}}
const state={only3d:false,geoSpin:false,geoFold:false,geoDirection:1,view:'all',category:'all',query:'',grade:'all',model:null,p:null,time:0,running:false,speed:1,compare:null,grid:true,labels:true,inking:false,strokes:[],answer:false,presenting:false,particles:[],theta:0,omega:0,zoom:1};
let pendingFrame=0,prevFrame=0,lastReadout=0,resizeObserver,stageInfo=null,toastTimer;
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3300);}
function updateCounts(){$('[data-nav=all] .nav-count').textContent=MODELS.length;$$('[data-category]').forEach(b=>{const el=b.querySelector('small');if(el)el.textContent=MODELS.filter(m=>m.cat===b.dataset.category).length;});$('#favoriteCount').textContent=store.favorites.length;$('#classCount').textContent=store.classes.length;}
function mobileNav(){return `<nav class="mobile-nav" aria-label="模型与课堂">${[['all','grid','模型库'],['favorites','heart','我的收藏'],['classes','classroom','我的课堂']].map(([view,glyph,label])=>`<button class="button ${state.view===view?'active':''}" data-nav="${view}" ${state.view===view?'aria-current="page"':''}>${icon(glyph)}${label}</button>`).join('')}</nav><div class="mobile-support"><button data-action="support">${icon('heart')}<span>支持知象</span><small>自愿支持维护</small></button></div>`;}
function emptyHTML(title,desc,button='查看全部模型'){return `<div class="empty-state">${icon('grid')}<h3>${esc(title)}</h3><p>${esc(desc)}</p><button class="button primary" data-action="clear-filter">${esc(button)}${icon('arrow')}</button></div>`;}
function setActiveNav(){
 const browsingModels=state.view==='all'||state.view==='demo';
 const category=state.model?.cat||state.category;
 const geometry=state.model?!!state.model.threeD:state.only3d&&(category==='all'||category==='math');
 $$('.nav-item').forEach(el=>{
  const active=el.dataset.nav?el.dataset.nav===state.view&&(state.view!=='all'||category==='all'&&!geometry):browsingModels&&(el.dataset.collection==='geometry'?geometry:el.dataset.category===category&&!geometry);
  el.classList.toggle('active',active);
  if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
 });
 updateCounts();
}
function setRoute(hash=''){try{const url=new URL(location.href);url.hash=hash;history.replaceState(null,'',url.href);}catch{/* Sandboxed previews may disallow history changes; local UI remains usable. */}}
function showLibrary(view='all',category='all'){stopAnimation();exitPresentation();state.view=view;state.category=category;state.only3d=false;state.model=null;state.query='';state.grade='all';state.inking=false;if(resizeObserver)resizeObserver.disconnect();setRoute(view==='all'&&category==='all'?'':`view=${view}&category=${category}`);renderLibrary();window.scrollTo(0,0);}
function renderLibrary(){
 setActiveNav();$('#pageCrumb').textContent=state.view==='classes'?'我的课堂':state.view==='favorites'?'我的收藏':state.category!=='all'?CATS[state.category].name:'模型库';
 if(state.view==='classes'){renderClasses();return;}
 const title=state.view==='favorites'?'我的收藏':state.category==='all'?'模型库':CATS[state.category].name;
 const subtitle=state.view==='favorites'?'已收藏的模型。':state.category==='all'?'数学、物理、地理的课堂演示。':'按知识点选择模型，打开后可调整参数。';
 $('#main').innerHTML=mobileNav()+`<section id="exploreSection"><div class="library-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="searchbox">${icon('search')}<input id="searchInput" type="search" placeholder="搜索，如：抛物线、截面" aria-label="搜索模型、知识点"><span class="search-shortcut">/</span></div></div><div class="library-toolbar"><div class="tabs">${[['all','全部'],['math','数学'],['physics','物理'],['geography','地理']].map(([id,label])=>`<button class="tab ${state.category===id?'active':''}" data-filter="${id}">${label}<span class="tab-count">${id==='all'?MODELS.length:MODELS.filter(m=>m.cat===id).length}</span></button>`).join('')}</div><div class="filter-controls"><label class="three-filter"><input id="threeDFilter" type="checkbox" ${state.only3d?'checked':''}>只看三维</label><select id="gradeFilter" class="grade-filter" aria-label="按学段筛选"><option value="all">全部学段</option><option value="初中">初中</option><option value="高中">高中</option></select></div></div><div class="result-row"><span id="resultCount"></span></div><div class="model-grid" id="modelGrid"></div></section>`;
 if(!storageOK)$('#main').insertAdjacentHTML('afterbegin','<div class="storage-warning">当前预览不支持本地保存。可通过导出配置备份课堂。</div>');
 renderCards();updateRanges();
}

function filteredModels(){return MODELS.filter(m=>(!state.only3d||m.threeD)&&(state.category==='all'||m.cat===state.category)&&(state.view!=='favorites'||store.favorites.includes(m.id))&&(state.grade==='all'||m.level.includes(state.grade))&&(!state.query||(m.title+' '+m.desc+' '+m.tags+' '+CATS[m.cat].name).toLowerCase().includes(state.query.toLowerCase())));}
function renderCards(){const models=filteredModels();$('#resultCount').textContent=`${models.length} 个模型`;
 $('#modelGrid').innerHTML=models.length?models.map(m=>`<article class="model-card"><button class="card-favorite ${store.favorites.includes(m.id)?'on':''}" data-favorite="${m.id}" aria-label="${store.favorites.includes(m.id)?'取消收藏':'收藏'}${m.title}" aria-pressed="${store.favorites.includes(m.id)}" title="${store.favorites.includes(m.id)?'取消收藏':'加入收藏'}">${icon('heart')}</button><button class="card-open" data-open="${m.id}" aria-label="打开${m.title}互动演示"><div class="card-art ${m.cat}"><canvas data-thumb="${m.id}" aria-hidden="true"></canvas></div><div class="card-body"><h3>${m.title}</h3><p>${m.desc}</p><div class="card-meta"><span class="tag ${m.cat}">${CATS[m.cat].name}</span><span>${m.level}</span></div></div></button></article>`).join(''):emptyHTML(state.view==='favorites'&&!store.favorites.length?'还没有收藏的模型':'没有找到匹配模型',state.view==='favorites'&&!store.favorites.length?'点击模型卡片右上角的爱心，即可加入收藏。':'试试其他关键词，或清除学科与学段筛选。');
 requestAnimationFrame(()=>$$('canvas[data-thumb]').forEach(drawThumbnail));
}
function toggleFavorite(id){if(!modelById(id))return;const ix=store.favorites.indexOf(id);if(ix>=0)store.favorites.splice(ix,1);else store.favorites.push(id);persist();updateCounts();if(!state.model)renderCards();toast(ix>=0?'已取消收藏':'已加入我的收藏');}
function renderClasses(){
 $('#main').innerHTML=mobileNav()+`<div class="section-heading"><div class="page-title" style="margin-bottom:0"><h1>我的课堂</h1><p>保存模型与参数，下次直接打开。</p></div><div class="class-actions"><button class="button secondary" data-action="import">${icon('upload')}导入配置</button><button class="button secondary" data-action="backup">${icon('download')}导出备份</button></div></div><div class="dialog-message" style="margin-bottom:20px">${icon('save')} 课堂配置仅保存在当前${STORAGE_CONTEXT}。清理本机数据或更换设备前，请导出备份。</div><div class="model-grid">${store.classes.length?store.classes.map(c=>{const m=modelById(c.model);return `<article class="saved-card"><span class="demo-tag ${m.cat}">${CATS[m.cat].name}</span><h3 style="margin-top:12px">${esc(c.title)}</h3><p>${m.title}</p><small>${esc(c.date||'本地课堂配置')}</small><div class="saved-actions"><button class="button primary small" data-class-open="${esc(c.id)}">打开演示${icon('arrow')}</button><button class="icon-button" data-class-export="${esc(c.id)}" aria-label="导出${esc(c.title)}" title="导出配置">${icon('download')}</button><button class="icon-button" data-class-delete="${esc(c.id)}" aria-label="删除${esc(c.title)}" title="删除课堂">${icon('trash')}</button></div></article>`;}).join(''):emptyHTML('还没有保存的课堂','打开任意模型，调整参数，然后点击「保存课堂」。')}</div>`;hydrateIcons($('#main'));
}
function projectileData(p){const vx=p.v*Math.cos(rad(p.angle)),vy=p.v*Math.sin(rad(p.angle)),flight=(vy+Math.sqrt(vy*vy+2*p.g*p.height))/p.g;return{vx,vy,flight,range:vx*flight,peak:p.height+vy*vy/(2*p.g)};}
function solarData(p){const phi=rad(p.lat),delta=rad(p.dec),hourAngle=rad(15*(p.hour-12));const elevation=deg(Math.asin(clamp(Math.sin(phi)*Math.sin(delta)+Math.cos(phi)*Math.cos(delta)*Math.cos(hourAngle),-1,1)));return{elevation,noon:90-Math.abs(p.lat-p.dec),shadow:elevation>1e-8?p.pole/Math.tan(rad(elevation)):null};}
function opticalData(p){const ratio=p.n1/p.n2*Math.sin(rad(p.angle));return{tir:ratio>1+1e-12,refracted:ratio<=1+1e-12?deg(Math.asin(clamp(ratio,-1,1))):null,critical:p.n1>p.n2?deg(Math.asin(p.n2/p.n1)):null};}
function gasData(p){return{pressure:p.moles*8.314462618*p.temp/p.vol,rms:Math.sqrt(3*8.314462618*p.temp/.028),celsius:p.temp-273.15};}
function springData(p,t){const omega=Math.sqrt(p.stiff/p.mass),x=p.amp*Math.cos(omega*t),v=-p.amp*omega*Math.sin(omega*t);return{x,v,force:-p.stiff*x,period:2*Math.PI/omega,kinetic:.5*p.mass*v*v,potential:.5*p.stiff*x*x,total:.5*p.stiff*p.amp*p.amp};}
function pendulumPeriod(p){
 const small=2*Math.PI*Math.sqrt(p.length/p.g),k=Math.sin(rad(p.angle)/2),n=128,step=Math.PI/(2*n);
 let sum=0;
 for(let i=0;i<=n;i++){const f=1/Math.sqrt(1-k*k*Math.sin(i*step)**2);sum+=(i===0||i===n?1:i%2?4:2)*f;}
 const period=4*Math.sqrt(p.length/p.g)*step*sum/3;
 return{period,small,error:(period/small-1)*100};
}
function pendulumEnergy(p,theta,omega){return{potential:p.mass*p.g*p.length*(1-Math.cos(theta)),kinetic:.5*p.mass*p.length*p.length*omega*omega,total:p.mass*p.g*p.length*(1-Math.cos(rad(p.angle)))};}
function isResistanceCompare(p){return p.motionMode==='compare';}
function rk4Pendulum(theta,omega,dt,p){return ZhixiangPhysics.pendulumStep(theta,omega,dt,p,isResistanceCompare(p)?p.damping:0);}
const projectilePathCache=new Map();
function resistedProjectile(p){
 const key=JSON.stringify([p.v,p.angle,p.height,p.g,p.mass,p.rho,p.cd,p.area]);
 if(!projectilePathCache.has(key)){
  if(projectilePathCache.size>=12)projectilePathCache.delete(projectilePathCache.keys().next().value);
  projectilePathCache.set(key,ZhixiangPhysics.projectilePath(p));
 }
 return projectilePathCache.get(key);
}
function projectileDuration(p){const ideal=projectileData(p);return isResistanceCompare(p)?Math.max(ideal.flight,resistedProjectile(p).flight):ideal.flight;}
function projectileAt(p,t,resisted=false){
 if(resisted)return ZhixiangPhysics.samplePath(resistedProjectile(p),t);
 const d=projectileData(p),time=clamp(t,0,d.flight);
 return{t:time,x:d.vx*time,y:Math.max(0,p.height+d.vy*time-.5*p.g*time*time),vx:d.vx,vy:d.vy-p.g*time};
}
function comparisonRows(rows){return rows.map(([label,ideal,actual,unit,digits=2])=>[label,num(ideal,digits),num(actual,digits),num(actual-ideal,digits),unit]);}
function comparisonHTML(rows,label){return `<div class="condition-results"><table><caption>${label} · 差值为含阻力减理想</caption><thead><tr><th scope="col">物理量</th><th scope="col">理想</th><th scope="col">含阻力</th><th scope="col">差值</th></tr></thead><tbody>${rows.map(([name,ideal,actual,diff,unit])=>`<tr><th scope="row">${esc(name)}${unit?`<small>${esc(unit)}</small>`:''}</th><td>${esc(ideal)}</td><td>${esc(actual)}</td><td>${esc(diff)}</td></tr>`).join('')}</tbody></table></div>`;}

function readout(m,p){if(m.threeD)return geometryReadout(m,p);switch(m.id){
 case'parabola':return{formula:`y = ${num(p.a)}(x ${signed(-p.h)})² ${signed(p.k)}`,caption:p.a===0?'a = 0：退化为常数函数':'等比例坐标 · 顶点 (h, k)',metrics:p.a===0?[['函数类型','常数函数',''],['函数值',num(p.k),''],['图像方向','水平直线','']]:[['顶点坐标',`(${num(p.h)}, ${num(p.k)})`,''],['对称轴',`x = ${num(p.h)}`,''],['开口方向',p.a>0?'向上':'向下','']]};
 case'functions':return{formula:`y = ${num(p.a)} · f(${num(p.b)}(x ${signed(-p.h)})) ${signed(p.k)}`,caption:`基础函数：f(x) = ${FUNCTIONS[p.kind].formula}`,metrics:[['基础函数',FUNCTIONS[p.kind].formula,''],['定义域',p.kind==='log'?`x > ${num(p.h)}`:p.kind==='sqrt'?`x ≥ ${num(p.h)}`:p.kind==='reciprocal'?`x ≠ ${num(p.h)}`:'全体实数',''],[(p.kind==='sin'||p.kind==='cos')?'图像周期':'纵向系数',p.a===0&&(p.kind==='sin'||p.kind==='cos')?'常数函数':(p.kind==='sin'||p.kind==='cos')?num(2*Math.PI/p.b):num(p.a),'']]};
 case'solar':{const d=solarData(p);return{formula:'sin α = sin φ sin δ + cos φ cos δ cos ω',caption:`ω = 15° × (地方真太阳时 − 12) · ${d.elevation>1e-8?'太阳在地平线上方':'太阳位于地平线或其下方'}`,metrics:[['当前太阳高度角',num(d.elevation,1),'°'],['正午太阳高度角',num(d.noon,1),'°'],['水平杆影长度',d.shadow===null?'无直射杆影':num(d.shadow,d.shadow>100?1:2),d.shadow===null?'':'m']]};}
 case'gas':{const d=gasData(p);return{formula:'pV = nRT',caption:'二维碰撞示意 · 绝对压强由 pV = nRT 计算',metrics:[['绝对压强',num(d.pressure,1),'kPa'],['均方根速率',num(d.rms,1),'m/s'],['摄氏温度',num(d.celsius,1),'°C']]};}
 case'projectile':{
  const ideal=projectileData(p),compare=isResistanceCompare(p),d=compare?resistedProjectile(p):ideal;
  const rows=compare?comparisonRows([['飞行时间',ideal.flight,d.flight,'s'],['水平射程',ideal.range,d.range,'m'],['最高点高度',ideal.peak,d.peak,'m']]):null;
  return{formula:compare?'Fᴅ = −½ρCᴅA |v|v　　a = (0, −g) + Fᴅ/m':'x = v₀ cos θ · t　　y = h₀ + v₀ sin θ · t − ½gt²',caption:compare?`同初值、同一时间与比例 · 静止空气的二次阻力近似${d.completed?'':' · 尚未落地，结果未完成'}`:'忽略空气阻力 · 两个方向独立运动 · 落地停止',metrics:rows?rows.map(([name,a,b,diff,unit])=>[name,`理想 ${a} / 含阻力 ${b}`,unit]):[['总飞行时间',num(d.flight),'s'],['水平射程',num(d.range),'m'],['最高点离地高度',num(d.peak),'m']],comparison:rows};
 }

 case'pendulum':{
  const d=pendulumPeriod(p);
  if(isResistanceCompare(p)){
   const actual=pendulumEnergy(p,state.theta,state.omega),ideal=pendulumEnergy(p,state.idealTheta,state.idealOmega),e=actual.kinetic+actual.potential;
   const rows=comparisonRows([['当前摆角',deg(state.idealTheta),deg(state.theta),'°',1],['当前速率',Math.abs(p.length*state.idealOmega),Math.abs(p.length*state.omega),'m/s'],['机械能',ideal.kinetic+ideal.potential,e,'J',3],['已耗散能量',0,Math.max(0,actual.total-e),'J',3]]);
   return{formula:'θ″ = −(g/L) sin θ − (b/m) θ̇',caption:`切向阻力 F = −bv · b = ${num(p.damping)} kg/s · 有阻尼摆不标作恒定周期`,metrics:rows.map(([name,a,b,diff,unit])=>[name,`理想 ${a} / 含阻力 ${b}`,unit]),comparison:rows};
  }
  return{formula:'θ″ = −(g/L) sin θ',caption:`无阻力质点单摆 · T 比小角近似长 ${num(d.error,2)}%`,metrics:[['计入摆角的周期 T',num(d.period,3),'s'],['小角近似周期 T₀',num(d.small,3),'s'],['当前摆球速率',num(Math.abs(p.length*state.omega)),'m/s']]};
 }

 case'trig':return{formula:'P = (cos θ, sin θ)',caption:`θ = ${num(p.angle,1)}° = ${num(rad(p.angle),3)} rad · 单位圆半径为 1`,metrics:[['sin θ',num(Math.sin(rad(p.angle)),3),''],['cos θ',num(Math.cos(rad(p.angle)),3),''],['角度',num(p.angle,1),'°']]};
 case'wave':return{formula:'y(x,t) = A sin[2π(x/λ − ft)]',caption:'沿 +x 传播的理想横波 · 质点在固定横坐标处振动',metrics:[['传播速度',num(p.freq*p.lambda),'m/s'],['振动周期',num(1/p.freq),'s'],['波长',num(p.lambda),'m']]};
 case'refraction':{const d=opticalData(p);return{formula:'n₁ sin θ₁ = n₂ sin θ₂',caption:d.tir?'已发生全反射 · 不存在实数折射角':'斯涅尔定律 · 角度均相对法线测量',metrics:[['入射角',num(p.angle,1),'°'],['折射角',d.tir?'全反射':num(d.refracted,1),d.tir?'':'°'],['临界角',d.critical===null?'无':num(d.critical,1),d.critical===null?'':'°']]};}
 case'spring':{const d=springData(p,state.time);return{formula:'x = A cos(√(k/m) · t)　　F = −kx',caption:'理想水平弹簧 · 无阻尼 · 总机械能守恒',metrics:[['振动周期',num(d.period),'s'],['当前位移',num(d.x),'m'],['回复力',num(d.force,1),'N']]};}
 default:return{formula:'',caption:'',metrics:[]};
}}
function resistanceKeys(m){return m.id==='projectile'?['mass','rho','cd','area']:m.id==='pendulum'?['damping']:[];}
function environmentControls(m,p){
 if(!m.environment)return '';
 const compare=isResistanceCompare(p);
 return `<fieldset class="motion-conditions"><legend>运动条件</legend><div class="condition-options"><label><input type="radio" name="motionMode" data-environment="motionMode" value="ideal" ${!compare?'checked':''}><span>理想 · 无阻力</span></label><label><input type="radio" name="motionMode" data-environment="motionMode" value="compare" ${compare?'checked':''}><span>理想与含阻力对照</span></label></div><p>同参数、同一时间、同一比例。含阻力结果为简化计算。</p></fieldset>`;
}
function paramHTML(c,p){const[key,symbol,label,min,max,step,unit]=c;return `<div class="param"><div class="param-head"><label class="param-label" for="range-${key}"><span class="param-symbol">${symbol}</span>${label}</label><div class="param-value"><input id="number-${key}" data-param-number="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${p[key]}" aria-label="${label}数值"><span>${unit}</span></div></div><input id="range-${key}" type="range" data-param="${key}" min="${min}" max="${max}" step="${step}" value="${p[key]}" aria-label="${label}"><div class="range-extents"><span>${min}${unit?' '+unit:''}</span><span>${max}${unit?' '+unit:''}</span></div></div>`;}
function renderControls(){const m=state.model;const root=$('#controlBody');if(!root)return;
 if(m.threeD){renderGeometryControls();return;}
 root.innerHTML=`${environmentControls(m,state.p)}<h3>预设</h3><div class="preset-list">${m.presets.map((s,i)=>`<button class="preset" data-preset="${i}">${s[0]}</button>`).join('')}</div>${m.id==='functions'?`<label for="functionSelect" style="font-size:10px;color:#80966b">基础函数</label><select id="functionSelect" class="control-select">${Object.entries(FUNCTIONS).map(([id,f])=>`<option value="${id}" ${state.p.kind===id?'selected':''}>${f.name}</option>`).join('')}</select>`:''}<div class="params-grid">${m.controls.filter(c=>!resistanceKeys(m).includes(c[0])).map(c=>paramHTML(c,state.p)).join('')}</div>${m.environment&&isResistanceCompare(state.p)?`<details class="resistance-params" ${m.id==='pendulum'?'open':''}><summary>${m.id==='projectile'?'空气与物体':'阻尼参数'}</summary><div class="params-grid">${m.controls.filter(c=>resistanceKeys(m).includes(c[0])).map(c=>paramHTML(c,state.p)).join('')}</div><p>${m.id==='projectile'?'默认参数仅作教学示例；ρ 或 Cᴅ 设为 0 可核对理想极限。':'b 为切向线性阻尼系数；b = 0 时两种摆重合。'}</p></details>`:''}<div class="control-divider"></div><h3>显示设置</h3>${['parabola','functions','projectile','wave'].includes(m.id)?`<label class="checkline"><input type="checkbox" data-flag="grid" ${state.grid?'checked':''}>显示坐标网格</label>`:''}<label class="checkline"><input type="checkbox" data-flag="labels" ${state.labels?'checked':''}>显示标注${['projectile','spring'].includes(m.id)?'与矢量':''}</label>${m.compare?`<button class="button soft small" style="width:100%;margin-top:10px" data-action="compare">${icon('compare')}<span id="compareText">${state.compare?'清除对照曲线':'保留当前曲线'}</span></button>`:''}<p class="control-note">${m.id==='gas'?'温度用开尔文 K 表示；粒子动画是慢放示意。':m.id==='solar'?'“地方真太阳时”不等于北京时间。正号为北纬，负号为南纬。':m.id==='pendulum'?(isResistanceCompare(state.p)?'比较当前机械能与已耗散能量；完整周期公式只适用于无阻尼摆。':'周期 T 计入摆角影响；T₀ 是小角近似。摆球按质点计算。'):m.id==='wave'?'注意控制变量：频率和波长独立变化，意味着在比较不同传播条件。':'拖动滑块实时观察。修改物理参数会从初始状态重新演示。'}</p><button class="source-link" data-action="model-info">模型条件与参考资料</button>`;updateRanges(root);
}
function openModel(id,params=null){const m=modelById(id);if(!m){toast('未找到这个模型，已返回模型库。');showLibrary();return;}stopAnimation();exitPresentation();if(resizeObserver)resizeObserver.disconnect();Object.assign(state,{view:'demo',model:m,p:safeParams(m,params),time:0,compare:null,answer:false,inking:false,strokes:[],zoom:1,grid:true,labels:true});resetSolver();renderDemo();setRoute(new URLSearchParams({model:id,...(params?{params:JSON.stringify(state.p)}:{})}).toString());window.scrollTo(0,0);}
function standardPlayback(m){return `${m.time?`<button class="button primary small" id="playButton" data-action="play">${icon('play')}播放</button><button class="icon-button" data-action="step" title="${m.id==='solar'?'暂停并推进 1.5 分钟地方真太阳时':'暂停并单步推进 0.05 秒'}" aria-label="暂停并单步推进">${icon('step')}</button>`:''}<button class="icon-button" data-action="reset" title="恢复默认参数 (R)" aria-label="恢复默认参数">${icon('reset')}</button>${m.id==='projectile'?`<input id="timeline" type="range" min="0" max="1000" step="1" value="0" aria-label="飞行进度"><span class="time-label" id="timeLabel">0.00 s</span>`:m.time?`<span class="time-label" id="timeLabel">0.00 s</span><span style="flex:1"></span>`:`<span class="note">按 R 恢复默认参数</span>`}${m.time?`<select id="speedSelect" class="speed-select" aria-label="播放速度"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>`:''}`;}
function renderDemo(){const m=state.model;setActiveNav();$('#pageCrumb').textContent=CATS[m.cat].name+' / '+m.title;
 $('#main').innerHTML=`<section class="demo-header"><div class="demo-heading"><button class="icon-button back-button" data-action="home" aria-label="返回模型库">${icon('back')}</button><div><div class="demo-title-row"><h1>${m.title}</h1><span class="demo-tag ${m.cat}">${CATS[m.cat].name}</span></div><p>${m.desc}</p></div></div><div class="demo-actions"><button class="button secondary" data-action="share" title="导出当前模型参数">${icon('share')}<span>导出参数</span></button><button class="button secondary" data-action="save">${icon('save')}<span>保存课堂</span></button><button class="button primary" data-action="present">${icon('fullscreen')}<span id="presentLabel">大屏模式</span></button></div></section><div class="demo-layout ${m.threeD?'geometry-layout geometry-'+m.id:''}"><div class="demo-left"><section class="canvas-panel" aria-label="互动模型演示"><div class="canvas-toolbar"><div class="status"><span id="simulationStatus">${m.threeD?'拖动旋转 · 滚轮缩放':m.time?'点击播放':'拖动参数'}</span><button class="mobile-param-jump" data-action="to-params">参数 ↓</button></div><div class="canvas-tools">${m.compare?`<button class="icon-button" data-action="compare" title="对照曲线" aria-label="保存或清除对照曲线">${icon('compare')}</button><span class="sep"></span>`:''}<button class="icon-button" id="inkButton" data-action="ink" title="板书 / 自由标注" aria-label="开启板书" aria-pressed="false">${icon('pencil')}</button><button class="icon-button" data-action="clear-ink" title="清空板书" aria-label="清空板书">${icon('trash')}</button><span class="sep"></span><button class="icon-button" data-action="screenshot" title="导出当前模型图片" aria-label="导出当前模型图片">${icon('camera')}</button></div></div>${m.threeD?geometryToolbar():''}<div class="stage ${m.threeD?'stage-3d':''}" id="stage"><canvas id="simCanvas" role="img" aria-label="${m.title}动态图。可通过参数滑块或数值输入操作；结果显示在下方。"></canvas><canvas id="annotation" aria-label="课堂板书画布"></canvas><div class="comparison-legend" id="comparisonLegend" hidden><span class="legend-item"><span class="legend-line"></span>当前模型</span><span class="legend-item"><span class="legend-line compare"></span>对照曲线</span></div></div><div class="stage-hint">${m.hint}</div><div class="formula-bar"><div><div class="formula-text" id="formula"></div><div class="formula-caption" id="formulaCaption"></div></div></div><div class="playback">${m.threeD?geometryPlayback():standardPlayback(m)}</div></section><div class="metrics" id="metrics" aria-live="off"></div><details class="model-question"><summary>讨论问题</summary><p>${m.question}</p><button data-action="answer" id="answerButton">查看解答</button><p class="answer" id="answerText" hidden>${m.answer}</p></details></div><aside class="control-panel" id="controlPanel" aria-label="模型参数"><div class="control-heading">参数<button class="mobile-stage-jump" data-action="to-model">回到模型 ↑</button></div><div class="control-body" id="controlBody"></div></aside></div>`;
 renderControls();renderReadout();state.speed=1;bindStage();if(m.threeD){bindGeometryStage();geometrySyncView();}resizeObserver=new ResizeObserver(()=>requestDraw());resizeObserver.observe($('#stage'));requestDraw();
}
function renderReadout(){if(!state.model||!$('#formula'))return;const d=readout(state.model,state.p);$('#formula').textContent=d.formula;$('#formulaCaption').textContent=d.caption;$('#metrics').classList.toggle('has-comparison',!!d.comparison);$('#metrics').innerHTML=d.comparison?comparisonHTML(d.comparison,state.model.id==='projectile'?'落地结果对照':'同一时刻对照'):d.metrics.map(v=>`<div class="metric"><span>${esc(v[0])}</span><strong>${esc(v[1])}${v[2]?`<small>${esc(v[2])}</small>`:''}</strong></div>`).join('');if($('#timeLabel'))$('#timeLabel').textContent=state.model.id==='solar'?`${num(state.p.hour,1)} h`:state.model.id==='trig'?`${num(state.p.angle,0)}°`:`${state.time.toFixed(2)} s`;if($('#timeline')){const total=projectileDuration(state.p);$('#timeline').value=total?Math.round(state.time/total*1000):0;setRangeProgress($('#timeline'));}if(state.model.id==='solar')syncParam('hour');if(state.model.id==='trig')syncParam('angle');if(state.model.threeD)geometrySyncView();}
function syncParam(key){const range=$(`#range-${key}`),number=$(`#number-${key}`);if(range){range.value=state.p[key];setRangeProgress(range);}if(number&&document.activeElement!==number)number.value=num(state.p[key],Math.max(2,(String(state.model.controls.find(c=>c[0]===key)?.[5]||.01).split('.')[1]||'').length));}
function setRangeProgress(el){const min=Number(el.min),max=Number(el.max),v=Number(el.value);el.style.setProperty('--progress',`${(v-min)/(max-min)*100}%`);}
function updateRanges(root=document){$$('input[type=range]',root).forEach(setRangeProgress);}
function setParam(key,value){if(state.model?.threeD)stopAnimation();const spec=state.model?.controls.find(c=>c[0]===key);if(!spec||!Number.isFinite(value))return;const [, , ,min,max,step]=spec;const p=Number(clamp(value,min,max).toFixed(4));state.p[key]=p;syncParam(key);if(!['solar','trig','gas'].includes(state.model.id)){state.time=0;resetSolver();}if(state.model.id==='gas'&&['moles','vol'].includes(key))initParticles();state.model.id==='projectile'&&updatePlayback();renderReadout();requestDraw();}
function resetSolver(){if(!state.model)return;if(state.model.id==='pendulum'){state.theta=state.idealTheta=rad(state.p.angle);state.omega=state.idealOmega=0;}if(state.model.id==='gas')initParticles();}
const GAS_RADIUS=.018;
function gasDomain(p){return{w:3.6*p.vol/30,h:2};}
function initParticles(){
 const {w,h}=gasDomain(state.p),r=GAS_RADIUS;
 let seed=937+Math.round(state.p.moles*1000);
 const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return(seed+.5)/4294967296;};
 const pts=[];
 for(let i=0;i<Math.max(9,Math.round(state.p.moles*90));i++){
  let x,y;
  // Reject overlapping starting positions, including at the smallest volume.
  do{x=r+(w-2*r)*rng();y=r+(h-2*r)*rng();}while(pts.some(q=>Math.hypot(x-q.x*w,y-q.y*h)<2*r));
  const a=2*Math.PI*rng(),speed=Math.sqrt(-2*Math.log(rng()));
  pts.push({x:x/w,y:y/h,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed});
 }
 // Normalize the finite sample so changing the count does not change its RMS speed.
 const meanX=pts.reduce((v,q)=>v+q.vx,0)/pts.length,meanY=pts.reduce((v,q)=>v+q.vy,0)/pts.length;
 pts.forEach(q=>{q.vx-=meanX;q.vy-=meanY;});
 const rms=Math.sqrt(pts.reduce((v,q)=>v+q.vx*q.vx+q.vy*q.vy,0)/pts.length);
 pts.forEach(q=>{q.vx/=rms;q.vy/=rms;});
 state.particles=pts;
}
function collideGasPair(a,b,w,h){
 const dx=(b.x-a.x)*w,dy=(b.y-a.y)*h,dist=Math.hypot(dx,dy),diameter=2*GAS_RADIUS;
 if(dist>=diameter)return;
 const nx=dist>1e-12?dx/dist:1,ny=dist>1e-12?dy/dist:0,shift=(diameter-dist)/2;
 a.x-=nx*shift/w;a.y-=ny*shift/h;b.x+=nx*shift/w;b.y+=ny*shift/h;
 const approach=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
 if(approach<0){a.vx+=approach*nx;a.vy+=approach*ny;b.vx-=approach*nx;b.vy-=approach*ny;}
}
function stepGas(p,particles,dt){
 const {w,h}=gasDomain(p),r=GAS_RADIUS,speed=.42*Math.sqrt(p.temp/300),steps=Math.max(1,Math.ceil(dt*240)),step=dt/steps;
 const wall=q=>{
  const mx=r/w,my=r/h;
  if(q.x<mx){q.x=mx;q.vx=Math.abs(q.vx);}else if(q.x>1-mx){q.x=1-mx;q.vx=-Math.abs(q.vx);}
  if(q.y<my){q.y=my;q.vy=Math.abs(q.vy);}else if(q.y>1-my){q.y=1-my;q.vy=-Math.abs(q.vy);}
 };
 for(let i=0;i<steps;i++){
  particles.forEach(q=>{q.x+=q.vx*speed*step/w;q.y+=q.vy*speed*step/h;wall(q);});
  for(let a=0;a<particles.length;a++)for(let b=a+1;b<particles.length;b++)collideGasPair(particles[a],particles[b],w,h);
  particles.forEach(wall);
 }
}
function updateSimulation(dt){if(!state.model)return;if(state.model.threeD){geometryTick(dt);return;}const id=state.model.id,p=state.p;state.time+=dt;
 if(id==='solar')p.hour=(p.hour+dt*.5)%24;
 if(id==='trig')p.angle=(p.angle+p.omega*dt)%360;
 if(id==='pendulum'){let remaining=dt;while(remaining>1e-9){const h=Math.min(remaining,1/240);[state.theta,state.omega]=rk4Pendulum(state.theta,state.omega,h,p);[state.idealTheta,state.idealOmega]=ZhixiangPhysics.pendulumStep(state.idealTheta,state.idealOmega,h,p,0);remaining-=h;}}
 if(id==='gas')stepGas(p,state.particles,dt);
 if(id==='projectile'){const total=projectileDuration(p);if(state.time>=total){state.time=total;state.running=false;updatePlayback();}}
}
function requestDraw(){if(!pendingFrame)pendingFrame=requestAnimationFrame(frame);}
function frame(now){pendingFrame=0;if(state.running&&state.model){const dt=Math.min((now-(prevFrame||now))/1000,.04)*state.speed;if(dt>0)updateSimulation(dt);}prevFrame=now;if(state.model){drawStage();if(now-lastReadout>100){renderReadout();lastReadout=now;}}if(state.running)requestDraw();}
function stopAnimation(){state.running=false;state.geoSpin=false;state.geoFold=false;prevFrame=0;updatePlayback();if(state.model?.threeD)geometrySyncView();}
function updatePlayback(){const b=$('#playButton');if(b)b.innerHTML=icon(state.running?'pause':'play')+(state.running?'暂停':'播放');if($('#simulationStatus')&&state.model?.time)$('#simulationStatus').textContent=state.running?'播放中':'已暂停';}
function togglePlay(){if(!state.model?.time)return;if(state.model.id==='projectile'&&state.time>=projectileDuration(state.p)){state.time=0;}state.running=!state.running;prevFrame=0;updatePlayback();requestDraw();}
// ---- Canvas rendering. Graphics remain local and export without cross-origin assets. ----
const PALETTE={green:'#397251',deep:'#216b51',orange:'#b97c3c',purple:'#796a9b',grid:'#e8ece9',axis:'#aabbb0',muted:'#65716a',ink:'#445b4b'};
function setupCanvas(canvas){const w=canvas.clientWidth||canvas.width||400,h=canvas.clientHeight||canvas.height||250,dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return{ctx,w,h,dpr};}
function line(ctx,x1,y1,x2,y2,color=PALETTE.axis,width=1,dash=[]){ctx.save();ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
function circle(ctx,x,y,r,fill,stroke=null,width=1){if(!Number.isFinite(x+y+r)||r<0)return;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function roundRect(ctx,x,y,w,h,r,fill,stroke=null,width=1){ctx.beginPath();ctx.roundRect(x,y,Math.max(0,w),Math.max(0,h),r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function text(ctx,txt,x,y,size=11,color=PALETTE.muted,align='left',font='sans-serif'){ctx.save();if(state.model&&size<12)size=12;ctx.font=`${size}px ${font==='math'?'Georgia, serif':'"PingFang SC", "Microsoft YaHei", sans-serif'}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(txt),x,y);ctx.restore();}
function arrow(ctx,x1,y1,x2,y2,color=PALETTE.green,width=1.5,head=6){line(ctx,x1,y1,x2,y2,color,width);const a=Math.atan2(y2-y1,x2-x1);ctx.save();ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(a-.45),y2-head*Math.sin(a-.45));ctx.lineTo(x2-head*Math.cos(a+.45),y2-head*Math.sin(a+.45));ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();}
function doubleArrow(ctx,x1,y1,x2,y2,color=PALETTE.orange){arrow(ctx,x1,y1,x2,y2,color,1,4);arrow(ctx,x2,y2,x1,y1,color,1,4);}
function niceStep(raw){const p=10**Math.floor(Math.log10(raw)),v=raw/p;return(v<=1?1:v<=2?2:v<=5?5:10)*p;}
function makePlot(ctx,w,h,options={}){let{xmin=-6,xmax=6,ymin=-3,ymax=7,equal=true,grid=state.grid,labels=state.labels,left=40,right=27,top=26,bottom=39}=options;const pw=w-left-right,ph=h-top-bottom;if(equal){const scale=Math.min(pw/(xmax-xmin),ph/(ymax-ymin));const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;xmin=cx-pw/scale/2;xmax=cx+pw/scale/2;ymin=cy-ph/scale/2;ymax=cy+ph/scale/2;}
 const x=v=>left+(v-xmin)/(xmax-xmin)*pw,y=v=>h-bottom-(v-ymin)/(ymax-ymin)*ph,ix=v=>xmin+(v-left)/pw*(xmax-xmin),iy=v=>ymin+(h-bottom-v)/ph*(ymax-ymin),sx=niceStep((xmax-xmin)/14),sy=equal?sx:niceStep((ymax-ymin)/7),ox=x(0),oy=y(0);
 ctx.save();ctx.beginPath();ctx.rect(left,top,pw,ph);ctx.clip();if(grid){for(let v=Math.ceil(xmin/sx)*sx;v<=xmax+1e-7;v+=sx)line(ctx,x(v),top,x(v),h-bottom,PALETTE.grid,1);for(let v=Math.ceil(ymin/sy)*sy;v<=ymax+1e-7;v+=sy)line(ctx,left,y(v),w-right,y(v),PALETTE.grid,1);}
 line(ctx,left,oy,w-right,oy,PALETTE.axis,1);line(ctx,ox,top,ox,h-bottom,PALETTE.axis,1);ctx.restore();
 if(labels){for(let v=Math.ceil(xmin/sx)*sx;v<=xmax+1e-7;v+=sx)if(Math.abs(v)>1e-7)text(ctx,num(v,1),x(v),clamp(oy+14,top+11,h-bottom+14),9,'#a3ae99','center');for(let v=Math.ceil(ymin/sy)*sy;v<=ymax+1e-7;v+=sy)if(Math.abs(v)>1e-7)text(ctx,num(v,1),clamp(ox-9,left+19,w-right-5),y(v),9,'#a3ae99','right');if(ox>=left&&ox<=w-right&&oy>=top&&oy<=h-bottom)text(ctx,'O',ox-10,oy+13,10,'#9bad8d');text(ctx,options.xLabel||'x',options.xLabel?w-8:w-right+8,clamp(oy+3,top+10,h-bottom+3),12,'#92a585',options.xLabel?'right':'left','math');text(ctx,options.yLabel||'y',clamp(ox+5,left+4,w-right-8),top-10,12,'#92a585','left','math');}
 return{x,y,ix,iy,xmin,xmax,ymin,ymax,left,right,top,bottom,w,h,pw,ph,clip:()=>{ctx.save();ctx.beginPath();ctx.rect(left,top,pw,ph);ctx.clip();},end:()=>ctx.restore()};
}
function plotCurve(ctx,plot,fn,color=PALETTE.green,width=2.3,dash=[],breaks=[]){plot.clip();ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.setLineDash(dash);let last=null,prevX=null;const samples=Math.ceil(plot.pw*1.6);for(let i=0;i<=samples;i++){const xv=plot.xmin+(plot.xmax-plot.xmin)*i/samples,yv=fn(xv),px=plot.x(xv),py=plot.y(yv);if(!Number.isFinite(py)||Math.abs(py)>1e5){last=null;prevX=xv;continue;}const crossed=prevX!==null&&breaks.some(b=>prevX<=b&&xv>=b);if(last===null||crossed||Math.abs(py-last)>plot.ph*2)ctx.moveTo(px,py);else ctx.lineTo(px,py);last=py;prevX=xv;}ctx.stroke();plot.end();}
function drawParabola(ctx,w,h,p,comparison){const plot=makePlot(ctx,w,h,{xmin:-6/state.zoom,xmax:6/state.zoom,ymin:-3/state.zoom,ymax:7/state.zoom});stageInfo={kind:'parabola',plot};if(comparison)plotCurve(ctx,plot,x=>comparison.a*(x-comparison.h)**2+comparison.k,PALETTE.orange,2,[5,4]);plotCurve(ctx,plot,x=>p.a*(x-p.h)**2+p.k,PALETTE.green,2.8);
 if(p.a!==0){if(state.labels){plot.clip();line(ctx,plot.x(p.h),plot.top,plot.x(p.h),h-plot.bottom,'#c4d6b5',1,[4,5]);plot.end();}const vx=plot.x(p.h),vy=plot.y(p.k);if(vx>=plot.left&&vx<=w-plot.right&&vy>=plot.top&&vy<=h-plot.bottom){circle(ctx,vx,vy,13,'#dcebd180');circle(ctx,vx,vy,5.5,'#fff',PALETTE.green,2.2);if(state.labels)text(ctx,`V (${num(p.h)}, ${num(p.k)})`,clamp(vx+16,50,w-111),clamp(vy+23,37,h-51),11,PALETTE.green);}}else if(state.labels)text(ctx,`常数函数 y = ${num(p.k)}`,w-45,42,12,PALETTE.green,'right');
}
function functionValue(p,x){return p.a*FUNCTIONS[p.kind].f(p.b*(x-p.h))+p.k;}
function drawFunctions(ctx,w,h,p,comparison){const plot=makePlot(ctx,w,h,{xmin:-6,xmax:6,ymin:-4,ymax:6});stageInfo={kind:'functions',plot};if(comparison)plotCurve(ctx,plot,x=>functionValue(comparison,x),PALETTE.orange,2,[5,4],comparison.kind==='reciprocal'?[comparison.h]:[]);if(state.labels&&(p.kind==='log'||p.kind==='reciprocal')){plot.clip();line(ctx,plot.x(p.h),plot.top,plot.x(p.h),h-plot.bottom,'#c6b4cf',1,[4,4]);if(p.kind==='reciprocal')line(ctx,plot.left,plot.y(p.k),w-plot.right,plot.y(p.k),'#c6b4cf',1,[4,4]);plot.end();}plotCurve(ctx,plot,x=>functionValue(p,x),PALETTE.green,2.6,[],p.kind==='reciprocal'?[p.h]:[]);}
function drawSolar(ctx,w,h,p){const d=solarData(p),ground=h*.76,base=w*.46,scale=Math.min(28,(h*.47)/5),poleH=p.pole*scale,a=rad(d.elevation),night=d.elevation<=1e-8;
 ctx.fillStyle=night?'#eff1f7':'#f6f8f4';ctx.fillRect(0,0,w,ground);ctx.fillStyle=night?'#e6e9ed':'#edf2e7';ctx.fillRect(0,ground,w,h-ground);line(ctx,0,ground,w,ground,'#c7d3b7',1.3);
 const sr=Math.min(w*.32,h*.54),sunX=base-Math.cos(a)*sr,sunY=ground-Math.sin(a)*sr;
 if(sunY<h-12){circle(ctx,sunX,sunY,25,night?'#c7cce945':'#f7dea955');circle(ctx,sunX,sunY,15,night?'#b9c0df':'#e9bf66');if(!night)for(let i=0;i<8;i++){const r=i*Math.PI/4;line(ctx,sunX+Math.cos(r)*21,sunY+Math.sin(r)*21,sunX+Math.cos(r)*26,sunY+Math.sin(r)*26,'#e7c271',1.3);}}
 if(!night){const shadow=d.shadow*scale,end=base+shadow;line(ctx,base,ground+3,Math.min(end,w-20),ground+3,'#879575',7);if(state.labels){if(end>w-25)text(ctx,'影子延伸至画面外 →',w-15,ground+25,10,'#8e9c7d','right');else text(ctx,`${num(d.shadow)} m`,base+shadow/2,ground+23,11,'#899674','center');}
 ctx.save();ctx.beginPath();ctx.rect(8,18,w-16,ground-18);ctx.clip();const tx=base,ty=ground-poleH;line(ctx,tx-Math.cos(a)*sr*1.5,ty-Math.sin(a)*sr*1.5,end,ground,'#d9b361',1.5,[5,5]);const end2x=base-30, end2y=ground;arrow(ctx,end2x-Math.cos(a)*sr*.75,end2y-Math.sin(a)*sr*.75,end2x,end2y,'#e0c77f',1.2,5);ctx.restore();
 if(state.labels){const centerX=base,centerY=ground;line(ctx,centerX,centerY,centerX-60,centerY,'#b5c49f',1);line(ctx,centerX,centerY,centerX-Math.cos(a)*70,centerY-Math.sin(a)*70,'#c4c9aa',1,[3,3]);ctx.beginPath();ctx.arc(centerX,centerY,42,Math.PI,Math.PI+a,false);ctx.strokeStyle='#8b9e68';ctx.lineWidth=1.2;ctx.stroke();text(ctx,`α = ${num(d.elevation,1)}°`,centerX-55*Math.cos(a/2),centerY-55*Math.sin(a/2)-7,11,'#78935a','center');}}
 line(ctx,base,ground,base,ground-poleH,'#5d7160',5);circle(ctx,base,ground-poleH,4,'#749569');roundRect(ctx,base-10,ground-3,20,6,2,'#9ba991');if(state.labels){text(ctx,`${num(p.pole)} m`,base+13,ground-poleH/2,11,'#77896b');text(ctx,night?'太阳低于地平线 · 无直射杆影':'太阳高度角：太阳光线与水平面的夹角',w/2,29,11,night?'#8f96b0':'#8c9c79','center');text(ctx,`${p.lat>=0?'北纬':'南纬'} ${num(Math.abs(p.lat))}°  ·  地方真太阳时 ${num(p.hour,1)} h`,w/2,h-44,10,'#9fa98f','center');}
}
function gasBounds(w,h,p){const domain=gasDomain(p),scale=Math.min(w*.7/3.6,h*.48/2);return{x:w*.1,y:h*.22,w:domain.w*scale,h:domain.h*scale,scale};}
function drawGas(ctx,w,h,p,particles){const b=gasBounds(w,h,p);roundRect(ctx,b.x-7,b.y-7,3.6*b.scale+14,b.h+14,4,'#f4f6f5','#d7ddd9');roundRect(ctx,b.x,b.y,b.w,b.h,5,'#fdfefa','#b6c9a5',1.5);ctx.save();ctx.beginPath();ctx.rect(b.x+2,b.y+2,b.w-4,b.h-4);ctx.clip();particles.forEach(pt=>{const x=b.x+pt.x*b.w,y=b.y+pt.y*b.h,col=PALETTE.green;line(ctx,x-pt.vx*4*Math.sqrt(p.temp/300),y-pt.vy*4*Math.sqrt(p.temp/300),x,y,'#94b5a180',1.7);circle(ctx,x,y,GAS_RADIUS*b.scale,col);});ctx.restore();roundRect(ctx,b.x+b.w-3,b.y-6,9,b.h+12,3,'#c1d0b0','#9eb788',1);line(ctx,b.x+b.w+7,b.y+b.h/2,Math.min(w*.86,b.x+b.w+27),b.y+b.h/2,'#a8ba97',5);
 const tx=w*.91,ty=b.y+12,th=b.h-32;roundRect(ctx,tx-4,ty,8,th,4,'#edf0e7','#d4dfc8',1);const fill=(p.temp-100)/700;roundRect(ctx,tx-2,ty+(1-fill)*th,4,Math.max(2,th*fill),2,'#d6a064');circle(ctx,tx,ty+th+4,7,'#d6a064');if(state.labels){text(ctx,`${num(p.temp)} K`,w*.91,b.y-23,11,'#b09067','center');text(ctx,`${num(p.vol)} L`,b.x+b.w/2,b.y+b.h+31,13,PALETTE.green,'center');text(ctx,`n = ${num(p.moles)} mol`,w*.12,b.y-26,11,'#8b9e7a');text(ctx,'等温状态 · 分子运动慢放示意',w/2,h*.85,12,PALETTE.muted,'center');}
}
function drawProjectile(ctx,w,h,p,comparison){
 const env=isResistanceCompare(p),ideal=projectileData(p),d=env?resistedProjectile(p):ideal;
 const other=comparison?(isResistanceCompare(comparison)?resistedProjectile(comparison):projectileData(comparison)):null;
 const maxR=Math.max(d.range,ideal.range,other?.range||0,10),maxH=Math.max(d.peak,ideal.peak,other?.peak||0,5);
 const plot=makePlot(ctx,w,h,{xmin:-maxR*.07,xmax:maxR*1.08,ymin:-maxH*.17,ymax:maxH*1.2+1,equal:true,top:46,bottom:38,xLabel:'x / m',yLabel:'y / m'});
 stageInfo={kind:'projectile',plot};plot.clip();ctx.fillStyle='#eef3e6';ctx.fillRect(plot.left,plot.y(0),plot.pw,Math.max(0,h-plot.bottom-plot.y(0)));line(ctx,plot.left,plot.y(0),w-plot.right,plot.y(0),'#bccca9',1.3);
 function trace(pp,resisted,col,dash=[],end=null,width=2){
  const dd=resisted?resistedProjectile(pp):projectileData(pp),total=end===null?dd.flight:Math.min(end,dd.flight);
  ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=width;ctx.setLineDash(dash);
  for(let i=0;i<=180;i++){const q=projectileAt(pp,total*i/180,resisted);i?ctx.lineTo(plot.x(q.x),plot.y(q.y)):ctx.moveTo(plot.x(q.x),plot.y(q.y));}
  ctx.stroke();ctx.setLineDash([]);
 }
 if(comparison)trace(comparison,isResistanceCompare(comparison),env?PALETTE.purple:PALETTE.orange,[3,5]);
 if(env)trace(p,false,PALETTE.orange,[6,5]);
 trace(p,env,'#b2cbbd',[],null,1.5);
 for(let i=0;i<=12;i++){const q=projectileAt(p,d.flight*i/12,env);circle(ctx,plot.x(q.x),plot.y(q.y),2.5,'#9cb5a7');}
 trace(p,env,PALETTE.green,[],state.time,2.7);
 if(env){const q=projectileAt(p,state.time);circle(ctx,plot.x(q.x),plot.y(q.y),7,'#fff',PALETTE.orange,1.7);}
 const t=clamp(state.time,0,d.flight),q=projectileAt(p,t,env),x=plot.x(q.x),y=plot.y(q.y),moving=t<d.flight;
 if(state.labels&&moving){
  const vScale=Math.min(3,w*.17/Math.max(p.v,Math.abs(q.vy),1));
  arrow(ctx,x,y,x+q.vx*vScale,y,PALETTE.green,1.8);arrow(ctx,x,y,x,y-q.vy*vScale,PALETTE.orange,1.8);
  text(ctx,'vₓ',clamp(x+q.vx*vScale+7,plot.left,w-40),y-12,12,PALETTE.green,'left','math');
  if(Math.abs(q.vy)>.5)text(ctx,'vᵧ',clamp(x+9,plot.left,w-40),clamp(y-q.vy*vScale,plot.top+12,h-55),12,PALETTE.orange,'left','math');
 }
 circle(ctx,x,y,9,'#e7eddc');circle(ctx,x,y,6,PALETTE.green,'#fff',1.5);plot.end();
 if(state.labels){
  if(moving){
   const [ax,ay]=env?ZhixiangPhysics.acceleration(q.vx,q.vy,p):[0,-p.g],dragY=ay+p.g,drag=Math.hypot(ax,dragY),aScale=Math.min(4,h*.18/Math.max(p.g,drag,1)),ox=x+16,oy=y;
   arrow(ctx,ox,oy,ox,oy+p.g*aScale,'#49545e',1.7);
   text(ctx,`g = ${num(p.g)} m/s²`,clamp(ox+9,85,w-100),clamp(oy+p.g*aScale/2,65,h-15),12,'#49545e',ox>w-130?'right':'left');
   if(env&&drag>1e-6){arrow(ctx,x,y,x+ax*aScale,y-dragY*aScale,PALETTE.purple,1.8);text(ctx,`aᴅ = ${num(drag)} m/s²`,w-20,63,12,PALETTE.purple,'right');}
  }
  text(ctx,`t = ${state.time.toFixed(2)} s`,w-20,25,12,PALETTE.green,'right');
 }
}

function energyBars(ctx,w,h,kinetic,potential,total,loss=null){
 const left=w*.19,bw=w*.5,yy=h-78,rows=[['动能',kinetic,PALETTE.green],['势能',potential,PALETTE.orange]];
 if(loss!==null)rows.push(['已耗散',loss,PALETTE.purple]);
 rows.forEach(([label,val,col],i)=>{const y=yy+i*22;text(ctx,label,left-12,y+4,12,PALETTE.muted,'right');roundRect(ctx,left,y,bw,7,3,'#edf1e6');roundRect(ctx,left,y,bw*clamp(val/(total||1),0,1),7,3,col);text(ctx,`${num(val,2)} J`,left+bw+8,y+4,12,PALETTE.muted);});
}

function drawPendulum(ctx,w,h,p){
 const env=isResistanceCompare(p),scale=Math.min((h-145)/3,w*.43/(3*Math.sin(rad(60)))),cx=w/2,cy=48,L=p.length*scale,angle=state.theta,bx=cx+Math.sin(angle)*L,by=cy+Math.cos(angle)*L;
 roundRect(ctx,cx-40,cy-11,80,8,3,'#dce4d3');for(let x=cx-36;x<=cx+35;x+=8)line(ctx,x,cy-13,x+4,cy-18,'#becbb0',1);
 line(ctx,cx,cy,cx,cy+L+20,'#ccd9bc',1,[4,4]);ctx.beginPath();ctx.arc(cx,cy,L,Math.PI/2-rad(p.angle),Math.PI/2+rad(p.angle));ctx.strokeStyle='#e2dcc6';ctx.lineWidth=1;ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);
 if(env){const ix=cx+Math.sin(state.idealTheta)*L,iy=cy+Math.cos(state.idealTheta)*L;line(ctx,cx,cy,ix,iy,PALETTE.orange,2,[5,4]);circle(ctx,ix,iy,11,'#fff',PALETTE.orange,1.7);}
 line(ctx,cx,cy,bx,by,'#6f8879',2);circle(ctx,cx,cy,4,'#95a784');circle(ctx,bx,by,12,PALETTE.green,'#fff',2);
 if(state.labels){text(ctx,`L = ${num(p.length)} m`,clamp(cx+Math.sin(angle)*L*.48+16,60,w-95),cy+Math.cos(angle)*L*.48,12,PALETTE.muted);text(ctx,`${num(deg(angle),1)}°`,cx+22,cy+31,12,PALETTE.orange);if(!env)text(ctx,p.angle>15?'大角度 · 完整单摆方程':'无阻力单摆',w-19,25,12,PALETTE.muted,'right');}
 const en=pendulumEnergy(p,state.theta,state.omega);energyBars(ctx,w,h,en.kinetic,en.potential,en.total,env?Math.max(0,en.total-en.kinetic-en.potential):null);
}

function trigLayout(w,h){const small=w<440,r=Math.min(w*(small?.2:.17),h*.29),cx=small?w*.25:w*.26,cy=h*.48,plotLeft=small?w*.53:w*.51,plotRight=w-25;return{r,cx,cy,plotLeft,plotRight};}
function drawTrig(ctx,w,h,p){const{r,cx,cy,plotLeft,plotRight}=trigLayout(w,h),a=rad(p.angle),x=cx+Math.cos(a)*r,y=cy-Math.sin(a)*r;stageInfo={kind:'trig',cx,cy,r};circle(ctx,cx,cy,r,'#f7f9f2','#b9ccaa',1.5);line(ctx,cx-r-17,cy,cx+r+19,cy,'#bdcdb0');line(ctx,cx,cy-r-18,cx,cy+r+20,'#bdcdb0');ctx.beginPath();ctx.arc(cx,cy,Math.min(30,r*.35),0,-a,true);ctx.strokeStyle='#d0b283';ctx.lineWidth=1.4;ctx.stroke();line(ctx,cx,cy,x,y,PALETTE.green,1.8);line(ctx,cx,cy,x,cy,PALETTE.green,3);line(ctx,x,cy,x,y,PALETTE.orange,3);circle(ctx,x,y,5.5,PALETTE.green,'#fff',1.5);circle(ctx,cx,cy,2,PALETTE.axis);line(ctx,x,y,plotLeft+(plotRight-plotLeft)*p.angle/360,y,'#d8c9ad',1,[3,4]);line(ctx,plotLeft,cy-r-10,plotLeft,cy+r+11,'#bfceb0');line(ctx,plotLeft,cy,plotRight+8,cy,'#bfceb0');line(ctx,plotLeft,cy-r,plotRight,cy-r,'#e6eddc',1,[3,4]);line(ctx,plotLeft,cy+r,plotRight,cy+r,'#e6eddc',1,[3,4]);ctx.beginPath();ctx.strokeStyle=PALETTE.orange;ctx.lineWidth=2;for(let i=0;i<=200;i++){const xx=plotLeft+(plotRight-plotLeft)*i/200,yy=cy-Math.sin(2*Math.PI*i/200)*r;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();circle(ctx,plotLeft+(plotRight-plotLeft)*p.angle/360,y,5,PALETTE.orange,'#fff',1.5);if(state.labels){text(ctx,'单位圆',cx,Math.min(cy+r+30,h-70),11,'#95a687','center');text(ctx,'y = sin θ',(plotLeft+plotRight)/2,cy-r-31,15,PALETTE.orange,'center','math');text(ctx,'1',cx+r+3,cy+16,9,'#a4b197');text(ctx,'1',cx-10,cy-r,9,'#a4b197','right');for(const v of[0,180,360])text(ctx,`${v}°`,plotLeft+(plotRight-plotLeft)*v/360,cy+r+26,9,'#a1ae95','center');text(ctx,'cos θ',cx,Math.min(cy+r+49,h-49),11,PALETTE.green,'center','math');text(ctx,'sin θ',cx+57,Math.min(cy+r+49,h-49),11,PALETTE.orange,'center','math');}}
function drawWave(ctx,w,h,p){const plot=makePlot(ctx,w,h,{xmin:0,xmax:9,ymin:-1.6,ymax:1.6,equal:false,left:44,right:32,top:65,bottom:80,xLabel:'x / m',yLabel:'y / m'});const f=x=>p.amp*Math.sin(2*Math.PI*(x/p.lambda-p.freq*state.time));plotCurve(ctx,plot,f,PALETTE.green,2.5);plot.clip();for(let x=0;x<=9;x+=.3)circle(ctx,plot.x(x),plot.y(f(x)),2.3,'#a8c394');const marked=3,xx=plot.x(marked),yy=plot.y(f(marked));line(ctx,xx,plot.y(p.amp+0.2),xx,plot.y(-p.amp-.2),'#dcc59e',1,[4,4]);circle(ctx,xx,yy,7,PALETTE.orange,'#fff',2);plot.end();if(state.labels){arrow(ctx,w*.37,29,w*.63,29,PALETTE.green,1.5);text(ctx,'波的传播方向',w*.5,47,10,'#91a180','center');text(ctx,'固定横坐标的质点',clamp(xx+12,20,w-136),yy-20,10,'#c29968');const from=.4,to=.4+p.lambda,y=h-64;doubleArrow(ctx,plot.x(from),y,plot.x(to),y,'#b2bd9e');text(ctx,`λ = ${num(p.lambda)} m`,(plot.x(from)+plot.x(to))/2,y+15,10,'#99aa87','center');}}
function arcAngle(ctx,cx,cy,r,start,end,color){ctx.beginPath();ctx.arc(cx,cy,r,start,end);ctx.strokeStyle=color;ctx.lineWidth=1.1;ctx.stroke();}
function rayPulse(ctx,x1,y1,x2,y2,phase,color){const t=(phase%1+1)%1;circle(ctx,x1+(x2-x1)*t,y1+(y2-y1)*t,3.5,color);}
function drawRefraction(ctx,w,h,p){const d=opticalData(p),cx=w*.5,cy=h*.49,r=Math.min(w*.37,h*.36),a=rad(p.angle),start={x:cx-Math.sin(a)*r,y:cy-Math.cos(a)*r},ref={x:cx+Math.sin(a)*r,y:cy-Math.cos(a)*r};ctx.fillStyle='#f6f8f3';ctx.fillRect(0,0,w,cy);ctx.fillStyle='#edf2f1';ctx.fillRect(0,cy,w,h-cy);line(ctx,0,cy,w,cy,'#b9cbc1',1.2);line(ctx,cx,22,cx,h-33,'#b9c7ad',1,[4,5]);arrow(ctx,start.x,start.y,cx,cy,'#ba9c68',2.3);if(Math.abs(p.n1-p.n2)>1e-10)arrow(ctx,cx,cy,ref.x,ref.y,d.tir?PALETTE.orange:'#c2d1b4',d.tir?2.8:1.4);rayPulse(ctx,start.x,start.y,cx,cy,state.time*.5,'#d0a964');if(d.tir)rayPulse(ctx,cx,cy,ref.x,ref.y,state.time*.5,PALETTE.orange);if(!d.tir){const a2=rad(d.refracted),end={x:cx+Math.sin(a2)*r,y:cy+Math.cos(a2)*r};arrow(ctx,cx,cy,end.x,end.y,PALETTE.green,2.8);rayPulse(ctx,cx,cy,end.x,end.y,state.time*.5,PALETTE.green);if(state.labels){arcAngle(ctx,cx,cy,39,Math.PI/2-a2,Math.PI/2,'#86a773');text(ctx,`θ₂ = ${num(d.refracted,1)}°`,cx+50,cy+55,11,PALETTE.green);}}
 if(state.labels){arcAngle(ctx,cx,cy,34,-Math.PI/2-a,-Math.PI/2,'#bfa372');text(ctx,`θ₁ = ${num(p.angle,1)}°`,cx-40,cy-47,11,'#b5986c','right');text(ctx,`n₁ = ${num(p.n1)}`,21,32,12,'#a1ac92');text(ctx,`n₂ = ${num(p.n2)}`,21,h-41,12,'#8baba0');text(ctx,'法线',cx+10,20,10,'#9eac90');if(d.tir){roundRect(ctx,w-117,17,100,24,6,'#fcf1df');text(ctx,'全反射',w-67,29,11,'#be985f','center');}}
 circle(ctx,cx,cy,3.5,'#a6b995');}
function drawSpring(ctx,w,h,p){
 const d=springData(p,state.time),eq=w*.55,scale=w*.23,bx=eq+d.x*scale,cy=h*.35,size=34,wall=w*.08,end=bx-size/2;
 roundRect(ctx,wall-8,cy-48,10,96,2,'#d3ddc8');
 for(let y=cy-45;y<=cy+45;y+=8)line(ctx,wall-15,y+6,wall-8,y,'#899a8c');
 line(ctx,wall,cy+size/2+3,w*.94,cy+size/2+3,'#aab9ad',1.3);
 line(ctx,eq,cy-52,eq,cy+size/2+26,'#aab9ad',1,[4,4]);
 ctx.beginPath();ctx.strokeStyle='#768e79';ctx.lineWidth=2;ctx.moveTo(wall,cy);ctx.lineTo(wall+12,cy);
 const start=wall+12,len=end-start-12;
 for(let i=0;i<=22;i++)ctx.lineTo(start+len*i/22,cy+(i===0||i===22?0:i%2?10:-10));
 ctx.lineTo(end,cy);ctx.stroke();
 roundRect(ctx,bx-size/2,cy-size/2,size,size,3,'#507e64','#365c47',1.5);
 text(ctx,`${num(p.mass)} kg`,bx,cy,11,'#fff','center');
 if(state.labels){
  const forceScale=Math.min(w*.2/80,2),velocityScale=Math.min(w*.2/20,8),fy=cy-size/2-20,vy=cy-size/2-66;
  if(Math.abs(d.force)>1e-6)arrow(ctx,bx,fy,bx+d.force*forceScale,fy,PALETTE.orange,1.8);
  text(ctx,`F = ${num(d.force,1)} N`,clamp(bx,80,w-80),fy-16,12,PALETTE.orange,'center');
  if(Math.abs(d.v)>1e-6)arrow(ctx,bx,vy,bx+d.v*velocityScale,vy,PALETTE.green,1.8);
  text(ctx,`v = ${num(d.v,2)} m/s`,clamp(bx,80,w-80),vy-16,12,PALETTE.green,'center');
  const rulerY=cy+size/2+40;
  line(ctx,eq-scale,rulerY,eq+scale,rulerY,'#b4bfb6',1);
  for(const x of[-1,-.5,0,.5,1]){const xx=eq+x*scale;line(ctx,xx,rulerY-4,xx,rulerY+4,'#96a69b',1);text(ctx,num(x),xx,rulerY+16,11,PALETTE.muted,'center');}
  circle(ctx,bx,rulerY,3,PALETTE.green);
  text(ctx,'位移 x / m',eq,rulerY+34,12,PALETTE.muted,'center');
 }
 energyBars(ctx,w,h,d.kinetic,d.potential,d.total);
}
function drawStage(){const canvas=$('#simCanvas');if(!canvas||!state.model)return;const{ctx,w,h}=setupCanvas(canvas);ctx.fillStyle='#fcfdfa';ctx.fillRect(0,0,w,h);stageInfo=null;switch(state.model.id){case'solids':case'sections':case'nets':drawGeometryStage(ctx,w,h,state.p);break;case'parabola':drawParabola(ctx,w,h,state.p,state.compare);break;case'functions':drawFunctions(ctx,w,h,state.p,state.compare);break;case'solar':drawSolar(ctx,w,h,state.p);break;case'gas':drawGas(ctx,w,h,state.p,state.particles);break;case'projectile':drawProjectile(ctx,w,h,state.p,state.compare);break;case'pendulum':drawPendulum(ctx,w,h,state.p);break;case'trig':drawTrig(ctx,w,h,state.p);break;case'wave':drawWave(ctx,w,h,state.p);break;case'refraction':drawRefraction(ctx,w,h,state.p);break;case'spring':drawSpring(ctx,w,h,state.p);break;}const legend=$('#comparisonLegend');if(legend){const env=state.model.environment&&isResistanceCompare(state.p);legend.hidden=!state.compare&&!env;legend.style.display=state.compare||env?'flex':'none';legend.innerHTML=env?`<span class="legend-item"><span class="legend-line"></span>含阻力</span><span class="legend-item"><span class="legend-line compare"></span>理想</span>${state.compare?'<span class="legend-item"><span class="legend-line retained"></span>保留曲线</span>':''}`:'<span class="legend-item"><span class="legend-line"></span>当前模型</span><span class="legend-item"><span class="legend-line compare"></span>对照曲线</span>'; }drawAnnotations();}
function drawAnnotations(){const canvas=$('#annotation');if(!canvas)return;const{ctx,w,h}=setupCanvas(canvas);ctx.lineWidth=2.5;ctx.strokeStyle='#c27c45';ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of state.strokes){ctx.beginPath();stroke.forEach((pt,i)=>i?ctx.lineTo(pt.x*w,pt.y*h):ctx.moveTo(pt.x*w,pt.y*h));ctx.stroke();if(stroke.length===1)circle(ctx,stroke[0].x*w,stroke[0].y*h,1.4,'#c27c45');}}
function bindStage(){let dragging=null,stroke=null;const canvas=$('#simCanvas'),annotation=$('#annotation');const pos=(e,el)=>{const r=el.getBoundingClientRect();return{x:(e.clientX-r.left)*el.clientWidth/r.width,y:(e.clientY-r.top)*el.clientHeight/r.height};};canvas.addEventListener('pointerdown',e=>{if(state.inking)return;const pt=pos(e,canvas);if(stageInfo?.kind==='parabola'&&state.p.a!==0){const plot=stageInfo.plot;if(Math.hypot(pt.x-plot.x(state.p.h),pt.y-plot.y(state.p.k))<28){dragging='vertex';canvas.setPointerCapture(e.pointerId);}}else if(stageInfo?.kind==='trig'&&Math.hypot(pt.x-stageInfo.cx,pt.y-stageInfo.cy)<stageInfo.r+35){dragging='circle';stopAnimation();canvas.setPointerCapture(e.pointerId);updateDrag(pt);}});
 function updateDrag(pt){if(dragging==='vertex'){setParam('h',Math.round(stageInfo.plot.ix(pt.x)*10)/10);setParam('k',Math.round(stageInfo.plot.iy(pt.y)*10)/10);}else if(dragging==='circle'){setParam('angle',(deg(Math.atan2(stageInfo.cy-pt.y,pt.x-stageInfo.cx))+360)%360);}}
 canvas.addEventListener('pointermove',e=>{const pt=pos(e,canvas);if(dragging)updateDrag(pt);else if(stageInfo?.kind==='parabola'&&state.p.a!==0)canvas.style.cursor=Math.hypot(pt.x-stageInfo.plot.x(state.p.h),pt.y-stageInfo.plot.y(state.p.k))<25?'grab':'default';else if(stageInfo?.kind==='trig')canvas.style.cursor=Math.hypot(pt.x-stageInfo.cx,pt.y-stageInfo.cy)<stageInfo.r+25?'grab':'default';});['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,()=>dragging=null));
 annotation.addEventListener('pointerdown',e=>{if(!state.inking)return;const pt=pos(e,annotation);stroke=[{x:pt.x/annotation.clientWidth,y:pt.y/annotation.clientHeight}];state.strokes.push(stroke);annotation.setPointerCapture(e.pointerId);drawAnnotations();});annotation.addEventListener('pointermove',e=>{if(!stroke)return;const pt=pos(e,annotation);stroke.push({x:pt.x/annotation.clientWidth,y:pt.y/annotation.clientHeight});drawAnnotations();});['pointerup','pointercancel','lostpointercapture'].forEach(type=>annotation.addEventListener(type,()=>stroke=null));}
function drawThumbnail(canvas){const m=modelById(canvas.dataset.thumb);if(!m)return;if(m.threeD){geometryThumb(canvas);return;}const{ctx,w,h}=setupCanvas(canvas),cx=w*.5,cy=h*.6,col=CATS[m.cat].color;ctx.save();switch(m.id){
 case'parabola':case'functions':{const ox=w*.5,oy=h*.73,s=h*.21;for(let x=ox%s;x<w;x+=s*.7)line(ctx,x,28,x,h,'#e0e8d8',.6);for(let y=oy%(s*.7);y<h;y+=s*.7)line(ctx,9,y,w-9,y,'#e0e8d8',.6);line(ctx,15,oy,w-15,oy,'#bdcdb1',.9);line(ctx,ox,30,ox,h-9,'#bdcdb1',.9);ctx.beginPath();ctx.rect(7,28,w-14,h-32);ctx.clip();for(const [factor,color]of[[.25,'#d2b086'],[1,col]]){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=1.8;for(let i=0;i<=w;i++){let x=(i-ox)/s,y=m.id==='parabola'?oy-(factor===1?.7:.3)*x*x*s:oy-Math.sin(x*factor)*s*1.35;i?ctx.lineTo(i,y):ctx.moveTo(i,y);}ctx.stroke();}circle(ctx,ox,oy,3,col,'#fff',1);if(m.id==='parabola')text(ctx,'y = ax²',w*.72,45,14,col,'center','math');else text(ctx,'y = sin x',w*.73,39,13,col,'center','math');break;}
 case'solar':{const gy=h*.78,bx=w*.53;ctx.fillStyle='#e4e3ef';ctx.fillRect(10,gy,w-20,h-gy);line(ctx,10,gy,w-10,gy,'#bdb5d1');circle(ctx,w*.3,h*.38,13,'#edcf89');circle(ctx,w*.3,h*.38,21,'#edcf8920');line(ctx,bx,gy,bx,gy-47,'#9990b1',3);line(ctx,bx,gy+2,w*.86,gy+2,'#bcb7d0',4);line(ctx,w*.23,h*.3,w*.84,gy,'#d0bf97',1,[4,4]);arcAngle(ctx,w*.84,gy,26,Math.PI,Math.PI+.59,'#b49c72');text(ctx,'α',w*.84-32,gy-12,14,'#ab9770','center','math');text(ctx,'φ = 31° N',w*.63,43,11,'#aea5c2');break;}
 case'gas':{const bx=w*.2,by=h*.28,bw=w*.59,bh=h*.56;roundRect(ctx,bx,by,bw,bh,6,'#fffdf670','#dccbae',1.3);for(let i=0;i<27;i++){const x=bx+9+((i*67+31)%(bw-18)),y=by+7+((i*41+19)%(bh-14));line(ctx,x-4,y+3,x,y,'#dcc9a177',1);circle(ctx,x,y,2.2,i%4?'#bbaa7e':'#daaa70');}roundRect(ctx,bx+bw-4,by-4,7,bh+8,2,'#d4c0a1');text(ctx,'T ↑',w*.85,h*.54,13,'#b5996c','center','math');break;}
 case'projectile':{const ox=w*.17,oy=h*.81;line(ctx,ox-7,oy,w*.88,oy,'#d8c9ac');line(ctx,ox,35,ox,oy+5,'#d8c9ac');ctx.beginPath();ctx.strokeStyle='#c5a371';ctx.lineWidth=1.7;ctx.setLineDash([3,3]);for(let i=0;i<=80;i++){const u=i/80,x=ox+w*.65*u,y=oy-h*.49*4*u*(1-u);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.setLineDash([]);for(let i=0;i<=8;i++){const u=i/8;circle(ctx,ox+w*.65*u,oy-h*.49*4*u*(1-u),2.1,'#d4ba94');}const u=.35,x=ox+w*.65*u,y=oy-h*.49*4*u*(1-u);circle(ctx,x,y,5,'#b59262');arrow(ctx,x,y,x+30,y,'#93a276',1.3,4);arrow(ctx,x,y,x,y-21,'#dca967',1.3,4);break;}
 case'pendulum':{const x=cx,y=h*.25,L=h*.52,a=.5;line(ctx,x-24,y-3,x+24,y-3,'#cdbd9f',4);line(ctx,x,y,x,y+L+8,'#e1d7c4',1,[3,4]);ctx.beginPath();ctx.arc(x,y,L,Math.PI/2-.55,Math.PI/2+.55);ctx.strokeStyle='#dccdb4';ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);line(ctx,x,y,x+Math.sin(a)*L,y+Math.cos(a)*L,'#beab8a',1.5);circle(ctx,x+Math.sin(a)*L,y+Math.cos(a)*L,10,'#c4a57a');text(ctx,'T ≈ 2π√(L/g)',w*.72,44,11,'#b19b7a','center','math');break;}
 case'trig':{const r=h*.28,x=w*.34,y=h*.6,a=.8;circle(ctx,x,y,r,'#f6f8f1','#b8cba9',1.2);line(ctx,x-r-9,y,x+r+9,y,'#c4d1b6');line(ctx,x,y-r-8,x,y+r+8,'#c4d1b6');line(ctx,x,y,x+Math.cos(a)*r,y-Math.sin(a)*r,'#84a56f',1.8);line(ctx,x+Math.cos(a)*r,y,x+Math.cos(a)*r,y-Math.sin(a)*r,'#d1ac78',1.6);circle(ctx,x+Math.cos(a)*r,y-Math.sin(a)*r,3.5,col);ctx.beginPath();ctx.strokeStyle='#bcb383';ctx.lineWidth=1.6;for(let i=0;i<80;i++){const xx=w*.58+i/79*w*.34,yy=y-Math.sin(i/79*Math.PI*2)*r*.75;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();text(ctx,'sin θ',w*.75,38,12,'#afac7e','center','math');break;}
 case'wave':{line(ctx,16,cy,w-16,cy,'#e2d8c6',1);ctx.beginPath();ctx.strokeStyle='#bb9b6d';ctx.lineWidth=2;for(let i=0;i<w;i++){const y=cy-Math.sin(i/w*4*Math.PI)*h*.22;i?ctx.lineTo(i,y):ctx.moveTo(i,y);}ctx.stroke();const x=w*.39,y=cy-Math.sin(.39*4*Math.PI)*h*.22;circle(ctx,x,y,5,'#d4a66c','#fff9eb',1);arrow(ctx,w*.42,34,w*.7,34,'#bea97f',1,4);text(ctx,'v = fλ',w*.74,h*.88,13,'#bda178','center','math');break;}
 case'refraction':{const x=w*.53,y=h*.57;ctx.fillStyle='#e9e4d8';ctx.fillRect(10,y,w-20,h-y);line(ctx,10,y,w-10,y,'#d1c7b5',1);line(ctx,x,28,x,h-12,'#c5bda9',1,[3,4]);arrow(ctx,x-45,y-39,x,y,'#d0aa71',1.7,4);arrow(ctx,x,y,x+28,y+40,'#91a981',1.7,4);arrow(ctx,x,y,x+45,y-39,'#d9ceb8',1,4);text(ctx,'n₁',w*.77,44,12,'#b6a485','left','math');text(ctx,'n₂',w*.25,h*.8,12,'#aab091','left','math');break;}
 case'spring':{const x1=w*.15,x2=w*.66,y=h*.62;line(ctx,x1,y-23,x1,y+27,'#d0bd9f',4);line(ctx,x1,y+28,w*.89,y+28,'#d8c9b1');ctx.beginPath();ctx.moveTo(x1,y);for(let i=0;i<=18;i++)ctx.lineTo(x1+8+(x2-x1-27)*i/18,y+(i%2?9:-9));ctx.lineTo(x2-16,y);ctx.strokeStyle='#bca886';ctx.lineWidth=1.7;ctx.stroke();roundRect(ctx,x2-15,y-17,34,34,5,'#c5ab81');arrow(ctx,x2-8,y-31,x2-40,y-31,'#d1a573',1.3,4);text(ctx,'F = −kx',w*.65,39,13,'#b29a74','center','math');break;}
 }ctx.restore();}
// ---- Teacher workspace, portable configuration, and accessible event handling. ----
let pendingImport=null;
function openDialog(title,html){const dialog=$('#dialog');if(dialog.open)dialog.close();$('#dialogTitle').textContent=title;$('#dialogBody').innerHTML=html;dialog.showModal();}
function closeDialog(){$('#dialog').close();}
function modelInfo(){if(!state.model)return;const m=state.model;openDialog(m.title+' · 模型说明',`<h3>模型与适用条件</h3><p>${esc(m.note)}</p><h3>参考资料</h3>${m.sources.map(id=>`<div class="source-row"><a href="${SOURCES[id][1]}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[id][0])} ↗</a></div>`).join('')}<div class="dialog-message">本站是课堂可视化工具。动画中的比例、速度或粒子数量可能为教学做过简化；请以明确标出的公式、单位及适用条件为准。</div>`);}
function showAbout(){openDialog('关于知象 · 模型与参考资料',`<p>知象提供数学、物理和地理的课堂演示模型。</p><div class="dialog-message">13 个模型，包含 3 个立体几何模块。收藏和课堂配置保存在当前${STORAGE_CONTEXT}，可导出文件备份。</div><h3>计算与可视化</h3><p>函数使用定义式直接绘制；抛体、波和理想弹簧使用解析方程；单摆使用完整非线性方程的数值积分。太阳高度角使用理想几何关系。气体宏观值按状态方程计算，微观动画为二维示意。新增三维模型采用空间坐标、面片深度排序和正投影；体积、面积不按屏幕投影计算。每个模型都可以单独查看假设与限制。</p><h3>参考资料</h3>${Object.values(SOURCES).map(([title,url])=>`<div class="source-row"><a href="${url}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a></div>`).join('')}<p style="margin-top:16px;font-size:10px">以上为理论参考，并非合作方或背书。NOAA 的旧太阳计算器已停止维护；本站不依赖该服务，也不提供精密天文预报。</p>`);}
function showSupportDialog(){
 if (!document.documentElement.dataset.supportReady) return;
 openDialog('支持知象',`<p>如果知象对你的课堂有帮助，可以自愿支持后续维护。</p><div class="support-code"><img src="${esc(SUPPORT_QR_SRC)}" alt="微信支付收款码"></div><p class="support-caption">使用微信扫码支持。支持完全自愿，不影响模型使用。</p>`);
}
function showGuide(){openDialog('使用说明',`<div class="modal-steps"><p><strong>选择模型</strong><br>按数学、物理、地理或学段筛选，也可以直接搜索“抛物线”“太阳”“气体”等关键词。</p><p><strong>调整参数</strong><br>打开模型，拖动滑块或直接输入数值。预设可快速切换常用情况。</p><p><strong>播放、暂停、比较</strong><br>运动模型支持播放、暂停、单步和倍速。物理运动单步推进 0.05 秒；太阳时单步推进 1.5 分钟。抛体可以拖动时间进度。函数与抛体支持保存一条对照曲线；抛物线顶点和单位圆上的点可直接拖动。</p><p><strong>旋转与展开</strong><br>三维模型可拖动旋转，滚轮或双指缩放，也可用正视、俯视和侧视按钮。点击画布后可用方向键旋转、加减键缩放。展开图支持连续展开或折叠。相机视角与显示选项一并保存到课堂配置。</p><p><strong>保存课堂</strong><br>点击「保存课堂」保存当前参数，或通过「导出参数」导出 JSON 文件。打开「我的课堂」可导入配置、导出全部备份。保存内容是模型与参数，不含播放进度、板书或对照曲线。</p><p><strong>让演示更适合投屏</strong><br>「大屏模式」隐藏导航；铅笔按钮开启自由板书，相机按钮导出带公式和数据的 PNG 图片。按 Esc 退出大屏。</p></div><div class="dialog-message"><strong>快捷键：</strong>空格播放 / 暂停，R 恢复默认参数，/ 聚焦搜索。输入框获得焦点时，不触发模型快捷键。<br><strong>离线与分享：</strong>${IS_DESKTOP_APP?'知象内置全部模型，断网可用。需要迁移课堂时，在「我的课堂」导出备份，再在另一台设备导入。':'standalone.html 可直接打开并离线使用。在线版可分享浏览器网址；带参数的演示链接可在「导出参数」中复制。访问按网站的分享权限决定。配置文件只包含参数，不包含网站程序。'}</div>`);}
function safeFileName(s){return String(s).replace(/[\\/:*?"<>|]/g,'-').slice(0,65);}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function exportJSON(data,name){downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),safeFileName(name)+'.json');}
function currentConfig(title=null){return{app:'zhixiang',version:1,type:'model',title:title||state.model.title,model:state.model.id,params:{...state.p}};}
function saveDialog(){if(!state.model)return;openDialog('保存到我的课堂',`<p>为这组参数起一个容易找到的名字，下次直接开始演示。</p><label for="classTitle">课堂名称</label><input type="text" id="classTitle" maxlength="80" value="${esc(state.model.title)}" placeholder="例如：抛物线向右平移 2 个单位"><div class="dialog-message">保存当前模型与参数，不含动画进度、板书和对照曲线。仅保存在本机${STORAGE_CONTEXT}；可在「我的课堂」导出备份。</div><div class="dialog-actions"><button class="button secondary" data-action="close-dialog">取消</button><button class="button primary" data-action="confirm-save">${icon('save')}保存课堂</button></div>`);setTimeout(()=>{$('#classTitle')?.select();},30);}
function makeId(){return globalThis.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;}
function confirmSave(){const input=$('#classTitle');if(!input||!state.model)return;const title=input.value.trim();if(!title){input.focus();toast('请先填写课堂名称。');return;}if(store.classes.length>=150){toast('已保存 150 个课堂，请先导出备份并删除不再需要的配置。');return;}store.classes.unshift({id:makeId(),title:title.slice(0,80),model:state.model.id,p:{...state.p},date:new Date().toLocaleString('zh-CN',{hour12:false})});const saved=persist();updateCounts();closeDialog();if(saved)toast('已保存到「我的课堂」。');}
function shareDialog(){if(!state.model)return;const config=currentConfig(),hosted=/^https?:$/.test(location.protocol)&&!['localhost','127.0.0.1','0.0.0.0'].includes(location.hostname);openDialog('导出模型参数',`<p>保存这组参数。在「我的课堂 → 导入配置」中可重新打开。</p><div class="dialog-actions">${hosted?`<button class="button secondary" data-action="copy-link">复制参数链接</button>`:''}<button class="button secondary" data-action="copy-config">复制参数</button><button class="button primary" data-action="export-config">${icon('download')}下载配置文件</button></div><details class="config-details"><summary>查看配置内容</summary><textarea id="configText" readonly aria-label="当前课堂参数 JSON">${esc(JSON.stringify(config,null,2))}</textarea></details>`);}

async function copyText(value,fallback=null){try{await navigator.clipboard.writeText(value);toast('已复制。');return true;}catch{if(fallback){const details=fallback.closest('details');if(details)details.open=true;fallback.focus();fallback.select();try{if(document.execCommand('copy')){toast('已复制。');return true;}}catch{}}toast('未能自动复制，请选中内容手动复制。');return false;}}
function backup(){exportJSON({app:'zhixiang',version:1,type:'backup',exportedAt:new Date().toISOString(),favorites:[...store.favorites],classes:store.classes.map(c=>({...c,p:{...c.p}}))},'知象-课堂与收藏备份');toast('已生成备份文件。');}
function validateImport(data){if(!data||typeof data!=='object'||data.app!=='zhixiang'||data.version!==1)throw new Error('这不是支持的知象 v1 配置文件。');if(data.type==='backup'){if(!Array.isArray(data.classes)||!Array.isArray(data.favorites)||data.classes.length>150)throw new Error('备份格式不完整，或课堂数量超过 150。');const classes=data.classes.map(c=>{if(!c||typeof c.title!=='string'||!modelById(c.model)||!c.p||typeof c.p!=='object')throw new Error('备份中存在无效课堂，未进行导入。');return{id:makeId(),model:c.model,title:c.title.slice(0,80),p:safeParams(modelById(c.model),c.p),date:typeof c.date==='string'?c.date.slice(0,60):''};});if(store.classes.length+classes.length>150)throw new Error('导入后课堂超过 150 个，请先整理当前课堂。');return{type:'backup',classes,favorites:data.favorites.filter(id=>typeof id==='string'&&modelById(id))};}if(data.type==='model'&&modelById(data.model)&&data.params&&typeof data.params==='object')return{type:'model',model:data.model,params:safeParams(modelById(data.model),data.params),title:typeof data.title==='string'?data.title.slice(0,80):modelById(data.model).title};throw new Error('找不到有效的模型或参数。');}
async function handleImport(file){if(!file)return;if(file.size>1024*1024){toast('配置文件超过 1 MB，已停止导入。');return;}try{pendingImport=validateImport(JSON.parse(await file.text()));const p=pendingImport;openDialog('确认导入课堂配置',`<p>${p.type==='backup'?`发现 ${p.classes.length} 个课堂配置和 ${p.favorites.length} 个收藏。将合并到当前${STORAGE_CONTEXT}，不覆盖已有课堂。`:`模型：${esc(modelById(p.model).title)}<br>名称：${esc(p.title)}`}</p><div class="dialog-message">参数会检查是否在模型允许的范围内。导入只处理数据，不执行文件中的代码。</div><div class="dialog-actions"><button class="button secondary" data-action="cancel-import">取消</button><button class="button primary" data-action="confirm-import">${p.type==='backup'?'确认合并':'导入并演示'}</button></div>`);}catch(error){pendingImport=null;toast(error instanceof SyntaxError?'无法解析 JSON 文件，请检查配置文件是否完整。':error.message);}finally{$('#importFile').value='';}}
function confirmImport(){if(!pendingImport)return;const p=pendingImport;pendingImport=null;closeDialog();if(p.type==='backup'){store.classes=[...p.classes,...store.classes];store.favorites=[...new Set([...store.favorites,...p.favorites])];const saved=persist();showLibrary('classes');if(saved)toast('课堂和收藏已合并导入。');}else{openModel(p.model,p.params);toast('已载入参数；点击「保存课堂」可保存在本机。');}}
async function togglePresentation(){if(!state.model)return;if(state.presenting){exitPresentation();return;}state.presenting=true;document.body.classList.add('presenting');$('#presentLabel').textContent='退出大屏';try{await document.documentElement.requestFullscreen?.();}catch{toast('已进入大屏布局；系统未允许全屏。');}requestDraw();}
function exitPresentation(){if(!state.presenting)return;state.presenting=false;document.body.classList.remove('presenting');if($('#presentLabel'))$('#presentLabel').textContent='大屏模式';if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});requestDraw();}
function wrapCanvasText(ctx,content,x,y,maxWidth,lineHeight,maxLines=4){let current='',lineNumber=0;for(const ch of content){if(ctx.measureText(current+ch).width>maxWidth&&current){ctx.fillText(current,x,y+lineNumber*lineHeight);lineNumber++;current=ch;if(lineNumber>=maxLines)break;}else current+=ch;}if(lineNumber<maxLines)ctx.fillText(current,x,y+lineNumber*lineHeight);return(lineNumber+1)*lineHeight;}
function exportImage(){
 if(!state.model)return;
 stopAnimation();renderReadout();drawStage();
 const source=$('#simCanvas'),anno=$('#annotation'),w=source.clientWidth,h=source.clientHeight,narrow=w<480||isResistanceCompare(state.p),header=isResistanceCompare(state.p)?76:52,footer=narrow?178+readout(state.model,state.p).metrics.length*54:258,dpr=2,output=document.createElement('canvas');
 output.width=w*dpr;output.height=(h+header+footer)*dpr;
 const ctx=output.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h+header+footer);
 text(ctx,state.model.title,20,26,17,'#314c3e');if(isResistanceCompare(state.p))text(ctx,'绿色实线：含阻力　橙色虚线：理想',20,52,12,'#58665f');
 ctx.drawImage(source,0,header,w,h);ctx.drawImage(anno,0,header,w,h);
 const d=readout(state.model,state.p);let y=h+header+14;
 ctx.fillStyle='#314c3e';ctx.font='16px Georgia, "PingFang SC", sans-serif';ctx.textBaseline='top';
 y+=wrapCanvasText(ctx,d.formula,20,y,w-40,22,3)+8;
 ctx.fillStyle='#58665f';ctx.font='12px "PingFang SC", sans-serif';ctx.textBaseline='top';
 y+=wrapCanvasText(ctx,d.caption,20,y,w-40,18,3)+14;
 d.metrics.forEach((v,i)=>{
  if(narrow){const row=y+i*54;text(ctx,v[0],20,row+7,12,'#58665f');text(ctx,`${v[1]} ${v[2]}`,20,row+29,17,'#314c3e');}
  else{const x=20+i*(w-40)/3;text(ctx,v[0],x,y+7,12,'#58665f');text(ctx,`${v[1]} ${v[2]}`,x,y+30,17,'#314c3e');}
 });
 text(ctx,'知象 · 教学模型',20,h+header+footer-18,12,'#58665f');
 output.toBlob(blob=>{if(!blob){toast('图片导出失败，请重试。');return;}downloadBlob(blob,safeFileName(state.model.title)+'-知象.png');toast('已导出模型、板书、公式与数值。');},'image/png');
}
function action(name){switch(name){
 case'home':showLibrary();break;case'explore':$('#exploreSection')?.scrollIntoView({behavior:'smooth'});break;case'guide':showGuide();break;case'about':showAbout();break;case'support':showSupportDialog();break;case'close-dialog':closeDialog();break;
 case'clear-filter':if(state.view==='favorites'&&!store.favorites.length||state.view==='classes')showLibrary();else{state.query='';state.category='all';state.grade='all';state.only3d=false;renderLibrary();}break;
 case'play':togglePlay();break;case'step':if(state.model?.time){stopAnimation();updateSimulation(.05);renderReadout();requestDraw();}break;
 case'reset':if(state.model){stopAnimation();state.p={...state.model.defaults};state.time=0;state.compare=null;state.strokes=[];resetSolver();if(state.model.threeD)geometrySyncView();renderControls();renderReadout();requestDraw();toast('已恢复默认参数。');}break;
 case'compare':if(state.model?.compare){state.compare=state.compare?null:{...state.p};const label=$('#compareText');if(label)label.textContent=state.compare?'清除对照曲线':'保留当前曲线';requestDraw();toast(state.compare?(isResistanceCompare(state.p)?'已保留紫色曲线；现在可以改变参数。':'已保留橙色对照曲线；现在可以改变参数。'):'已清除对照曲线。');}break;
 case'ink':state.inking=!state.inking;$('#stage')?.classList.toggle('inking',state.inking);$('#inkButton')?.classList.toggle('active',state.inking);$('#inkButton')?.setAttribute('aria-pressed',String(state.inking));$('#inkButton')?.setAttribute('aria-label',state.inking?'关闭板书':'开启板书');toast(state.inking?'板书已开启；拖动可书写，再点铅笔恢复模型操作。':'已恢复模型操作。');break;
 case'clear-ink':state.strokes=[];drawAnnotations();toast('已清空板书。');break;case'screenshot':exportImage();break;
 case'answer':state.answer=!state.answer;$('#answerText').hidden=!state.answer;$('#answerButton').innerHTML=state.answer?'收起解答':'查看解答';break;
 case'to-params':$('#controlPanel')?.scrollIntoView({block:'start'});break;
 case'to-model':$('.canvas-panel')?.scrollIntoView({block:'start'});break;
 case'model-info':modelInfo();break;case'save':saveDialog();break;case'confirm-save':confirmSave();break;case'share':shareDialog();break;case'present':togglePresentation();break;
 case'copy-config':copyText($('#configText').value,$('#configText'));break;
 case'copy-link':{const url=new URL(location.href);url.hash=new URLSearchParams({model:state.model.id,params:JSON.stringify(state.p)}).toString();copyText(url.href);break;}
 case'export-config':exportJSON(currentConfig(),state.model.title+'-课堂配置');toast('已导出当前参数配置。');break;case'backup':backup();break;case'import':$('#importFile').click();break;case'confirm-import':confirmImport();break;case'cancel-import':pendingImport=null;closeDialog();break;
}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.open)return openModel(b.dataset.open);
 if(b.dataset.favorite)return toggleFavorite(b.dataset.favorite);
 if(b.dataset.nav)return showLibrary(b.dataset.nav);
 if(b.dataset.category)return showLibrary('all',b.dataset.category);
 if(b.dataset.filter){state.category=b.dataset.filter;$$('[data-filter]').forEach(el=>el.classList.toggle('active',el===b));setActiveNav();renderCards();return;}
 if(b.dataset.preset!==undefined&&state.model){stopAnimation();Object.assign(state.p,state.model.presets[Number(b.dataset.preset)][1]);state.time=0;resetSolver();renderControls();$(`[data-preset="${b.dataset.preset}"]`)?.classList.add('active');renderReadout();requestDraw();return;}
 if(b.dataset.classOpen){const c=store.classes.find(s=>s.id===b.dataset.classOpen);if(c)openModel(c.model,c.p);return;}
 if(b.dataset.classExport){const c=store.classes.find(s=>s.id===b.dataset.classExport);if(c)exportJSON({app:'zhixiang',version:1,type:'model',title:c.title,model:c.model,params:c.p},c.title+'-课堂配置');return;}
 if(b.dataset.classDelete){const c=store.classes.find(s=>s.id===b.dataset.classDelete);if(c)openDialog('删除这个课堂？',`<p>将从当前${STORAGE_CONTEXT}移除「${esc(c.title)}」。已经导出的文件不会受影响。</p><div class="dialog-actions"><button class="button secondary" data-action="close-dialog">取消</button><button class="button danger" data-confirm-delete="${esc(c.id)}">确认删除</button></div>`);return;}
 if(b.dataset.confirmDelete){store.classes=store.classes.filter(c=>c.id!==b.dataset.confirmDelete);persist();closeDialog();showLibrary('classes');toast('已删除课堂。');return;}
 if(b.dataset.action)action(b.dataset.action);
});
document.addEventListener('input',e=>{const el=e.target;if(el.id==='searchInput'){state.query=el.value.trim();renderCards();}else if(el.dataset.param&&state.model){setParam(el.dataset.param,Number(el.value));}else if(el.id==='timeline'&&state.model?.id==='projectile'){stopAnimation();state.time=Number(el.value)/1000*projectileDuration(state.p);renderReadout();requestDraw();}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.environment&&state.model?.environment&&state.model.choices.motionMode.includes(el.value)){stopAnimation();state.p.motionMode=el.value;state.time=0;state.compare=null;resetSolver();renderControls();renderReadout();requestDraw();}else if(el.id==='gradeFilter'){state.grade=el.value;renderCards();}else if(el.dataset.paramNumber&&state.model){const key=el.dataset.paramNumber,value=Number(el.value);if(el.value.trim()===''||!Number.isFinite(value)){el.value=state.p[key];toast('请输入范围内的有效数字。');}else{setParam(key,value);el.value=state.p[key];}}else if(el.id==='functionSelect'){if(Object.hasOwn(FUNCTIONS,el.value)){state.p.kind=el.value;renderReadout();requestDraw();}}else if(el.id==='speedSelect'){state.speed=Number(el.value);}else if(el.dataset.flag){state[el.dataset.flag]=el.checked;requestDraw();}else if(el.id==='importFile'){handleImport(el.files[0]);}});
document.addEventListener('keydown',e=>{const editing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable;if(e.key==='Escape'&&state.presenting){exitPresentation();return;}if($('#dialog').open){if(e.key==='Enter'&&document.activeElement?.id==='classTitle'){e.preventDefault();confirmSave();}return;}if(editing)return;if(e.code==='Space'&&state.model?.time){e.preventDefault();togglePlay();}else if(e.key.toLowerCase()==='r'&&state.model){e.preventDefault();action('reset');}else if(e.key==='/'&&!state.model){e.preventDefault();$('#searchInput')?.focus();}});
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&state.presenting){state.presenting=false;document.body.classList.remove('presenting');if($('#presentLabel'))$('#presentLabel').textContent='大屏模式';requestDraw();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAnimation();}});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(state.model)requestDraw();else{$$('canvas[data-thumb]').forEach(drawThumbnail);}},100);});
function routeFromHash(){const args=new URLSearchParams(location.hash.slice(1)),model=args.get('model');if(model&&modelById(model)){let p=null;try{if(args.get('params'))p=JSON.parse(args.get('params'));}catch{toast('链接中的参数无法读取，使用默认参数。');}openModel(model,p);}else{const v=['all','favorites','classes'].includes(args.get('view'))?args.get('view'):'all',c=Object.hasOwn(CATS,args.get('category'))?args.get('category'):'all';showLibrary(v,c);}}
window.addEventListener('hashchange',routeFromHash);
hydrateIcons();$$('.nav-item').forEach(b=>{const label=b.dataset.collection==='geometry'?'三维模型':b.dataset.category?CATS[b.dataset.category].name:b.dataset.nav==='all'?'模型库':b.dataset.nav==='favorites'?'我的收藏':'我的课堂';b.setAttribute('aria-label',label);b.title=label;});
// Verify storage availability without collecting or transmitting anything.
try{localStorage.setItem('zhixiang-storage-check','1');localStorage.removeItem('zhixiang-storage-check');}catch{storageOK=false;setTimeout(()=>toast('当前环境未开放本地存储；使用导出配置功能保存课堂。'),500);}

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.collection==='geometry'){showLibrary('all','math');state.only3d=true;$('#threeDFilter').checked=true;setActiveNav();renderCards();}
 if(b.dataset.geoView&&state.model?.threeD){geoStop();const v={iso:[-35,state.model.id==='nets'?38:24],front:[0,0],top:[0,90],side:[90,0]}[b.dataset.geoView];if(v){state.p.yaw=v[0];state.p.pitch=v[1];geometrySyncView();requestDraw();}}
 if(b.dataset.geoAction)geometryAction(b.dataset.geoAction);
});
document.addEventListener('change',e=>{
 const el=e.target;
 if(el.id==='threeDFilter'){state.only3d=el.checked;setActiveNav();renderCards();}
 if(el.dataset.geoSelect&&state.model?.threeD){const k=el.dataset.geoSelect;if(state.model.choices?.[k]?.includes(el.value)){geoStop();state.p[k]=el.value;renderControls();renderReadout();requestDraw();}}
 if(el.dataset.geoToggle&&state.model?.threeD){const k=el.dataset.geoToggle;if(state.model.bools?.includes(k)){state.p[k]=el.checked;requestDraw();}}
});

routeFromHash();
// Small documented math API for independent verification and future extensions.
window.ZhixiangMath=Object.freeze({solid:solidData,section:sectionData,net:netMesh,solidMesh,solar:solarData,projectile:projectileData,gas:gasData,refraction:opticalData,spring:springData,pendulumStep:rk4Pendulum,pendulumEnergy,pendulumPeriod});
