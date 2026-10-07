/* Actual controls, pointer dragging, v1 persistence, PNG download and responsive/offline checks. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('./runtime.cjs').loadPlaywright();
const root=path.resolve(__dirname,'..'),out=require('./runtime.cjs').outputDir;fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];let browser;
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto((require('./runtime.cjs').baseURL + '/index.html?qa=advanced'));
 check('数学与科学模型共28个',await page.locator('.model-card').count()=== 28);
 await page.locator('#gradeFilter').selectOption('高中');await page.locator('#searchInput').fill('圆锥曲线');
 check('高中筛选与圆锥曲线搜索',await page.locator('.model-card').count()===1);
 await page.locator('[data-open="conics"]').click();
 await page.locator('#simCanvas').waitFor();await page.waitForTimeout(70);
 check('椭圆焦距、距离和与比值显示',await page.locator('#metrics').innerText().then(t=>t.includes('半焦距')&&t.includes('|PF₁|+|PF₂|')&&t.includes('焦点距离 / 准线距离')));
 const fill=async(key,value)=>{await page.locator('#number-'+key).fill(String(value));await page.locator('#number-'+key).press('Tab');};
 await fill('b',5);check('禁止椭圆 b>a 并给出提示',await page.evaluate(()=>state.p.b===3&&document.querySelector('#mathNotice').textContent.includes('a≥b')));
 await page.locator('[data-preset="3"]').click();check('圆边界明确显示',await page.locator('#formulaCaption').innerText().then(t=>t.includes('圆的准线')));
 await page.locator('[data-preset="0"]').click();await page.waitForTimeout(50);
 async function dragPoint(xShift,yShift){
  await page.locator('#simCanvas').scrollIntoViewIfNeeded();
  // Wait for the requested redraw and any scroll/layout change before locating P.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const point=await page.evaluate(()=>{const canvas=document.querySelector('#simCanvas'),box=canvas.getBoundingClientRect();return{x:box.x+(stageInfo.plot.x(stageInfo.point.x)+(stageInfo.dx||0))*box.width/canvas.clientWidth,y:box.y+(stageInfo.plot.y(stageInfo.point.y)+(stageInfo.dy||0))*box.height/canvas.clientHeight};});
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+xShift,point.y+yShift,{steps:8});await page.mouse.up();
 }
 const angle=await page.evaluate(()=>state.p.angle);await dragPoint(-60,30);
 check('拖动椭圆 P 并保持定义恒等',await page.evaluate(old=>state.p.angle!==old&&Math.abs(MATH_TOOLS.conicMeasurements(state.p).invariant-2*state.p.a)<1e-9,angle));
 await page.locator('#math-kind').selectOption('hyperbola');await page.locator('#math-branch').selectOption('left');await fill('u',.3);await page.waitForTimeout(40);await dragPoint(-10,-25);
 check('双曲线两支、渐近线与距离差',await page.evaluate(()=>state.p.branch==='left'&&Math.abs(MATH_TOOLS.conicMeasurements(state.p).invariant-2*state.p.a)<1e-9)&&await page.locator('.math-details').innerText().then(t=>t.includes('±')));
 await page.locator('#math-kind').selectOption('parabola');check('抛物线 p 控件与等距定义',await page.locator('#number-p').count()===1&&await page.evaluate(()=>Math.abs(MATH_TOOLS.conicMeasurements(state.p).ratio-1)<1e-9));
 await page.locator('#math-mode').selectOption('unified');
 for(const [e,type] of[[0,'圆'],[.6,'椭圆'],[.9999,'椭圆'],[1,'抛物线'],[1.0001,'双曲线'],[1.8,'双曲线']]){await fill('e',e);check(`统一定义 e=${e} 显示${type}`,await page.locator('#metrics .metric').first().innerText().then(t=>t.includes(type)));}
 await fill('e',1);await fill('angle',180);check('无穷远方向不输出 NaN/Infinity',await page.locator('#metrics').innerText().then(t=>t.includes('无穷远')&&!/NaN|Infinity/.test(t)));
 await page.locator('[data-action="reset-point"]').click();await page.locator('[data-action="compare"]').first().click();await fill('e',.6);check('新模型保留对照曲线',await page.evaluate(()=>state.compare.e===1&&state.p.e===.6));
 await page.screenshot({path:path.join(out,'conics-desktop.png'),fullPage:true});
 await page.evaluate(()=>openModel('derivative'));await page.waitForTimeout(50);
 check('原函数与导函数、差分误差均显示',await page.locator('#metrics').innerText().then(t=>t.includes('中心差分导数')&&t.includes('两种导数的绝对差')));
 const x0=await page.evaluate(()=>state.p.x0);await dragPoint(35,0);check('拖动切点并联动导函数',await page.evaluate(old=>state.p.x0!==old&&Math.abs(MATH_TOOLS.derivativeReadings(state.p).error)<1e-7,x0));
 await fill('h',1);for(let i=0;i<16;i++)await page.locator('#halveH').click();check('h连续减半不受4位小数截断',await page.evaluate(()=>Math.abs(state.p.h-1/65536)<1e-10));
 await fill('h',0);check('h=0 显示极限且禁用减半',await page.locator('#halveH').isDisabled()&&await page.locator('#formulaCaption').innerText().then(t=>t.includes('割线斜率未定义')));
 await fill('a',.123456789);check('公式保留高精度系数',await page.locator('#formula').innerText().then(t=>t.includes('0.123456789x³')));await fill('a',.25);
 for(const kind of['poly','sin','exp','log','reciprocal']){await page.locator('#math-kind').selectOption(kind);await fill('x0',1);await fill('h',.2);check(`函数${kind}解析与差分一致`,await page.evaluate(()=>MATH_TOOLS.derivativeReadings(state.p).error<1e-7));}
 await page.locator('#math-kind').selectOption('log');await fill('x0',-1);check('定义域外切点输入被拒绝并提示',await page.evaluate(()=>state.p.x0===1&&document.querySelector('#mathNotice').textContent.includes('不在定义域')));
 await fill('x0',1e-12);check('小于输入精度的切点不被舍入到奇点',await page.evaluate(()=>state.p.x0===1&&document.querySelector('#mathNotice').textContent.includes('输入精度')));
 await fill('x0',.001);check('接近奇点显示边界提示',await page.locator('#formulaCaption').innerText().then(t=>t.includes('靠近 x=0')));
 await page.locator('#math-kind').selectOption('reciprocal');await fill('x0',-.2);await fill('h',.4);check('割线跨0禁用',await page.locator('#formulaCaption').innerText().then(t=>t.includes('越过 x = 0')));
 await page.evaluate(()=>openModel('derivative',{kind:'log',x0:-1}));check('导入非法定义域时切线与割线禁用',await page.locator('#halveH').isDisabled()&&await page.locator('#metrics').innerText().then(t=>t.includes('定义域外')));
 await page.locator('[data-preset="1"]').click();check('水平切线不误判极值',await page.locator('.math-details').innerText().then(t=>t.includes('驻点（非极值）')));
 await page.locator('[data-preset="0"]').click();await fill('h',.0000123456);
 check('数值输入框与实际 h 精度一致',await page.locator('#number-h').inputValue()==='0.0000123456');
 const config=await page.evaluate(()=>currentConfig());check('新模型仍导出 version:1 且保留 h 精度',config.version===1&&config.params.h===.0000123456);
 await page.locator('[data-action="save"]').click();await page.locator('#classTitle').fill('导数回归');await page.locator('[data-action="confirm-save"]').click();await page.evaluate(()=>showLibrary('classes'));await page.locator('[data-class-open]').first().click();
 check('课堂恢复新模型参数',await page.evaluate(()=>state.model.id==='derivative'&&state.p.h===.0000123456));
 check('原有 version:1 配置兼容',await page.evaluate(()=>validateImport({app:'zhixiang',version:1,type:'model',model:'parabola',params:{a:2,h:1,k:3}}).params.k===3));
 await page.waitForTimeout(50);await page.screenshot({path:path.join(out,'derivative-desktop.png'),fullPage:true});
 for(const width of[320,390,768,1440]){await page.setViewportSize({width,height:1000});for(const id of['conics','derivative']){await page.evaluate(id=>openModel(id),id);await page.waitForTimeout(60);check(`${id} ${width}px 无横向溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===390)await page.screenshot({path:path.join(out,`${id}-mobile.png`),fullPage:true});}}
 for(const id of['conics','derivative']){
  await page.evaluate(id=>openModel(id),id);await page.waitForTimeout(60);
  await page.locator('[data-action="compare"]').first().click();await fill('a',id==='conics'?5:.5);
  await page.locator('[data-action="ink"]').click();const box=await page.locator('#annotation').boundingBox();await page.mouse.move(box.x+80,box.y+80);await page.mouse.down();await page.mouse.move(box.x+120,box.y+110,{steps:4});await page.mouse.up();
  check(`${id} 板书不拖动模型`,await page.evaluate(()=>state.strokes.length===1));await page.locator('[data-action="ink"]').click();
  const download=page.waitForEvent('download');await page.locator('[data-action="screenshot"]').click();const file=await download;await file.saveAs(path.join(out,`export-${id}.png`));check(`${id} PNG实际导出`,fs.statSync(path.join(out,`export-${id}.png`)).size>10000);
  await page.locator('[data-action="present"]').click();check(`${id} 大屏模式`,await page.locator('body').evaluate(el=>el.classList.contains('presenting')));await page.keyboard.press('Escape');await page.evaluate(()=>exitPresentation());
 }
 const offline=await context.newPage(),network=[];offline.on('pageerror',e=>errors.push(e.message));offline.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});await offline.goto('file://'+path.join(root,'standalone.html'));
 for(const id of['conics','derivative']){await offline.evaluate(id=>openModel(id),id);await offline.waitForTimeout(50);check(`离线单文件模型${id}`,await offline.locator('#formula').innerText().then(t=>t.length>0));}
 check('离线版无网络请求',network.length===0,network);check('新模型浏览器无脚本异常',errors.length===0,errors);
 await browser.close();fs.writeFileSync(path.join(out,'advanced-browser-results.json'),JSON.stringify({date:new Date().toISOString(),results,errors},null,2));console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
