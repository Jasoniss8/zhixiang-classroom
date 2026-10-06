/* Independent physical identities and boundary cases. No application dependencies. */
const fs=require('node:fs'),path=require('node:path');
global.window={};require('../physics.js');const s=window.ZhixiangPhysics,results=[];
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
const close=(a,b,tol=1e-10)=>Number.isFinite(a)&&Math.abs(a-b)<tol;
let seed=20261001;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const base={mass:1,radius:2,g:9.8,omega:3,plane:'horizontal',start:'top'};
let maxCircleError=0;
for(let i=0;i<1000;i++){
 const p={...base,mass:.1+4.9*random(),radius:.3+4.7*random(),omega:20*random()},time=50*random(),d=s.circularData(p,{time});
 maxCircleError=Math.max(maxCircleError,Math.abs(Math.hypot(d.x,d.y)-p.radius),Math.abs(d.vx*d.x+d.vy*d.y),Math.abs(d.ax*d.vx+d.ay*d.vy),Math.abs(d.ac-d.speed**2/p.radius),Math.abs(d.force-p.mass*d.speed**2/p.radius));
}
check('1000 组水平圆周：半径、切向速度、径向加速度和向心力恒等',maxCircleError<1e-9,{maxAbsoluteError:maxCircleError});
const stationary=s.circularData({...base,omega:0},{time:100});check('水平零角速度：位置固定、速度与向心力为零',stationary.x===0&&stationary.y===-2&&stationary.force===0&&stationary.speed===0);
const horizontal=s.circularAdvance(base,s.circularInitial(base),123.4),hd=s.circularData(base,horizontal);
check('水平运动直接符合解析位置',close(hd.x,2*Math.sin(3*123.4))&&close(hd.y,-2*Math.cos(3*123.4)));
const vertical={...base,plane:'vertical'},initial=s.circularInitial(vertical),initialEnergy=s.circularData(vertical,initial).energy;
let state=initial,maxEnergyError=0;
for(let i=0;i<6000;i++){state=s.circularAdvance(vertical,state,.01);maxEnergyError=Math.max(maxEnergyError,Math.abs(s.circularData(vertical,state).energy-initialEnergy));}
check('竖直 RK4 连续 60 s 能量守恒',!state.slack&&maxEnergyError<1e-6,{maxAbsoluteEnergyError:maxEnergyError});
check('最高点与最低点张力关系正确',close(s.circularTension(vertical,Math.PI,3),18-9.8)&&close(s.circularTension(vertical,0,3),18+9.8));
const slowTop={...vertical,omega:1.5},loose=s.circularInitial(slowTop);
check('最高点 v<√(gr) 立即判定绳松弛',loose.slack&&loose.time===0);
check('绳松弛后不继续圆周积分',JSON.stringify(s.circularAdvance(slowTop,loose,20))===JSON.stringify(loose));
const critical={...vertical,omega:Math.sqrt(vertical.g/vertical.radius)};state=s.circularInitial(critical);
for(let i=0;i<2000;i++)state=s.circularAdvance(critical,state,.01);
check('最高点恰好临界不被误判松弛',!state.slack&&close(s.circularTension(critical,Math.PI,critical.omega),0,1e-12));
const release={...vertical,start:'bottom',omega:4},expectedAngle=Math.acos((2*release.g*release.radius-(release.omega*release.radius)**2)/(3*release.g*release.radius));
state=s.circularInitial(release);while(!state.slack&&state.time<10)state=s.circularAdvance(release,state,.037);
check('最低点出发：松弛角符合独立能量与 T=0 解析式',state.slack&&close(state.theta,expectedAngle,1e-8),{actual:state.theta,expected:expectedAngle,time:state.time});
check('松弛事件定位到张力零点',Math.abs(s.circularTension(release,state.theta,state.omega))<1e-10);
let fine=s.circularInitial(release);while(!fine.slack&&fine.time<10)fine=s.circularAdvance(release,fine,.037,1/480);
check('减半 RK4 步长后松弛事件收敛',Math.abs(fine.time-state.time)<1e-8&&Math.abs(fine.theta-state.theta)<1e-8);
const swing={...vertical,start:'bottom',omega:.8};state=s.circularInitial(swing);for(let i=0;i<2000;i++)state=s.circularAdvance(swing,state,.01);
check('低速摆动不误报松弛或强行绕完整圆周',!state.slack&&Math.abs(state.theta)<Math.PI/2);
const bottomCritical={...vertical,start:'bottom',omega:Math.sqrt(5*vertical.g/vertical.radius)};state=s.circularInitial(bottomCritical);for(let i=0;i<2000;i++)state=s.circularAdvance(bottomCritical,state,.01);
check('最低点 √(5gr) 临界初速度能完成圆周',!state.slack&&state.theta>2*Math.PI);

