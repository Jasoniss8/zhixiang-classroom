/* Real-page university question review, fixed calculations and offline workflow. */
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {baseURL,outputDir,loadPlaywright}=require('./runtime.cjs');
const {chromium}=loadPlaywright(),q=require('../question-matcher.js');
const results=[],errors=[],external=[];let browser;
const check=(name,passed,details)=>{results.push({name,passed:!!passed,details});console.log(`${passed?'PASS':'FAIL'} ${name}${passed?'':' '+JSON.stringify(details)}`);};
const examples=q.types.filter(t=>t.university);
async function questions(page){if(!await page.locator('#questionText').isVisible())await page.locator('[data-nav="questions"]:visible').first().click();await page.locator('#questionText').waitFor({state:'visible'});}
async function analyze(page,text,type='auto'){await questions(page);await page.locator('#questionText').fill(text);await page.locator('#questionType').selectOption(type);await page.locator('#matchQuestion').click();}
async function open(page){await page.locator('#questionConfirm').check();if(!await page.locator('#openQuestionModel').isEnabled())throw Error('不能进入模型: '+await page.locator('#questionResult').innerText());await page.locator('#openQuestionModel').click();await page.locator('#simCanvas').waitFor({state:'visible'});}
async function change(page,key,value){await page.evaluate(({key,value})=>{setParam(key,value);requestDraw();updateQuestionVariation();},{key,value});}
function observe(page){page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(baseURL+'/'))external.push(r.url());});}
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
 const page=await context.newPage();observe(page);await page.goto(baseURL+'/index.html#view=questions');
 check('六大学题与四旧题入口可见',await page.locator('[data-question-example]').count()===10&&await page.locator('#questionType option').count()===11);
 const expected={taylor:{kind:'sin',amp:1,offset:0,center:0,degree:5,probe:.5},'linear-transform':{m11:1,m12:2,m21:0,m22:1,vx:2,vy:-1,tau:1},fourier:{kind:'square',amplitude:1,period:2*Math.PI,terms:9,probe:Math.PI/4},gradient:{surface:'quadratic',a:1,b:1,c:2,x0:1,y0:2},ode:{kind:'linear',a:1,b:-1,c:0,t0:0,y0:1,h:.1,span:2},rlc:{mode:'steady',resistance:20,inductance:100,capacitance:100,driveVoltage:10,frequency:50}};
 const viewOnly={taylor:['span',4],'linear-transform':['tau',.5],fourier:['harmonic',3],gradient:['yaw',20],ode:['K',4],rlc:['voltage0',10]};
 const mathField={taylor:['degree',3],'linear-transform':['m11',2],fourier:['terms',7],gradient:['a',2],ode:['a',.5],rlc:['resistance',30]};
 for(const type of examples){
  await questions(page);await page.locator(`[data-question-example="${type.id}"]`).click();
  check(type.id+' 必须核对后进入',await page.locator('#openQuestionModel').isDisabled());
  check(type.id+' 核对页展示固定步骤',await page.locator('#questionStepPreview .question-calculation-steps li').count()>=2);
  await open(page);
  const actual=await page.evaluate(()=>({id:state.model.id,p:state.p,running:state.running}));
  check(type.id+' 精确映射参数',actual.id===type.id&&Object.entries(expected[type.id]).every(([k,v])=>typeof v==='number'?Math.abs(actual.p[k]-v)<1e-12:actual.p[k]===v),actual);
  check(type.id+' 固定步骤保留原题且默认暂停',await page.locator('#questionSteps li').count()>=2&&(await page.locator('#questionContext').innerText()).includes(type.example)&&!actual.running);
  check(type.id+' 原题不写入hash或存储',!decodeURIComponent(new URL(page.url()).hash).includes(type.example)&&await page.evaluate(text=>!Object.keys(localStorage).some(k=>String(localStorage.getItem(k)).includes(text)),type.example));
  const originalSteps=await page.locator('#questionSteps').innerText();
  await change(page,...viewOnly[type.id]);check(type.id+' 仅视图或无关参数不提示变式',!(await page.locator('#questionVariation').innerText()).includes('当前为变式'));
  await change(page,...mathField[type.id]);check(type.id+' 改计算参数标明变式且同步更新步骤',(await page.locator('#questionVariation').innerText()).includes('当前为变式')&&await page.locator('#questionSteps').innerText()!==originalSteps);
  check(type.id+' 变式步骤结果与纯计算一致',await page.evaluate(id=>{
    const p=state.p,format=n=>String(Number(n.toPrecision(12))),text=document.querySelector('#questionSteps').textContent;
    const value=id==='taylor'?ZhixiangUniversityMath.taylorData(p).approx:id==='linear-transform'?ZhixiangUniversityMath.linearData({...p,tau:1}).output[0]:id==='fourier'?ZhixiangUniversityDynamics.fourierSum(p,p.probe):id==='gradient'?ZhixiangUniversityMath.gradientData(p).fx:id==='ode'?ZhixiangUniversityDynamics.odeExact(p,p.t0+p.span):ZhixiangPhysics.rlcResponse(p).currentAmplitude;
    return text.includes(format(value));
  },type.id));
  await page.locator('#questionOriginal').click();check(type.id+' 一键还原题设',await page.evaluate(({key,value})=>state.p[key]===value,{key:mathField[type.id][0],value:expected[type.id][mathField[type.id][0]]})&&await page.locator('#questionSteps').innerText()===originalSteps);
 }
 await page.screenshot({path:path.join(outputDir,'university-question-rlc-desktop.png'),fullPage:true});
 await analyze(page,'泰勒展开f(x)=sin(x)，a=0，N=5，求近似值。');
 await page.locator('#questionConfirm').check();check('泰勒数值求值缺probe不可进入',await page.locator('#openQuestionModel').isDisabled()&&!(await page.locator('label[for="question-field-probe"]').innerText()).includes('可选'));
 await page.locator('[data-question-field="probe"]').fill('.5');check('补填条件取消核对',!await page.locator('#questionConfirm').isChecked());await open(page);
 await analyze(page,'泰勒展开f(x)=sin(x)，a=0，N=5。');await open(page);check('不求数值时不伪造已知求值点',!(await page.locator('.question-known').innerText()).includes('求值点'));
 const taylorSteps=await page.locator('#questionSteps').innerText();await change(page,'probe',1.5);check('Taylor未给求值点时探针仅演示，不提示变式',!(await page.locator('#questionVariation').innerText()).includes('当前为变式')&&await page.locator('#questionSteps').innerText()===taylorSteps);
 await analyze(page,examples.find(t=>t.id==='taylor').example);await open(page);await change(page,'probe',.75);check('Taylor题给求值点变化时同步步骤并提示变式',(await page.locator('#questionVariation').innerText()).includes('当前为变式')&&(await page.locator('#questionSteps').innerText()).includes('x=0.75'));
 await analyze(page,'矩阵A=[[1,2],[3,4]]，求det(A)。');
 check('det模板隐藏非必要向量输入',await page.locator('[data-question-field="vx"]').count()===0);check('原题计算任务锁定，不能改任务绕过缺参',await page.locator('[data-question-field="task"]').isDisabled());
 await analyze(page,'f(x,y)=x²+y²，P=(1,2)，求方向导数。');await page.locator('#questionConfirm').check();check('方向导数缺方向不得默认theta',await page.locator('#openQuestionModel').isDisabled());
 await page.locator('[data-question-field="theta"]').fill('90');await open(page);check('方向补填后计算步骤显示方向导数',(await page.locator('#questionSteps').innerText()).includes('方向导数'));
 await analyze(page,"微分方程y'=x-y，y(0)=1。");await page.locator('#questionConfirm').check();check('ODE缺目标或区间阻止进入',await page.locator('#openQuestionModel').isDisabled());
 await page.locator('[data-question-field="span"]').fill('2');await open(page);check('ODE可核对补填正向区间',await page.evaluate(()=>state.p.span===2));
 await analyze(page,'串联RLC，R=20Ω，L=0.1H，C=0.0001F，正弦电源有效值U=10V，f=50Hz，求稳态电流幅值。');await open(page);
 check('RLC有效值通过页面精确转峰值',await page.evaluate(()=>Math.abs(state.p.driveVoltage-10*Math.SQRT2)<1e-12));
 check('RLC固定步骤用SI单位且电流相位符号正确',/L=0.1H/.test(await page.locator('#questionSteps').innerText())&&/相位=1\.188/.test(await page.locator('#questionSteps').innerText()));
 await analyze(page,examples.find(t=>t.id==='fourier').example);await open(page);await change(page,'probe',.9);check('给定Fourier求值点改变必须标变式',(await page.locator('#questionVariation').innerText()).includes('当前为变式'));
 await analyze(page,'串联RLC电路，R=20Ω，L=100mH，C=100μF，正弦电源电压U=10V，频率f=50Hz，电流峰值是多少？');await page.locator('#questionConfirm').check();check('所求电流峰值不代填电源类型',await page.locator('[data-question-field="voltageKind"]').inputValue()===''&&await page.locator('#openQuestionModel').isDisabled());
 const rejects=[['taylor','泰勒展开f(x)=sin(x)+x，a=0，N=5。'],['linear-transform','矩阵A=[[1,2],[3,4]]，求特征值。'],['fourier','标准奇方波，A=1，T=2，N=5，占空比0.2。'],['gradient','f(x,y)=x²+y²+sin(x)，P=(1,2)，求梯度。'],['ode',"微分方程y'=x-y+sin(x)，y(0)=1，求y(2)。"],['rlc','并联RLC，R=20Ω，L=100mH，C=100μF，正弦电源峰值10V，f=50Hz。']];
 rejects.push(['rlc',examples.find(t=>t.id==='rlc').example.replace('R=20Ω','R=20Ω/π')],['rlc',examples.find(t=>t.id==='rlc').example.replace('正弦电源','非正弦电源')],['ode','dy/dt=x-y，y(0)=1，求y(2)。'],['linear-transform','矩阵A=[[1,2],[0,1]]，求A的转置。']);
 for(const [id,text]of rejects){await analyze(page,text,id);await page.locator('#questionConfirm').check();check(id+' 手动选型核对也不能绕过不支持条件',await page.locator('#openQuestionModel').isDisabled()&&(await page.locator('#questionResult').innerText()).length>100);}
 await analyze(page,examples[0].example,'parabola');await page.locator('#questionConfirm').check();check('大学函数不能手选旧二次模型绕过',await page.locator('#openQuestionModel').isDisabled());
 await analyze(page,examples[0].example);await page.locator('#questionConfirm').check();await page.locator('#questionText').fill(examples[0].example+'多一句');check('改原文使旧核对与步骤失效',await page.locator('#questionConfirm').count()===0&&await page.locator('#questionStepPreview').count()===0);
 await analyze(page,'泰勒展开f(x)=sin(x)，a=0，N=99。');await page.locator('#questionConfirm').check();check('超过N范围保留99并禁止进入',await page.locator('[data-question-field="degree"]').inputValue()==='99'&&await page.locator('#openQuestionModel').isDisabled());
 await page.setViewportSize({width:390,height:844});await analyze(page,examples.find(t=>t.id==='gradient').example);
 check('390px大学核对与步骤无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('label[for="questionText"]').click();await page.screenshot({path:path.join(outputDir,'university-question-review-390.png'),fullPage:true});await open(page);
 check('390px模型题干与固定步骤无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(outputDir,'university-question-model-390.png'),fullPage:true});
 const offline=await context.newPage();observe(offline);await offline.goto(pathToFileURL(path.resolve(__dirname,'../standalone.html')).href+'#view=questions');
 for(const type of examples){await analyze(offline,type.example);await open(offline);check('离线单文件 '+type.id+' 保持参数和固定步骤',await offline.evaluate(id=>state.model.id===id,type.id)&&await offline.locator('#questionSteps li').count()>=2);}
 check('大学做题过程无外部请求',external.length===0,external);check('大学做题控制台无异常',errors.length===0,errors);
})().catch(e=>check('大学做题浏览器流程完成',false,e.stack)).finally(async()=>{await browser?.close();const passed=results.filter(x=>x.passed).length;fs.writeFileSync(path.join(outputDir,'university-questions-browser-results.json'),JSON.stringify({total:results.length,passed,failed:results.length-passed,results,errors,external},null,2));console.log(`RESULT ${passed}/${results.length}`);if(passed!==results.length)process.exitCode=1;});
