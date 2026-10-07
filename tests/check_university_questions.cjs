/* Finite university text grammar, exact parameter mapping and worked-step regression. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {outputDir}=require('./runtime.cjs');
const sandbox={window:{},Math};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../physics.js'),'utf8'),sandbox);
global.ZhixiangPhysics=sandbox.window.ZhixiangPhysics;
const q=require('../question-matcher.js'),u=require('../university-questions.js');
const math=require('../university-math.js'),dyn=require('../university-dynamics.js');
const results=[];
function check(name,passed,details){results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);}
const near=(a,b,tol=1e-10)=>Number.isFinite(a)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(b));
function analyze(text,type='auto'){const r=q.analyze(text,type);return {r,v:q.validate(r.typeId,r.values)};}
function accepted(text,id,expected){const {r,v}=analyze(text);return r.typeId===id&&!r.issues.length&&v.ok&&Object.entries(expected).every(([k,x])=>typeof x==='number'?near(v.params[k],x):v.params[k]===x);}
function reject(text,id='auto'){const {r,v}=analyze(text,id);return r.issues.length>0||!v.ok;}
const example=id=>q.types.find(t=>t.id===id).example;
check('十类题型中大学六类独立标注',q.types.length===10&&q.types.filter(t=>t.university).length===6);
for(const type of u.types){
 const {r,v}=analyze(type.example);
 check(`${type.id}例题有完整参数与来源`,r.typeId===type.id&&!r.issues.length&&v.ok&&Object.keys(r.values).every(k=>r.sources[k]),{r,v});
 const steps=q.steps(type.id,r.values);
 check(`${type.id}固定步骤含公式代入结果且非占位`,steps.length>=2&&steps.every(s=>s.title&&typeof s.formula==='string'&&typeof s.substitution==='string'&&typeof s.result==='string')&&!JSON.stringify(steps).match(/不定义|暂不可用|无法计算|请在模型/),steps);
 check(`${type.id}手动错选不得绕过识别`,reject(type.example,'lens'));
 check(`${type.id}附加方程不可省略`,reject(type.example+'另有z=7。'));
 check(`${type.id}附加中文约束不可省略`,reject(type.example+'同时要求误差不超过容许值。'));
 check(`${type.id}代码标记只作文本且拒绝`,reject(type.example+'<img src=x onerror=alert(1)>'));
 const missing={...r.values};delete missing[type.fields.find(f=>f.type==='number'&&!f.optional&&!f.when).key];
 check(`${type.id}缺必填数值不得补默认`,!q.validate(type.id,missing).ok);
 check(`${type.id}输入条件不被验证器改写`,(()=>{const old=JSON.stringify(r.values);q.validate(type.id,r.values);return old===JSON.stringify(r.values);})());
}
for(const [func,kind,center] of [['sin(x)','sin',0],['cos x','cos',0],['e^x','exp',0],['ln(x)','log',1],['2/x','reciprocal',1]]){
 check(`泰勒白名单${func}`,accepted(`求泰勒展开，f(x)=${func}，a=${center}，N=4，x=1。`,'taylor',{kind,center,degree:4,probe:1,amp:func==='2/x'?2:1}));
}
check('任务词优先于旧f(x)抛物线规则',analyze(example('taylor')).r.typeId==='taylor');
check('泰勒分数系数常数与非零展开点',accepted('泰勒展开f(x)=-1/2*cos(x)+2，a=1，N=6，x=1.1。','taylor',{kind:'cos',amp:-.5,offset:2,center:1,degree:6,probe:1.1}));
check('麦克劳林明确等价展开点零',accepted('f(x)=sinx，求5阶麦克劳林展开。','taylor',{center:0,degree:5}));
check('泰勒缺求值点不伪装给定值',(()=>{const {r,v}=analyze('泰勒展开f(x)=e^x，a=2，N=4。');return !r.issues.length&&v.ok&&!Object.hasOwn(r.values,'probe')&&v.params.probe===2&&q.steps('taylor',r.values).length===2;})());
for(const text of ['泰勒展开f(x)=sin(x)+x，a=0，N=5。','泰勒展开f(x)=sin(2x)，a=0，N=5。','泰勒展开f(x)=ln(x)，a=0，N=5。','泰勒展开f(x)=1/x，a=0.001，N=5。','泰勒展开f(x)=sin(x)，a=0，N=5.5。','泰勒展开f(x)=sin(x)，a=0，N=13。','泰勒展开f(x)=sin(x)，a=0，N=5，求最小阶数。','泰勒展开f(x)=ln(x)，a=1，N=5，x=-1。'])check('泰勒严格拒绝 '+text,reject(text));
check('收敛范围外可计算但步骤明确告知',(()=>{const {r,v}=analyze('泰勒展开f(x)=ln(x)，a=1，N=4，x=3。');return v.ok&&!r.issues.length&&q.steps('taylor',r.values).some(x=>x.title==='收敛说明');})());
check('矩阵Av精确映射和4至5向量范围',accepted('矩阵A=[[1,0],[0,-1]]，v=(4,5)，求Av。','linear-transform',{m11:1,m12:0,m21:0,m22:-1,vx:4,vy:5,tau:1}));
check('只求det不强填向量',(()=>{const {r,v}=analyze('矩阵A=[[1,2],[3,4]]，求det(A)。');return v.ok&&!r.issues.length&&!Object.hasOwn(v.params,'vx')&&q.fieldsFor(r.typeId,r.values).every(f=>!['vx','vy'].includes(f.key))&&q.steps(r.typeId,r.values).length===1;})());
for(const text of ['矩阵A=[[1,2],[3,4]]，求逆矩阵。','矩阵A=[[1,2],[3,4]]，求特征值。','矩阵A=[[1,2,3],[4,5,6]]，求det(A)。','矩阵A=[[1,2],[3,4]]，v=(1,2,3)，求Av。','矩阵A=[[1,2],[3,4]]，v=(6,1)，求Av。','矩阵A=[[1,2],[3,4]]，求Av，且B=[[1,0],[0,1]]。'])check('矩阵严格拒绝 '+text,reject(text));
check('傅里叶周期pi分数与相位角度',accepted('标准奇方波，A=1，T=2π，N=7，相位φ=90°，x=π/4。','fourier',{period:2*Math.PI,phase:Math.PI/2,probe:Math.PI/4}));
check('傅里叶有单位周期保持秒横轴',accepted('标准奇锯齿波，A=2，T=0.5s，N=10，t=0.25s。','fourier',{period:.5,axisUnit:'s',probe:.25}));
check('傅里叶标准三角波识别',accepted('标准三角波，A=1，T=2，N=9。','fourier',{kind:'triangle',period:2,terms:9}));
for(const text of ['方波，A=1，T=2，N=9。','标准奇方波，A=1，T=2，前5项。','标准奇方波，A=1，T=2，N=5，占空比0.2。','标准奇方波，A=1，T=2，N=5，x=1s。','标准奇方波，A=1，T=2，N=5，phi=4。'])check('傅里叶严格拒绝 '+text,reject(text));
check('二元二次各项保留且点不被式吞掉',accepted('f(x,y)=2x²-xy+y²+2x-y+1，在P=(1,-1)处求梯度与切平面。','gradient',{a:2,b:-1,c:1,d:2,e:-1,f:1,x0:1,y0:-1}));
check('方向向量先单位化不当角度',accepted('f(x,y)=x²+y²，P=(1,2)，方向向量v=(3,4)，求方向导数。','gradient',{theta:Math.atan2(4,3)*180/Math.PI}));
check('方向角弧度转换为模型度',accepted('f(x,y)=x²+y²，P=(1,2)，theta=π/2 rad，求方向导数。','gradient',{theta:90}));
check('切平面无需方向字段',(()=>{const r=analyze(example('gradient')).r;return q.fieldsFor(r.typeId,r.values).every(f=>f.key!=='theta');})());
for(const text of ['f(x,y)=x²+y²，P=(1,2)，求方向导数。','f(x,y)=x²+y²，P=(1,2)，方向v=(0,0)，求方向导数。','f(x,y)=x²+y²+sin(x)，P=(1,2)，求梯度。','f(x,y)=x³+y²，P=(1,2)，求切平面。','f(x,y)=x²+y²，P=(1,2)，求约束极值。'])check('梯度严格拒绝 '+text,reject(text));
check('线性ODE三项严格读取',accepted("微分方程y'=0.5x-2y+1，y(0)=1，求y(2)。",'ode',{kind:'linear',a:.5,b:-2,c:1,t0:0,y0:1,span:2}));
check('指数增长以线性特例表示',accepted("微分方程y'=y，y(0)=1，求y(1)。",'ode',{kind:'linear',a:0,b:1,c:0,span:1}));
check('显式Logistic数值式',accepted('dy/dx=1.5y(1-y/4)，y(0)=1，求y(2)。','ode',{kind:'logistic',r:1.5,K:4}));
check('Logistic具名参数式',accepted("Logistic微分方程y'=ry(1-y/K)，r=1，K=4，y(0)=1，求y(2)。",'ode',{kind:'logistic',r:1,K:4}));
for(const text of ["微分方程y'=y^2，y(0)=1，求y(2)。","微分方程y'=x-y+sin(x)，y(0)=1，求y(2)。","微分方程y'=x-y，y(0)=1，y(1)=2，求y(2)。","微分方程y'=x-y，y(0)=1，求y(-1)。","微分方程y'=x-y，y(0)=1，h=0.01，求y(2)。","Logistic微分方程，r=1，K=2，y(0)=3。","微分方程y'=3x-y，y(0)=1，求y(2)。"])check('ODE严格拒绝 '+text,reject(text));
check('RLC SI单位换算且RMS转峰值',accepted('串联RLC，R=0.02kΩ，L=0.1H，C=0.0001F，正弦电源有效值U=10V，f=0.05kHz，求稳态电流幅值。','rlc',{resistance:20,inductance:100,capacitance:100,driveVoltage:10*Math.SQRT2,frequency:50,mode:'steady'}));
for(const text of ['并联RLC，R=20Ω，L=100mH，C=100μF，正弦电源峰值10V，f=50Hz。','串联RLC，R=0Ω，L=100mH，C=100μF，正弦电源峰值10V，f=50Hz。','串联RLC，R=20Ω，L=100mH，C=100μF，正弦电源10V，f=50Hz。','串联RLC，R=20Ω，L=100mH，C=100μF，正弦电源峰值10V，f=50Hz，初始电压5V。','串联RLC，R=20Ω，L=100mH，C=100μF，正弦电源有效值300V，f=50Hz。'])check('RLC严格拒绝 '+text,reject(text));
for(const [from,to]of [['R=20Ω','R=20Ω/π'],['R=20Ω','R=20Ω×π'],['L=100mH','L=100mH/π'],['U0=10V','U0=10V/π'],['正弦电源','非正弦电源'],['正弦电源','不是正弦电源']])check('RLC不吞尾部运算或否定 '+to,reject(example('rlc').replace(from,to)));
check('RLC固定相位使用电流相对电压符号',(()=>{const r=analyze(example('rlc')).r,s=q.steps('rlc',r.values).at(-1);return /相位=1\.188/.test(s.result);})());
check('view-only与无关条件排除变式',(()=>{const tests=[['taylor',{},'span'],['taylor',{},'probe'],['linear-transform',{task:'det'},'vx'],['linear-transform',{},'tau'],['gradient',{task:'tangent'},'theta'],['gradient',{},'yaw'],['fourier',{},'harmonic'],['fourier',{},'probe'],['ode',{kind:'linear'},'K'],['rlc',{},'voltage0']];return tests.every(([id,v,key])=>!q.variationKeys(id,v,{[key]:1}).length);})());
check('物理数学条件变化仍是变式',u.types.every(t=>{const r=q.analyze(t.example),key=t.fields.find(f=>f.type==='number'&&!f.optional&&!f.when&&f.parameter!==false).key;return q.variationKeys(t.id,r.values,{[key]:1}).includes(key);}));
check('请求泰勒近似值必须给probe',reject('泰勒展开f(x)=sin(x)，a=0，N=5，求近似值。'));
check('请求Fourier部分和值必须给probe',reject('标准奇方波，A=1，T=2，N=5，计算部分和的数值。'));
check('原题求值要求不暴露成可关闭字段',(()=>{const r=q.analyze('泰勒展开f(x)=sin(x)，a=0，N=5，求近似值。');return r.values.requiresProbe===true&&!q.fieldsFor('taylor',r.values).find(f=>f.key==='probe').optional&&!q.fieldsFor('taylor',r.values).some(f=>f.key==='requiresProbe');})());
check('ODE缺目标或正向区间不可默认',reject("微分方程y'=x-y，y(0)=1。"));
check('ODE正向区间可替代目标点',accepted("微分方程y'=x-y，y(0)=1，正向区间[0,2]。",'ode',{t0:0,y0:1,span:2}));
check('ODE正向区间长度可独立使用',accepted("微分方程y'=x-y，y(0)=1，正向区间长度=2。",'ode',{span:2}));
check('ODE区间冲突不取其一',reject("微分方程y'=x-y，y(0)=1，正向区间[1,2]。")&&reject("微分方程y'=x-y，y(0)=1，span=2，求y(3)。"));
check('给定Fourier探针属于数学条件',q.variationKeys('fourier',{probe:.5},{probe:.5}).includes('probe'));
for(const task of ['转置','矩阵平方','伴随矩阵'])check('矩阵不把'+task+'当行列式',reject('矩阵A=[[1,2],[0,1]]，求A的'+task+'。'));
for(const equation of ['dy/dt=x-y','dy/dx=t-y',"y'=x+t-y"])check('ODE独立变量冲突 '+equation,reject('微分方程'+equation+'，y(0)=1，求y(2)。'));
check('ODE显式t与x各自一致均可用',accepted('dy/dt=t-y，y(0)=1，求y(2)。','ode',{a:1,b:-1,c:0})&&accepted('dy/dx=x-y，y(0)=1，求y(2)。','ode',{a:1,b:-1,c:0}));
check('矩阵vA不能改成Av',reject('矩阵A=[[1,2],[0,1]]，v=(2,-1)，求vA。'));
check('Fourier奇偶附加约束不能省略',reject('标准奇方波，A=1，T=2，N=5，N为偶数。'));
check('Taylor正负附加约束不能省略',reject('泰勒展开f(x)=sin(x)，a=1，N=5，展开点a为负数。'));
check('所求电流峰值不能决定电源数值类型',(()=>{const r=q.analyze('串联RLC电路，R=20Ω，L=100mH，C=100μF，正弦电源电压U=10V，频率f=50Hz，电流峰值是多少？');return !Object.hasOwn(r.values,'voltageKind')&&!q.validate('rlc',r.values).ok;})());
let seed=837;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
let randomized=true;
for(let n=0;n<150;n++){
 const a=Math.round((rnd()*4-2)*100)/100,b=Math.round((rnd()*4-2)*100)/100,x=Math.round((rnd()*4-2)*100)/100;
 const p={kind:'sin',amp:a,offset:b,center:0,degree:5,probe:x,span:3},d=math.taylorData(p),expected=b+a*(x-x**3/6+x**5/120);
 randomized&&=near(d.approx,expected)&&near(d.error,expected-(a*Math.sin(x)+b));
 const r=q.analyze(`泰勒展开f(x)=${a}*sin(x)${b<0?'':'+'}${b}，a=0，N=5，x=${x}。`);
 randomized&&=!r.issues.length&&q.validate('taylor',r.values).ok&&near(r.values.amp,a)&&near(r.values.offset,b);
}
check('150组有限泰勒语法和固定数值对照',randomized);
const vmScope={window:{},Math};for(const file of ['university-math.js','university-dynamics.js','physics.js','university-questions.js','question-matcher.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),vmScope);
check('离线UMD全依赖顺序暴露同一十类API',vmScope.window.ZhixiangQuestions.types.length===10&&vmScope.window.ZhixiangQuestions.steps('rlc',q.analyze(example('rlc')).values).length===3);
const passed=results.filter(r=>r.passed).length;fs.writeFileSync(path.join(outputDir,'university-questions-results.json'),JSON.stringify({total:results.length,passed,failed:results.length-passed,results},null,2));
console.log(`RESULT ${passed}/${results.length}`);if(passed!==results.length)process.exitCode=1;
