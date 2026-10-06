/* Geometry, thin lenses, damped/forced RK4 and frozen pre-change resistance fixtures. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
global.window={};require('../physics.js');const P=window.ZhixiangPhysics;
const c=vm.createContext({window:{},Math,console,rad:x=>x*Math.PI/180,deg:x=>x*180/Math.PI,clamp:(x,a,b)=>Math.min(b,Math.max(a,x))});vm.runInContext(fs.readFileSync(path.join(__dirname,'../geometry.js'),'utf8'),c);
// Read the same registered metadata as the browser, with inert UI hooks.
for(const name of ['renderGeometryControls','setLegacyParam','resetLegacySolver','advanceLegacyModel']) c[name]=()=>{};
for(const file of ['model-registry.js','models/solids.js','models/sections.js','models/nets.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),c);
const G=c.window.ZhixiangGeometryTools,models=vm.runInContext('ZhixiangModels.list()',c),base={...models[0].defaults},results=[];
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
const close=(a,b,e=1e-9)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<e;
let seed=318901;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const bank=G.geoProjectionBank();
for(const s of bank.samples){const d=G.geoReconstruction({restoreFront:s.id,restoreTop:s.id,restoreSide:s.id});check(s.id+' 的三个投影可匹配回样例',d.candidates.some(q=>q.id===s.id));}
for(const view of['front','top','side']){const d=G.geoOrthographic(G.solidMesh(base),view);check('正方体 '+view+' 投影为 4 条可见边，无重复虚线',d.segments.length===4&&d.segments.every(q=>!q.hidden)&&close(d.bounds.xmax-d.bounds.xmin,3)&&close(d.bounds.ymax-d.bounds.ymin,3));}
const prism=G.geoOrthographic(G.solidMesh({...base,shape:'prism'}),'front');check('三棱柱正视图含被遮挡且不重合的虚线',prism.segments.some(q=>q.hidden));
const eq=(a,b,view)=>bank.samples.find(s=>s.id===a).views[view].signature===bank.samples.find(s=>s.id===b).views[view].signature;
check('正方体与等高圆柱正视图相同',eq('cube','cylinder','front'));
check('球、圆柱、圆锥俯视圆投影相同',eq('sphere','cylinder','top')&&eq('sphere','cone','top'));
check('不相容的三视图明确无匹配',G.geoReconstruction({restoreFront:'sphere',restoreTop:'cube',restoreSide:'cone'}).candidates.length===0);
let error=0;
for(let i=0;i<500;i++){
 const p={...base,a:1+4*rnd(),height:1+4*rnd(),shape:i%2?'pyramid':'tetra',vectorFrom:'0',vectorTo:i%2?'4':'3'},m=G.solidMesh(p),v=G.geoVectorData(models[0],p);
 const expected=Math.hypot(...m.vertices[Number(p.vectorTo)].map((x,k)=>x-m.vertices[0][k]));error=Math.max(error,Math.abs(v.length-expected));
 for(const f of m.faces)for(const vertex of f.points)error=Math.max(error,Math.abs(G.V3.dot(f.normal,G.V3.sub(vertex,f.points[0]))));
}
check('500 个正棱锥：向量模与面法向量来自空间坐标',error<1e-9,{maxError:error});
let d=G.geoAngleData(models[0],{...base,angleKind:'line-line',edge1:'0:1',edge2:'0:4'});check('正方体垂直棱为 90°',close(d.angle,90));
d=G.geoAngleData(models[0],{...base,angleKind:'line-line',edge1:'0:1',edge2:'4:5'});check('平行棱所在直线为 0°',close(d.angle,0));
d=G.geoAngleData(models[0],{...base,angleKind:'line-plane',edge1:'0:4',face1:'0'});check('垂直底面的棱线面角 90°',close(d.angle,90));
d=G.geoAngleData(models[0],{...base,angleKind:'line-plane',edge1:'0:1',face1:'0'});check('棱在平面内，线面角为 0°',close(d.angle,0));
d=G.geoAngleData(models[0],{...base,angleKind:'dihedral',face1:'0',face2:'2'});check('正方体相邻面内二面角 90°',d.adjacent&&close(d.angle,90));
d=G.geoAngleData(models[0],{...base,angleKind:'dihedral',face1:'0',face2:'1'});check('相对面不定义内二面角，平面锐夹角为 0°',!d.adjacent&&d.angle===null&&close(d.acute,0));
d=G.geoAngleData(models[0],{...base,shape:'tetra',height:base.a*Math.sqrt(2/3),angleKind:'dihedral',face1:'0',face2:'1'});check('正四面体内二面角 acos(1/3)，不是外法线夹角',d.adjacent&&close(d.angle,Math.acos(1/3)*180/Math.PI));
d=G.geoAngleData(models[0],{...base,shape:'pyramid',height:3,angleKind:'dihedral',face1:'1',face2:'2'});check('正四棱锥侧面内二面角可为钝角',d.adjacent&&d.angle>90&&close(d.angle+d.acute,180));
const sp={...models[1].defaults,angleKind:'line-plane',edge1:'0:4',face1:'cut'},cut=G.geoAngleData(models[1],sp);check('截平面线面角符合独立法向公式',close(cut.angle,Math.asin(Math.cos(sp.tilt*Math.PI/180))*180/Math.PI));
const oldAngle=cut.angle;sp.yaw=175;sp.pitch=-82;sp.scale=1.8;check('视角和缩放不改变空间角',G.geoAngleData(models[1],sp).angle===oldAngle);
const zero=G.geoVectorData(models[0],{...base,vectorFrom:'0',vectorTo:'0'});check('零向量模为 0',zero.length===0&&zero.vector.every(v=>v===0));
const normalized=G.normalizeGeometryParams(models[0],{...base,shape:'tetra',edge1:'0:7',face1:'5',vectorTo:'7'});check('切换几何体时移除无效选择',normalized.edge1!=='0:7'&&normalized.face1!=='5'&&normalized.vectorTo!=='7');
const degenerate=G.normalizeGeometryParams(models[1],{...models[1].defaults,offset:100,face1:'cut',vectorTo:'cut5'});check('截面退化时不存在的面与点使用默认值',degenerate.face1!=='cut'&&degenerate.vectorTo!=='cut5');
const lens={kind:'convex',focal:10,objectDistance:30,objectHeight:3};error=0;let rayError=0;
for(let i=0;i<1500;i++){
 const p={...lens,kind:rnd()<.5?'convex':'concave',focal:1+19*rnd(),objectDistance:.5+59.5*rnd(),objectHeight:.5+4.5*rnd()},q=P.lensData(p);
 error=Math.max(error,Math.abs(1/q.u+1/q.v-1/q.f),Math.abs(q.magnification+q.v/q.u));
 for(const r of P.lensRays(p))rayError=Math.max(rayError,Math.abs(r.height+r.slope*q.v-q.imageHeight));
}
check('1500 个薄透镜随机参数：透镜方程与放大率恒等',error<1e-9,{maxError:error});check('三条特殊光线或延长线均经过同一像点',rayError<1e-9,{maxError:rayError});
for(const [u,v,M] of[[30,15,-.5],[20,20,-1],[15,30,-2],[6,-15,2.5]]){const d=P.lensData({...lens,objectDistance:u});check(`凸透镜 u=${u}：像距、放大率、虚实正倒`,d.v===v&&d.magnification===M&&d.real===(v>0)&&d.upright===(M>0));}
const concave=P.lensData({...lens,kind:'concave'});check('凹透镜实物成正立缩小虚像',concave.v<0&&concave.magnification>0&&concave.magnification<1);
const focus=P.lensData({...lens,objectDistance:10}),rays=P.lensRays({...lens,objectDistance:10});check('焦点边界不返回 Infinity/NaN，出射光平行',focus.atFocus&&focus.v===null&&focus.magnification===null&&rays.length===2&&rays[0].slope===rays[1].slope);
for(const key of['objectDistance','objectHeight','focal'])check(key+' 必须为正',!P.lensData({...lens,[key]:0}).valid&&!P.lensData({...lens,[key]:-1}).valid);
const near=P.lensData({...lens,objectDistance:10+1e-8});check('近焦点但不等于焦点仍给有限带符号结果',!near.atFocus&&Number.isFinite(near.v)&&near.v>1e9);
const spring={mass:1,stiff:20,amp:.6,springMode:'under',zeta:.2,driveFreq:.7,driveForce:1};
const analytic=(p,t)=>{const w=Math.sqrt(p.stiff/p.mass),z=p.springMode==='critical'?1:p.zeta;if(z<1){const a=z*w,wd=w*Math.sqrt(1-z*z),C=p.amp,D=a*C/wd;return {x:Math.exp(-a*t)*(C*Math.cos(wd*t)+D*Math.sin(wd*t)),v:Math.exp(-a*t)*(-a*(C*Math.cos(wd*t)+D*Math.sin(wd*t))-C*wd*Math.sin(wd*t)+D*wd*Math.cos(wd*t))};}if(z===1)return{x:p.amp*(1+w*t)*Math.exp(-w*t),v:-p.amp*w*w*t*Math.exp(-w*t)};const r1=-w*(z-Math.sqrt(z*z-1)),r2=-w*(z+Math.sqrt(z*z-1)),C=-p.amp*r2/(r1-r2),D=p.amp*r1/(r1-r2);return {x:C*Math.exp(r1*t)+D*Math.exp(r2*t),v:C*r1*Math.exp(r1*t)+D*r2*Math.exp(r2*t)};};
for(const [mode,zeta] of[['under',.2],['under',.99],['critical',1],['over',1.01],['over',3]]){
 const p={...spring,springMode:mode,zeta};let q=P.oscillatorInitial(p),err=0,enerr=0,prev=P.oscillatorReadings(p,q).total,bound=true,positive=true;
 for(let i=0;i<2400;i++){q=P.oscillatorAdvance(p,q,1/240);const a=analytic(p,q.time),en=P.oscillatorReadings(p,q).total;err=Math.max(err,Math.abs(q.x-a.x),Math.abs(q.v-a.v));enerr=Math.max(enerr,en-prev);prev=en;bound&&=Math.abs(q.x)<=P.oscillatorEnvelope(p,q.time)+1e-7;positive&&=q.x>=-1e-10;}
 check(`${mode} ζ=${zeta} RK4 对照独立解析解`,err<2e-6,{maxError:err});check(`${mode} ζ=${zeta} 自由能量不增加，解位于衰减边界内`,enerr<1e-9&&bound&&(zeta<1||positive),{maxEnergyIncrease:enerr});
}
const fast={...spring,mass:.2,stiff:80,zeta:.05};const coarse=P.oscillatorAdvance(fast,P.oscillatorInitial(fast),3),fine=P.oscillatorAdvance(fast,P.oscillatorInitial(fast),3,1/480),truth=analytic(fast,3),ec=Math.hypot(coarse.x-truth.x,coarse.v-truth.v),ef=Math.hypot(fine.x-truth.x,fine.v-truth.v);
check('高频振子减半步长收敛',ef<ec/8,{coarseError:ec,fineError:ef});check('外部给大步长仍拆分至≤1/240 s',JSON.stringify(P.oscillatorAdvance(spring,P.oscillatorInitial(spring),.4,1))===JSON.stringify(P.oscillatorAdvance(spring,P.oscillatorInitial(spring),.4,1/240)));
let q=P.oscillatorInitial({...spring,springMode:'forced'}),p={...spring,springMode:'forced'};for(let i=0;i<7200;i++)q=P.oscillatorAdvance(p,q,1/240);let steadyErr=0;const resp=P.oscillatorResponse(p);for(let i=0;i<2400;i++){q=P.oscillatorAdvance(p,q,1/240);steadyErr=Math.max(steadyErr,Math.abs(q.x-resp.amplitude*Math.cos(2*Math.PI*p.driveFreq*q.time-resp.phase)));}
check('受迫 RK4 在瞬态衰减后符合独立稳态振幅和相位',steadyErr<1e-7,{maxError:steadyErr});
const f0=Math.sqrt(p.stiff/p.mass)/(2*Math.PI),peak=f0*Math.sqrt(1-2*p.zeta*p.zeta);check('有阻尼位移共振峰低于固有频率',P.oscillatorResponse(p,peak).amplitude>P.oscillatorResponse(p,f0).amplitude);
check('临界及过阻尼响应峰值在零频',P.oscillatorResponse({...p,zeta:1},0).amplitude>P.oscillatorResponse({...p,zeta:1},f0).amplitude);
check('零阻尼精确共振无有限稳态',P.oscillatorResponse({...p,zeta:0,driveFreq:f0}).resonant&&P.oscillatorResponse({...p,zeta:0,driveFreq:f0}).amplitude===null);
check('零驱动力在无阻尼共振位置响应为零',P.oscillatorResponse({...p,zeta:0,driveFreq:f0,driveForce:0}).amplitude===0);
const noDamp={...p,zeta:0,driveFreq:f0,amp:0},t=10,qs=P.oscillatorAdvance(noDamp,P.oscillatorInitial(noDamp),t);check('零阻尼受迫共振的振幅随时间增长符合解析特解',close(qs.x,noDamp.driveForce*t/(2*noDamp.mass*2*Math.PI*f0)*Math.sin(2*Math.PI*f0*t),2e-6));
const read=P.oscillatorReadings(p,{time:.4,x:.2,v:-.7});check('能量变化率为驱动力做功减阻尼耗散',close(read.energyRate,read.drive*(-.7)-read.b*.7**2));
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/resistance-display-baseline.json')));
for(const [name,hash] of Object.entries(baseline.hashes))check('原阻力函数 '+name+' 源码哈希未改变',crypto.createHash('sha256').update(P[name].toString()).digest('hex')===hash);
for(const [i,f] of baseline.trajectories.entries()){const d=P.projectilePath(f.p);check('抛体基准 '+i+' 射程、飞行时间、高度及轨迹点逐位相同',d.flight===f.flight&&d.range===f.range&&d.peak===f.peak&&f.points.every(pt=>JSON.stringify(P.samplePath(d,pt.t))===JSON.stringify(pt)));}
for(const [i,f] of baseline.pendulums.entries()){let theta=f.p.angle*Math.PI/180,omega=0,idealTheta=theta,idealOmega=0,ok=true;for(let n=0;n<2400;n++){[theta,omega]=P.pendulumStep(theta,omega,1/240,f.p,f.p.damping);[idealTheta,idealOmega]=P.pendulumStep(idealTheta,idealOmega,1/240,f.p,0);const pt=f.samples.find(q=>Math.round(q.time*240)===n+1);if(pt)ok&&=theta===pt.theta&&omega===pt.omega&&idealTheta===pt.idealTheta&&idealOmega===pt.idealOmega;}check('单摆基准 '+i+' 有阻尼与理想状态逐位相同',ok);}
const out=require('./runtime.cjs').outputDir;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'extensions-math-results.json'),JSON.stringify({date:new Date().toISOString(),passed:results.filter(q=>q.passed).length,total:results.length,results},null,2));if(results.some(q=>!q.passed))process.exitCode=1;
