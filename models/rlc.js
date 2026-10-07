"use strict";
const uniRLCCurveCache=new Map();
function uniRLCSamples(p) {
  const cacheKey=JSON.stringify(p);if(uniRLCCurveCache.has(cacheKey))return uniRLCCurveCache.get(cacheKey);
  const P=window.ZhixiangPhysics,d=P.rlcParameters(p),duration=P.rlcDuration(p);
  if(!d.valid)return [];
  const times=Array.from({length:1001},(_,i)=>duration*i/1000);
  // In overdamped circuits the two decay scales can differ greatly. Include
  // early samples on the fast scale instead of hiding the initial transient.
  if(p.mode==="free"&&d.alpha>0){const early=Math.min(duration,10/(d.alpha+Math.sqrt(Math.abs(d.delta))));for(let i=0;i<=200;i++)times.push(early*i/200);}
  const result=[...new Set(times)].sort((a,b)=>a-b).map(t=>P.rlcState(p,t));
  if(uniRLCCurveCache.size>=4)uniRLCCurveCache.delete(uniRLCCurveCache.keys().next().value);uniRLCCurveCache.set(cacheKey,result);return result;
}
function uniRLCTrace(ctx,plot,points,key,color,dash=[]){
  plot.clip();ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash);let active=false;
  for(const q of points){if(!q.valid||!Number.isFinite(q[key])){active=false;continue;}const x=plot.x(q.time),y=plot.y(q[key]);active?ctx.lineTo(x,y):ctx.moveTo(x,y);active=true;}
  ctx.stroke();ctx.setLineDash([]);plot.end();
}
function uniRLCCircuit(ctx,w,p,d){
  const x0=25,x1=w-125,y=37,span=(x1-x0)/3;
  line(ctx,x0,y,x1,y,PALETTE.axis,1.4);line(ctx,x0,y,x0,70,PALETTE.axis,1.4);line(ctx,x1,y,x1,70,PALETTE.axis,1.4);line(ctx,x0,70,x1,70,PALETTE.axis,1.4);
  for(const [i,label] of [[0,"R"],[1,"L"],[2,"C"]]){const x=x0+span*(i+.5);ctx.fillStyle="#f8faf6";ctx.fillRect(x-13,y-7,26,14);ctx.strokeStyle=PALETTE.green;
    if(i===2){line(ctx,x-4,y-9,x-4,y+9,PALETTE.green,2);line(ctx,x+4,y-9,x+4,y+9,PALETTE.green,2);}else{ctx.strokeRect(x-13,y-7,26,14);}text(ctx,label,x,17,12,PALETTE.deep,"center");}
  text(ctx,p.mode==="steady"?"正弦电源：峰值 Vm":"自由响应：无外加电源",x0,88,10,PALETTE.muted);
  const cx=w-57,cy=46;
  if(p.mode==="steady"){const r=window.ZhixiangPhysics.rlcResponse(p);if(r.valid){arrow(ctx,cx,cy,cx+33,cy,PALETTE.orange,1.5,4);arrow(ctx,cx,cy,cx+30*Math.cos(r.phase),cy+30*Math.sin(r.phase),PALETTE.green,1.5,4);text(ctx,"电压 / 电流相位",cx,87,9,PALETTE.muted,"center");}}
  else text(ctx,{under:"欠阻尼",critical:"临界阻尼",over:"过阻尼"}[d.regime],cx,46,12,PALETTE.deep,"center");
}
function drawUniversityRLC(ctx,w,h,p,comparison){
  const P=window.ZhixiangPhysics,d=P.rlcParameters(p),current=P.rlcState(p,state.time);
  if(!d.valid||!current.valid){text(ctx,d.message||current.message,20,40,12,PALETTE.orange);stageInfo={kind:"university"};return;}
  uniRLCCircuit(ctx,w,p,d);
  const samples=uniRLCSamples(p),qSamples=comparison?uniRLCSamples(comparison):[],top=100,totalH=h-top,waveH=totalH*.60,stacked=w<520,paneW=stacked?w:w/2,paneH=stacked?waveH/2:waveH,duration=P.rlcDuration(p),plots=[];
  for(const [i,key,title,unit] of [[0,"current","电流 i(t)","A"],[1,"voltageC","电容电压 Uc(t)","V"]]){
    const dx=stacked?0:i*paneW,dy=top+(stacked?i*paneH:0);ctx.save();ctx.translate(dx,dy);
    const values=[...samples,...qSamples].filter(x=>x.valid).map(x=>Math.abs(x[key])),extent=Math.max(key==="current"?.001:.1,...values)*1.14;
    const plot=makePlot(ctx,paneW,paneH,{xmin:0,xmax:duration*1000,ymin:-extent,ymax:extent,equal:false,left:43,right:20,top:29,bottom:25,xLabel:"t / ms",yLabel:unit});
    const mapped=samples.map(x=>({...x,time:x.time*1000})),mappedQ=qSamples.map(x=>({...x,time:x.time*1000}));
    text(ctx,title,plot.left,11,11,PALETTE.deep);if(comparison)uniRLCTrace(ctx,plot,mappedQ,key,PALETTE.orange,[5,4]);uniRLCTrace(ctx,plot,mapped,key,PALETTE.green);
    plot.clip();line(ctx,plot.x(state.time*1000),plot.top,plot.x(state.time*1000),paneH-plot.bottom,PALETTE.orange,1,[3,3]);circle(ctx,plot.x(state.time*1000),plot.y(current[key]),4,PALETTE.orange);plot.end();plots.push({plot,dx,dy});ctx.restore();
  }
  ctx.save();ctx.translate(0,top+waveH);
  const bottomH=totalH-waveH;
  if(p.mode==="steady"){
    const fmax=Math.min(2000,Math.max(2*d.f0,p.frequency*1.15)),response=P.rlcResponse(p,d.f0),upper=Math.max(.001,response.currentAmplitude)*1.1,
      plot=makePlot(ctx,w,bottomH,{xmin:0,xmax:fmax,ymin:0,ymax:upper,equal:false,left:43,top:32,bottom:25,xLabel:"f / Hz",yLabel:"Iₘ / A"});
    text(ctx,"稳态电流共振：峰值位于 f₀",plot.left,12,11,PALETTE.deep);
    // Always include resonance and the current drive frequency, even for a narrow peak.
    const fs=[...new Set([...Array.from({length:1001},(_,i)=>Math.max(.001,fmax*i/1000)),d.f0,p.frequency])].filter(f=>f<=fmax).sort((a,b)=>a-b);
    const pts=fs.map(f=>({valid:true,time:f,current:P.rlcResponse(p,f).currentAmplitude}));uniRLCTrace(ctx,plot,pts,"current",PALETTE.green);
    if(comparison){const cp=fs.map(f=>{const r=P.rlcResponse(comparison,f);return{valid:r.valid,time:f,current:r.currentAmplitude};});uniRLCTrace(ctx,plot,cp,"current",PALETTE.orange,[5,4]);}
    plot.clip();line(ctx,plot.x(d.f0),plot.top,plot.x(d.f0),bottomH-plot.bottom,PALETTE.purple,1,[3,3]);circle(ctx,plot.x(p.frequency),plot.y(P.rlcResponse(p).currentAmplitude),4,PALETTE.orange);plot.end();
  }else{
    const maxE=Math.max(1e-9,...samples.map(x=>x.energy),...qSamples.filter(x=>x.valid).map(x=>x.energy)),plot=makePlot(ctx,w,bottomH,{xmin:0,xmax:duration*1000,ymin:0,ymax:maxE*1.12,equal:false,left:43,top:32,bottom:25,xLabel:"t / ms",yLabel:"E / J"});
    text(ctx,"电场能 + 磁场能；dE/dt = −Ri²",plot.left,12,11,PALETTE.deep);uniRLCTrace(ctx,plot,samples.map(x=>({...x,time:x.time*1000})),"energy",PALETTE.purple);if(comparison)uniRLCTrace(ctx,plot,qSamples.map(x=>({...x,time:x.time*1000})),"energy",PALETTE.orange,[5,4]);
    plot.clip();line(ctx,plot.x(state.time*1000),plot.top,plot.x(state.time*1000),bottomH-plot.bottom,PALETTE.orange,1,[3,3]);circle(ctx,plot.x(state.time*1000),plot.y(current.energy),4,PALETTE.orange);plot.end();
  }
  ctx.restore();
  stageInfo={kind:"university",uniDrag:pt=>{const pane=plots.find(x=>pt.x>=x.dx&&pt.x<x.dx+paneW&&pt.y>=x.dy&&pt.y<x.dy+paneH);if(!pane)return false;if(pt.phase!=="end"){stopAnimation();state.time=clamp(pane.plot.ix(pt.x-pane.dx)/1000,0,duration);renderReadout();updatePlayback();requestDraw();}return true;},uniKey:key=>{if(!["ArrowLeft","ArrowRight"].includes(key))return false;stopAnimation();state.time=clamp(state.time+(key==="ArrowRight"?1:-1)*duration/100,0,duration);renderReadout();updatePlayback();requestDraw();return true;}};
}
function universityRLCExport(){
  const P=window.ZhixiangPhysics,p=state.p,q=state.compare,d=P.rlcParameters(p),samples=uniRLCSamples(p);if(!d.valid)return [];
  const fields=[["q","C"],["current","A"],["voltageC","V"],["voltageL","V"],["voltageR","V"],["sourceVoltage","V"],["energy","J"],["energyRate","W"],["energyC","J"],["energyL","J"],["dissipated","J"]],columns=[exportColumn("t","s"),...fields.map(([k,u])=>exportColumn(k,u))],series=[exportSeries("电流",0,2,0)];
  if(q){columns.push(...fields.map(([k,u])=>exportColumn(`${k}_comparison`,u)));series.push(exportSeries("保留电流",0,2+fields.length,1));}
  const rows=samples.map(v=>{const other=q&&P.rlcState(q,v.time);return [v.time,...fields.map(([key])=>v[key]),...(q?fields.map(([key])=>other.valid?other[key]:NaN):[])];}),common={columns,rows,xLabel:"t / s",note:"固定串联 RLC；内部 SI 单位。自由响应或已建立的正弦稳态，不包含接通暂态。对照曲线使用相同物理时间。"};
  const result=[{name:"RLC电流",...common,series,yLabel:"i / A"},{name:"RLC电容电压",...common,series:[exportSeries("电容电压",0,3),...(q?[exportSeries("保留电容电压",0,3+fields.length,1)]:[])],yLabel:"Uc / V"},{name:"RLC能量",...common,series:[exportSeries("储能",0,7,2),...(q?[exportSeries("保留储能",0,7+fields.length,1)]:[])],yLabel:"E / J"}];
  if(p.mode==="steady"){
    const fmax=Math.min(2000,Math.max(2*d.f0,p.frequency*1.15)),fs=[...new Set([...samplesBetween(1,fmax,1000),d.f0,p.frequency])].sort((a,b)=>a-b),cols=[exportColumn("frequency","Hz"),exportColumn("current_amplitude","A"),exportColumn("charge_amplitude","C"),exportColumn("phase","rad")];
    if(q)cols.push(exportColumn("current_amplitude_comparison","A"),exportColumn("phase_comparison","rad"));
    result.push({name:"RLC稳态频响",columns:cols,rows:fs.map(f=>{const v=P.rlcResponse(p,f),other=q&&P.rlcResponse(q,f);return[f,v.currentAmplitude,v.chargeAmplitude,v.phase,...(q?[other.valid?other.currentAmplitude:NaN,other.valid?other.phase:NaN]:[])];}),series:[exportSeries("电流振幅",0,1),...(q?[exportSeries("保留电流振幅",0,4,1)]:[])],xLabel:"f / Hz",yLabel:"Iₘ / A",note:"电流振幅峰在 f₀；电荷/电容电压峰可低于 f₀。phase>0 表示电流滞后电源电压。"});
  }
  return result;
}
ZhixiangModels.register({
  id:"rlc",cat:"physics",level:"大学",title:"串联RLC电路与共振",desc:"比较自由响应、正弦稳态、电流共振和电路储能。",tags:"RLC 电路 串联 电阻 电感 电容 共振 阻尼 相位 大学",university:true,keepNumericPrecision:true,time:true,compare:true,
  defaults:{mode:"free",resistance:20,inductance:100,capacitance:100,voltage0:5,current0:0,driveVoltage:5,frequency:50.32921210448704},choices:{mode:["free","steady"]},choiceLabels:{mode:{free:"自由响应（无外加电源）",steady:"正弦稳态（不含接通暂态）"}},
  controls:[["resistance","R","电阻",0,500,1,"Ω"],["inductance","L","电感",10,1000,1,"mH"],["capacitance","C","电容",1,1000,1,"μF"],["voltage0","Uc₀","初始电容电压",-100,100,.1,"V"],["current0","i₀","初始电流",-10,10,.01,"A"],["driveVoltage","Vₘ","电源电压峰值",0,400,.1,"V"],["frequency","f","驱动频率",1,2000,1,"Hz"]],
  controlVisible:(key,p)=>!["voltage0","current0","driveVoltage","frequency"].includes(key)||(["voltage0","current0"].includes(key)?p.mode==="free":p.mode==="steady"),
  presets:[["电容放电：欠阻尼",{mode:"free",resistance:20,inductance:100,capacitance:100,voltage0:5,current0:0,driveVoltage:5,frequency:50.32921210448704}],["电容放电：临界阻尼",{mode:"free",resistance:63.24555320336759,inductance:100,capacitance:100,voltage0:5,current0:0,driveVoltage:5,frequency:50.32921210448704}],["稳态电流共振",{mode:"steady",resistance:20,inductance:100,capacitance:100,voltage0:5,current0:0,driveVoltage:5,frequency:50.32921210448704}]],
  presetDescriptions:["R=20 Ω、L=100 mH、C=100 μF，电容初始5 V且初始电流0，观察放电振荡和能量损耗。", "同一电感与电容，把 R 设为临界值 63.245553… Ω，比较回到平衡的过程。", "Vm=5 V（峰值）、R=20 Ω，调到 f₀=50.329212… Hz，检验电流峰值 Vm/R 和零相位差。"],
  validate:p=>{const P=window.ZhixiangPhysics,d=P.rlcParameters(p);return d.valid?P.rlcState(p,0):d;},
  notice:p=>{const P=window.ZhixiangPhysics,d=P.rlcParameters(p);return !d.valid?d.message:p.mode==="free"?`临界电阻 Rc=${Number(d.criticalResistance.toPrecision(6))} Ω；能量变化率为 −Ri²。`:`电源输入为峰值，非有效值。电流共振 f₀=${Number(d.f0.toPrecision(6))} Hz。`;},
  hint:"图表时间与播放同步；拖动波形区定位时间。电压、电流分别使用各自纵轴。",
  note:"固定理想串联 RLC，电阻为唯一耗散；不含寄生参数、开关过程或任意电路求解。L、C 输入为 mH、μF，计算转为 H、F，时间为 s（画面标 ms）。自由响应：q′=i，Li′+Ri+q/C=0，q₀=C·Uc₀，使用解析解，允许 R=0。正弦稳态：v=Vm cosωt，i=Im cos(ωt−φ)，Im=Vm/√[R²+(ωL−1/ωC)²]，φ=atan2(ωL−1/ωC,R)，要求 R>0。Vm、Im 均为峰值，有效值除以√2。正电流流入电容正极，Uc=q/C。电流峰在 ω₀=1/√LC；电荷/电容电压的峰在 √(ω₀²−R²/(2L²))（根号内为正时），不等于自由阻尼频率。E=Li²/2+q²/(2C)，dE/dt=vi−Ri²。播放经过时间按显示区间缩放，读数为物理时间。",
  question:"串联 RLC 中，电流共振频率、电容电压的峰值频率和自由阻尼振荡频率相同吗？",answer:"一般不同。电流峰在 ω₀=1/√LC，与 R 无关；电容电压或电荷峰在 √(ω₀²−R²/(2L²))，且只在根号内为正时有正频率峰；欠阻尼自由频率为 √(ω₀²−R²/(4L²))。R=0 是无耗散自由振荡，但本模型不在零电阻下定义受迫稳态。",
  references:[["OpenStax：RLC Series Circuits","https://openstax.org/books/university-physics-volume-2/pages/14-6-rlc-series-circuits"],["OpenStax：RLC Series Circuits with AC","https://openstax.org/books/university-physics-volume-2/pages/15-3-rlc-series-circuits-with-ac"]],
  draw:drawUniversityRLC,exportData:universityRLCExport,
  readout:p=>{const P=window.ZhixiangPhysics,d=P.rlcState(p,state.time),n=v=>String(Number(v.toPrecision(6)));if(!d.valid)return{formula:"参数条件无效",caption:d.message,metrics:[]};const resp=p.mode==="steady"?P.rlcResponse(p):null;return{formula:p.mode==="free"?"Lq″ + Rq′ + q/C = 0；i = q′":"Iₘ = Vₘ / √[R² + (ωL − 1/ωC)²]",caption:p.mode==="free"?`自由响应 · ${{under:"欠阻尼",critical:"临界阻尼",over:"过阻尼"}[d.regime]}`:`已建立正弦稳态 · 电流${resp.phase>=0?"滞后":"超前"} ${n(Math.abs(resp.phase)*180/Math.PI)}°`,metrics:[["当前电流",n(d.current),"A"],["电容电压",n(d.voltageC),"V"],["电阻电压",n(d.voltageR),"V"],["电感电压",n(d.voltageL),"V"],["电容储能",n(d.energyC),"J"],["电感储能",n(d.energyL),"J"],["电路储能",n(d.energy),"J"],["固有频率 f₀",n(d.f0),"Hz"],...(resp?[["电流峰值",n(resp.currentAmplitude),"A"],["相位 φ",n(resp.phase),"rad"],["阻抗模",n(resp.impedance),"Ω"]]:[["电荷 q",n(d.q),"C"],["累计耗散能",n(d.dissipated),"J"],["临界电阻",n(d.criticalResistance),"Ω"]]) ]};},
  renderControls:uniRenderControls,setParam:uniSetParam,bind:uniBindStage,parsePrecision:()=>12,reset:()=>{state.time=0;},
  advance:dt=>{const P=window.ZhixiangPhysics,d=P.rlcParameters(state.p);if(!d.valid){stopAnimation();return;}const end=P.rlcDuration(state.p);state.time=Math.min(end,state.time+dt);if(state.time>=end)stopAnimation();},
  playback:{duration:p=>window.ZhixiangPhysics.rlcDuration(p),step:p=>window.ZhixiangPhysics.rlcDuration(p)/240,formatTime:t=>`${Number((t*1000).toPrecision(5))} ms`,seek:t=>{state.time=clamp(t,0,window.ZhixiangPhysics.rlcDuration(state.p));},rate:p=>window.ZhixiangPhysics.rlcDuration(p)/12},
  thumbnail:canvas=>{const {ctx,w,h}=setupCanvas(canvas),plot=makePlot(ctx,w,h,{xmin:0,xmax:6,ymin:-1.1,ymax:1.1,equal:false,labels:false,left:15,right:15,top:15,bottom:15});plotCurve(ctx,plot,t=>Math.exp(-.35*t)*Math.cos(5*t),PALETTE.green,2);}
});
