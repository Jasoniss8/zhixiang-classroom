'use strict';
const fs = require('node:fs'), path = require('node:path');
const {baseURL,outputDir,loadPlaywright,waitForPresentationExit} = require('./runtime.cjs');
const {chromium} = loadPlaywright();
const added = ['taylor','linear-transform','fourier','gradient','ode','rlc'];
// Frozen independently of the new manifest: the university extension must keep all 22.
const legacy = ['solids','sections','nets','parabola','functions','conics','derivative','trig','projectile','pendulum','wave','refraction','lens','spring','circular','electric','collision','induction','double-slit','gas','solar','seasons'];
const results=[],errors=[]; let browser;
function check(name,passed,details) {results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);}
const launchOptions={headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})};
(async()=>{
  browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(baseURL+'/index.html');
  const inventory=await page.evaluate(()=>({ids:MODELS.map(m=>m.id),cats:Object.fromEntries(['math','physics','geography'].map(c=>[c,MODELS.filter(m=>m.cat===c).length])),three:MODELS.filter(m=>m.threeD).map(m=>m.id)}));
  check('独立旧22模型清单完整保留',legacy.every(id=>inventory.ids.includes(id)),inventory.ids);
  check('大学扩展总数和学科数28/13/13/2',inventory.ids.length===28&&inventory.cats.math===13&&inventory.cats.physics===13&&inventory.cats.geography===2,inventory.cats);
  check('三维筛选四个模型包含独立梯度曲面',inventory.three.length===4&&inventory.three.includes('gradient'),inventory.three);
  await page.locator('#gradeFilter').selectOption('大学');
  check('大学筛选准确显示六个模型',JSON.stringify((await page.locator('.card-open').evaluateAll(nodes=>nodes.map(n=>n.dataset.open))).sort())===JSON.stringify([...added].sort()));
  for(const id of added){
    await page.evaluate(id=>openModel(id),id);
    await page.waitForFunction(()=>stageInfo?.modelId===state.model.id&&!!stageInfo?.uniDrag);
    const details=await page.evaluate(()=>({id:state.model.id,p:{...state.p},formula:document.querySelector('#formula').textContent,caption:document.querySelector('#formulaCaption').textContent,presets:document.querySelectorAll('[data-preset]').length,running:state.running,step:!!document.querySelector('[data-action=step]'),controls:state.model.controls.map(c=>c[0])}));
    check(id+' 默认暂停、三例题与公式完整',!details.running&&details.presets===3&&details.formula.length>5&&details.caption.length>5,details);
    const key=details.controls.find(k=>!['yaw','pitch','scale'].includes(k));
    const precision=await page.evaluate(({id,key})=>{const m=modelById(id),c=m.controls.find(c=>c[0]===key),value=c[3]+(c[4]-c[3])*.3728319415926,p=safeParams(m,{...m.defaults,[key]:value}),hash=encodeShareHash(id,p),roundtrip=safeParams(m,decodeShareParams(new URLSearchParams(hash)));return{same:JSON.stringify(p)===JSON.stringify(roundtrip),value:p[key],raw:value,integer:c[5]===1};},{id,key});
    check(id+' 参数精度与分享往返',precision.same&&(precision.integer||precision.value===precision.raw),precision);
    await page.locator('#simCanvas').focus();
    const before=await page.evaluate(()=>JSON.stringify({p:state.p,time:state.time}));
    await page.keyboard.press('ArrowRight');
    check(id+' 画布键盘可操作',await page.evaluate(value=>JSON.stringify({p:state.p,time:state.time})!==value,before));
    await page.locator('[data-preset="1"]').click();
    check(id+' 例题切换保持有效读数',await page.evaluate(()=>document.querySelector('#formula').textContent.length>5&&!state.running));
    await page.locator('[data-action=reset]').click();
    check(id+' R重置恢复默认参数',await page.evaluate(()=>JSON.stringify(state.p)===JSON.stringify(safeParams(state.model,state.model.defaults))));
    // Real pointer input: sample the plot interior, away from toolbar/annotation.
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const box=await page.locator('#simCanvas').boundingBox();
    const initial=await page.evaluate(()=>JSON.stringify({p:state.p,time:state.time}));
    const hit=await page.evaluate(id=>id==='ode'?{x:stageInfo.plot.x(state.p.t0),y:stageInfo.plot.y(state.p.y0)}:null,id);
    const sx=box.x+(hit?.x??box.width*.3),sy=box.y+(hit?.y??box.height*.4);
    await page.mouse.move(sx,sy);await page.mouse.down();
    await page.mouse.move(sx+box.width*.06,sy+box.height*.04,{steps:6});await page.mouse.up();
    check(id+' 实际拖动改变参数',await page.evaluate(p=>JSON.stringify({p:state.p,time:state.time})!==p,initial));
    if(['linear-transform','gradient'].includes(id)){const event=page.waitForEvent('download');await page.locator('[data-action=screenshot]').click();const file=await event,filename=path.join(outputDir,'university-'+id+'-export.png');await file.saveAs(filename);const png=fs.readFileSync(filename);check(id+' 完整PNG实际下载含图与读数区域',png.subarray(1,4).toString()==='PNG'&&png.readUInt32BE(20)>box.height,{width:png.readUInt32BE(16),height:png.readUInt32BE(20)});}
    await page.screenshot({path:path.join(outputDir,'university-'+id+'-desktop.png'),fullPage:true});
  }
  await page.evaluate(()=>openModel('gradient'));
  check('梯度不出现几何专用工具栏',await page.locator('[data-geo-view]').count()===0&&await page.locator('[data-action=geo-spin]').count()===0);
  const mathBefore=await page.evaluate(()=>JSON.stringify(readout(state.model,state.p).metrics));
  await page.evaluate(()=>uniSetParam('yaw',state.p.yaw+12));
  check('梯度旋转不改变数学读数',await page.evaluate(v=>JSON.stringify(readout(state.model,state.p).metrics)===v,mathBefore));
  await page.evaluate(()=>openModel('rlc'));
  await page.locator('[data-action=step]').click();
  check('RLC 单步采用模型真实时间并显示ms',await page.evaluate(()=>Math.abs(state.time-state.model.playback.step(state.p))<1e-14&&document.querySelector('#timeLabel').textContent.includes('ms')));
  await page.locator('#timeline').fill('500');await page.locator('#timeline').dispatchEvent('input');
  check('RLC 时间轴和读数同步',await page.evaluate(()=>Math.abs(state.time-playbackDuration()/2)<1e-12));
  await page.locator('[data-action=play]').click();await page.waitForTimeout(160);await page.locator('[data-action=play]').click();
  const frozen=await page.evaluate(()=>({time:state.time,metrics:document.querySelector('#metrics').textContent}));
  await page.waitForTimeout(120);
  check('RLC 暂停冻结全部时域读数',await page.evaluate(v=>!state.running&&state.time===v.time&&document.querySelector('#metrics').textContent===v.metrics,frozen));
  await page.evaluate(()=>{state.time=playbackDuration();state.running=false;togglePlay();updateSimulation(playbackDuration());});
  check('RLC 播放到终点自动暂停且可重播',await page.evaluate(()=>!state.running&&state.time===playbackDuration()));
  await page.evaluate(()=>openModel('rlc',{...modelById('rlc').defaults,mode:'steady',resistance:0}));
  await page.locator('[data-action=play]').click();
  check('RLC 非法稳态R=0不能播放且不静默改值',await page.evaluate(()=>!state.running&&state.p.resistance===0&&!state.model.validate(state.p).valid));
  for(const id of ['taylor','fourier','ode','rlc']){
    await page.evaluate(id=>openModel(id),id);await page.locator('[data-action=compare]').click();
    await page.locator('[data-export-data]').click();
    const spec=await page.evaluate(()=>({rows:selectedExportChart().rows.length,columns:selectedExportChart().columns.map(c=>c.name+' ['+c.unit+']')}));
    const csvEvent=page.waitForEvent('download');await page.locator('[data-chart-export=csv]').click();
    const csv=await csvEvent,csvPath=path.join(outputDir,'university-'+id+'.csv');await csv.saveAs(csvPath);
    const lines=fs.readFileSync(csvPath,'utf8').replace(/^\ufeff/,'').trimEnd().split(/\r?\n/);
    check(id+' 实际CSV下载行数/单位/对照列',lines.length===spec.rows+1&&lines[0]===spec.columns.map(v=>'"'+v+'"').join(',')&&spec.columns.some(v=>/comparison|compare/i.test(v)),{header:lines[0],rows:lines.length});
    const svgEvent=page.waitForEvent('download');await page.locator('[data-chart-export=svg]').click();
    const svg=await svgEvent,svgPath=path.join(outputDir,'university-'+id+'.svg');await svg.saveAs(svgPath);
    const svgText=fs.readFileSync(svgPath,'utf8');
    check(id+' 实际SVG为矢量且无非法坐标',svgText.includes('<path')&&svgText.includes('<metadata>')&&!/NaN|Infinity/.test(svgText));
    if(id!=='rlc')check(id+' 静态导出不误标物理时间',!svgText.includes('导出时刻 t='));
    await page.locator('[data-action=close-dialog]').first().click();await page.waitForTimeout(1050);
  }
  await page.evaluate(()=>openModel('gradient'));
  await page.locator('[data-action=present]').click();
  check('新曲面大屏保留独立参数交互',await page.evaluate(()=>state.presenting&&document.body.classList.contains('presenting')&&!!stageInfo.uniDrag));
  await page.locator('[data-action=present]').click();await waitForPresentationExit(page);
  await page.setViewportSize({width:390,height:844});
  for(const id of added){await page.evaluate(id=>openModel(id),id);await page.waitForTimeout(70);check(id+' 390px无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(outputDir,'university-'+id+'-390.png'),fullPage:true});}
  // A real v1 file produced before the university models remains importable.
  await page.evaluate(()=>showLibrary('classes'));await page.locator('#importFile').setInputFiles({name:'legacy-v1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'zhixiang',version:1,type:'model',model:'projectile',title:'旧课堂v1',params:{v:23.4567,angle:36,g:9.8,height:1}}))});
  await page.locator('[data-action=confirm-import]').click();
  check('旧version:1文件实际导入并演示',await page.evaluate(()=>state.model.id==='projectile'&&state.p.v===23.4567));
  const offline=await context.newPage(),remote=[];offline.on('pageerror',e=>errors.push(e.message));offline.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await offline.goto('file://'+path.resolve(__dirname,'../standalone.html'));
  for(const id of added){await offline.evaluate(id=>openModel(id),id);check(id+' 离线单文件可计算',await offline.evaluate(()=>document.querySelector('#formula').textContent.length>5));}
  check('离线六模型不发起HTTP请求',remote.length===0,remote);
  check('新大学模型页面无脚本异常',errors.length===0,errors);
})().catch(e=>check('大学浏览器回归完成',false,e.stack)).finally(async()=>{
  if(browser)await browser.close();fs.writeFileSync(path.join(outputDir,'university-browser-results.json'),JSON.stringify({date:new Date().toISOString(),results,errors,limitations:'Chromium desktop and 390px viewport; not physical mobile hardware.'},null,2));
  console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
});
