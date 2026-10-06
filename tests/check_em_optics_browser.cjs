/* Actual input, synchronized plots, image output, v1 config and offline checks. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('./runtime.cjs').loadPlaywright();
const root=path.resolve(__dirname,'..'),out=require('./runtime.cjs').outputDir;fs.mkdirSync(out,{recursive:true});
const results=[],errors=[],remote=[];let browser;
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith((require('./runtime.cjs').baseURL + '/')))remote.push(r.url());});
 await page.goto((require('./runtime.cjs').baseURL + '/index.html?qa=em-optics'));
 check('22 个模型、物理 12 个，首页结构保留',await page.locator('.model-card').count()===22&&await page.locator('[data-category=physics] small').innerText()==='12');
 const draw=async()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const fill=async(key,value)=>{await page.locator('#number-'+key).fill(String(value));await page.locator('#number-'+key).press('Tab');await draw();};
 const metric=async label=>page.evaluate(label=>[...document.querySelectorAll('.metric')].find(e=>e.querySelector('span').textContent===label)?.querySelector('strong').textContent,label);
 const open=async id=>{await page.evaluate(id=>openModel(id),id);await draw();};
 const capture=async name=>{await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});});await draw();await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});};
 await page.locator('[data-filter=physics]').click();await page.locator('#gradeFilter').selectOption('高中');await page.locator('#searchInput').fill('感应');
 check('电磁感应可按学科、学段和搜索找到',await page.locator('.model-card').count()===1);await page.locator('[data-open=induction]').click();await draw();
 check('感应公式、SI 单位和正视方向明确',await page.locator('#formula').innerText().then(t=>t.includes('−dΦ/dt'))&&(await metric('磁通量 Φ')).endsWith('Wb')&&(await metric('感应电动势 ε')).endsWith('V')&&await page.locator('#formulaCaption').innerText().then(t=>t.includes('磁铁侧')));
 await page.locator('#timeline').fill('250');await draw();check('N 极靠近、Φ 和 ε 图共用时刻',(await metric('电流方向'))==='逆时针'&&await page.evaluate(()=>state.time===2&&stageInfo.current.time===2&&stageInfo.charts[0].x(2)===stageInfo.charts[1].x(2)&&stageInfo.current.emf>0));
 await capture('induction-magnet-desktop');
 await page.locator('#timeline').fill('750');check('远离时电流方向反转',(await metric('电流方向'))==='顺时针');
 await page.locator('#timeline').fill('500');check('最近点电动势为零，磁通仍非零',(await metric('感应电动势 ε'))==='0V'&&await page.evaluate(()=>SCIENCE.inductionState(state.p,state.time).flux!==0));
 await page.locator('#science-fieldSign').selectOption('positive');await page.locator('#timeline').fill('250');check('反转磁极也反转电流',(await metric('电流方向'))==='顺时针');
 // Record the rejection and subsequent rendering: a pending animation frame
 // must not erase validation feedback while the rejected value stays unchanged.
 await page.evaluate(()=>{
  window.__resistanceNoticeTrace=[];
  window.__noticeBeforeResistanceCheck=updateScienceNotice;
  updateScienceNotice=function(message=''){
   window.__noticeBeforeResistanceCheck(message);
   window.__resistanceNoticeTrace.push({at:performance.now(),message,notice:document.querySelector('#scienceNotice')?.textContent,resistance:state.p.resistance,pendingFrame,lastReadout,caller:new Error().stack.split('\n').slice(2,5).join(' / ')});
  };
 });
 await fill('resistance',0);
 const resistanceRejection=await page.evaluate(()=>{
  const beforeRefresh=document.querySelector('#scienceNotice').textContent;
  // Reproduce the readout refresh scheduled by preceding timeline/select edits.
  renderReadout();
  const snapshot={resistance:state.p.resistance,notice:document.querySelector('#scienceNotice').textContent,beforeRefresh,input:document.querySelector('#number-resistance').value,events:window.__resistanceNoticeTrace};
  updateScienceNotice=window.__noticeBeforeResistanceCheck;
  delete window.__noticeBeforeResistanceCheck;delete window.__resistanceNoticeTrace;
  return snapshot;
 });
 check('零电阻拒绝并保留原值',resistanceRejection.resistance===2&&resistanceRejection.notice.includes('大于 0'),resistanceRejection);
 await fill('resistance',3);
 check('合法电阻输入清除旧错误提示',await page.evaluate(()=>state.p.resistance===3&&!$('#scienceNotice').dataset.inputError&&!$('#scienceNotice').textContent.includes('大于 0')));
 await fill('resistance',0);await page.locator('[data-action=reset]').click();await draw();
 check('重置清除错误提示并恢复默认',await page.evaluate(()=>state.p.resistance===2&&!$('#scienceNotice').dataset.inputError&&!$('#scienceNotice').textContent.includes('大于 0')));
 await fill('resistance',0);await open('double-slit');
 check('切换模型不继承输入错误',await page.evaluate(()=>state.model.id==='double-slit'&&!$('#scienceNotice').dataset.inputError&&!$('#scienceNotice').textContent.includes('电阻')));
 await open('induction');
 await fill('period',-1);check('负周期被拒绝',await page.evaluate(()=>state.p.period===8));
 await fill('field',0);await page.locator('#timeline').fill('250');await draw();check('零场所有感应读数为零、画布有效',(await metric('磁通量 Φ'))==='0Wb'&&(await metric('电流方向'))==='无感应电流'&&await page.evaluate(()=>Number.isFinite(stageInfo.current.emf)));
 await page.locator('[data-preset="2"]').click();await page.locator('#timeline').fill('250');await draw();check('匀强场内完全重叠时 Φ=0.009 Wb、ε=0',(await metric('磁通量 Φ'))==='0.009Wb'&&(await metric('感应电动势 ε'))==='0V');
 await page.evaluate(()=>{const e=SCIENCE.inductionEvents(state.p);state.time=(e[0]+e[1])/2;renderReadout();requestDraw();});await draw();check('进场时有感应，面积与磁通一致',await page.evaluate(()=>{const a=stageInfo.current;return a.current<0&&Math.abs(a.flux-state.p.field*a.overlap)<1e-12;}));
 await capture('induction-uniform-desktop');
 await page.evaluate(()=>{state.time=SCIENCE.inductionEvents(state.p)[0];renderReadout();requestDraw();});await draw();
 check('锐边瞬间明确提示、不以有限数替代',await metric('感应电动势 ε')==='此瞬间不定义'&&await page.locator('#scienceNotice').innerText().then(t=>t.includes('锐边'))&&await page.evaluate(()=>stageInfo.current.emf===null));
 await fill('resistance',0);
 check('输入错误不遮盖实时锐边提示',await page.locator('#scienceNotice').innerText().then(t=>t.includes('大于 0')&&t.includes('锐边')));
 await fill('resistance',3);
 check('修正输入后恢复正常物理提示',await page.evaluate(()=>!$('#scienceNotice').dataset.inputError&&!$('#scienceNotice').textContent.includes('大于 0')));
 await page.evaluate(()=>{state.time=SCIENCE.inductionEvents(state.p)[0];renderReadout();requestDraw();});await draw();
 check('电动势图在 8 个事件处分段',await page.evaluate(()=>inductionTraces(state.p).segments.length===9&&inductionTraces(state.p).segments.every(a=>a.every(v=>Number.isFinite(v.emf)))));
 await page.locator('#simCanvas').scrollIntoViewIfNeeded();await draw();
 let pt=await page.evaluate(()=>{const r=$('#simCanvas').getBoundingClientRect(),s=stageInfo;return {x:r.left+s.charts[0].x(2),y:r.top+s.charts[0].top+20};});await page.mouse.click(pt.x,pt.y);check('点击时间图可同步选取时刻',await page.evaluate(()=>Math.abs(state.time-2)<.03&&!state.running));
 await page.locator('#simCanvas').focus();const t=await page.evaluate(()=>state.time);await page.keyboard.press('ArrowRight');check('键盘可推进时间图',await page.evaluate(t=>Math.abs(state.time-t-.05)<1e-12,t));
 await fill('period',2);await page.locator('[data-action=play]').click();await page.waitForFunction(()=>state.time>.1);check('实际播放推进模型',await page.evaluate(()=>state.running));await page.waitForFunction(()=>state.time===2&&!state.running);check('一个往返周期后自动停止',await page.locator('#simulationStatus').innerText()==='演示结束');
 await page.locator('[data-action=play]').click();await page.waitForFunction(()=>state.time>0&&state.time<.5);await page.locator('[data-action=play]').click();check('从末端播放可重新开始',await page.evaluate(()=>state.time<.5&&!state.running));
 await page.locator('#timeline').fill('0');await page.locator('[data-action=step]').click();check('感应模型单步 0.05 s',await page.evaluate(()=>state.time===.05));
 await fill('field',.4);check('调参后暂停并归零',await page.evaluate(()=>state.time===0&&!state.running));
 for(const id of['induction','double-slit']){
  await open(id);if(id==='induction')await page.locator('#timeline').fill('250');
  const baseline=await page.evaluate(()=>JSON.stringify(scienceReadout(state.model,state.p).metrics));
  for(const width of[320,390,768,1024,1440]){
   await page.setViewportSize({width,height:1050});await draw();
   check(id+' '+width+'px 无横向溢出，物理读数不变',await page.evaluate(v=>document.documentElement.scrollWidth<=innerWidth+1&&JSON.stringify(scienceReadout(state.model,state.p).metrics)===v,baseline));
   if(width===390)await capture(id+'-mobile');
  }
 }
 check('双缝默认间距和单位正确',(await metric('条纹间距 Δx'))==='2.75mm');
 check('双缝默认参数满足明确的小角近似范围',await page.locator('.math-details').innerText().then(t=>t.includes('d/L=')&&t.includes('|x|/L≤')));
 await fill('probe',1.375);check('半条纹位置为暗纹且曲线点一致',(await metric('相对强度 I/Imax'))==='0'&&await page.evaluate(()=>stageInfo.probe.intensity===0));
 await fill('probe',2.75);check('第一亮纹位置与 Δx、画面比例一致',(await metric('相对强度 I/Imax'))==='1'&&await page.evaluate(()=>Math.abs(stageInfo.x(stageInfo.data.spacing)-stageInfo.x(0)-stageInfo.spacingPx)<1e-9));
 check('实际条纹像素的亮度峰与强度峰一致',await page.evaluate(()=>{const c=$('#simCanvas'),ctx=c.getContext('2d'),s=stageInfo,scale=c.width/c.clientWidth;const energy=x=>{const v=ctx.getImageData(Math.floor(s.x(x)*scale),Math.floor((s.stripTop+15)*scale),1,1).data;return v[0]+v[1]+v[2];};return energy(0)>energy(s.data.spacing/2)+100;}));
 await page.locator('[data-preset="2"]').click();check('缝距加倍后间距减半',(await metric('条纹间距 Δx'))==='1.375mm');
 await page.locator('[data-preset="3"]').click();check('屏距加倍后间距加倍',(await metric('条纹间距 Δx'))==='5.5mm');
 await page.locator('[data-preset="1"]').click();check('红光预设改变波长及间距',await page.evaluate(()=>state.p.wavelength===650)&&Math.abs(parseFloat(await metric('条纹间距 Δx'))-3.25)<1e-9);
 await page.locator('[data-science-toggle=colorize]').uncheck();check('波长色彩可关闭，数值不变',await page.evaluate(()=>!state.p.colorize)&&(await metric('条纹间距 Δx'))==='3.25mm');
 for(const key of['wavelength','separation','distance','screenHalf']){const before=await page.evaluate(key=>state.p[key],key);await fill(key,0);check('零值 '+key+' 被拒绝',await page.evaluate(([key,before])=>state.p[key]===before,[key,before]));}
 await fill('probe',9);await fill('screenHalf',2);check('缩小屏幕半宽会限制测量点、同步输入范围',await page.evaluate(()=>state.p.probe===2&&$('#number-probe').max==='2'&&$('#number-probe').value==='2'&&$('#range-probe').closest('.param').querySelector('.range-extents').textContent==='-2 mm2 mm'));
 await page.locator('[data-preset="0"]').click();await page.locator('#simCanvas').scrollIntoViewIfNeeded();await draw();
 pt=await page.evaluate(()=>{const r=$('#simCanvas').getBoundingClientRect(),s=stageInfo;return {from:r.left+s.x(0),to:r.left+s.x(.004),y:r.top+s.stripTop+20};});await page.mouse.move(pt.from,pt.y);await page.mouse.down();await page.mouse.move(pt.to,pt.y,{steps:8});await page.mouse.up();await draw();
 check('真实拖动条纹能移动测量点并联动曲线',await page.evaluate(()=>Math.abs(state.p.probe-4)<.03&&Math.abs(stageInfo.probe.x-state.p.probe*1e-3)<1e-12));
 await page.locator('#simCanvas').focus();const probe=await page.evaluate(()=>state.p.probe);await page.keyboard.press('ArrowLeft');check('测量点支持键盘',await page.evaluate(v=>Math.abs(state.p.probe-v+.1)<1e-9,probe));
 await fill('wavelength',380);await fill('separation',1);await fill('distance',.5);await fill('screenHalf',30);check('密纹提示调整视窗、读数仍有限',await page.locator('#scienceNotice').innerText().then(t=>t.includes('过密'))&&await page.locator('#metrics').innerText().then(t=>!(/NaN|Infinity/.test(t))));
 check('外围高阶条纹的相位误差有定量提示',await page.locator('#scienceNotice').innerText().then(t=>t.includes('λ/10')));
 await page.locator('[data-preset="0"]').click();await capture('double-slit-desktop');
 for(const id of['induction','double-slit']){
  await open(id);if(id==='induction'){await page.locator('#science-scenario').selectOption('uniform');await fill('period',7.1234567891);}else{await fill('probe',1.2345678901);await page.locator('[data-science-toggle=colorize]').uncheck();}
  const params=await page.evaluate(()=>JSON.stringify(state.p));
  await page.locator('[data-action=save]').click();await page.locator('#classTitle').fill(id+' 回归');await page.locator('[data-action=confirm-save]').click();await page.evaluate(()=>showLibrary('classes'));await page.locator('[data-class-open]').first().click();
  check(id+' 保存课堂可恢复所有参数',await page.evaluate(([id,params])=>state.model.id===id&&JSON.stringify(state.p)===params&&state.time===0,[id,params]));
  await page.locator('[data-action=share]').click();const file=page.waitForEvent('download');await page.locator('[data-action=export-config]').click();const target=path.join(out,id+'-config.json');await(await file).saveAs(target);await page.locator('[data-action=close-dialog]').click();
  await page.locator('#importFile').setInputFiles(target);await page.locator('[data-action=confirm-import]').click();check(id+' version:1 文件真实导入导出',JSON.parse(fs.readFileSync(target)).version===1&&await page.evaluate(v=>JSON.stringify(state.p)===v,params));
  await page.locator('#simCanvas').scrollIntoViewIfNeeded();await page.locator('[data-action=ink]').click();const box=await page.locator('#annotation').boundingBox();await page.mouse.move(box.x+70,box.y+70);await page.mouse.down();await page.mouse.move(box.x+105,box.y+105,{steps:5});await page.mouse.up();
  check(id+' 板书不改变模型参数',await page.evaluate(v=>state.strokes.length===1&&JSON.stringify(state.p)===v,params));await page.locator('[data-action=ink]').click();
  const image=page.waitForEvent('download');await page.locator('[data-action=screenshot]').click();const imagePath=path.join(out,id+'-export.png');await(await image).saveAs(imagePath);check(id+' 实际导出 PNG',fs.statSync(imagePath).size>20000);
  await page.locator('[data-action=present]').click();check(id+' 大屏可用',await page.locator('body').evaluate(e=>e.classList.contains('presenting')));await page.keyboard.press('Escape');await page.evaluate(()=>exitPresentation());
  await page.locator('.model-question summary').click();await page.locator('#answerButton').click();check(id+' 讨论解答可展开',await page.locator('#answerText').isVisible());
  await page.locator('[data-action=model-info]').click();check(id+' 模型条件和参考资料可查看',await page.locator('#dialogBody').innerText().then(t=>t.includes(id==='induction'?'忽略自感':'小角近似')));await page.locator('[data-action=close-dialog]').click();
 }
 check('旧 v1 格式仍可读取且新测量点按屏宽限幅',await page.evaluate(()=>validateImport({app:'zhixiang',version:1,type:'model',model:'projectile',params:{v:15}}).params.v===15&&safeParams(modelById('double-slit'),{screenHalf:2,probe:30}).probe===2));
 const offline=await context.newPage(),requests=[];offline.on('pageerror',e=>errors.push(e.message));offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 for(const id of['induction','double-slit']){await offline.goto('file://'+path.join(root,'standalone.html')+'#model='+id);await offline.waitForFunction(id=>state.model?.id===id&&stageInfo?.kind===id,id);check('单文件离线打开 '+id,await offline.evaluate(()=>!!stageInfo&&Number.isFinite(stageInfo.kind==='induction'?stageInfo.current.flux:stageInfo.probe.intensity))&&requests.length===0);}
 check('分文件无远程运行依赖',remote.length===0,remote);check('浏览器无脚本异常',errors.length===0,errors);
 await browser.close();fs.writeFileSync(path.join(out,'em-optics-browser-results.json'),JSON.stringify({date:new Date().toISOString(),results,errors,remote},null,2));console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
