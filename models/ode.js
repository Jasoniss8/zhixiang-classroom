"use strict";
function uniOdeTrace(ctx, plot, points, key, color, dash = []) {
  plot.clip();ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=key==="exact"?2.5:1.7;ctx.setLineDash(dash);
  points.forEach((q,i)=>{const x=plot.x(q.t),y=plot.y(q[key]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  ctx.stroke();ctx.setLineDash([]);plot.end();
}
function uniOdeRange(p, solved) {
  const values=solved.points.flatMap(q=>[q.exact,q.euler,q.rk4]),lo=Math.min(-1,...values),hi=Math.max(2,...values),gap=(hi-lo)*.12;
  return {xmin:p.t0-.2*p.span,xmax:p.t0+p.span,ymin:lo-gap,ymax:hi+gap};
}
function drawUniversityODE(ctx,w,h,p,comparison) {
  const D=window.ZhixiangUniversityDynamics,d=D.odeSolve(p);
  if(!d.valid){text(ctx,d.message,20,40,12,PALETTE.orange);stageInfo={kind:"university"};return;}
  const mainH=Math.round(h*.67),bounds=uniOdeRange(p,d),plot=makePlot(ctx,w,mainH,{...bounds,equal:false,left:46,top:50,bottom:30,xLabel:"x / 1",yLabel:"y / 1"});
  text(ctx,"绿色：解析解　紫色：RK4　蓝灰：欧拉法",plot.left,19,11,PALETTE.deep);
  // Field slope is evaluated in mathematical coordinates, then mapped to the plot.
  plot.clip();
  for(let ix=0;ix<=19;ix++)for(let iy=0;iy<=11;iy++){
    const t=bounds.xmin+(bounds.xmax-bounds.xmin)*ix/19,y=bounds.ymin+(bounds.ymax-bounds.ymin)*iy/11;
    if(p.kind==="logistic"&&(y<0||y>p.K))continue;
    const slope=D.odeRHS(p,t,y),vx=plot.x(t+1)-plot.x(t),vy=plot.y(y+slope)-plot.y(y),norm=Math.hypot(vx,vy),len=6;
    if(norm>0)line(ctx,plot.x(t)-len*vx/norm,plot.y(y)-len*vy/norm,plot.x(t)+len*vx/norm,plot.y(y)+len*vy/norm,"#bdc9c1",1);
  }
  plot.end();
  if(comparison){const q=D.odeSolve(comparison);if(q.valid)uniOdeTrace(ctx,plot,q.points,"rk4",PALETTE.orange,[5,4]);}
  const exact=Array.from({length:501},(_,i)=>{const t=p.t0+p.span*i/500;return {t,exact:D.odeExact(p,t)};});
  uniOdeTrace(ctx,plot,exact,"exact",PALETTE.green);
  uniOdeTrace(ctx,plot,d.points,"euler","#68899b",[5,4]);
  uniOdeTrace(ctx,plot,d.points,"rk4",PALETTE.purple,[2,3]);
  plot.clip();circle(ctx,plot.x(p.t0),plot.y(p.y0),6,PALETTE.orange,"#fff",1.5);plot.end();
  ctx.save();ctx.translate(0,mainH);
  const errorPoints=d.points.map(q=>({t:q.t,euler:Math.abs(q.euler-q.exact),rk4:Math.abs(q.rk4-q.exact)})),errMax=Math.max(1e-10,d.maxEulerError,d.maxRK4Error),ep=makePlot(ctx,w,h-mainH,{xmin:p.t0,xmax:p.t0+p.span,ymin:0,ymax:errMax*1.15,equal:false,left:46,top:32,bottom:28,xLabel:"x / 1",yLabel:"绝对误差"});
  text(ctx,"各计算节点的误差（对照解析解）",ep.left,12,11,PALETTE.deep);
  uniOdeTrace(ctx,ep,errorPoints,"euler","#68899b");uniOdeTrace(ctx,ep,errorPoints,"rk4",PALETTE.purple);ctx.restore();
  stageInfo={kind:"university",plot,uniDrag:pt=>{
    if(pt.phase==="start"&&Math.hypot(pt.x-plot.x(p.t0),pt.y-plot.y(p.y0))>28)return false;
    if(pt.phase!=="end"){uniSetParam("t0",clamp(plot.ix(pt.x),-2,2));uniSetParam("y0",clamp(plot.iy(pt.y),p.kind==="logistic"?0:-3,p.kind==="logistic"?p.K:5));}return true;
  },uniKey:key=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(key))return false;const horizontal=key==="ArrowLeft"||key==="ArrowRight";uniSetParam(horizontal?"t0":"y0",state.p[horizontal?"t0":"y0"]+(["ArrowRight","ArrowUp"].includes(key)?.05:-.05));return true;}};
}
function universityODEExport(){
  const D=window.ZhixiangUniversityDynamics,p=state.p,d=D.odeSolve(p),q=state.compare&&D.odeSolve(state.compare);
  if(!d.valid)return [];
  const columns=[exportColumn("t"),exportColumn("exact"),exportColumn("euler"),exportColumn("rk4"),exportColumn("euler_abs_error"),exportColumn("rk4_abs_error")],series=[exportSeries("解析解",0,1),exportSeries("欧拉法",0,2,3),exportSeries("RK4",0,3,2)];
  const interpolate=(points,t,key)=>{if(t<points[0].t||t>points.at(-1).t)return NaN;let lo=0,hi=points.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(points[m].t<=t)lo=m;else hi=m;}const a=points[lo],b=points[hi];return a[key]+(b[key]-a[key])*(t-a.t)/(b.t-a.t);};
  if(q?.valid){columns.push(exportColumn("comparison_rk4"));series.push(exportSeries("保留 RK4",0,6,1));}
  return [{name:"一阶ODE解与误差",columns,series,rows:d.points.map(v=>[v.t,v.exact,v.euler,v.rk4,Math.abs(v.euler-v.exact),Math.abs(v.rk4-v.exact),...(q?.valid?[interpolate(q.points,v.t,"rk4")]:[])]),bounds:uniOdeRange(p,d),xLabel:"x / 1",yLabel:"y / 1",note:"每行是当前数值方法的实际计算节点，末步缩短以准确到达终点；保留曲线按其 RK4 节点线性插值，区间外留空。"},
    {name:"一阶ODE误差",columns:[exportColumn("t"),exportColumn("euler_abs_error"),exportColumn("rk4_abs_error"),...(q?.valid?[exportColumn("euler_error_comparison"),exportColumn("rk4_error_comparison")]:[])],rows:d.points.map(v=>{const other=q?.valid?q.points.map(qv=>({...qv,eulerError:Math.abs(qv.euler-qv.exact),rk4Error:Math.abs(qv.rk4-qv.exact)})):null;return[v.t,Math.abs(v.euler-v.exact),Math.abs(v.rk4-v.exact),...(other?[interpolate(other,v.t,"eulerError"),interpolate(other,v.t,"rk4Error")]:[])];}),series:[exportSeries("欧拉法绝对误差",0,1,3),exportSeries("RK4绝对误差",0,2,2),...(q?.valid?[exportSeries("保留Euler误差",0,3,1),exportSeries("保留RK4误差",0,4,4)]:[])],xLabel:"x / 1",yLabel:"绝对误差 / 1",note:"相对于解析解，未裁切数值。"}];
}
ZhixiangModels.register({
  id:"ode",cat:"math",level:"大学",title:"一阶微分方程与方向场",desc:"拖动初值，比较方向场、欧拉法、RK4 与解析解。",tags:"微分方程 ODE 方向场 初值 欧拉 RK4 Logistic 线性 大学",university:true,keepNumericPrecision:true,time:false,compare:true,
  defaults:{kind:"linear",a:1,b:-1,c:0,r:1,K:2,t0:0,y0:1,h:.1,span:4},choices:{kind:["linear","logistic"]},choiceLabels:{kind:{linear:"线性：y′ = ax + by + c",logistic:"Logistic：y′ = ry(1−y/K)"}},
  controls:[["a","a","自变量系数",-2,2,.1,"1"],["b","b","y 系数",-2,2,.1,"1"],["c","c","常数项",-2,2,.1,"1"],["r","r","增长率",.1,2,.1,"1"],["K","K","容量",.5,5,.1,"1"],["t0","x₀","初始自变量",-2,2,.05,"1"],["y0","y₀","初值",-3,5,.05,"1"],["h","h","数值步长",.02,.5,.01,"1"],["span","Δt","正向区间长度",.5,6,.1,"1"]],
  controlVisible:(key,p)=>!["a","b","c","r","K"].includes(key)||(["a","b","c"].includes(key)?p.kind==="linear":p.kind==="logistic"),
  presets:[["y′=x−y",{kind:"linear",a:1,b:-1,c:0,r:1,K:2,t0:0,y0:1,h:.1,span:4}],["指数增长 y′=y",{kind:"linear",a:0,b:1,c:0,r:1,K:2,t0:0,y0:1,h:.2,span:3}],["Logistic 增长",{kind:"logistic",a:1,b:-1,c:0,r:1,K:2,t0:0,y0:.25,h:.2,span:6}]],
  presetDescriptions:["求 y′=x−y、y(0)=1 在 [0,4] 的数值解，比较 h=0.1 的 Euler 与 RK4 误差。", "求 y′=y、y(0)=1 在 [0,3] 的数值解，用 eˣ 检验 h=0.2 的误差。", "给定 r=1、K=2、y(0)=0.25，观察到 x=6 时的 Logistic 增长及数值误差。"],
  validate:p=>window.ZhixiangUniversityDynamics.odeValidate(p),notice:p=>{const d=window.ZhixiangUniversityDynamics.odeValidate(p);return d.valid?(p.kind==="logistic"?"0≤y₀≤K；0 和 K 是平衡解。":"固定线性模板，系数与自变量均为无量纲；只向初值右侧求解。"):d.message;},
  hint:"拖动橙色初值点；方向键改变初值。减小 h 比较两种数值方法的误差。",
  note:"只支持 y′=ax+by+c 与 y′=ry(1−y/K)，不解析任意表达式。x、y、系数均无量纲。欧拉法 yₙ₊₁=yₙ+h·f(xₙ,yₙ)；经典四阶 RK4 在同一节点计算。误差以解析解为基准，所有方法使用同一初值；仅正向积分，末步必要时缩短。Logistic 限制 r>0、K>0、0≤y₀≤K；线性模板允许增长解，图轴自动缩放，数值本身不截断。图中连接数值节点的线段不是额外积分。",
  question:"沿同一方向场，从不同初值出发会得到同一条解曲线吗？减半 h 有何影响？",answer:"初值决定经过哪个点的解曲线。在本模型的光滑右端条件下，每个初值局部唯一。通常欧拉法的全局误差约随 h 成正比，RK4 约随 h⁴ 缩小；当误差接近浮点舍入极限时，这种比例不再明显。",
  references:[["OpenStax Calculus：Direction Fields and Numerical Methods","https://openstax.org/books/calculus-volume-2/pages/4-2-direction-fields-and-numerical-methods"]],
  draw:drawUniversityODE,exportData:universityODEExport,readout:p=>{const d=window.ZhixiangUniversityDynamics.odeSolve(p),n=v=>String(Number(v.toPrecision(6)));return d.valid?{formula:p.kind==="linear"?`y′ = ${p.a}x + (${p.b})y + (${p.c})`:`y′ = ${p.r}y(1 − y/${p.K})`,caption:`y(${p.t0})=${p.y0}；末节点 x=${p.t0+p.span}`,metrics:[["计算步数",String(d.points.length-1),"步"],["欧拉最大误差",n(d.maxEulerError),"1"],["RK4 最大误差",n(d.maxRK4Error),"1"],["终点解析值",n(d.points.at(-1).exact),"1"],["终点欧拉值",n(d.points.at(-1).euler),"1"],["终点 RK4 值",n(d.points.at(-1).rk4),"1"],["终点欧拉误差",n(Math.abs(d.points.at(-1).euler-d.points.at(-1).exact)),"1"],["终点 RK4 误差",n(Math.abs(d.points.at(-1).rk4-d.points.at(-1).exact)),"1"]]}:{formula:"初值条件无效",caption:d.message,metrics:[]};},
  renderControls:uniRenderControls,setParam:uniSetParam,bind:uniBindStage,reset:()=>{},parsePrecision:()=>12,
  thumbnail:canvas=>{const {ctx,w,h}=setupCanvas(canvas),plot=makePlot(ctx,w,h,{xmin:0,xmax:4,ymin:0,ymax:3.5,equal:false,labels:false,left:14,right:14,top:14,bottom:14});for(let t=0;t<=4;t+=.4)for(let y=0;y<=3;y+=.5){const slope=t-y;line(ctx,plot.x(t-.06),plot.y(y-.06*slope),plot.x(t+.06),plot.y(y+.06*slope),"#b7c7ba");}plotCurve(ctx,plot,t=>t-1+2*Math.exp(-t),PALETTE.green,2);}
});
