/* Independent conservation laws, restitution, limiting cases and event timing. */
const fs=require('node:fs'),path=require('node:path');
global.window={};require('../physics.js');const s=window.ZhixiangPhysics,results=[];
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
const close=(a,b,tol=1e-10)=>Number.isFinite(a)&&Math.abs(a-b)<tol;
const base={mass1:1,mass2:2,u1:3,u2:-1,e:1};
let d=s.collisionSolution(base);
check('默认碰撞时刻来自表面间距与相对速度',d.collides&&d.collisionTime===1.375);
check('非等质量弹性碰撞独立解',close(d.after.v1,-7/3)&&close(d.after.v2,5/3)&&close(d.after.kinetic,5.5)&&d.energyLoss===0);
d=s.collisionSolution({...base,mass2:1});check('等质量弹性碰撞交换速度',d.after.v1===-1&&d.after.v2===3);
d=s.collisionSolution({...base,e:0});check('完全非弹性共同速度为质心速度',d.after.v1===d.after.v2&&close(d.after.v1,1/3)&&close(d.after.kinetic,1/6));
d=s.collisionSolution({...base,mass2:1,u2:-3,e:0});check('总动量为零的完全非弹性碰撞共同静止',d.after.v1===0&&d.after.v2===0&&d.after.kinetic===0&&d.energyLoss===9);
d=s.collisionSolution({...base,u1:4,u2:1,e:.5});check('同向追赶会碰撞',d.collides&&close(d.collisionTime,5.5/3));
d=s.collisionSolution({...base,u1:-1,u2:-4});check('两球都向左也可相遇',d.collides&&close(d.collisionTime,5.5/3));
for(const [u1,u2] of[[-2,1],[1,2],[2,2],[0,0],[-4,-1]]){
 const p={...base,u1,u2},r=s.collisionSolution(p),a=s.collisionState(p,100);
 check(`u₁=${u1},u₂=${u2} 不相遇且没有伪碰后数据`,!r.collides&&r.after===null&&r.collisionTime===null&&r.energyLoss===null&&a.x1===-3+100*u1&&a.x2===3+100*u2);
}
check('非法质量、恢复系数和非有限输入被拒绝',[
 {mass1:0},{mass2:-1},{e:-.1},{e:1.1},{u1:Infinity},{mass2:NaN}
].every(x=>!s.collisionSolution({...base,...x}).valid));
check('负时间与非有限时间被拒绝',!s.collisionState(base,-1).valid&&!s.collisionState(base,NaN).valid);
let seed=20260930;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
let maxP=0,maxRest=0,maxK=0,maxStateP=0,nonOverlap=true,continuous=true,finite=true;
for(let i=0;i<6000;i++){
 const a=20*rand()-10,b=20*rand()-10,p={mass1:.1+9.9*rand(),mass2:.1+9.9*rand(),u1:Math.max(a,b),u2:Math.min(a,b),e:i%3===0?0:i%3===1?1:rand()},r=s.collisionSolution(p);
 maxP=Math.max(maxP,Math.abs(r.after.momentum-r.before.momentum));
 maxRest=Math.max(maxRest,Math.abs(r.after.v2-r.after.v1-p.e*(p.u1-p.u2)));
 maxK=Math.max(maxK,Math.abs(r.before.kinetic-r.after.kinetic-r.energyLoss));
 const impulse=p.mass1*(r.after.v1-p.u1),opposite=p.mass2*(r.after.v2-p.u2);maxP=Math.max(maxP,Math.abs(impulse+opposite));
 const t=r.collisionTime,dt=1e-6,pre=s.collisionState(p,t-dt,r),at=s.collisionState(p,t,r),post=s.collisionState(p,t+rand()*20,r);
 continuous&&=close(pre.x1+pre.v1*dt,at.x1,1e-8)&&close(pre.x2+pre.v2*dt,at.x2,1e-8);
 nonOverlap&&=post.x2-post.x1>=.5-1e-8;
 maxStateP=Math.max(maxStateP,Math.abs(post.momentum-r.before.momentum));
 finite&&=Object.values(post).filter(x=>typeof x==='number').every(Number.isFinite)&&r.energyLoss>=0&&r.after.kinetic<=r.before.kinetic+1e-9;
}
check('6000 组随机碰撞总动量与相反冲量守恒',maxP<1e-10,{maxAbsoluteError:maxP});
check('6000 组随机碰撞满足恢复系数定义',maxRest<1e-11,{maxAbsoluteError:maxRest});
check('动能损失符合约化质量公式且非负',maxK<1e-9&&finite,{maxAbsoluteEnergyError:maxK});
check('碰撞时刻两球位置连续',continuous);
check('碰后两球不穿透，动量在任意时刻守恒',nonOverlap&&maxStateP<1e-10,{maxAbsoluteError:maxStateP});
const r=s.collisionSolution(base),before=s.collisionState(base,r.collisionTime-1e-8),at=s.collisionState(base,r.collisionTime),after=s.collisionState(base,r.collisionTime+1e-8);
check('接触时刻直接切换到解析碰后速度',!before.collided&&at.collided&&after.collided&&at.v1===r.after.v1&&close(at.x2-at.x1,.5));
const p0={...base,e:0},r0=s.collisionSolution(p0),a0=s.collisionState(p0,r0.collisionTime+100);
check('e=0 长时间保持接触且同速',a0.v1===a0.v2&&close(a0.x2-a0.x1,.5));
const slow={...base,u1:1.0000000001,u2:1},slowResult=s.collisionSolution(slow),slowAt=s.collisionState(slow,slowResult.collisionTime);
check('极小正相对速度仍会碰撞，不按帧步跳过事件',slowResult.collides&&slowResult.collisionTime>1e10&&slowAt.collided&&Number.isFinite(slowAt.x1));
const light={...base,mass1:.1,mass2:10},heavy={...base,mass1:10,mass2:.1};
check('质量比例 100:1 的两端均有限且守恒',[light,heavy].every(p=>{const r=s.collisionSolution(p);return close(r.before.momentum,r.after.momentum)&&close(r.before.kinetic,r.after.kinetic);}));
const losses=[0,.25,.5,.75,1].map(e=>s.collisionSolution({...base,e}).energyLoss);
check('e 增大时动能损失单调下降，e=1 为零',losses.every((v,i)=>i===0||v<losses[i-1])&&losses.at(-1)===0);
const boost=7,boosted=s.collisionSolution({...base,u1:base.u1+boost,u2:base.u2+boost,e:.4}),unboosted=s.collisionSolution({...base,e:.4});
check('伽利略变换保留碰撞时刻、相对速度和损失',close(boosted.collisionTime,unboosted.collisionTime)&&close(boosted.after.v1-unboosted.after.v1,boost)&&close(boosted.energyLoss,unboosted.energyLoss));
const out=require('./runtime.cjs').outputDir;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'collision-math-results.json'),JSON.stringify({date:new Date().toISOString(),results},null,2));
console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