let extremeCritical=true,extremeEnergyError=0;
for(const start of ['top','bottom']){
 const p={...vertical,start,radius:.3,g:15,omega:Math.sqrt((start==='bottom'?5:1)*15/.3)};
 let a=s.circularInitial(p);const energy=s.circularData(p,a).energy;
 for(let i=0;i<6000;i++){a=s.circularAdvance(p,a,.01);extremeEnergyError=Math.max(extremeEnergyError,Math.abs(s.circularData(p,a).energy-energy)/energy);}
 extremeCritical&&=!a.slack&&a.time>59.99&&a.theta>2*Math.PI;
}
check('小半径大重力：两起点临界运动 60 s 不误报松弛',extremeCritical&&extremeEnergyError<1e-6,{maxRelativeEnergyError:extremeEnergyError});

const charge={id:1,q:2,x:1,y:-1},single=s.electricField([charge],4,3);
check('单点电荷 nC→C 换算与库仑定律',close(single.ex,17.98*3/125)&&close(single.ey,17.98*4/125)&&close(single.potential,17.98/5));
const negative=s.electricField([{...charge,q:-2}],4,3);check('负电荷场方向和电势符号',close(negative.ex,-single.ex)&&close(negative.potential,-single.potential));
const pair=[{id:1,q:1,x:-1,y:0},{id:2,q:-1,x:1,y:0}],mid=s.electricField(pair,0,0);
check('等量异号中点 V=0 而 E 非零',mid.potential===0&&close(mid.ex,17.98)&&mid.ey===0);
const like=s.electricField([pair[0],{...pair[1],q:1}],0,0);check('等量同号中点 E=0 而 V 非零',like.magnitude===0&&close(like.potential,17.98));
check('非零电荷的 0.16 m 奇点避让',!s.electricField([charge],1,-1).valid&&!s.electricField([charge],1.15,-1).valid&&s.electricField([charge],1.17,-1).valid);
const empty=s.electricField([{...charge,q:0}],1,-1);check('零电荷不产生场或伪奇点',empty.valid&&empty.magnitude===0&&empty.potential===0);
let maxSuperposition=0,maxGradient=0;
for(let i=0;i<1200;i++){
 const charges=[{id:1,q:random()*10-5,x:-2,y:0},{id:2,q:random()*10-5,x:2,y:0},{id:3,q:random()*10-5,x:0,y:2}],x=10*random()-5,y=8*random()-4;
 if(charges.some(c=>Math.hypot(x-c.x,y-c.y)<.35)){i--;continue;}
 const f=s.electricField(charges,x,y),parts=charges.map(c=>s.electricField([c],x,y));
 maxSuperposition=Math.max(maxSuperposition,Math.abs(f.ex-parts.reduce((v,q)=>v+q.ex,0)),Math.abs(f.ey-parts.reduce((v,q)=>v+q.ey,0)),Math.abs(f.potential-parts.reduce((v,q)=>v+q.potential,0)));
 const h=1e-5,ex=-(s.electricField(charges,x+h,y).potential-s.electricField(charges,x-h,y).potential)/(2*h),ey=-(s.electricField(charges,x,y+h).potential-s.electricField(charges,x,y-h).potential)/(2*h);
 maxGradient=Math.max(maxGradient,Math.hypot(ex-f.ex,ey-f.ey)/Math.max(1,f.magnitude));
}
check('1200 组随机测量点符合 E 与 V 的叠加原理',maxSuperposition<1e-12,{maxAbsoluteError:maxSuperposition});
check('场强与独立电势梯度 E=−∇V 一致',maxGradient<1e-7,{maxNormalizedError:maxGradient});
let fieldDirection=true,avoidsCharges=true,ends=true,count=0;
for(const charges of[[{id:1,q:1,x:0,y:0}],[{id:1,q:-1,x:0,y:0}],pair,[pair[0],{...pair[1],q:1}],[...pair,{id:3,q:-2,x:0,y:2}]]){
 for(const line of s.electricFieldLines(charges)){
  count++;ends&&=['charge','boundary','zero-field','length-limit','step-limit'].includes(line.end);
  for(let j=0;j<line.points.length;j++){
   const p=line.points[j];avoidsCharges&&=charges.every(c=>Math.hypot(p.x-c.x,p.y-c.y)>s.CHARGE_CUTOFF);
   if(j){const a=line.points[j-1],f=s.electricField(charges,(a.x+p.x)/2,(a.y+p.y)/2);fieldDirection&&=f.ex*(p.x-a.x)+f.ey*(p.y-a.y)>-1e-10;}
  }
 }
}
check('场线始终沿正试探电荷受力方向（含单负电荷）',fieldDirection,{lines:count});
check('场线避开奇点，终止原因明确',avoidsCharges&&ends);
check('零场不生成场线',s.electricFieldLines([{id:1,q:0,x:0,y:0}]).length===0);
const contours=s.equipotentialContours([{id:1,q:1,x:0,y:0}],[8.99]);let maxRadiusError=0;
for(const segment of contours[0].segments)for(const p of segment)maxRadiusError=Math.max(maxRadiusError,Math.abs(Math.hypot(p.x,p.y)-1));
check('单电荷 V=8.99 V 等势线为半径 1 m 的圆（网格插值误差）',contours[0].segments.length>30&&maxRadiusError<.004,{maxRadiusError});

