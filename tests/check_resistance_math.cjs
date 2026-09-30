/* Independent physical checks: analytical limits, drag dissipation and damping. */
const fs = require('node:fs');
const path = require('node:path');
global.window = {};
require('../physics.js');
const physics = window.ZhixiangPhysics, results = [];
function check(name, passed, details) {
  results.push({name, passed:!!passed, details});
  console.log(`${passed?'PASS':'FAIL'} ${name}`);
}
const p={v:20,angle:45,height:0,g:9.8,mass:.15,rho:1.225,cd:.47,area:.0042};
const zero=physics.projectilePath({...p,rho:0});
check('真空退化为解析抛体',Math.abs(zero.range-400/9.8)<1e-12&&Math.abs(zero.peak-100/9.8)<1e-12);
const actual=physics.projectilePath(p);
check('相同初值下阻力降低射程和最高点',actual.range<zero.range&&actual.peak<zero.peak&&actual.completed);
check('零阻力系数回到理想轨迹',Math.abs(physics.projectilePath({...p,cd:0}).range-zero.range)<1e-12);
check('地面水平发射立即结束',physics.projectilePath({...p,angle:0}).flight===0);
// Vertical quadratic drag has an exact solution, independent of the RK4 implementation.
const vertical={...p,angle:90,v:30},q=physics.dragRate(vertical),k=Math.sqrt(q*p.g);
const peak=Math.log(1+q*vertical.v**2/p.g)/(2*q);
const ascent=Math.atan(vertical.v*Math.sqrt(q/p.g))/k;
const flight=ascent+Math.acosh(Math.exp(q*peak))/k;
const vd=physics.projectilePath(vertical);
check('竖直上抛最高点符合二次阻力闭式解',Math.abs(vd.peak-peak)<1e-8,{actual:vd.peak,reference:peak});
check('竖直上抛落地时间符合闭式解',Math.abs(vd.flight-flight)<1e-8,{actual:vd.flight,reference:flight});
const fall={...p,v:0,angle:0,height:20},fd=physics.projectilePath(fall),ft=Math.acosh(Math.exp(q*fall.height))/k;
const terminal=Math.sqrt(fall.g/q),landingVelocity=-terminal*Math.tanh(k*ft);
check('从静止落下符合闭式解与终端速度',Math.abs(fd.flight-ft)<1e-8&&Math.abs(fd.points.at(-1).vy-landingVelocity)<1e-8&&Math.abs(fd.points.at(-1).vy)<terminal);
let maxGain=0,work=0,lastEnergy=null;
for(let i=0;i<actual.points.length;i++){
  const a=actual.points[i],energy=.5*p.mass*(a.vx*a.vx+a.vy*a.vy)+p.mass*p.g*a.y;
  if(lastEnergy!==null)maxGain=Math.max(maxGain,energy-lastEnergy);
  if(i){const b=actual.points[i-1],power=s=>.5*p.rho*p.cd*p.area*Math.hypot(s.vx,s.vy)**3;work+=(a.t-b.t)*(power(a)+power(b))/2;}
  lastEnergy=energy;
}
check('抛体机械能不增加',maxGain<1e-10,maxGain);
check('抛体能量损失等于阻力做功',Math.abs(.5*p.mass*p.v**2-lastEnergy-work)<1e-4);
const [ax,ay]=physics.acceleration(-6,8,p);
check('空气阻力与速度反向',ax*(-6)+(ay+p.g)*8<0&&Math.abs(ax*8-(ay+p.g)*(-6))<1e-12);
// Cartesian product of all eight endpoint controls, including the vacuum limits.
let finite=true,count=0,worstStepError=0;
for(const v of[5,40])for(const angle of[0,85])for(const height of[0,20])for(const g of[1.62,15])
for(const mass of[.05,2])for(const rho of[0,1.5])for(const cd of[0,1.2])for(const area of[.001,.02]){
  const pp={v,angle,height,g,mass,rho,cd,area},d=physics.projectilePath(pp);
  finite&&=d.completed&&d.points.every(s=>Object.values(s).every(Number.isFinite))&&d.range>=0&&d.peak>=height&&d.points.at(-1).y===0;
  if(rho&&cd){const fine=physics.projectilePath(pp,1/480);worstStepError=Math.max(worstStepError,Math.abs(d.range-fine.range),Math.abs(d.flight-fine.flight),Math.abs(d.peak-fine.peak));}
  count++;
}
check('256组抛体参数端点均有限且落地',finite,count);
check('减半步长结果收敛',worstStepError<1e-6,worstStepError);
const pend={length:1.5,g:9.8,mass:1},amplitude=.001,b=.15,decay=b/(2*pend.mass),frequency=Math.sqrt(pend.g/pend.length-decay**2);
let theta=amplitude,omega=0;
for(let i=0;i<240*8;i++)[theta,omega]=physics.pendulumStep(theta,omega,1/240,pend,b);
const reference=amplitude*Math.exp(-decay*8)*(Math.cos(frequency*8)+decay/frequency*Math.sin(frequency*8));
check('小角阻尼解符合独立解析极限',Math.abs(theta-reference)<2e-9,{actual:theta,reference});
let largestGain=0,worstBalance=0;
for(const mass of[.1,2])for(const length of[.5,3])for(const g of[1.62,15])for(const angle of[5,60])for(const damping of[0,.6]){
  const pp={mass,length,g},start=angle*Math.PI/180,energy=(a,v)=>mass*g*length*(1-Math.cos(a))+.5*mass*length**2*v**2;
  let a=start,v=0,previous=energy(a,v),heat=0;
  for(let i=0;i<240*10;i++){
    const oldPower=damping*length**2*v*v;
    [a,v]=physics.pendulumStep(a,v,1/240,pp,damping);
    const current=energy(a,v);largestGain=Math.max(largestGain,current-previous);previous=current;
    heat+=(oldPower+damping*length**2*v*v)/(2*240);
  }
  worstBalance=Math.max(worstBalance,Math.abs(energy(start,0)-previous-heat)/energy(start,0));
}
check('32组单摆边界的机械能不增加',largestGain<1e-7,largestGain);
check('单摆能量损失与阻尼做功一致',worstBalance<1e-4,worstBalance);
const out=path.resolve(__dirname,'../output/playwright');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'resistance-math-results.json'),JSON.stringify({date:new Date().toISOString(),checks:results.length,passed:results.filter(x=>x.passed).length,results},null,2));
console.log(`RESULT ${results.filter(x=>x.passed).length}/${results.length}`);
if(results.some(x=>!x.passed))process.exitCode=1;
