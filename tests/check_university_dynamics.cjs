/* Pure mathematical checks: Fourier, initial-value ODEs and series RLC. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const D=require('../university-dynamics.js');
let stops=0;
const context=vm.createContext({window:{},console,Math,uniRenderControls(){},uniSetParam(){},uniBindStage(){},stopAnimation(){stops++;},state:{time:0},document:{addEventListener(){}},
  esc:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),num:v=>String(v),mathNumber:v=>String(v)});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../physics.js'),'utf8'),context);
const P=context.window.ZhixiangPhysics,results=[];
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
const close=(a,b,abs=1e-10,rel=1e-9)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=abs+rel*Math.max(Math.abs(a),Math.abs(b));
let seed=7022026;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(const file of ['model-registry.js','models/fourier.js','models/ode.js','models/rlc.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const models=vm.runInContext('ZhixiangModels.list()',context),F=models.find(m=>m.id==='fourier').defaults,O=models.find(m=>m.id==='ode').defaults,R=models.find(m=>m.id==='rlc').defaults;
context.window.ZhixiangUniversityDynamics=D;
check('新模型独立注册：三个模型及各三个完整预设',models.length===3&&models.every(m=>m.presets.length===3&&m.university&&m.keepNumericPrecision));
for(const m of models)for(const [title,preset] of m.presets){const p={...m.defaults,...preset};check(`${m.id} 预设 ${title} 通过参数校验`,m.validate(p).valid);}
check('UMD 在浏览器与 Node 导出相同函数',typeof D.odeSolve==='function'&&typeof D.fourierData==='function');
check('方波 N=5 只有 1、3、5 次非零谐波',D.fourierData(F).activeTerms===3&&D.fourierCoefficient(F,2).b===0&&D.fourierCoefficient(F,5).b===4/(5*Math.PI));
check('三角波第三谐波为负且按 n² 衰减',close(D.fourierCoefficient({...F,kind:'triangle'},3).b,-8/(9*Math.PI**2)));
check('锯齿波第二谐波为负',close(D.fourierCoefficient({...F,kind:'sawtooth'},2).b,-1/Math.PI));
for(const kind of ['square','sawtooth','triangle']){
  const p={...F,kind,terms:49,phase:.37};let worst=0;
  for(let i=0;i<250;i++){const x=-20+40*random();worst=Math.max(worst,Math.abs(D.fourierSum(p,x+p.period)-D.fourierSum(p,x)));}
  check(`${kind} 随机点周期性`,worst<1e-11,{worst});
  const count=50000,dx=p.period/count;let mse=0;
  for(let i=0;i<count;i++){const x=(i+.5)*dx+p.phase*p.period/(2*Math.PI);mse+=(D.fourierSum(p,x)-D.fourierTarget(p,x))**2/count;}
  check(`${kind} Parseval RMS 与独立整周期中点积分一致`,close(D.fourierData(p).rmsError**2,mse,3e-8,1e-6),{parseval:D.fourierData(p).rmsError**2,mse});
}
check('方波跳点与锯齿波跳点均取平均值0',D.fourierTarget(F,0)===0&&D.fourierTarget({...F,kind:'sawtooth'},F.period/2)===0);
check('三角波峰值达到 A',close(D.fourierTarget({...F,kind:'triangle'},F.period/4),F.amplitude));
const gibbsP={...F,terms:49},gibbs=D.fourierSum(gibbsP,gibbsP.period/(2*(gibbsP.terms+1)));
check('方波有限部分和存在 Gibbs 过冲',gibbs>1.17&&gibbs<1.20,{value:gibbs});
for(const [key,value] of [['terms',2.5],['terms',51],['period',0],['period',21],['amplitude',NaN],['phase',Infinity],['kind','expression']])check(`Fourier 拒绝非法 ${key}=${value}`,!D.fourierValidate({...F,[key]:value}).valid);
const linear={...O,a:0,b:1,c:0,y0:1,span:1,h:.2},coarse=D.odeSolve(linear),fine=D.odeSolve({...linear,h:.1}),finer=D.odeSolve({...linear,h:.05});
check('线性指数模板解析终点 e',close(D.odeExact(linear,1),Math.E));
const eulerRatio=fine.maxEulerError/finer.maxEulerError,rkRatio=fine.maxRK4Error/finer.maxRK4Error;
check('减半步长：Euler 一阶收敛',eulerRatio>1.8&&eulerRatio<2.1,{eulerRatio});
check('减半步长：RK4 四阶收敛',rkRatio>14&&rkRatio<17,{rkRatio});
check('RK4 误差小于同一步长 Euler',coarse.maxRK4Error<coarse.maxEulerError/100);
const endpoint={...O,t0:.17,span:.63,h:.2},end=D.odeSolve(endpoint).points.at(-1).t;
check('非整步区间准确落在终点',end===endpoint.t0+endpoint.span,{end});
check('线性 b=0 连续极限为二次函数',close(D.odeExact({...O,a:2,b:0,c:1,t0:.3,y0:2},1.2),2+(.3*2+1)*.9+.9*.9));
check('接近 b=0 的解析公式无相消跳变',close(D.odeExact({...O,b:1e-12},4),D.odeExact({...O,b:0},4),1e-9));
let rhsError=0,odeError=0;
for(let i=0;i<150;i++){
  const p={...O,a:-2+4*random(),b:-2+4*random(),c:-2+4*random(),t0:-2+4*random(),y0:-3+8*random(),h:.02,span:.5+random()},t=p.t0+random()*p.span,dt=1e-5;
  const derivative=(D.odeExact(p,t+dt)-D.odeExact(p,t-dt))/(2*dt),truth=D.odeRHS(p,t,D.odeExact(p,t));
  rhsError=Math.max(rhsError,Math.abs(derivative-truth)/(1+Math.abs(truth)));
  const v=D.odeSolve(p);odeError=Math.max(odeError,v.maxRK4Error/(1+Math.abs(v.points.at(-1).exact)));
}
check('150组随机线性解析解满足微分方程',rhsError<2e-8,{rhsError});
check('150组随机线性 RK4 对照解析解',odeError<2e-7,{odeError});
const log={...O,kind:'logistic',r:1,K:2,y0:.25,span:6};
check('Logistic 平衡解0和K保持不变',[0,2].every(y=>D.odeSolve({...log,y0:y}).points.every(q=>q.euler===y&&q.rk4===y&&q.exact===y)));
const lp=D.odeSolve(log).points;
check('Logistic 生长有界且单调',lp.every((q,i)=>q.rk4>=0&&q.rk4<=log.K&&(!i||q.rk4>=lp[i-1].rk4)));
check('Logistic 越界初值有明确拒绝',!D.odeSolve({...log,y0:2.1}).valid&&!D.odeSolve({...log,y0:-.1}).valid);
for(const [key,value] of [['h',0],['h',.6],['a',2.1],['span',0],['b',NaN],['kind','arbitrary']])check(`ODE 拒绝非法 ${key}`,!D.odeValidate({...O,[key]:value}).valid);
const base=P.rlcParameters(R);
check('RLC mH/μF 转 SI',base.L===.1&&close(base.C,1e-4)&&close(base.f0,50.32921210448704));
const initial=P.rlcState(R,0);
check('自由响应精确满足两个初值',initial.current===R.current0&&close(initial.voltageC,R.voltage0));
const rc=base.criticalResistance,critical={...R,resistance:rc};
check('临界阻尼分类及解析解',P.rlcParameters(critical).regime==='critical'&&close(P.rlcState(critical,.01).voltageC,R.voltage0*(1+base.omega0*.01)*Math.exp(-base.omega0*.01),1e-11));
for(const factor of [1-1e-8,1+1e-8])check(`临界阻尼两侧连续 factor=${factor}`,close(P.rlcState({...critical,resistance:rc*factor},.01).voltageC,P.rlcState(critical,.01).voltageC,2e-7));
let energyDrift=0;const lossless={...R,resistance:0,current0:.3},e0=P.rlcState(lossless,0).energy;
for(let i=0;i<2000;i++)energyDrift=Math.max(energyDrift,Math.abs(P.rlcState(lossless,i*.0001).energy-e0));
check('无电阻自由响应能量守恒',energyDrift<1e-12,{energyDrift});
for(const resistance of [20,rc,500]){
  const p={...R,resistance,current0:.3},end=P.rlcDuration(p),start=P.rlcState(p,0).energy;let prev=start,worst=0,balance=0;
  for(let i=1;i<=1000;i++){const v=P.rlcState(p,end*i/1000);worst=Math.max(worst,v.energy-prev);balance=Math.max(balance,Math.abs(v.energy+v.dissipated-start));prev=v.energy;}
  check(`R=${resistance} 自由储能不增且耗散守恒`,worst<1e-12&&balance<1e-12,{worst,balance});
}
let derivativeError=0,energyError=0,validExtremes=true;
for(let i=0;i<250;i++){
  const p={...R,resistance:500*random(),inductance:10+990*random(),capacitance:1+999*random(),voltage0:-100+200*random(),current0:-10+20*random()},d=P.rlcParameters(p),t=random()*P.rlcDuration(p),dt=1e-6/Math.max(d.omega0,d.alpha,1),left=P.rlcState(p,Math.max(0,t-dt)),right=P.rlcState(p,t+dt),v=P.rlcState(p,t),div=t-dt>=0?2*dt:t+dt;
  const qPrime=(right.q-left.q)/div,iPrime=(right.current-left.current)/div;
  derivativeError=Math.max(derivativeError,Math.abs(qPrime-v.current)/(1+Math.abs(v.current)),Math.abs(iPrime-v.currentRate)/(1+Math.abs(v.currentRate)));
  energyError=Math.max(energyError,Math.abs((right.energy-left.energy)/div-v.energyRate)/(1+Math.abs(v.energyRate)));
  validExtremes&&=v.valid&&Number.isFinite(v.energy);
}
check('250组随机自由解析解满足 q′=i 与 KVL',derivativeError<2e-6,{derivativeError});
check('250组随机储能导数等于 −Ri²',energyError<2e-6,{energyError});
check('随机支持范围均为有限读数',validExtremes);
for(const resistance of [0,500])for(const inductance of [10,1000])for(const capacitance of [1,1000]){
  const p={...R,resistance,inductance,capacitance,voltage0:100,current0:-10},duration=P.rlcDuration(p);
  check(`RLC 极端组合 ${resistance}/${inductance}/${capacitance} 稳定`,[0,1e-8,duration/100,duration].every(t=>P.rlcState(p,t).valid));
}
const steady={...R,mode:'steady'},res=P.rlcResponse(steady,base.f0);
check('稳态谐振电流 Vm/R 且相位0',close(res.currentAmplitude,steady.driveVoltage/steady.resistance)&&Math.abs(res.phase)<1e-12);
check('低频电流超前，高频电流滞后',P.rlcResponse(steady,base.f0/2).phase<0&&P.rlcResponse(steady,base.f0*2).phase>0);
check('电流峰在 f0',res.currentAmplitude>P.rlcResponse(steady,base.f0*.99).currentAmplitude&&res.currentAmplitude>P.rlcResponse(steady,base.f0*1.01).currentAmplitude);
const fq=base.qPeakOmega/(2*Math.PI),qpeak=P.rlcResponse(steady,fq);
check('电荷峰低于电流峰频率',fq<base.f0&&qpeak.chargeAmplitude>P.rlcResponse(steady,base.f0).chargeAmplitude);
let steadyError=0;
for(let i=0;i<200;i++){const t=.05*random(),dt=1e-8,v=P.rlcState(steady,t),left=P.rlcState(steady,t-dt),right=P.rlcState(steady,t+dt);steadyError=Math.max(steadyError,Math.abs((right.energy-left.energy)/(2*dt)-v.energyRate));}
check('稳态能量变化等于电源功率减焦耳热',steadyError<1e-7,{steadyError});
check('R=0自由有效，正弦稳态明确禁用',P.rlcParameters({...R,resistance:0}).valid&&!P.rlcParameters({...steady,resistance:0}).valid);
for(const [key,value] of [['inductance',0],['capacitance',0],['resistance',-1],['resistance',501],['frequency',2001],['driveVoltage',401]])check(`稳态拒绝非法 ${key}`,!P.rlcParameters({...steady,[key]:value}).valid);
check('无效时间与任意电路类型拒绝',!P.rlcState(R,-1).valid&&!P.rlcState(R,Infinity).valid&&!P.rlcParameters({...R,mode:'parallel'}).valid);
check('电场/磁场储能之和等于总储能',close(initial.energyC+initial.energyL,initial.energy));
check('所有元件电压满足带符号 KVL',close(initial.voltageR+initial.voltageL+initial.voltageC,initial.sourceVoltage));
vm.runInContext(fs.readFileSync(path.join(__dirname,'../chart-export.js'),'utf8'),context);
for(const [id,p] of [['fourier',F],['ode',O],['rlc',R],['rlc',steady]]){
  const m=models.find(m=>m.id===id);context.state.p={...p};context.state.compare={...p};
  const charts=m.exportData();
  for(const chart of charts){
    context.chartUnderTest=chart;
    const csv=vm.runInContext('csvForChart(chartUnderTest)',context),svg=vm.runInContext('svgForChart(chartUnderTest,"数值回归",{time:0})',context);
    check(`${id}/${p.mode||p.kind} ${chart.name} CSV行数、单位表头和对照列`,csv.trimEnd().split('\r\n').length===chart.rows.length+1&&chart.columns.every(c=>csv.split('\r\n')[0].includes(`${c.name} [${c.unit}]`))&&chart.columns.some(c=>/comparison/.test(c.name))&&chart.rows.every(row=>row.length===chart.columns.length));
    check(`${id}/${p.mode||p.kind} ${chart.name} SVG系列取有效数据列`,chart.series.every(s=>s.x<chart.columns.length&&s.y<chart.columns.length&&chart.rows.some(row=>Number.isFinite(row[s.y])))&&svg.includes('<svg')&&!/NaN|Infinity/.test(svg));
  }
}
const rlcModel=models.find(m=>m.id==='rlc');context.state.p={...R};context.state.time=P.rlcDuration(R)-1e-5;rlcModel.advance(.1);
check('RLC播放到终点停止且时间不越界',context.state.time===P.rlcDuration(R)&&stops===1);
check('RLC播放速度将完整时域映射到12秒演示',close(rlcModel.playback.rate(R)*12,P.rlcDuration(R)));
// Preserve the established resistance functions byte-for-byte.
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/resistance-display-baseline.json'),'utf8'));
for(const [name,hash] of Object.entries(baseline.hashes))check(`既有阻力函数 ${name} 哈希保持`,crypto.createHash('sha256').update(P[name].toString()).digest('hex')===hash);
const {outputDir}=require('./runtime.cjs');fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'university-dynamics-results.json'),JSON.stringify({date:new Date().toISOString(),total:results.length,passed:results.filter(q=>q.passed).length,results},null,2));
console.log(`总数 ${results.length}，通过 ${results.filter(q=>q.passed).length}，失败 ${results.filter(q=>!q.passed).length}`);
if(results.some(q=>!q.passed))process.exitCode=1;