for(const phase of[0,180]){
 let good=true;for(const lat of[-89.9,-66.56,-31,0,31,66.56,89.9]){const d=s.seasonData({phase,lat});good&&=d.dec===0&&close(d.hours,12)&&close(d.noon,90-Math.abs(lat));}
 check(`${phase===0?'春分':'秋分'}：直射赤道，非极点昼长 12 h`,good);
}
for(const [phase,dec] of[[90,23.44],[270,-23.44]]){
 const d=s.seasonData({phase,lat:31});check(`${phase===90?'夏至':'冬至'}直射纬度`,close(d.dec,dec,1e-12));
 check(`${phase===90?'夏至':'冬至'}北纬 31° 昼长`,close(d.hours,phase===90?14.013406787966384:9.986593212033615,1e-10));
}
check('夏至南北极昼夜相反',s.daylight(90,23.44).hours===24&&s.daylight(-90,23.44).hours===0);
check('冬至南北极昼夜相反',s.daylight(90,-23.44).hours===0&&s.daylight(-90,-23.44).hours===24);
check('极圈边界与退化极点明确处理',s.daylight(66.56,23.44).hours===24&&s.daylight(-66.56,23.44).hours===0&&s.daylight(90,0).hours===null&&s.daylight(-90,0).hours===null);
let maxDayError=0,maxNoonError=0,maxVectorError=0;
for(const phase of[15,45,90,165,225,270])for(const lat of[-80,-45,0,31,70]){
 const d=s.seasonData({phase,lat});let daytime=0;const samples=7200;
 for(let j=0;j<samples;j++)if(s.solarPosition(lat,d.dec,(j+.5)*24/samples).elevation>0)daytime++;
 maxDayError=Math.max(maxDayError,Math.abs(daytime*24/samples-d.hours));
 maxNoonError=Math.max(maxNoonError,Math.abs(s.solarPosition(lat,d.dec,12).elevation-d.noon));
 const dot=d.axis.reduce((v,a,i)=>v+a*d.sun[i],0);maxVectorError=Math.max(maxVectorError,Math.abs(Math.asin(dot)*180/Math.PI-d.dec));
}
check('昼长与独立逐时太阳高度采样一致',maxDayError<=24/7200+1e-10,{maxHourError:maxDayError});
check('正午高度与原太阳高度角公式一致',maxNoonError<1e-10,{maxDegreeError:maxNoonError});
check('直射纬度由固定地轴与太阳方向点积求得',maxVectorError<1e-12);
let sphereError=0;for(let i=0;i<500;i++){const q=s.earthSurface(180*random()-90,360*random());sphereError=Math.max(sphereError,Math.abs(Math.hypot(...q)-1));}
check('球面经纬度计算不依赖投影',sphereError<1e-12);
check('节气每 15° 一个，日期为代表性月日',s.SOLAR_TERMS.length===24&&s.seasonData({phase:15,lat:0}).term==='清明'&&s.seasonData({phase:90,lat:0}).date==='约 6月21日'&&s.seasonData({phase:360,lat:0}).term==='春分');
const out=require('./runtime.cjs').outputDir;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'science-math-results.json'),JSON.stringify({date:new Date().toISOString(),results},null,2));
console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
