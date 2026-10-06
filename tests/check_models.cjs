/* Browser + numerical regression. No application dependency or test framework required.
   PLAYWRIGHT_MODULE_PATH can point to an already installed Playwright package.
   Run after: python3 build.py && python3 -m http.server 8000 --bind 127.0.0.1 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('./runtime.cjs').loadPlaywright();
const root = path.resolve(__dirname, '..');
const out = require('./runtime.cjs').outputDir;
fs.mkdirSync(out, { recursive: true });
const results = [], errors = [], remoteRequests = [];
let runningBrowser;
function check(name, value, details) {
  results.push({ name, passed: !!value, ...(details === undefined ? {} : { details }) });
  console.log(`${value ? 'PASS' : 'FAIL'} ${name}${!value && details ? ' '+JSON.stringify(details) : ''}`);
}
(async () => {
  const options = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = runningBrowser = await chromium.launch(options);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith((require('./runtime.cjs').baseURL + '/'))) remoteRequests.push(r.url()); });
  await page.goto((require('./runtime.cjs').baseURL + '/index.html?qa=current'));
  check('首页保留原有21个并新增透镜成像', await page.locator('.model-card').count() === 22);
  check('移除重复推荐条、标签与课堂脚本', await page.locator('.collection-bar,.card-chip,.control-tab,.hero').count() === 0);
  await page.locator('#threeDFilter').check();
  check('只看三维为3个模块', await page.locator('.model-card').count() === 3);
  await page.locator('#threeDFilter').uncheck();
  for (const [cat,count] of [['math',8],['physics',12],['geography',2],['all',22]]) {
    await page.locator(`[data-filter="${cat}"]`).click();
    check(`学科筛选${cat}`, await page.locator('.model-card').count() === count);
  }
  await page.locator('#searchInput').fill('球');
  check('搜索球', await page.locator('[data-open="solids"]').count() === 1);
  await page.locator('#searchInput').fill('');
  await page.locator('[data-favorite="solids"]').click();
  check('收藏持久化', await page.evaluate(() => loadStore().favorites.includes('solids')));
  await page.locator('[data-open="solids"]').click();
  await page.locator('#simCanvas').waitFor();
  check('8种几何体', await page.locator('#solidSelect option').count() === 8);
  const meshes = await page.evaluate(() => Object.keys(SOLID_NAMES).map(shape => {
    const p = { ...GEOMETRY_MODELS[0].defaults,shape,a:3,b:2,height:4,r:1.5 }, m=solidMesh(p), d=solidData(p);
    let area=0,volume=0;
    for(const f of m.faces)for(let i=1;i<f.points.length-1;i++) {
      const a=f.points[0],b=f.points[i],c=f.points[i+1];
      area+=V3.len(V3.cross(V3.sub(b,a),V3.sub(c,a)))/2; volume+=V3.dot(a,V3.cross(b,c))/6;
    }
    return {shape,area:d.area,meshArea:area,volume:d.volume,meshVolume:volume,count:d.count,actual:[m.vertices.length,m.edges.length,m.faces.length]};
  }));
  for(const m of meshes) {
    if(m.count)check(`多面体拓扑${m.shape}`,JSON.stringify(m.count)===JSON.stringify(m.actual));
    const tolerance=m.count?1e-9:.012;
    check(`网格体积${m.shape}`,Math.abs(m.volume-m.meshVolume)/m.volume<tolerance);
    check(`网格面积${m.shape}`,Math.abs(m.area-m.meshArea)/m.area<tolerance);
  }
  await page.locator('#number-a').fill('4'); await page.locator('#number-a').press('Tab');
  check('尺寸计算64cm³', await page.evaluate(() => solidData(state.p).volume===64));
  await page.locator('#number-a').fill('100'); await page.locator('#number-a').press('Tab');
  check('输入超界限幅', await page.evaluate(() => state.p.a===5));
  await page.locator('[data-action="reset"]').click();
  const old = await page.evaluate(() => [state.p.yaw,state.p.pitch]);
  const box=await page.locator('#simCanvas').boundingBox(),x=box.x+box.width*.4,y=box.y+box.height*.4;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+75,y+30,{steps:6});await page.mouse.up();
  check('拖动旋转', JSON.stringify(old)!==JSON.stringify(await page.evaluate(() => [state.p.yaw,state.p.pitch])));
  await page.mouse.wheel(0,-150);await page.waitForTimeout(80);
  check('滚轮缩放', await page.evaluate(() => state.p.scale>1));
  for(const [view,yaw,pitch] of [['top',0,90],['front',0,0],['side',90,0],['iso',-35,24]]) {
    await page.locator(`[data-geo-view="${view}"]`).click();
    check(`视角${view}`,await page.evaluate(([a,b])=>state.p.yaw===a&&state.p.pitch===b,[yaw,pitch]));
  }
  await page.locator('#simCanvas').focus();await page.keyboard.press('ArrowRight');
  check('键盘旋转',await page.evaluate(()=>state.p.yaw===-30));
  await page.locator('[data-geo-toggle="ghost"]').check();
  await page.locator('[data-geo-toggle="hidden"]').uncheck();
  check('透明与遮挡选项',await page.evaluate(()=>state.p.ghost&&!state.p.hidden));
  await page.locator('[data-geo-action="rotate"]').click();await page.waitForTimeout(180);
  check('自动旋转', await page.evaluate(()=>state.p.yaw!==-30));
  await page.locator('[data-geo-action="rotate"]').click();
  await page.locator('[data-action="ink"]').click();const yaw=await page.evaluate(()=>state.p.yaw);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+40,y+20,{steps:4});await page.mouse.up();
  check('板书捕捉手势且不旋转',await page.evaluate(yaw=>state.strokes.length>0&&state.p.yaw===yaw,yaw));
  await page.locator('[data-action="ink"]').click();
  await page.locator('[data-action="clear-ink"]').click();
  check('板书清空', await page.evaluate(()=>state.strokes.length===0));
  const config=await page.evaluate(()=>currentConfig());
  await page.locator('[data-action="save"]').click();await page.locator('#classTitle').fill('本次回归 <b>');
  await page.locator('[data-action="confirm-save"]').click();
  await page.evaluate(()=>showLibrary('classes'));
  check('保存标题转义',await page.locator('.saved-card h3 b').count()===0);
  await page.locator('[data-class-open]').first().click();
  check('课堂恢复尺寸和视角',await page.evaluate(c=>Math.abs(state.p.yaw-c.params.yaw)<.000051&&state.p.ghost===c.params.ghost,config));
  check('v1旧配置兼容',await page.evaluate(()=>{const c=validateImport({app:'zhixiang',version:1,type:'model',model:'pendulum',params:{angle:60,length:2,g:9.8,mass:.5}});return c.params.angle===60&&c.params.length===2;}));
  check('导入参数安全边界',await page.evaluate(()=>{const p=safeParams(modelById('solids'),{shape:'<script>',a:Infinity,yaw:999,pitch:-999,ghost:'yes',hidden:false});return p.shape==='cube'&&p.a===3&&p.yaw===180&&p.pitch===-90&&!p.ghost&&!p.hidden;}));
  await page.evaluate(()=>openModel('sections'));
  for(const [i,count] of [[0,3],[1,4],[2,5],[3,6]]){
    await page.locator(`[data-preset="${i}"]`).click();check(`截面预设${i}`,await page.evaluate(count=>sectionData(state.p).points.length===count,count));
  }
  check('正六边形解析面积',await page.evaluate(()=>Math.abs(sectionData(state.p).area-3*Math.sqrt(3)/4*state.p.a**2)<1e-6));
  check('平面移动不改变正视图比例',await page.evaluate(()=>{const p={...state.p},base=sectionInsetLayout(600,p.a).scale;return [0,30,64,90].every(offset=>{p.offset=offset;const d=sectionData(p);return d.area>=0&&sectionInsetLayout(600,p.a).scale===base;});}));
  for(const [tilt,azimuth,count] of [[0,0,4],[90,45,2],[54.735610317,45,1]]) {
    check(`截面支撑边界${count}`,await page.evaluate(([tilt,azimuth,count])=>{const d=sectionData({a:3,tilt,azimuth,offset:100});return d.points.length===count&&(count===4?Math.abs(d.area-9)<1e-8:d.area===0);},[tilt,azimuth,count]));
  }
  const random=await page.evaluate(()=>{
    let bad=0,max=0,seed=81;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<1600;i++){const p={a:1+4*rnd(),tilt:90*rnd(),azimuth:180*rnd(),offset:-100+200*rnd()},d=sectionData(p);max=Math.max(max,d.points.length);if(d.points.length>6||!Number.isFinite(d.area+d.perimeter)||d.area<0||d.area>3*Math.sqrt(3)/2*p.a*p.a+1e-5||d.points.some(v=>Math.abs(V3.dot(d.normal,v)-d.d)>1e-6||v.some(x=>Math.abs(x)>p.a/2+1e-6)))bad++;}return{bad,max};
  });check('1600组随机截面几何约束',random.bad===0&&random.max===6,random);
  const nets=await page.evaluate(()=>{
    const out=[];
    for(const shape of ['cube','cuboid'])for(const fold of [0,10,32,50,75,100]){
      const d=netMesh({shape,a:3,b:2,height:4,fold}),fs=d.panels.map(f=>f.points),pairs=[[[0,3],[1,0]],[[0,2],[1,1]],[[0,0],[2,3]],[[0,1],[2,2]],[[2,0],[5,3]],[[2,1],[5,2]],[[0,0],[3,1]],[[0,3],[3,2]],[[0,1],[4,0]],[[0,2],[4,3]]],pts=fs.flat();
      out.push({shape,fold,gap:Math.max(...pairs.map(([a,b])=>V3.len(V3.sub(fs[a[0]][a[1]],fs[b[0]][b[1]])))),area:d.panels.reduce((s,f)=>s+V3.len(V3.cross(V3.sub(f.points[1],f.points[0]),V3.sub(f.points[3],f.points[0]))),0),expected:d.area,dimensions:[0,1,2].map(j=>Math.max(...pts.map(p=>p[j]))-Math.min(...pts.map(p=>p[j])))});
    }return out;
  });
  check('展开面积不变',nets.every(d=>Math.abs(d.area-d.expected)<1e-8));
  check('展开共享棱连接',nets.every(d=>d.gap<1e-8));
  check('闭合尺寸正确',nets.filter(d=>d.fold===0).every(d=>d.dimensions.every((v,i)=>Math.abs(v-(d.shape==='cube'?[3,3,3]:[3,4,2])[i])<1e-8)));
  check('完全展开共面',nets.filter(d=>d.fold===100).every(d=>d.dimensions[1]<1e-8));
  await page.evaluate(()=>openModel('nets'));await page.locator('[data-preset="0"]').click();await page.locator('[data-geo-action="fold"]').click();await page.waitForTimeout(160);
  check('展开动画推进',await page.evaluate(()=>state.p.fold>0));
  await page.evaluate(()=>updateSimulation(10));check('展开终点停止',await page.evaluate(()=>state.p.fold===100&&!state.running));
  await page.locator('[data-geo-action="fold"]').click();await page.evaluate(()=>updateSimulation(10));
  check('折叠起点停止',await page.evaluate(()=>state.p.fold===0&&!state.running));
  // Independent period reference + long-run energy / period from ODE crossings.
  const pendulum=await page.evaluate(()=>[5,15,60].map(angle=>{
    const p={length:1.5,g:9.8,mass:1,angle},d=pendulumPeriod(p);let theta=rad(angle),omega=0,t=0,last=theta,first=null,measured=null,maxError=0;const initial=pendulumEnergy(p,theta,omega).total;
    for(let i=0;i<240*60;i++){[theta,omega]=rk4Pendulum(theta,omega,1/240,p);t+=1/240;const e=pendulumEnergy(p,theta,omega);maxError=Math.max(maxError,Math.abs((e.kinetic+e.potential)/initial-1));if(last>0&&theta<=0){const crossing=t-(1/240)*theta/(theta-last);if(first===null)first=crossing;else if(measured===null)measured=crossing-first;}last=theta;}return{angle,...d,measured,maxError};
  }));
  for(const p of pendulum){check(`单摆${p.angle}°周期匹配运动积分`,Math.abs(p.period-p.measured)<1e-6,p);check(`单摆${p.angle}°60s能量守恒`,p.maxError<1e-7,p.maxError);}
  check('60°周期修正参考值',Math.abs(pendulum[2].period/pendulum[2].small-1.0731820071493645)<1e-10);
  const collision=await page.evaluate(()=>{
    const pair=[{x:.4,y:.5,vx:1,vy:.2},{x:.4+.035/2,y:.5,vx:-1,vy:-.2}],before=pair.map(p=>({...p}));collideGasPair(pair[0],pair[1],2,2);
    const e=pts=>pts.reduce((s,p)=>s+p.vx*p.vx+p.vy*p.vy,0);
    return{exchange:Math.abs(pair[0].vx+1)<1e-12&&Math.abs(pair[1].vx-1)<1e-12,energy:Math.abs(e(pair)-e(before)),momentum:Math.abs(pair[0].vx+pair[1].vx)+Math.abs(pair[0].vy+pair[1].vy)};
  });check('两体碰撞交换法向速度',collision.exchange);check('两体碰撞能量和动量守恒',collision.energy<1e-12&&collision.momentum<1e-12,collision);
  await page.evaluate(()=>openModel('gas'));
  const gas=await page.evaluate(()=>{
    const out=[];
    for(const vol of[5,20,30])for(const moles of[.1,.5,1])for(const temp of[100,800]){
      Object.assign(state.p,{vol,moles,temp});initParticles();const {w,h}=gasDomain(state.p),initial=state.particles.reduce((s,p)=>s+p.vx*p.vx+p.vy*p.vy,0);
      let initialOverlap=false;
      for(let a=0;a<state.particles.length;a++)for(let b=a+1;b<state.particles.length;b++){const p=state.particles[a],q=state.particles[b];if(Math.hypot((p.x-q.x)*w,(p.y-q.y)*h)<2*GAS_RADIUS-1e-9)initialOverlap=true;}
      for(let i=0;i<120;i++)stepGas(state.p,state.particles,1/30);
      const final=state.particles.reduce((s,p)=>s+p.vx*p.vx+p.vy*p.vy,0);
      out.push({vol,moles,temp,initialOverlap,energyError:Math.abs(final/initial-1),contained:state.particles.every(p=>Number.isFinite(p.x+p.y+p.vx+p.vy)&&p.x>=GAS_RADIUS/w-1e-8&&p.x<=1-GAS_RADIUS/w+1e-8&&p.y>=GAS_RADIUS/h-1e-8&&p.y<=1-GAS_RADIUS/h+1e-8)});
    }return out;
  });
  check('18组气体极值初态无重叠',gas.every(d=>!d.initialOverlap));
  check('18组气体4s碰撞能量守恒',gas.every(d=>d.energyError<1e-10),Math.max(...gas.map(d=>d.energyError)));
  check('18组气体粒子不逃逸',gas.every(d=>d.contained));
  const particles=await page.evaluate(()=>{Object.assign(state.p,{temp:300,vol:20,moles:.5});initParticles();return structuredClone(state.particles);});
  const wide=await page.evaluate(pts=>{stepGas(state.p,pts,1);return pts;},particles);
  await page.setViewportSize({width:390,height:844});
  const narrow=await page.evaluate(pts=>{stepGas(state.p,pts,1);return pts;},particles);
  check('改变窗口不影响气体运动',JSON.stringify(wide)===JSON.stringify(narrow));
  // Every model, selectable variant, preset and control endpoint. Check finite canvas coordinates too.
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>{
    for(const name of['moveTo','lineTo','arc','rect']){const original=CanvasRenderingContext2D.prototype[name];CanvasRenderingContext2D.prototype[name]=function(...args){if(args.slice(0,name==='arc'?5:name==='rect'?4:2).some(v=>!Number.isFinite(v)))throw new Error('Non-finite canvas coordinate: '+name);return original.apply(this,args);};}
  });
  const ids=await page.evaluate(()=>MODELS.map(m=>m.id));
  for(const id of ids){
    await page.evaluate(id=>openModel(id),id);
    const variants=await page.evaluate(()=>state.model.id==='functions'?Object.keys(FUNCTIONS):state.model.choices?.shape||[null]);
    for(const variant of variants){
      await page.evaluate(v=>{if(v){state.p[state.model.id==='functions'?'kind':'shape']=v;renderControls();}drawStage();},variant);
      const controls=await page.evaluate(()=>state.model.threeD?geoVisibleControls(state.model,state.p):state.model.controls);
      for(const c of controls)for(const value of[c[3],c[4]])await page.evaluate(([k,v])=>{setParam(k,v);drawStage();},[c[0],value]);
    }
    check(`模型及边界渲染${id}`,errors.length===0,errors);
  }
  check('旧模型公式回归',await page.evaluate(()=>solarData({lat:0,dec:0,hour:12,pole:2}).elevation===90&&Math.abs(gasData({moles:.5,vol:20,temp:300}).pressure-62.358469635)<1e-8&&Math.abs(projectileData({v:20,angle:45,height:0,g:10}).range-40)<1e-8&&opticalData({n1:1.5,n2:1,angle:55}).tir));
  await page.evaluate(()=>openModel('sections'));await page.waitForTimeout(50);
  const imageDownload=page.waitForEvent('download');await page.locator('[data-action="screenshot"]').click();
  const img=await imageDownload;await img.saveAs(path.join(out,'export-section.png'));
  check('PNG实际下载',fs.statSync(path.join(out,'export-section.png')).size>1000);
  await page.locator('[data-action="share"]').click();
  check('配置JSON默认收起',await page.locator('.config-details').evaluate(el=>!el.open));
  const jsonDownload=page.waitForEvent('download');await page.locator('[data-action="export-config"]').click();
  const json=await jsonDownload;await json.saveAs(path.join(out,'export-config.json'));
  const exported=JSON.parse(fs.readFileSync(path.join(out,'export-config.json'),'utf8'));
  check('JSON导出兼容v1',exported.version===1&&exported.model==='sections'&&typeof exported.params.yaw==='number');
  await page.locator('[data-action="close-dialog"]').click();
  await page.evaluate(()=>showLibrary('classes'));await page.locator('[data-action="import"]').click();
  await page.locator('#importFile').setInputFiles(path.join(out,'export-config.json'));await page.locator('[data-action="confirm-import"]').click();
  check('实际文件导入恢复模型',await page.evaluate(()=>state.model.id==='sections'));
  await page.locator('[data-action="present"]').click();
  check('进入大屏',await page.evaluate(()=>state.presenting));await page.keyboard.press('Escape');check('退出大屏',await page.evaluate(()=>!state.presenting));
  for(const width of[390,768,1024,1440]){
    await page.setViewportSize({width,height:950});
    for(const id of['home',...ids]){
      await page.evaluate(id=>id==='home'?showLibrary():openModel(id),id);await page.waitForTimeout(25);
      check(`${width}px ${id}无横向溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
  }
  await page.setViewportSize({width:390,height:844});
  for(const id of['home','sections','spring','gas']){await page.evaluate(id=>id==='home'?showLibrary():openModel(id),id);await page.evaluate(()=>document.querySelector('#toast').classList.remove('show'));await page.screenshot({path:path.join(out,`mobile-${id}.png`),fullPage:true});}
  await page.locator('[data-action="to-params"]').click();
  await page.waitForFunction(()=>{const el=document.querySelector('#controlPanel'),top=el.getBoundingClientRect().top;return top>=10&&top<=Math.max(14,innerHeight-el.offsetHeight);});
  check('窄屏直达参数',await page.locator('#controlPanel').evaluate(el=>{const top=el.getBoundingClientRect().top;return top>=10&&top<=Math.max(14,innerHeight-el.offsetHeight);}));
  await page.locator('[data-action="to-model"]').click();
  await page.waitForFunction(()=>Math.abs(document.querySelector('.canvas-panel').getBoundingClientRect().top-12)<2);
  check('窄屏回到模型',await page.locator('.canvas-panel').evaluate(el=>Math.abs(el.getBoundingClientRect().top-12)<2));
  const mobileDownload=page.waitForEvent('download');await page.locator('[data-action="screenshot"]').click();
  await (await mobileDownload).saveAs(path.join(out,'export-mobile-gas.png'));
  check('窄屏PNG导出',fs.statSync(path.join(out,'export-mobile-gas.png')).size>1000);
  await page.evaluate(()=>openModel('solids'));await page.waitForTimeout(40);
  await page.evaluate(()=>{const c=document.querySelector('#simCanvas');for(const[type,id,x,y]of[['pointerdown',1,100,200],['pointerdown',2,200,200],['pointermove',2,250,200],['pointerup',1,100,200],['pointerup',2,250,200]])c.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:x,clientY:y,pointerType:'touch',bubbles:true}));});
  check('双指缩放事件逻辑',await page.evaluate(()=>Math.abs(state.p.scale-1.5)<1e-8));
  await page.setViewportSize({width:1440,height:1000});
  for(const id of['home',...ids]){await page.evaluate(id=>id==='home'?showLibrary():openModel(id),id);await page.evaluate(()=>document.querySelector('#toast').classList.remove('show'));await page.screenshot({path:path.join(out,`verified-${id}.png`),fullPage:true});}
  // Standalone build and storage-disabled behavior in a separate fresh context.
  const offline=await browser.newContext({viewport:{width:390,height:844}}),offlinePage=await offline.newPage(),network=[];
  offlinePage.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});offlinePage.on('pageerror',e=>errors.push(e.message));
  await offlinePage.goto('file://'+path.join(root,'standalone.html'));
  check('单文件首页22模型',await offlinePage.locator('.model-card').count()===22);
  for(const id of ids){await offlinePage.evaluate(id=>openModel(id),id);await offlinePage.waitForTimeout(20);}
  check('单文件所有模型无需网络',network.length===0,network);
  const storagePage=await context.newPage();await storagePage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Disabled for test');}}));await storagePage.goto((require('./runtime.cjs').baseURL + '/index.html?qa=storage'));
  check('禁用存储仍可操作',await storagePage.locator('.storage-warning').count()>0&&await storagePage.evaluate(()=>{openModel('gas');return state.particles.length>0;}));
  check('控制台无异常',errors.length===0,errors);check('无外部请求',remoteRequests.length===0,remoteRequests);
  await browser.close();
  const report={date:new Date().toISOString(),checks:results.length,passed:results.filter(r=>r.passed).length,results,errors,remoteRequests};
  fs.writeFileSync(path.join(out,'current-results.json'),JSON.stringify(report,null,2));
  console.log(`RESULT ${report.passed}/${report.checks}`);
  if(report.passed!==report.checks)process.exitCode=1;
})().catch(async e=>{console.error(e);await runningBrowser?.close();process.exitCode=1;});
