/* C1-C7: new behavior checks. Uses real downloads and independent QR decoding. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {baseURL,outputDir:out,loadPlaywright}=require('./runtime.cjs');
const {chromium}=loadPlaywright(),jsQR=require('jsqr');
const root=path.resolve(__dirname,'..'),results=[],errors=[];
let browser;
function check(name,passed,details){results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);}
const equal=(a,b,tol=1e-10)=>Math.abs(a-b)<tol;
// Read the downloaded file independently of selectedExportChart()/csvForChart().
function csvTable(lines){return {headers:lines[0].split(',').map(s=>s.replace(/^"|"$/g,'')),rows:lines.slice(1).map(line=>line.split(',').map(s=>s===''?null:Number(s)))};}
function maxError(rows,actual,expected){return Math.max(...rows.map(row=>Math.abs(actual(row)-expected(row))));}
function checkCSVMathematics(id,lines,before){
 const {headers,rows}=csvTable(lines),p=JSON.parse(before.p);
 check(id+' CSV 数据为有限数或明确空值',rows.length>1&&rows.every(row=>row.length===headers.length&&row.every(v=>v===null||Number.isFinite(v))));
 if(id==='parabola'){
  const error=Math.max(maxError(rows,r=>r[1],r=>r[0]**2),maxError(rows,r=>r[2],r=>2*r[0]**2));
  check('二次函数 CSV 当前及保留曲线独立方程',headers.join('|')==='x [1]|y_current [1]|y_comparison [1]'&&error<1e-10,{error});
 }else if(id==='functions'){
  const error=Math.max(maxError(rows,r=>r[1],r=>Math.sin(r[0])),maxError(rows,r=>r[2],r=>2*Math.sin(r[0])));
  const origin=rows.find(r=>Math.abs(r[0])<1e-12);
  check('正弦函数 CSV 标准点和保留曲线独立方程',!!origin&&equal(origin[1],0)&&equal(origin[2],0)&&error<1e-12,{error});
 }else if(id==='derivative'){
  // f=.25x³−x at x₀=1: f₀=−.75, f′₀=−.25; h=1 gives secant slope .75.
  const error=Math.max(maxError(rows,r=>r[1],r=>.25*r[0]**3-r[0]),maxError(rows,r=>r[2],r=>-.75-.25*(r[0]-1)),maxError(rows,r=>r[3],r=>-.75+.75*(r[0]-1)),maxError(rows,r=>r[4],r=>2*r[0]**3-r[0]));
  check('导数 CSV 原函数、切线、割线和对照独立算式',headers.join('|')==='x [1]|f [1]|tangent [1]|secant [1]|f_comparison [1]'&&error<1e-10,{error});
 }else if(id==='projectile'){
  const present=rows.filter(r=>r[1]!==null),comparison=rows.filter(r=>r[5]!==null),drag=rows.filter(r=>r[3]!==null),vx=20/Math.SQRT2,cx=25/Math.SQRT2;
  const error=Math.max(maxError(present,r=>r[1],r=>vx*r[0]),maxError(present,r=>r[2],r=>Math.max(0,vx*r[0]-4.9*r[0]**2)),maxError(comparison,r=>r[5],r=>cx*r[0]),maxError(comparison,r=>r[6],r=>Math.max(0,cx*r[0]-4.9*r[0]**2)));
  check('抛体 CSV 理想及保留曲线分别满足运动方程',headers.join('|')==='t [s]|ideal_x [m]|ideal_y [m]|drag_x [m]|drag_y [m]|comparison_x [m]|comparison_y [m]'&&present.length>1&&comparison.length>present.length&&error<1e-10,{error});
  // Independent explicit-midpoint integration, 20 times finer than the product RK4 step.
  // Only interior samples are compared: product interpolation is linear between RK4 nodes.
  const probeRows=[rows[120],rows[240],rows[360]],coefficient=p.rho*p.cd*p.area/(2*p.mass);
  const slope=s=>[s[2],s[3],-coefficient*Math.hypot(s[2],s[3])*s[2],-p.g-coefficient*Math.hypot(s[2],s[3])*s[3]];
  let t=0,solution=[0,p.height,p.v*Math.cos(p.angle*Math.PI/180),p.v*Math.sin(p.angle*Math.PI/180)],dragError=0;
  for(const row of probeRows){while(t<row[0]-1e-14){const dt=Math.min(1/4800,row[0]-t),v=slope(solution),mid=solution.map((x,i)=>x+dt*v[i]/2),d=slope(mid);solution=solution.map((x,i)=>x+dt*d[i]);t+=dt;}dragError=Math.max(dragError,Math.abs(row[3]-solution[0]),Math.abs(row[4]-solution[1]));}
  check('抛体 CSV 含阻力列通过独立中点积分对照',probeRows.every(r=>r[3]!==null&&r[4]!==null)&&dragError<5e-5,{maxErrorM:dragError,toleranceM:5e-5});
  check('抛体 CSV 落地时刻与后续空值正确',equal(present.at(-1)[0],2*vx/9.8)&&equal(comparison.at(-1)[0],2*cx/9.8)&&equal(drag.at(-1)[4],0,1e-8)&&rows.filter(r=>r[0]>drag.at(-1)[0]).every(r=>r[3]===null&&r[4]===null)&&drag.at(-1)[3]<present.at(-1)[1]);
 }else if(id==='pendulum'){
  const e0=p.mass*p.g*p.length*(1-Math.cos(p.angle*Math.PI/180)),sumError=Math.max(maxError(rows,r=>r[1]+r[2],r=>r[3]),maxError(rows,r=>r[4]+r[5],r=>r[6])),conservation=maxError(rows,r=>r[6],()=>e0);
  check('单摆 CSV 六列能量及 K+U=E',headers.join('|')==='t [s]|actual_kinetic [J]|actual_potential [J]|actual_total [J]|ideal_kinetic [J]|ideal_potential [J]|ideal_total [J]'&&sumError<1e-12,{sumError});
  check('单摆 CSV 理想能量守恒且等于初始势能',conservation<1e-8,{e0,maxErrorJ:conservation});
  const last=rows.at(-1),k=.5*p.mass*p.length**2*before.omega**2,u=p.mass*p.g*p.length*(1-Math.cos(before.theta));
  check('单摆 CSV 末端能量对应实际摆角和角速度',equal(last[1],k)&&equal(last[2],u)&&equal(last[0],before.time));
  check('单摆 CSV 阻尼能量递减',rows.every((r,i)=>r[3]>=0&&(!i||r[3]<=rows[i-1][3]+1e-10))&&last[3]<e0);
 }else if(id==='wave'){
  const error=maxError(rows,r=>r[1],r=>p.amp*Math.sin(2*Math.PI*(r[0]/p.lambda-p.freq*before.time)));
  const atQuarter=rows.find(r=>equal(r[0],p.lambda/4));
  check('波 CSV 固定时刻满足行波方程',headers.join('|')==='x [m]|y [m]|t [s]'&&rows.every(r=>equal(r[2],before.time))&&error<1e-12,{time:before.time,error});
  check('波 CSV 标准四分之一波长取值',equal(before.time,1)&&!!atQuarter&&equal(atQuarter[1],-p.amp)&&equal(rows[0][1],0));
 }else if(id==='spring'){
  const error=maxError(rows,r=>r[1],r=>p.amp*Math.cos(Math.sqrt(p.stiff/p.mass)*r[0]));
  check('弹簧 CSV 理想位移满足解析解',headers.join('|')==='t [s]|displacement [m]|envelope_upper [m]|envelope_lower [m]'&&error<1e-12,{error});
  check('弹簧 CSV 正负包络覆盖位移',rows.every(r=>equal(r[2],Math.abs(p.amp))&&equal(r[3],-Math.abs(p.amp))&&r[1]<=r[2]+1e-12&&r[1]>=r[3]-1e-12));
 }
}
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL+'/index.html');
 const original=fs.readFileSync(path.join(root,'assets/original/zhixiang-logo.png')),small=fs.readFileSync(path.join(root,'assets/zhixiang-logo.png')),standalone=fs.readFileSync(path.join(root,'standalone.html'),'utf8');
 check('原始 Logo 按原哈希保留',crypto.createHash('sha256').update(original).digest('hex')==='e83130ed634839a8434403662de85942cb1a5c36d0a9535969625be5b37bcbb6');
 check('导航 Logo 为 192px 且小于 40KB',small.readUInt32BE(16)===192&&small.readUInt32BE(20)===192&&small.length<40000);
 check('构建仅嵌入压缩 Logo',standalone.includes(small.toString('base64'))&&!standalone.includes(original.toString('base64')));
 check('桌面页面共用 build.py 压缩构建',fs.readFileSync(path.join(root,'macos/build.sh'),'utf8').includes('build.py')&&fs.readFileSync(path.join(root,'windows/build.py'),'utf8').includes('build.py'));
 check('22 模型注册与清单顺序一致',await page.evaluate(ids=>JSON.stringify(MODELS.map(m=>m.id))===JSON.stringify(ids)&&MODELS.every(m=>typeof m.draw==='function'&&typeof m.readout==='function'),JSON.parse(fs.readFileSync(path.join(root,'models/manifest.json')))));
 check('注册表拒绝重复 id',await page.evaluate(()=>{try{ZhixiangModels.register({...MODELS[0]});return false;}catch{return true;}}));
 for(const shape of ['sphere','cylinder','cone']){
  const d=await page.evaluate(shape=>{const p={...modelById('solids').defaults,shape};const a=solidMesh(p),b=solidMesh({...p,scale:1.8}),c=solidMesh({...p,scale:100});let area=0,volume=0;for(const f of b.faces)for(let i=1;i<f.points.length-1;i++){const [v,w,z]=[f.points[0],f.points[i],f.points[i+1]];area+=V3.len(V3.cross(V3.sub(w,v),V3.sub(z,v)))/2;volume+=V3.dot(v,V3.cross(w,z))/6;}const expected=solidData(p);return{a:a.vertices.length,b:b.vertices.length,c:c.vertices.length,segments:c.segments,volume:Math.abs(volume/expected.volume-1),area:Math.abs(area/expected.area-1),cached:a===solidMesh({...p,yaw:90,pitch:60})};},shape);
  check(shape+' 放大细分且上限 96',d.b>d.a&&d.segments<=96,d);
  check(shape+' 高细分数值交叉校验',d.volume<.012&&d.area<.012,d);
  check(shape+' 旋转复用网格',d.cached);
 }
 for(const model of await page.evaluate(()=>MODELS.map(m=>m.id))){const d=await page.evaluate(id=>{const m=modelById(id),p=safeParams(m,Object.fromEntries(m.controls.map(c=>[c[0],c[4]]))),hash=encodeShareHash(id,p),decoded=safeParams(m,decodeShareParams(new URLSearchParams(hash)));return{same:JSON.stringify(p)===JSON.stringify(decoded),length:makeShareLink(id,p).length};},model);check(model+' 分享参数无损往返',d.same&&d.length<4096,d);}
 const hash=await page.evaluate(()=>encodeShareHash('projectile',{...modelById('projectile').defaults,v:27.3,angle:36,motionMode:'compare',area:.0037}));
 await page.goto(baseURL+'/index.html#'+hash);
 check('带 hash 直接打开与恢复',await page.evaluate(()=>state.model.id==='projectile'&&state.p.v===27.3&&state.p.motionMode==='compare'&&state.p.area===.0037));
 await page.goto(baseURL+'/index.html#'+new URLSearchParams({model:'wave',params:JSON.stringify({amp:999,freq:'no',lambda:1,unknown:'<script>'})}));
 check('旧参数 hash 限幅并忽略非法字段',await page.evaluate(()=>state.p.amp===modelById('wave').controls.find(c=>c[0]==='amp')[4]&&state.p.freq===modelById('wave').defaults.freq&&!('unknown'in state.p)));
 await page.goto(baseURL+'/index.html#model=wave&p=!!');
 check('非法分享编码回退默认且有提示',await page.evaluate(()=>state.model.id==='wave'&&state.p.amp===modelById('wave').defaults.amp&&document.querySelector('#toast').textContent.includes('无法读取')));
 await page.goto(baseURL+'/index.html#'+'x'.repeat(4100));
 check('超长 hash 拒绝载入',await page.evaluate(()=>state.model===null&&document.querySelector('#toast').textContent.includes('过长')));
 await page.evaluate(()=>{openModel('functions',{...modelById('functions').defaults,a:2,h:1});store.classes=[{id:'share-test',title:'课堂分享',model:'functions',p:{...state.p}}];persist();showLibrary('classes');});
 await page.locator('[data-class-share="share-test"]').click();
 check('我的课堂提供可复制链接与二维码',await page.locator('#shareURL').inputValue().then(v=>v.includes('#model=functions'))&&await page.locator('#shareQR svg').count()===1);
 await page.screenshot({path:path.join(out,'class-share-dialog.png'),fullPage:true});
 const qr=await page.evaluate(()=>{const url=$('#shareURL').value,m=ZhixiangQR.encode(url),size=(m.length+8)*5,data=new Uint8ClampedArray(size*size*4);data.fill(255);m.forEach((row,y)=>row.forEach((v,x)=>{if(v)for(let dy=0;dy<5;dy++)for(let dx=0;dx<5;dx++){const i=(((y+4)*5+dy)*size+(x+4)*5+dx)*4;data[i]=data[i+1]=data[i+2]=0;}}));return{url,size,data:Array.from(data)};});
 check('独立 QR 解码得到完整分享链接',jsQR(Uint8ClampedArray.from(qr.data),qr.size,qr.size)?.data===qr.url);
 await page.locator('#shareBase').fill('https://example.com/'+'x'.repeat(1900));
 check('二维码长度上限提示但链接仍可复制',await page.locator('#shareError').textContent().then(v=>v.includes('过长'))&&!(await page.locator('#copyShareButton').isDisabled()));
 await page.locator('#shareBase').fill('javascript:alert(1)');
 check('无效页面网址禁用复制',await page.locator('#copyShareButton').isDisabled());
 await page.locator('#shareBase').fill('https://example.com/'+'x'.repeat(4200));
 check('链接长度上限提示',await page.locator('#shareError').textContent().then(v=>v.includes('4096')));
 await page.locator('[data-action=close-dialog]').first().click();
 await page.evaluate(()=>openModel('wave'));
 check('减少动态效果下默认静止',await page.evaluate(()=>reducedMotion.matches&&!state.running&&!state.geoSpin));
 await page.locator('#range-amp').focus();const amp=await page.evaluate(()=>state.p.amp);await page.keyboard.press('ArrowRight');
 check('非三维参数方向键微调',await page.evaluate(v=>state.p.amp>v,amp));
 await page.keyboard.press('Space');check('滑块聚焦时空格播放',await page.evaluate(()=>state.running));await page.keyboard.press('Space');check('滑块聚焦时空格暂停',await page.evaluate(()=>!state.running));
 await page.keyboard.press('Space');await page.waitForTimeout(360);await page.keyboard.press('Space');await page.waitForTimeout(1250);check('播放后暂停及时更新读屏标签',await page.evaluate(()=>!state.running&&$('#simCanvas').getAttribute('aria-label').includes('已暂停')&&!$('#simCanvas').getAttribute('aria-label').includes('播放中')));
 await page.keyboard.press('r');check('滑块聚焦时 R 恢复默认',await page.evaluate(()=>state.p.amp===state.model.defaults.amp));
 await page.locator('#simCanvas').focus();await page.keyboard.press('Tab');check('Tab 可离开画布且无焦点陷阱',await page.evaluate(()=>document.activeElement.id!=='simCanvas'));
 await page.locator('#number-amp').focus();await page.keyboard.press('Space');check('输入数值时不误触播放',await page.evaluate(()=>!state.running));
 await page.evaluate(()=>{window.labelChanges=0;new MutationObserver(list=>window.labelChanges+=list.filter(r=>r.attributeName==='aria-label').length).observe($('#simCanvas'),{attributes:true});for(let i=0;i<50;i++){state.p.amp=1+i/100;renderReadout();}});await page.waitForTimeout(1150);
 check('画布读数标签节流并保留最新值',await page.evaluate(()=>window.labelChanges<=2&&$('#simCanvas').getAttribute('aria-label').includes('传播速度')&&$('#simCanvas').getAttribute('aria-live')==='off'),await page.evaluate(()=>window.labelChanges));
 await page.locator('[data-display-dialog]').click();await page.locator('[data-display=contrast]').check();await page.locator('[data-display=large]').check();await page.locator('[data-action=close-dialog]').first().click();await page.reload();
 check('显示设置持久化',await page.evaluate(()=>document.documentElement.dataset.contrast==='high'&&document.documentElement.dataset.typeSize==='large'));
 check('高对比文字颜色和大字生效',await page.locator('.formula-caption').evaluate(el=>{const s=getComputedStyle(el);return parseFloat(s.fontSize)>=18&&s.color==='rgb(23, 45, 33)';}));
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});for(const id of ['wave','projectile','spring','derivative','solids']){await page.evaluate(id=>openModel(id),id);check(`${id} 大字高对比 ${width}px 无横向溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}if(width!==320)await page.screenshot({path:path.join(out,'display-mode-'+width+'.png'),fullPage:true});}
 await page.locator('[data-display-dialog]').click();await page.locator('[data-display=contrast]').uncheck();await page.locator('[data-display=large]').uncheck();await page.locator('[data-action=close-dialog]').first().click();await page.setViewportSize({width:1440,height:1000});
 for(const id of ['parabola','functions','derivative','projectile','pendulum','wave','spring']){
  // Keep real download clicks below Chromium's burst-download limit.
  await page.waitForTimeout(1200);
  await page.evaluate(id=>{openModel(id);if(state.model.compare)state.compare={...state.p,a:2,v:25};if(state.model.environment){state.p.motionMode='compare';resetSolver();}if(state.model.time)for(let i=0;i<100;i++)updateSimulation(.01);drawStage();},id);
  const before=await page.evaluate(()=>({time:state.time,p:JSON.stringify(state.p),theta:state.theta,omega:state.omega}));
  await page.locator('[data-export-data]').click();const expected=await page.evaluate(()=>({headers:selectedExportChart().columns.map(c=>`${c.name} [${c.unit}]`),rows:selectedExportChart().rows.length}));
  const downloadCSV=page.waitForEvent('download');await page.locator('[data-chart-export=csv]').click();const csv=await downloadCSV,csvPath=path.join(out,`data-${id}.csv`);await csv.saveAs(csvPath);const lines=fs.readFileSync(csvPath,'utf8').replace(/^\ufeff/,'').trimEnd().split(/\r?\n/);
  check(id+' CSV 实际下载行数与表头',lines.length===expected.rows+1&&lines[0]===expected.headers.map(v=>'"'+v+'"').join(','),{actual:lines.length,expected:expected.rows+1,header:lines[0]});
  check(id+' 导出文件名含模型名与时间',/^.+-\d{8}-\d{6}\.csv$/.test(csv.suggestedFilename()));
  checkCSVMathematics(id,lines,before);
  const downloadSVG=page.waitForEvent('download');await page.locator('[data-chart-export=svg]').click();const svg=await downloadSVG,svgPath=path.join(out,`data-${id}.svg`);await svg.saveAs(svgPath);const text=fs.readFileSync(svgPath,'utf8');
  check(id+' SVG 为矢量且无无效坐标',text.includes('<path data-series=')&&!/<image|NaN|Infinity/.test(text)&&text.includes('<metadata>'));
  if(['parabola','functions','projectile'].includes(id)){
   const sx=Number(text.match(/data-x-scale="([^"]+)"/)?.[1]),sy=Number(text.match(/data-y-scale="([^"]+)"/)?.[1]);
   check(id+' SVG 数学坐标等比例',Number.isFinite(sx)&&sx>0&&equal(sx,sy,1e-10),{xScale:sx,yScale:sy});
   if(id==='projectile'){
    const idealPath=text.match(/data-series="理想" d="([^"]+)"/)?.[1]||'',points=[...idealPath.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>[Number(m[1]),Number(m[2])]),slope=points.length>1?-(points[1][1]-points[0][1])/(points[1][0]-points[0][0]):NaN;
    const dt=csvTable(lines).rows[1][0],expectedSlope=1-9.8*dt/(2*(20/Math.SQRT2));
    check('抛体 SVG 45° 起抛角与第一采样段一致',Number.isFinite(slope)&&Math.abs(slope-expectedSlope)<.003&&Math.abs(Math.atan(slope)-Math.PI/4)<.02,{slope,expectedSlope});
   }
  }
  const after=await page.evaluate(()=>({time:state.time,p:JSON.stringify(state.p),theta:state.theta,omega:state.omega}));check(id+' 导出不改变求解状态',JSON.stringify(before)===JSON.stringify(after));
  await page.locator('[data-action=close-dialog]').first().click();
 }
 // A second actual spring download exercises nonconstant damping envelopes and RK4 data.
 await page.waitForTimeout(1200);
 await page.evaluate(()=>{openModel('spring',{...modelById('spring').defaults,springMode:'under',mass:1.2,stiff:18,amp:.45,zeta:.35});for(let i=0;i<100;i++)updateSimulation(.01);drawStage();});
 await page.locator('[data-export-data]').click();const underDownload=page.waitForEvent('download');await page.locator('[data-chart-export=csv]').click();const underCSV=await underDownload,underPath=path.join(out,'data-spring-underdamped.csv');await underCSV.saveAs(underPath);
 const under=csvTable(fs.readFileSync(underPath,'utf8').replace(/^\ufeff/,'').trimEnd().split(/\r?\n/)),w0=Math.sqrt(18/1.2),wd=w0*Math.sqrt(1-.35**2),decay=.35*w0;
 // For x(0)=.45 and v(0)=0, the exact solution fixes both sine and cosine coefficients.
 const displacementError=maxError(under.rows,r=>r[1],r=>.45*Math.exp(-decay*r[0])*(Math.cos(wd*r[0])+decay/wd*Math.sin(wd*r[0])));
 const envelopeError=maxError(under.rows,r=>r[2],r=>.45/Math.sqrt(1-.35**2)*Math.exp(-decay*r[0]));
 check('欠阻尼 CSV 位移与独立解析解一致',under.rows.length>100&&displacementError<1e-8,{maxErrorM:displacementError});
 check('欠阻尼 CSV 包络随时间衰减且覆盖位移',envelopeError<1e-12&&under.rows.every((r,i)=>equal(r[2],-r[3])&&Math.abs(r[1])<=r[2]+1e-10&&(!i||r[2]<=under.rows[i-1][2]))&&under.rows.at(-1)[2]<under.rows[0][2],{envelopeError});
 await page.locator('[data-action=close-dialog]').first().click();
 await page.evaluate(()=>{openModel('functions',{...modelById('functions').defaults,kind:'reciprocal',h:.137});drawStage();});await page.locator('[data-export-data]').click();
 check('SVG 不跨反比例渐近线连线',await page.evaluate(()=>{const c=selectedExportChart(),svg=svgForChart(c,'test');return c.series[0].breaks[0]===.137&&(svg.match(/data-series="当前函数" d="([^"]*)"/)[1].match(/M/g)||[]).length===2;}));await page.locator('[data-action=close-dialog]').first().click();
 await page.evaluate(()=>{openModel('spring',{...modelById('spring').defaults,springMode:'forced'});});await page.locator('[data-export-data]').click();
 await page.locator('#exportChart').selectOption('1');check('受迫弹簧导出共振曲线及 Hz 单位',await page.evaluate(()=>selectedExportChart().rows.length===601&&selectedExportChart().columns[0].unit==='Hz'&&selectedExportChart().markers.length===2));await page.locator('[data-action=close-dialog]').first().click();
 // A separately registered model works without adding a core switch branch.
 const pluginPage=await context.newPage();pluginPage.on('pageerror',e=>errors.push(e.message));await pluginPage.route('**/app.js',route=>route.fulfill({contentType:'text/javascript',body:`ZhixiangModels.register({id:'qa-plugin',cat:'math',level:'高中',title:'测试模型',desc:'注册接口检查',tags:'测试',defaults:{n:2},controls:[['n','n','测试参数',1,9,1,'']],draw(ctx,w,h,p){ctx.fillText(String(p.n),20,30);},readout(p){return{formula:'n='+p.n,caption:'',metrics:[['n',String(p.n),'']]};}});\n`+fs.readFileSync(path.join(root,'app.js'),'utf8')}));await pluginPage.goto(baseURL+'/index.html#model=qa-plugin');await pluginPage.locator('#range-n').fill('5');
 check('新注册模型无需核心分支即可打开、调参和配置导入',await pluginPage.evaluate(()=>state.p.n===5&&readout(state.model,state.p).formula==='n=5'&&validateImport(currentConfig()).params.n===5));
 await pluginPage.close();
 await page.goto('file://'+path.join(root,'standalone.html')+'#'+hash);check('离线单文件包含注册表、分享解码和导出',await page.evaluate(()=>MODELS.length===22&&state.p.v===27.3&&typeof state.model.exportData==='function'));
 await page.locator('[data-action=share]').click();await page.locator('[data-action=copy-link]').click();check('离线可生成公开页面的参数二维码',await page.locator('#shareQR svg').count()===1&&await page.locator('#shareURL').inputValue().then(v=>v.startsWith('https://zhixiang-classroom.pages.dev/')));
 check('C1-C7 页面控制台无异常',errors.length===0,errors);
})().catch(e=>{check('测试未完成',false,e.stack);}).finally(async()=>{await browser?.close();fs.writeFileSync(path.join(out,'maintenance-browser-results.json'),JSON.stringify({date:new Date().toISOString(),results,errors},null,2));console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;});
