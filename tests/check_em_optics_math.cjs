/* SI-based identities, derivative checks and approximation boundaries. */
const fs=require('node:fs'),path=require('node:path');
global.window={};require('../physics.js');const s=window.ZhixiangPhysics,results=[];
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
const near=(a,b,tol=1e-10)=>Number.isFinite(a)&&Math.abs(a-b)<tol;
let seed=20261003;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const magnet={scenario:'magnet',fieldSign:'negative',field:.3,period:8,resistance:2};
const uniform={...magnet,scenario:'uniform',fieldSign:'positive'};
check('磁铁远近端物理距离和固定线圈面积',near(s.inductionState(magnet,0).position,.5)&&near(s.inductionState(magnet,4).position,.08)&&near(s.inductionState(magnet,2).area,.03));
check('N 极靠近：磁通负向增加，电流逆时针',s.inductionState(magnet,2).flux<0&&s.inductionState(magnet,2).fluxRate<0&&s.inductionState(magnet,2).direction==='ccw');
check('N 极远离：电流顺时针',s.inductionState(magnet,6).fluxRate>0&&s.inductionState(magnet,6).direction==='cw');
check('S 极靠近：反向电流',s.inductionState({...magnet,fieldSign:'positive'},2).direction==='cw');
check('最近点磁通最大但瞬时电动势为零',[0,4,8].every(t=>s.inductionState(magnet,t).emf===0)&&Math.abs(s.inductionState(magnet,4).flux)>Math.abs(s.inductionState(magnet,0).flux));
let maxDerivative=0,maxOhm=0,maxReversal=0,maxHalfPeriod=0,minLenz=0;
for(let i=0;i<5000;i++){
 const p={...(i%2?magnet:uniform),field:random(),fieldSign:random()>.5?'positive':'negative',period:2+18*random(),resistance:.1+19.9*random()};
 const t=(.001+.998*random())*p.period,h=p.period*1e-6;
 if(s.inductionEvents(p).some(e=>Math.abs(e-t)<10*h))continue;
 const a=s.inductionState(p,t),plus=s.inductionState(p,t+h),minus=s.inductionState(p,t-h),reverse=s.inductionState({...p,fieldSign:p.fieldSign==='positive'?'negative':'positive'},t);
 maxDerivative=Math.max(maxDerivative,Math.abs(a.emf+(plus.flux-minus.flux)/(2*h)));
 maxOhm=Math.max(maxOhm,Math.abs(a.emf-a.current*p.resistance));
 maxReversal=Math.max(maxReversal,Math.abs(a.flux+reverse.flux),Math.abs(a.emf+reverse.emf));
 const fast=s.inductionState({...p,period:p.period/2},t/2);maxHalfPeriod=Math.max(maxHalfPeriod,Math.abs(a.flux-fast.flux),Math.abs(2*a.emf-fast.emf));
 minLenz=Math.max(minLenz,a.emf*a.fluxRate);
}
check('5000 组磁铁/线圈：ε 核对独立中心差分',maxDerivative<1e-8,{maxAbsoluteErrorV:maxDerivative});
check('5000 组：I=ε/R，楞次定律只解释方向',maxOhm<1e-12&&minLenz<=0,{maxOhmError:maxOhm});
check('反转磁极或磁场同时反转 Φ 与 ε',maxReversal<1e-12);
check('相同位置运动加快一倍，磁通不变且电动势加倍',maxHalfPeriod<1e-12);
const events=s.inductionEvents(uniform);
check('一个周期有 8 个锐边穿越时刻，按时间排序',events.length===8&&events.every((t,i)=>t>0&&t<8&&(!i||t>events[i-1])));
check('线圈进场时顺时针，出场时逆时针',s.inductionState(uniform,(events[0]+events[1])/2).direction==='cw'&&s.inductionState(uniform,(events[2]+events[3])/2).direction==='ccw');
check('完全在磁场内部时 Φ=BA、ε=0',near(s.inductionState(uniform,2).flux,.009)&&s.inductionState(uniform,2).emf===0);
check('完全在场外时 Φ、ε、I 为零',[0,4,8].every(t=>{const d=s.inductionState(uniform,t);return d.flux===0&&d.emf===0&&d.current===0;}));
check('锐边瞬间不伪造电动势或电流',events.every(t=>{const d=s.inductionState(uniform,t);return d.edge&&d.emf===null&&d.current===null&&d.direction==='undefined';}));
check('锐边磁通连续，电动势左右极限不同',events.every(t=>{const l=s.inductionState(uniform,t-1e-8),r=s.inductionState(uniform,t+1e-8);return near(l.flux,r.flux,1e-8)&&Math.abs(l.emf-r.emf)>1e-4;}));
for(const scenario of['magnet','uniform'])check(scenario+'：B=0 时任意位置均无感应',Array.from({length:33},(_,i)=>i/4).concat(events).every(t=>{const d=s.inductionState({...uniform,scenario,field:0},t);return d.valid&&d.emf===0&&d.flux===0&&!d.edge;}));
let maxIntegral=0;
for(const p of[magnet,uniform]){
 const bounds=[0,...s.inductionEvents(p),p.period];
 for(let i=0;i<bounds.length-1;i++){
  const a=bounds[i],b=bounds[i+1],n=2000,dt=(b-a)/n;let integral=0;
  for(let j=0;j<n;j++)integral+=s.inductionState(p,a+(j+.5)*dt).emf*dt;
  maxIntegral=Math.max(maxIntegral,Math.abs(integral+s.inductionState(p,b).flux-s.inductionState(p,a).flux));
 }
}
check('各连续时间段 ∫εdt=−ΔΦ，独立中点积分',maxIntegral<1e-8,{maxAbsoluteErrorWb:maxIntegral});
for(const [key,value] of[['period',0],['period',-1],['resistance',0],['resistance',-1],['field',-1],['field',Infinity]])check('拒绝非法感应参数 '+key+'='+value,!s.inductionState({...magnet,[key]:value},1).valid);
check('拒绝非法时间、情景与方向',!s.inductionState(magnet,-1).valid&&!s.inductionState({...magnet,scenario:'x'},1).valid&&!s.inductionState({...magnet,fieldSign:'x'},1).valid);
const slit={wavelength:550,separation:.3,distance:1.5,screenHalf:10};
check('nm、mm 转 SI，默认条纹间距 2.75 mm',near(s.doubleSlitParameters(slit).spacing,.00275,1e-15));
let maxBright=0,maxDark=0,maxSymmetry=0,maxPeriodicity=0,maxApprox=0;
for(let i=0;i<3000;i++){
 const p={wavelength:380+370*random(),separation:.1+.9*random(),distance:.5+4.5*random(),screenHalf:1+29*random()},d=s.doubleSlitParameters(p),order=Math.floor(random()*21)-10,x=(2*random()-1)*d.half;
 maxBright=Math.max(maxBright,Math.abs(s.doubleSlitAt(p,order*d.spacing).intensity-1));
 maxDark=Math.max(maxDark,s.doubleSlitAt(p,(order+.5)*d.spacing).intensity);
 maxSymmetry=Math.max(maxSymmetry,Math.abs(s.doubleSlitAt(p,x).intensity-s.doubleSlitAt(p,-x).intensity));
 maxPeriodicity=Math.max(maxPeriodicity,Math.abs(s.doubleSlitAt(p,x).intensity-s.doubleSlitAt(p,x+d.spacing).intensity));
 const e=s.doubleSlitAt(p,d.half);maxApprox=Math.max(maxApprox,Math.abs(e.pathDifference/e.exactPathDifference-1));
}
check('3000 组参数：所有整数级亮纹强度为 1',maxBright<1e-12,{maxError:maxBright});
check('3000 组参数：半整数级暗纹强度为 0',maxDark<1e-12,{maxError:maxDark});
check('条纹关于中央亮纹对称，周期等于 Δx',maxSymmetry<1e-12&&maxPeriodicity<1e-12,{maxPeriodicity});
check('可选参数范围内光程差近似相对误差小于 0.2%',maxApprox<.002,{maxRelativeError:maxApprox});
const worst={wavelength:380,separation:1,distance:.5,screenHalf:30},w=s.doubleSlitParameters(worst),wq=s.doubleSlitAt(worst,w.half);
check('参数端点虽小角，外围光程差误差仍可超过 λ/10',w.smallAngle&&Math.abs(wq.pathDifference/wq.exactPathDifference-1)<.002&&Math.abs(wq.pathDifference-wq.exactPathDifference)/w.wavelength>.1);
const delta=p=>s.doubleSlitParameters(p).spacing,baseDelta=delta(slit);
check('λ 或 L 加倍使间距加倍；d 加倍使间距减半',near(delta({...slit,wavelength:1100}),2*baseDelta)&&near(delta({...slit,distance:3}),2*baseDelta)&&near(delta({...slit,separation:.6}),baseDelta/2));
check('中央亮纹光程差、相位差为零，强度为 1',s.doubleSlitAt(slit,0).pathDifference===0&&s.doubleSlitAt(slit,0).exactPathDifference===0&&s.doubleSlitAt(slit,0).intensity===1);
check('精确路程差核对稳定公式',[-.03,-.01,.01,.03].every(x=>{const d=s.doubleSlitParameters(slit);return near(s.doubleSlitAt(slit,x).exactPathDifference,Math.hypot(d.distance,x+d.separation/2)-Math.hypot(d.distance,x-d.separation/2),1e-15);}));
check('一个或整数个条纹周期的平均强度为 1/2',[1,2,10,250].every(n=>near(s.doubleSlitPixelIntensity(slit,.00013,.00013+n*baseDelta),.5,1e-12)));
check('零宽像素极限等于点强度',[-.01,0,.005].every(x=>near(s.doubleSlitPixelIntensity(slit,x,x),s.doubleSlitAt(slit,x).intensity,1e-12)));
let maxPixel=0;for(let i=0;i<100;i++){const left=(random()-.5)*.02,right=left+random()*.001,steps=2000;let sum=0;for(let j=0;j<steps;j++)sum+=s.doubleSlitAt(slit,left+(right-left)*(j+.5)/steps).intensity/steps;maxPixel=Math.max(maxPixel,Math.abs(sum-s.doubleSlitPixelIntensity(slit,left,right)));}
check('像素亮度解析平均值核对独立积分',maxPixel<1e-7,{maxError:maxPixel});
for(const key of['wavelength','separation','distance','screenHalf'])check('拒绝零、负数和非有限光学参数 '+key,[0,-1,Infinity,NaN].every(v=>!s.doubleSlitParameters({...slit,[key]:v}).valid));
check('小角近似适用范围检测',s.doubleSlitParameters(slit).smallAngle&&!s.doubleSlitParameters({...slit,distance:.001}).smallAngle);
check('可见光色彩均为有限 RGB，红端为红、550 nm 以绿为主',Array.from({length:371},(_,i)=>s.wavelengthColor(380+i)).flat().every(v=>v>=0&&v<=255)&&s.wavelengthColor(650)[0]>s.wavelengthColor(650)[1]&&s.wavelengthColor(550)[1]>s.wavelengthColor(550)[0]);
const out=require('./runtime.cjs').outputDir;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'em-optics-math-results.json'),JSON.stringify({date:new Date().toISOString(),results},null,2));
console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
