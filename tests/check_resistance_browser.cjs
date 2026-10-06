const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('./runtime.cjs').loadPlaywright();
const out=require('./runtime.cjs').outputDir,results=[],errors=[];
function check(name,passed,details){results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}`);}
(async()=>{
 const options={headless:true};if(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)options.executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
 const browser=await chromium.launch(options);
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((require('./runtime.cjs').baseURL + '/index.html?qa=resistance#model=projectile'));
  check('旧抛体配置默认理想条件',await page.evaluate(()=>{const p=safeParams(modelById('projectile'),{v:25,angle:30,height:3,g:9.8});return p.motionMode==='ideal'&&p.v===25&&p.area===.0042;}));
  check('旧单摆配置默认无阻尼',await page.evaluate(()=>safeParams(modelById('pendulum'),{angle:60,length:2,g:9.8,mass:.5}).motionMode==='ideal'));
  await page.getByRole('radio',{name:'理想与含阻力对照'}).check();
  check('抛体显示三项并列结果',await page.locator('.condition-results tbody tr').count()===3);
  check('阻力降低抛体射程',await page.evaluate(()=>resistedProjectile(state.p).range<projectileData(state.p).range));
  await page.locator('.resistance-params summary').click();
  await page.locator('#range-area').fill('0.0037');
  check('小面积数值保持四位精度',await page.locator('#number-area').inputValue()==='.0037'||await page.locator('#number-area').inputValue()==='0.0037');
  await page.locator('#number-cd').fill('0');await page.locator('#number-cd').press('Tab');
  check('零阻力时显示结果重合',await page.evaluate(()=>Math.abs(resistedProjectile(state.p).range-projectileData(state.p).range)<1e-12));
  await page.locator('#number-cd').fill('.47');await page.locator('#number-cd').press('Tab');
  await page.locator('#timeline').fill('1000');
  check('时间轴终点包含两种落地结果',await page.evaluate(()=>state.time===projectileDuration(state.p)&&projectileAt(state.p,state.time,true).y===0&&projectileAt(state.p,state.time).y<1e-12));
  await page.locator('[data-action=play]').click();
  check('到达终点可以重新播放',await page.evaluate(()=>state.running&&state.time<projectileDuration(state.p)));
  await page.locator('[data-action=play]').click();
  await page.locator('[data-action=compare]').first().click();await page.locator('#range-v').fill('25');
  await page.evaluate(()=>drawStage());
  check('保留曲线与理想参照分开标注',await page.locator('#comparisonLegend').textContent()==='含阻力理想保留曲线');
  await page.locator('[data-preset="2"]').click();
  check('月球预设为空气密度零',await page.evaluate(()=>state.p.rho===0&&state.p.g===1.62&&Math.abs(resistedProjectile(state.p).range-projectileData(state.p).range)<1e-12));
  const config=await page.evaluate(()=>currentConfig());
  await page.evaluate(c=>openModel(c.model,validateImport(c).params),config);
  check('抛体新配置保存对照条件',await page.evaluate(()=>state.p.motionMode==='compare'&&state.p.rho===0&&state.p.area===.0037));
  await page.evaluate(()=>{openModel('pendulum');});await page.getByRole('radio',{name:'理想与含阻力对照'}).check();
  await page.evaluate(()=>{for(let i=0;i<600;i++)updateSimulation(1/120);renderReadout();drawStage();});
  check('单摆显示四项实时对照',await page.locator('.condition-results tbody tr').count()===4);
  check('单摆机械能衰减且理想参照守恒',await page.evaluate(()=>{const e=pendulumEnergy(state.p,state.theta,state.omega),i=pendulumEnergy(state.p,state.idealTheta,state.idealOmega);return e.kinetic+e.potential<e.total&&Math.abs(i.kinetic+i.potential-i.total)<1e-7;}));
  await page.locator('#range-damping').fill('0');
  await page.evaluate(()=>{for(let i=0;i<600;i++)updateSimulation(1/120);renderReadout();drawStage();});
  check('零阻尼时两种摆完全重合',await page.evaluate(()=>state.theta===state.idealTheta&&state.omega===state.idealOmega));
  await page.locator('#range-damping').fill('0.15');
  const title='单摆阻尼对照';await page.getByRole('button',{name:'保存课堂',exact:true}).click();await page.locator('#classTitle').fill(title);await page.locator('[data-action=confirm-save]').click();
  await page.locator('.sidebar [data-nav=classes]').click();await page.getByRole('button',{name:/打开演示/}).click();
  check('我的课堂恢复阻尼与对照状态',await page.evaluate(()=>state.p.motionMode==='compare'&&state.p.damping===.15));
  const saved=await page.evaluate(()=>currentConfig());
  await page.getByRole('button',{name:'导出参数',exact:true}).click();const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=export-config]').click();const download=await downloadPromise;
  const file=path.join(out,'resistance-config.json');await download.saveAs(file);await page.locator('[data-action=close-dialog]').click();
  check('实际导出文件含新阻尼参数',JSON.parse(fs.readFileSync(file)).params.damping===.15);
  await page.locator('#importFile').setInputFiles(file);await page.locator('[data-action=confirm-import]').click();
  check('实际导入文件恢复对照模式',await page.getByRole('radio',{name:'理想与含阻力对照'}).isChecked());
  for(const width of[1440,768,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const model of['projectile','pendulum']){
    await page.evaluate(model=>openModel(model,{...modelById(model).defaults,motionMode:'compare'}),model);
    await page.evaluate(()=>{updateSimulation(.5);renderReadout();drawStage();});
    check(`${model}对照${width}px无溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#formula').scrollWidth<=document.querySelector('#formula').clientWidth));
    if(width===390||width===1440)await page.screenshot({path:path.join(out,`resistance-${model}-${width}.png`),fullPage:true});
   }
  }
  const imagePromise=page.waitForEvent('download');await page.locator('[data-action=screenshot]').click();const image=await imagePromise;await image.saveAs(path.join(out,'resistance-pendulum-export.png'));
  check('窄屏对照PNG实际导出',fs.statSync(path.join(out,'resistance-pendulum-export.png')).size>5000);
  await page.evaluate(()=>openModel('projectile',{...modelById('projectile').defaults,motionMode:'compare'}));await page.setViewportSize({width:1440,height:1000});await page.locator('#timeline').fill('500');
  const projectilePromise=page.waitForEvent('download');await page.locator('[data-action=screenshot]').click();await(await projectilePromise).saveAs(path.join(out,'resistance-projectile-export.png'));
  check('桌面对照PNG实际导出',fs.statSync(path.join(out,'resistance-projectile-export.png')).size>5000);
  await page.goto('file://'+path.resolve(__dirname,'../standalone.html')+'#model=projectile');
  await page.getByRole('radio',{name:'理想与含阻力对照'}).check();
  check('单文件包含阻力积分与对照',await page.evaluate(()=>state.p.motionMode==='compare'&&resistedProjectile(state.p).completed));
  check('对照模式控制台无异常',errors.length===0,errors);
 }finally{await browser.close();}
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'resistance-browser-results.json'),JSON.stringify({date:new Date().toISOString(),checks:results.length,passed:results.filter(r=>r.passed).length,errors,results},null,2));
 console.log(`RESULT ${results.filter(r=>r.passed).length}/${results.length}`);if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
