/* Real controls, pointer gestures, playback, v1 data and offline export. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('./runtime.cjs').loadPlaywright();
const root=path.resolve(__dirname,'..'),out=require('./runtime.cjs').outputDir;fs.mkdirSync(out,{recursive:true});
const results=[],errors=[],remote=[];let browser;
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith((require('./runtime.cjs').baseURL + '/')))remote.push(r.url());});
 await page.goto((require('./runtime.cjs').baseURL + '/index.html?qa=science'));
 check('22 个模型全部保留',await page.locator('.model-card').count()===22);
 for(const [cat,count] of[['math',8],['physics',12],['geography',2]]){await page.locator('[data-filter='+cat+']').click();check(cat+' 分类数量',await page.locator('.model-card').count()===count);}
 await page.locator('[data-filter=all]').click();await page.locator('#gradeFilter').selectOption('高中');await page.locator('#searchInput').fill('圆周');
 check('高中筛选可找到圆周运动',await page.locator('.model-card').count()===1);await page.locator('[data-open=circular]').click();
 const fill=async(key,value)=>{await page.locator('#number-'+key).fill(String(value));await page.locator('#number-'+key).press('Tab');};
 check('水平向心量、周期与单位显示',await page.locator('#metrics').innerText().then(t=>t.includes('周期 T')&&t.includes('m/s²')&&t.includes('径向合力')));
 await page.locator('[data-action=play]').click();await page.waitForFunction(()=>state.time>.1);await page.locator('[data-action=play]').click();
 check('水平播放使用解析位置',await page.evaluate(()=>{const d=SCIENCE.circularData(state.p,state.circular);return Math.abs(d.x-state.p.radius*Math.sin(state.p.omega*state.time))<1e-12&&Math.abs(d.y+state.p.radius*Math.cos(state.p.omega*state.time))<1e-12;}));
 await page.locator('[data-preset="1"]').click();check('竖直模式显示最高点临界速度与起点',await page.locator('#science-start').count()===1&&await page.locator('#metrics').innerText().then(t=>t.includes('√(gr)')));
 await page.locator('[data-action=play]').click();await page.waitForFunction(()=>state.time>.15);await page.locator('[data-action=play]').click();
 check('竖直模式角速度随高度变化',await page.evaluate(()=>state.circular.omega>state.p.omega&&!state.circular.slack));
 await page.locator('[data-preset="3"]').click();check('最高点低于临界值提示松弛，禁止播放和单步',await page.locator('#formulaCaption').innerText().then(t=>t.includes('绳松弛'))&&await page.locator('[data-action=play]').isDisabled()&&await page.locator('[data-action=step]').isDisabled());
 const frozen=await page.evaluate(()=>({...state.circular}));await page.waitForTimeout(100);check('松弛状态不再前进',JSON.stringify(frozen)===JSON.stringify(await page.evaluate(()=>state.circular)));
 await page.screenshot({path:path.join(out,'circular-slack.png'),fullPage:true});
 await page.locator('[data-action=critical-speed]').click();check('设置临界值后恢复，张力约为零',await page.locator('[data-action=play]').isEnabled()&&await page.evaluate(()=>Math.abs(SCIENCE.circularData(state.p,state.circular).tension)<1e-8));
 const critical=await page.evaluate(()=>currentConfig());await page.evaluate(c=>openModel(c.model,validateImport(c).params),critical);
 check('临界速度 v1 配置恢复不误报松弛',await page.evaluate(()=>!state.circular.slack));
 await page.locator('#science-start').selectOption('bottom');await fill('omega',4);await page.locator('[data-action=play]').click();await page.waitForFunction(()=>state.circular.slack,{},{timeout:10000});
 check('从最低点积分到松弛事件并自动停止',await page.evaluate(()=>!state.running&&state.time>0&&Math.abs(SCIENCE.circularTension(state.p,state.circular.theta,state.circular.omega))<1e-8));
 await page.locator('[data-action=critical-speed]').click();check('最低点临界按钮使用 √(5gr)',await page.evaluate(()=>Math.abs(state.p.omega*state.p.radius-Math.sqrt(5*state.p.g*state.p.radius))<1e-8));
 await page.locator('[data-action=step]').click();check('单步推进 0.05 s',await page.evaluate(()=>Math.abs(state.time-.05)<1e-12));

 await fill('radius',.3);await fill('g',15);await page.locator('[data-action=critical-speed]').click();
 const extreme=await page.evaluate(()=>currentConfig());await page.evaluate(c=>openModel(c.model,validateImport(c).params),extreme);
 check('最小半径最大重力的临界角速度不被控件或 v1 读取截断',await page.evaluate(()=>state.p.omega>15&&Math.abs(state.p.omega-Math.sqrt(250))<1e-9&&!state.circular.slack));
 await page.evaluate(()=>{window.scrollTo({top:240,behavior:'instant'});openModel('electric');});
 check('打开新模型立即归位，拖动不受上一页滚动影响',await page.evaluate(()=>scrollY===0));await page.waitForTimeout(100);
 check('电荷参数和 SI 单位显示',await page.locator('#metrics').innerText().then(t=>t.includes('N/C')&&t.includes('电势 V'))&&await page.locator('#number-q2').count()===1);
 const worldPoint=async(x,y)=>{const box=await page.locator('#simCanvas').boundingBox(),point=await page.evaluate(({x,y})=>({x:stageInfo.plot.x(x),y:stageInfo.plot.y(y)}),{x,y});return{x:box.x+point.x,y:box.y+point.y};};
 let q=await worldPoint(0,1);await page.mouse.click(q.x,q.y);check('画布点击测量点，读数符合场强叠加',await page.evaluate(()=>Math.abs(state.p.probeX)<1e-5&&Math.abs(state.p.probeY-1)<1e-5&&SCIENCE.electricField(SCIENCE.electricCharges(state.p),state.p.probeX,state.p.probeY).ex>0));
 let start=await worldPoint(-1.5,0),end=await worldPoint(-2,1);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();await page.waitForTimeout(50);
 check('拖动电荷更新数学坐标',await page.evaluate(()=>Math.abs(state.p.x1+2)<1e-5&&Math.abs(state.p.y1-1)<1e-5));
 await page.locator('#science-count').selectOption('3');check('可放置 3 个电荷',await page.locator('#number-q3').count()===1&&await page.evaluate(()=>SCIENCE.electricCharges(state.p).length===3));
 await fill('x3',0);await fill('y3',2);await fill('q3',-2);check('第三个电荷参与叠加',await page.evaluate(()=>SCIENCE.electricCharges(state.p)[2].q===-2));
 await fill('x3',-2);await fill('y3',1);check('拒绝重叠电荷并提示间距',await page.evaluate(()=>state.p.y3===2&&document.querySelector('#scienceNotice').textContent.includes('0.35')));
 await fill('probeX',-2);await fill('probeY',1);check('奇点避让区禁用数值、不显示 Infinity',await page.locator('#formulaCaption').innerText().then(t=>t.includes('避让区'))&&await page.locator('#metrics').innerText().then(t=>!t.includes('Infinity')&&!t.includes('NaN')));
 for(let i=0;i<4;i++){await page.locator('[data-preset="'+i+'"]').click();check('电场预设 '+i+' 可用',await page.evaluate(()=>SCIENCE.electricCharges(state.p).length>=1&&electricPlotData(state.p).lines.length>0));}
 await page.locator('[data-preset="1"]').click();await fill('probeX',0);await fill('probeY',0);check('同号中点零场方向不定义',await page.locator('#formulaCaption').innerText().then(t=>t.includes('方向不定义')));
 await page.locator('[data-preset="0"]').click();await fill('q1',-1);check('单负电荷场线指向电荷',await page.evaluate(()=>electricPlotData(state.p).lines.every(l=>Math.hypot(l.points[0].x,l.points[0].y)>Math.hypot(l.points.at(-1).x,l.points.at(-1).y))));
 await fill('q1',0);check('q=0 无场线或伪奇点',await page.evaluate(()=>electricPlotData(state.p).lines.length===0&&SCIENCE.electricField(SCIENCE.electricCharges(state.p),0,0).valid));
 await page.locator('[data-preset="2"]').click();await page.locator('[data-science-toggle=showField]').uncheck();await page.locator('[data-science-toggle=showPotential]').uncheck();check('场线与等势线可独立隐藏',await page.evaluate(()=>!state.p.showField&&!state.p.showPotential));
 await page.locator('[data-science-toggle=showField]').check();await page.locator('[data-science-toggle=showPotential]').check();
 await page.locator('[data-action=save]').click();await page.locator('#classTitle').fill('电场三模型回归');await page.locator('[data-action=confirm-save]').click();await page.evaluate(()=>showLibrary('classes'));await page.locator('[data-class-open]').first().click();
 check('课堂恢复电场参数与显示选项',await page.evaluate(()=>state.model.id==='electric'&&state.p.q2===-1&&state.p.showPotential));
 await page.locator('[data-action=share]').click();const jsonDownload=page.waitForEvent('download');await page.locator('[data-action=export-config]').click();await(await jsonDownload).saveAs(path.join(out,'science-config.json'));await page.locator('[data-action=close-dialog]').click();
 await page.locator('#importFile').setInputFiles(path.join(out,'science-config.json'));await page.locator('[data-action=confirm-import]').click();check('电场 version:1 文件实际导出导入',JSON.parse(fs.readFileSync(path.join(out,'science-config.json'))).version===1&&await page.evaluate(()=>state.p.q2===-1));
 await page.evaluate(()=>openModel('seasons'));await page.locator('[data-preset="1"]').click();await fill('lat',66.56);check('夏至极圈昼长为 24 h',await page.evaluate(()=>SCIENCE.seasonData(state.p).hours===24));
 await page.locator('[data-preset="3"]').click();check('冬至极圈昼长为 0 h',await page.evaluate(()=>SCIENCE.seasonData(state.p).hours===0));
 await page.locator('[data-preset="0"]').click();await fill('lat',90);check('春分极点边界不错误显示 12 h',await page.locator('#metrics').innerText().then(t=>t.includes('全天位于地平线')&&t.includes('极点临界状态')));
 await fill('lat',31);await page.locator('#science-view').selectOption('top');await page.waitForTimeout(60);check('俯视投影切换',await page.evaluate(()=>stageInfo.orbit.yscale===1&&stageInfo.globe.camera.depth[2]===1));
 const box=await page.locator('#simCanvas').boundingBox(),orbit=await page.evaluate(()=>stageInfo.orbit);await page.mouse.move(box.x+orbit.x,box.y+orbit.y);await page.mouse.down();await page.mouse.move(box.x+orbit.cx,box.y+orbit.cy+orbit.r,{steps:10});await page.mouse.up();
 check('拖动地球联动公转角、节气与直射纬度',await page.evaluate(()=>state.p.phase===90&&SCIENCE.seasonData(state.p).term==='夏至'&&SCIENCE.seasonData(state.p).onTerm&&SCIENCE.seasonData(state.p).date==='约 6月21日'&&Math.abs(SCIENCE.seasonData(state.p).dec-23.44)<1e-10));
 await page.screenshot({path:path.join(out,'seasons-top.png'),fullPage:true});await page.locator('#science-view').selectOption('side');await page.waitForTimeout(60);check('侧视投影保持同一物理读数',await page.evaluate(()=>Math.abs(stageInfo.orbit.yscale-Math.sin(20*Math.PI/180))<1e-12&&Math.abs(SCIENCE.seasonData(state.p).dec-23.44)<1e-10));
 await page.locator('[data-action=play]').click();await page.waitForFunction(()=>state.p.phase>91);await page.locator('[data-action=play]').click();check('公转播放联动示意日期',await page.locator('#metrics').innerText().then(t=>t.includes('约')&&t.includes('夏至 → 小暑')));
 const before=await page.evaluate(()=>({lat:state.p.lat,...SCIENCE.seasonData(state.p)}));await page.locator('[data-action=season-shadow]').click();check('与日影模型使用同一纬度和直射纬度',await page.evaluate(d=>state.model.id==='solar'&&state.p.lat===d.lat&&Math.abs(state.p.dec-d.dec)<.000051&&Math.abs(solarData(state.p).noon-d.noon)<.000051,before));
 await page.evaluate(()=>openModel('seasons',{phase:90,lat:31,view:'side'}));await page.waitForTimeout(80);await page.screenshot({path:path.join(out,'seasons-desktop.png'),fullPage:true});
 for(const width of[320,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  for(const id of['circular','electric','seasons']){
   await page.evaluate(id=>openModel(id),id);await page.waitForTimeout(80);
   check(`${id} ${width}px 无横向溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(id==='seasons')check(`四季 ${width}px 地球图与图例在画布内`,await page.evaluate(()=>stageInfo.globe.cy+stageInfo.globe.r+60<=document.querySelector('#simCanvas').clientHeight));
   if(width===390)await page.screenshot({path:path.join(out,id+'-mobile.png'),fullPage:true});
  }
 }
 for(const id of['circular','electric','seasons']){
  await page.evaluate(id=>openModel(id),id);await page.waitForTimeout(100);
  const values=await page.evaluate(()=>JSON.stringify(readout(state.model,state.p).metrics));await page.setViewportSize({width:1000,height:900});await page.waitForTimeout(80);
  check(id+' 改变窗口不改变数值',values===await page.evaluate(()=>JSON.stringify(readout(state.model,state.p).metrics)));
  await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(80);
  const config=await page.evaluate(()=>JSON.stringify(state.p));await page.locator('[data-action=ink]').click();const b=await page.locator('#annotation').boundingBox();await page.mouse.move(b.x+80,b.y+80);await page.mouse.down();await page.mouse.move(b.x+120,b.y+110,{steps:5});await page.mouse.up();
  check(id+' 板书不操作底层模型',await page.evaluate(c=>state.strokes.length===1&&JSON.stringify(state.p)===c,config));await page.locator('[data-action=ink]').click();
  const png=page.waitForEvent('download');await page.locator('[data-action=screenshot]').click();await(await png).saveAs(path.join(out,id+'-export.png'));check(id+' PNG实际导出',fs.statSync(path.join(out,id+'-export.png')).size>20000);
  await page.locator('[data-action=present]').click();check(id+' 大屏模式',await page.locator('body').evaluate(e=>e.classList.contains('presenting')));await page.keyboard.press('Escape');await page.evaluate(()=>exitPresentation());
 }
 const offline=await context.newPage(),requests=[];offline.on('pageerror',e=>errors.push(e.message));offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await offline.goto('file://'+path.join(root,'standalone.html'));
 for(const id of['circular','electric','seasons']){await offline.evaluate(id=>openModel(id),id);await offline.waitForTimeout(100);check('离线单文件包含 '+id,await offline.locator('#formula').innerText().then(t=>t.length>0));}
 check('离线版零网络请求',requests.length===0,requests);check('分文件版无远程运行依赖',remote.length===0,remote);check('浏览器无脚本异常',errors.length===0,errors);
 await browser.close();fs.writeFileSync(path.join(out,'science-browser-results.json'),JSON.stringify({date:new Date().toISOString(),results,errors},null,2));console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
