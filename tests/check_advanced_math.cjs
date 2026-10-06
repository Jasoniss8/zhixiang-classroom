/* Independent equations and randomized numerical checks. No browser or runtime dependencies. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../geometry.js'),'utf8'),context);
const m=context.window.ZhixiangMathTools,results=[];let seed=20260930;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
const base={mode:'standard',kind:'ellipse',a:5,b:3,p:2,cx:0,cy:0,e:.6,angle:45,u:.6,branch:'right'};
let g=m.conicGeometry(base);check('椭圆 3-4-5 半焦距与离心率',g.c===4&&g.e===.8);
g=m.conicGeometry({...base,kind:'hyperbola',a:3,b:4});check('双曲线 3-4-5 半焦距与离心率',g.c===5&&g.e===5/3);
g=m.conicMeasurements({...base,a:3,b:3});check('圆边界无有限准线、两焦点重合',g.e===0&&g.c===0&&g.directrices.length===0&&g.ratio===null&&Math.abs(g.invariant-6)<1e-12);
g=m.conicGeometry({...base,kind:'parabola',cx:2,cy:-1,p:4});check('抛物线 p 为焦点到准线距离',g.e===1&&g.foci[0].x===4&&g.directrices[0]===0&&g.vertex.x===2);
for(const kind of ['ellipse','hyperbola','parabola']){
 let maximum=0;
 for(let i=0;i<1500;i++){
  const a=.3+5.7*random(),p={...base,kind,a,b:kind==='ellipse'?a*(.01+.98*random()):.1+5.9*random(),p:.2+3.8*random(),cx:8*random()-4,cy:8*random()-4,angle:360*random()-180,u:6*random()-3,branch:random()<.5?'left':'right'};
  const d=m.conicMeasurements(p),x=d.point.x-p.cx,y=d.point.y-p.cy;
  const eq=kind==='ellipse'?x*x/(p.a*p.a)+y*y/(p.b*p.b)-1:kind==='hyperbola'?x*x/(p.a*p.a)-y*y/(p.b*p.b)-1:y*y-2*p.p*x;
  const focal=kind==='parabola'?d.pf[0]-d.directrixDistance:d.invariant-2*p.a;
  const cIdentity=kind==='parabola'?d.c-p.p/2:d.c*d.c-(kind==='ellipse'?p.a*p.a-p.b*p.b:p.a*p.a+p.b*p.b);
  maximum=Math.max(maximum,Math.abs(eq),Math.abs(focal),Math.abs(d.ratio-d.e),Math.abs(cIdentity));
 }
 check(`${kind}：1500 随机点方程、焦距、距离恒等误差 <1e-9`,maximum<1e-9,{maxAbsoluteError:maximum});
}
let maximum=0,count=0;
for(const e of[0,.1,.6,.99,.9999,1,1.0001,1.2,2])for(let i=0;i<500;i++){
 const p={...base,mode:'unified',e,p:.2+3.8*random(),cx:8*random()-4,cy:8*random()-4,angle:360*random()-180},d=m.conicMeasurements(p);
 if(!d.point||Math.abs(1+e*Math.cos(p.angle*Math.PI/180))<.05)continue;
 const x=d.point.x-p.cx,y=d.point.y-p.cy,r=Math.hypot(x,y);
 const residual=e===0?Math.abs(r-p.p):Math.max(Math.abs(r-e*Math.abs(x-p.p/e)),Math.abs(d.ratio-e));
 const invariant=d.type==='parabola'?Math.abs(d.pf[0]-d.directrixDistance):Math.abs(d.invariant-2*d.a);
 maximum=Math.max(maximum,residual,invariant);count++;
}
check('统一定义 e=0、e=1 及其两侧随机点，误差 <1e-9',maximum<1e-9,{points:count,maxAbsoluteError:maximum});
check('e=1 的渐近方向不伪造有限点',m.conicPoint({...base,mode:'unified',e:1,angle:180})===null);
const db={kind:'poly',a:.25,b:0,c:-1,d:0,x0:1,h:1};
for(const kind of ['poly','sin','exp','log','reciprocal']){
 let error=0,analyticError=0;
 for(let i=0;i<2000;i++){
  const p={...db,kind,a:6*random()-3,b:6*random()-3,c:8*random()-4,d:8*random()-4};
  const x=kind==='log'?10**(-4+4.77*random()):kind==='reciprocal'?(random()<.5?-1:1)*10**(-4+4.77*random()):12*random()-6;
  const expected=kind==='poly'?3*p.a*x**2+2*p.b*x+p.c:kind==='sin'?p.a*Math.cos(x):kind==='exp'?p.a*Math.exp(x):kind==='log'?p.a/x:-p.a/x**2;
  const actual=m.derivativeAnalytic(p,x),numeric=m.centralDerivative(p,x);
  analyticError=Math.max(analyticError,Math.abs(expected-actual)/Math.max(1,Math.abs(expected)));error=Math.max(error,Math.abs(expected-numeric.value)/Math.max(1,Math.abs(expected)));
  if(!m.derivativeDomain(kind,x-numeric.delta)||!m.derivativeDomain(kind,x+numeric.delta))throw Error('Difference outside domain');
 }
 check(`${kind}：2000 随机点解析导数`,analyticError<2e-15,{maxNormalizedError:analyticError});
 check(`${kind}：中心差分归一化误差 <2e-7`,error<2e-7,{maxNormalizedError:error});
}
check('ln x、1/x 定义域边界禁用',!m.derivativeReadings({...db,kind:'log',x0:0}).valid&&!m.derivativeReadings({...db,kind:'log',x0:-1}).valid&&!m.derivativeReadings({...db,kind:'reciprocal',x0:0}).valid);
check('跨越间断点的割线禁用',Number.isNaN(m.derivativeReadings({...db,kind:'reciprocal',x0:-.2,h:.4}).secant));
check('h=0 不把割线斜率误标为导数',Number.isNaN(m.derivativeReadings({...db,h:0}).secant)&&Number.isFinite(m.derivativeReadings({...db,h:0}).analytic));
check('靠近奇点显示提示且中心差分保持同侧',m.derivativeReadings({...db,kind:'log',x0:.0001}).near&&m.centralDerivative({...db,kind:'log'},.0001).delta<.0001);
let a=m.derivativeAnalysis({...db,a:1,c:0});check('x³ 的零导数为非极值驻点',a.critical.length===1&&a.critical[0].type==='驻点（非极值）');
check('x³ 经过水平切线仍保持同一递增区间',a.intervals.length===1&&a.intervals[0].from===-6&&a.intervals[0].to===6&&a.intervals[0].sign===1);
a=m.derivativeAnalysis(db);check('三次函数两极值与导数变号',a.critical.length===2&&a.critical[0].type==='极大值'&&a.critical[1].type==='极小值');
a=m.derivativeAnalysis({...db,a:0,b:1,c:0});check('降阶二次函数极小值',a.critical.length===1&&a.critical[0].type==='极小值');
a=m.derivativeAnalysis({...db,a:0,b:1,c:-12});check('视窗端点零导数不列作内部极值',a.zeros.includes(6)&&a.critical.length===0);
a=m.derivativeAnalysis({...db,a:0,b:0,c:0});check('常数函数不列孤立极值',a.constant&&a.critical.length===0&&a.intervals.every(v=>v.sign===0));
a=m.derivativeAnalysis({...db,kind:'reciprocal',a:1});check('反比例单调区间在 0 处断开',a.intervals.length===2&&a.intervals.every(v=>v.sign===-1)&&a.intervals[0].to===0&&a.intervals[1].from===0);
const out=require('./runtime.cjs').outputDir;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'advanced-math-results.json'),JSON.stringify({date:new Date().toISOString(),results},null,2));
console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
