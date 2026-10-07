/* Independent equations and deterministic numerical checks for university math. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const U = require('../university-math.js'), results = [];
const check = (name, passed, details) => { results.push({name,passed:!!passed,details}); console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`); };
const close = (a,b,tol=1e-11) => Number.isFinite(a) && Math.abs(a-b) <= tol*Math.max(1,Math.abs(b));
let seed=20261007; const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32), between=(lo,hi)=>lo+(hi-lo)*random();
const tb={kind:'sin',amp:1,offset:0,center:0,degree:5,probe:1,span:3};
check('纯数学UMD支持浏览器与Node',(()=>{const c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../university-math.js'),'utf8'),c);return typeof c.window.ZhixiangUniversityMath.gradientData==='function'&&typeof U.taylorData==='function';})());
check('sin在0的五阶系数为已知解析值',U.taylorCoefficients(tb).every((c,i)=>close(c,[0,1,0,-1/6,0,1/120][i],1e-15)));
check('cos在0的六阶系数为已知解析值',U.taylorCoefficients({...tb,kind:'cos',degree:6}).every((c,i)=>close(c,[1,0,-1/2,0,1/24,0,-1/720][i],1e-15)));
check('exp系数按阶乘形成',U.taylorCoefficients({...tb,kind:'exp',degree:6}).every((c,i)=>close(c,[1,1,1/2,1/6,1/24,1/120,1/720][i],1e-15)));
check('ln在1的解析系数',U.taylorCoefficients({...tb,kind:'log',center:1,degree:4}).every((c,i)=>close(c,[0,1,-1/2,1/3,-1/4][i],1e-15)));
check('1/x在负展开点的符号正确',U.taylorCoefficients({...tb,kind:'reciprocal',center:-2,degree:3}).every((c,i)=>close(c,[-.5,-.25,-.125,-.0625][i],1e-15)));
check('函数系数与常数项完整进入展开',U.taylorCoefficients({...tb,amp:2,offset:3}).every((c,i)=>close(c,[3,2,0,-1/3,0,1/60][i])));
check('零阶多项式是展开点常数',close(U.taylorValue({...tb,center:1,degree:0},4),Math.sin(1)));
check('sin的零偶次项不会假称每阶误差下降',close(U.taylorValue(tb,1),U.taylorValue({...tb,degree:6},1),1e-15));
check('非法阶数与非有限展开点拒绝',[-1,13,2.5,NaN].every(degree=>!U.taylorData({...tb,degree}).valid)&&!U.taylorData({...tb,center:Infinity}).valid);
check('ln及倒数的奇点安全边界严格',!U.taylorData({...tb,kind:'log',center:.049999}).valid&&U.taylorData({...tb,kind:'log',center:.05}).valid&&!U.taylorData({...tb,kind:'reciprocal',center:-.049}).valid&&U.taylorData({...tb,kind:'reciprocal',center:-.05}).valid);
check('ln收敛右端包含左端排除',U.taylorData({...tb,kind:'log',center:1,probe:2}).converges&&!U.taylorData({...tb,kind:'log',center:1,probe:0}).converges&&!U.taylorData({...tb,kind:'log',center:1,probe:2.01}).converges);
check('倒数两侧端点均不收敛',!U.taylorData({...tb,kind:'reciprocal',center:-1,probe:-2}).converges&&!U.taylorData({...tb,kind:'reciprocal',center:-1,probe:0}).converges&&U.taylorData({...tb,kind:'reciprocal',center:-1,probe:-1.5}).converges);
check('原函数定义域外不产生误差数字',(()=>{const d=U.taylorData({...tb,kind:'log',center:1,probe:-1});return !d.domainValid&&Number.isNaN(d.absError)&&Number.isFinite(d.approx);})());
check('error约定为近似减真实',(()=>{const d=U.taylorData(tb);return close(d.error,(1-1/6+1/120)-Math.sin(1))&&close(d.absError,Math.abs(d.error));})());
let expansion=true,tangent=true,remainder=true,geometric=true,maxRemainderRatio=0;
for(let i=0;i<700;i++){
  const kind=['sin','cos','exp','log','reciprocal'][i%5],center=kind==='log'?between(.1,4):kind==='reciprocal'?(random()<.5?-1:1)*between(.1,4):between(-4,4),p={...tb,kind,center,degree:Math.floor(random()*13),amp:between(-3,3),offset:between(-4,4)};
  expansion&&=close(U.taylorValue(p,center),U.taylorFunction(p,center),1e-13);
  const h=between(-.1,.1),expectedDerivative=p.amp*(kind==='sin'?Math.cos(center):kind==='cos'?-Math.sin(center):kind==='exp'?Math.exp(center):kind==='log'?1/center:-1/center**2);
  tangent&&=close(U.taylorValue({...p,degree:1},center+h),U.taylorFunction(p,center)+expectedDerivative*h,1e-12);
  if(['sin','cos','exp'].includes(kind)){
    const n=p.degree,delta=between(-1,1);let factorial=1;for(let j=1;j<=n+1;j++)factorial*=j;
    const bound=Math.abs(p.amp)*(kind==='exp'?Math.exp(Math.max(center,center+delta)):1)*Math.abs(delta)**(n+1)/factorial;
    const error=Math.abs(U.taylorValue(p,center+delta)-U.taylorFunction(p,center+delta));remainder&&=error<=bound+2e-12*Math.max(1,Math.abs(U.taylorFunction(p,center+delta)));if(bound>1e-10)maxRemainderRatio=Math.max(maxRemainderRatio,error/bound);
  }
  if(kind==='reciprocal'){
    const delta=center*between(-.8,.8),x=center+delta,q=-delta/center;
    const expected=p.amp*(1-q**(p.degree+1))/(center*(1-q))+p.offset;
    geometric&&=close(U.taylorValue(p,x),expected,2e-12);
  }
}
check('700随机展开点函数值恒等',expansion);
check('700随机一阶展开与解析切线一致',tangent);
check('三角与指数近似满足独立余项界',remainder,{maxRemainderRatio});
check('倒数展开与有限等比和独立核对',geometric);
const lb={m11:2,m12:0,m21:0,m22:1,vx:1,vy:1,tau:1};
check('矩阵默认向量和面积结果',(()=>{const d=U.linearData(lb);return d.output[0]===2&&d.output[1]===1&&d.det===2&&d.trace===3;})());
check('插值起点是恒等映射终点是目标',(()=>{const a=U.linearData({...lb,tau:0}),b=U.linearData(lb);return a.output[0]===1&&a.output[1]===1&&a.det===1&&b.det===b.targetDet;})());
check('插值中间的读数对应当前矩阵',(()=>{const d=U.linearData({...lb,tau:.5});return d.det===1.5&&d.output[0]===1.5&&d.targetDet===2;})());
check('旋转90度给出共轭复根且不画实方向',(()=>{const d=U.linearData({...lb,m11:0,m12:-1,m21:1,m22:0});return d.eigenvectors.length===0&&d.eigenvalues.every(x=>x.re===0&&Math.abs(x.im)===1)&&d.det===1&&d.output[0]===-1&&d.output[1]===1;})());
check('剪切重根只有一个特征方向',(()=>{const d=U.linearData({...lb,m11:1,m12:1,m21:0,m22:1});return d.eigenvectors.length===1&&d.eigenvalues.every(x=>x.re===1);})());
check('标量矩阵提示任意非零向量是特征向量',U.linearData({...lb,m11:2,m22:2}).classification.includes('每个非零'));
check('零矩阵与秩1矩阵面积为零',U.linearData({...lb,m11:0,m12:0,m21:0,m22:0}).singular&&U.linearData({...lb,m11:1,m12:1,m21:0,m22:0}).singular);
check('近奇异矩阵保留非零行列式并提示误差敏感',(()=>{const d=U.linearData({...lb,m11:1,m22:1e-12});return !d.singular&&d.nearSingular&&d.det===1e-12;})());
check('镜像的面积绝对值与定向分开',(()=>{const d=U.linearData({...lb,m11:-1});return d.det===-1&&d.areaScale===1&&d.orientation.includes('反转');})());
check('无效插值与矩阵拒绝',!U.linearData({...lb,tau:1.1}).valid&&!U.linearData({...lb,m12:NaN}).valid);
let linearity=true,area=true,eigenResidual=0,eigenEquation=true,rotation=true;
for(let i=0;i<1600;i++){
  const p={...lb,m11:between(-5,5),m12:between(-5,5),m21:between(-5,5),m22:between(-5,5),vx:between(-5,5),vy:between(-5,5),tau:random()},d=U.linearData(p),A=d.current;
  const w=[between(-3,3),between(-3,3)],k=between(-2,2),sum=U.matrixVector(A,[p.vx+k*w[0],p.vy+k*w[1]]),aw=U.matrixVector(A,w);
  linearity&&=close(sum[0],d.output[0]+k*aw[0])&&close(sum[1],d.output[1]+k*aw[1]);
  const x=U.matrixVector(A,[1,0]),y=U.matrixVector(A,[0,1]);area&&=close(x[0]*y[1]-x[1]*y[0],d.det,1e-13);
  const [l1,l2]=d.eigenvalues;eigenEquation&&=close(l1.re+l2.re,d.trace,1e-12)&&close(l1.im+l2.im,0)&&close(l1.re*l2.re-l1.im*l2.im,d.det,1e-11);
  d.eigenvectors.forEach((v,j)=>{const av=U.matrixVector(A,v),lambda=d.eigenvalues[j].re;eigenResidual=Math.max(eigenResidual,Math.hypot(av[0]-lambda*v[0],av[1]-lambda*v[1]));});
  const angle=between(-Math.PI,Math.PI),r=[[Math.cos(angle),-Math.sin(angle)],[Math.sin(angle),Math.cos(angle)]],rv=U.matrixVector(r,w);rotation&&=close(Math.hypot(...rv),Math.hypot(...w),1e-13);
}
check('1600随机矩阵线性性质',linearity);
check('1600随机矩阵有向面积恒等式',area);
check('1600实复特征根满足迹与行列式',eigenEquation);
check('1600随机实特征向量残差<1e-10',eigenResidual<1e-10,{maxAbsoluteResidual:eigenResidual});
check('1600随机旋转保向量长度',rotation);
const gb={surface:'quadratic',a:.5,b:0,c:.5,d:0,e:0,f:0,x0:1,y0:1,theta:30,yaw:-35,pitch:28,scale:1};
check('抛物面梯度与方向导数独立值',(()=>{const d=U.gradientData(gb);return d.value===1&&d.fx===1&&d.fy===1&&close(d.directional,(Math.sqrt(3)+1)/2)&&close(d.norm,Math.sqrt(2));})());
check('鞍点梯度零不误判极值',(()=>{const p={...gb,a:1,c:-1,x0:0,y0:0},d=U.gradientData(p);return d.stationary&&U.gradientValue(p,.1,0)>d.value&&U.gradientValue(p,0,.1)<d.value;})());
check('三角曲面的解析偏导',(()=>{const p={...gb,surface:'wave'},d=U.gradientData(p);return close(d.fx,Math.cos(1)**2)&&close(d.fy,-(Math.sin(1)**2));})());
check('高斯曲面原点高度与梯度',(()=>{const d=U.gradientData({...gb,surface:'gaussian',x0:0,y0:0});return d.value===1&&d.fx===0&&d.fy===0&&d.stationary;})());
check('视角缩放不改变数学读数',(()=>{const a=U.gradientData(gb),b=U.gradientData({...gb,yaw:130,pitch:-70,scale:1.8});return JSON.stringify(a)===JSON.stringify(b);})());
check('非有限梯度参数拒绝',!U.gradientData({...gb,theta:NaN}).valid&&!U.gradientData({...gb,a:Infinity}).valid);
let gradientExact=true,tangentExact=true,orthogonal=true,maximum=true,maxDifference=0;
for(let i=0;i<1500;i++){
  const p={...gb,surface:['quadratic','wave','gaussian'][i%3],a:between(-3,3),b:between(-3,3),c:between(-3,3),d:between(-3,3),e:between(-3,3),f:between(-3,3),x0:between(-3,3),y0:between(-3,3),theta:between(-180,180)},g=U.gradientData(p),dx=between(-.1,.1),dy=between(-.1,.1);
  if(p.surface==='quadratic'){
    gradientExact&&=close(g.fx,2*p.a*p.x0+p.b*p.y0+p.d,1e-13)&&close(g.fy,p.b*p.x0+2*p.c*p.y0+p.e,1e-13);
    const remainder=U.gradientValue(p,p.x0+dx,p.y0+dy)-g.value-g.fx*dx-g.fy*dy;tangentExact&&=close(remainder,p.a*dx*dx+p.b*dx*dy+p.c*dy*dy,1e-11);
  }
  orthogonal&&=Math.abs(g.fx*(-g.fy)+g.fy*g.fx)<1e-12;
  maximum&&=Math.abs(g.directional)<=g.norm+1e-12;
  maxDifference=Math.max(maxDifference,g.errors.fx/Math.max(1,Math.abs(g.fx)),g.errors.fy/Math.max(1,Math.abs(g.fy)),g.errors.directional/Math.max(1,Math.abs(g.directional)));
}
check('随机二次曲面偏导与独立表达式一致',gradientExact);
check('随机切平面余项满足二次型恒等式',tangentExact);
check('梯度与等高线切方向正交',orthogonal);
check('方向导数受梯度模约束',maximum);
check('1500解析与中心差分归一化误差<2e-7',maxDifference<2e-7,{maxNormalizedError:maxDifference});
check('41×41曲面有1681顶点1600面片',(()=>{const m=U.gradientMesh(gb);return m.vertices.length===1681&&m.faces.length===1600&&m.vertices.every(([x,y,z])=>close(z,(x*x+y*y)/2));})());
check('曲面网格设定61上限',U.gradientMesh(gb,1000).resolution===61);
const contourError=n=>Math.max(...U.gradientContours({...gb,a:1,c:1},[1,2,4],n).flatMap(c=>c.segments.flatMap(s=>s.map(([x,y])=>Math.abs(x*x+y*y-c.level)))));
const coarseError=contourError(21),fineError=contourError(41);
check('等高线插值误差随网格细化下降',fineError<coarseError&&fineError<=.15*.15/4+1e-12,{coarseError,fineError});
check('鞍面歧义网格不产生非有限线段',U.gradientContours({...gb,a:1,c:-1},[-1,0,1],41).every(c=>c.segments.every(s=>s.length===2&&s.flat().every(Number.isFinite))));
check('常数曲面不伪造等高线方向',U.gradientContours({...gb,a:0,b:0,c:0,d:0,e:0,f:2},[2],41)[0].segments.length===0);
const models={},context={window:{ZhixiangUniversityMath:U},ZhixiangModels:{register:m=>models[m.id]=m},uniRenderControls(){},uniSetParam(){},uniBindStage(){},state:{},exportColumn:(key,unit='1')=>({key,unit}),exportSeries:(name,x,y,color,breaks=[])=>({name,x,y,color,breaks}),samplesBetween:(a,b)=>Array.from({length:601},(_,i)=>a+(b-a)*i/600)};
vm.createContext(context);
for(const name of ['taylor','linear-transform','gradient'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../models/${name}.js`),'utf8'),context);
check('三个模型注册默认参数全部可计算',U.taylorData(models.taylor.defaults).valid&&U.linearData(models['linear-transform'].defaults).valid&&U.gradientData(models.gradient.defaults).valid);
check('大学标记与曲面几何能力独立',Object.values(models).every(m=>m.university&&m.keepNumericPrecision)&&models.gradient.threeD&&models.gradient.geometryUI===false);
check('泰勒与矩阵范围符合正式计划',models.taylor.controls.find(c=>c[0]==='center')[3]===-5&&models.taylor.controls.find(c=>c[0]==='probe')[4]===8&&models['linear-transform'].controls.find(c=>c[0]==='vx')[4]===5);
check('三个模型各有三道具体示例说明',Object.values(models).every(m=>m.presets.length>=3&&m.presetDescriptions.length>=3&&m.presetDescriptions.every(s=>s.length>20)));
check('矩阵预设明确重置向量和全部数学条件',models['linear-transform'].presets.every(([,p])=>Object.keys(models['linear-transform'].defaults).every(key=>Object.hasOwn(p,key))&&p.vx===1&&p.vy===1));
check('梯度预设完整重置数学条件但允许保留视角',models.gradient.presets.every(([,p])=>Object.keys(models.gradient.defaults).filter(k=>!['yaw','pitch','scale'].includes(k)).every(key=>Object.hasOwn(p,key))));
context.state={p:{...models.taylor.defaults},compare:{...models.taylor.defaults,degree:3}};
const exported=models.taylor.exportData()[0];
check('泰勒导出601行含当前与对照参数曲线',exported.rows.length===601&&exported.columns.length===7&&exported.rows.every(r=>r.length===7)&&exported.series.some(s=>s.y===5));
check('泰勒对照导出数值来自对应独立阶数',exported.rows.every(r=>close(r[2],r[0]-r[0]**3/6+r[0]**5/120,1e-11)&&close(r[5],r[0]-r[0]**3/6,1e-11)));
const out=require('./runtime.cjs').outputDir;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'university-math-results.json'),JSON.stringify({date:new Date().toISOString(),results},null,2));
console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
