"use strict";
// Windows CI launches the actual packaged executable, with an isolated profile.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {outputDir}=require("./runtime.cjs");
const {_electron}=require("playwright");
const ids=["taylor","linear-transform","fourier","gradient","ode","rlc"];
const executablePath=process.env.ZHIXIANG_PACKAGED_EXE || path.resolve(__dirname,"../output/windows/知象-Windows/Zhixiang.exe");
const results=[],errors=[],requests=[];
let app,temporary;
function check(name,value,details){results.push({name,passed:!!value,details});console.log(`${value?"PASS":"FAIL"} ${name}${value?"":" "+JSON.stringify(details)}`);}
(async()=>{
  if(process.platform!=="win32")throw Error("This check must run on Windows with the packaged executable.");
  if(!fs.existsSync(executablePath))throw Error("Missing packaged executable: "+executablePath);
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),"zhixiang-university-"));
  app=await _electron.launch({executablePath,env:{...process.env,APPDATA:temporary,LOCALAPPDATA:temporary},timeout:60000});
  const page=await app.firstWindow();
  page.on("pageerror",e=>errors.push(e.message));
  page.on("request",r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.waitForFunction(()=>typeof MODELS!=="undefined" && document.querySelectorAll(".model-card").length===28);
  check("packaged Windows app loads 28 offline models",await page.locator(".model-card").count()===28);
  check("desktop bridge and content version",await page.evaluate(async()=>!!window.zhixiangDesktop && (await window.zhixiangDesktop.getInfo()).version===window.ZhixiangRelease.version));
  for(const id of ids){
    await page.evaluate(id=>openModel(id),id);
    await page.locator("#formula").waitFor();
    check(id+" actual renderer formula and controls",await page.locator("#formula").textContent()!=="" && await page.locator("[data-param]").count()>0);
    check(id+" defaults stay paused",await page.evaluate(()=>!state.running));
    const number=page.locator("input[type=number][data-param-number]").first();
    const key=await number.getAttribute("data-param-number");
    const max=Number(await number.getAttribute("max")),min=Number(await number.getAttribute("min"));
    const value=(min+max)/2;
    await number.fill(String(value));await number.dispatchEvent("change");
    check(id+" parameter input renders and updates state",await page.locator("#formula").textContent()!=="" && await page.evaluate(({key,value})=>state.p[key]===value,{key,value}));
  }
  await page.evaluate(()=>openModel("taylor"));
  await page.locator('[data-action="save"]').click();
  await page.locator("#classTitle").fill("Windows CI university");
  await page.locator('[data-action="confirm-save"]').click();
  const saved=await page.evaluate(()=>localStorage.getItem("zhixiang-lab-v1"));
  check("classroom saved through actual UI",JSON.parse(saved)?.classes.some(c=>c.title==="Windows CI university" && c.model==="taylor"));
  await page.reload();await page.waitForFunction(()=>typeof MODELS!=="undefined");
  check("classroom persists after reload",await page.evaluate(saved=>localStorage.getItem("zhixiang-lab-v1")===saved,saved));
  await page.screenshot({path:path.join(outputDir,"windows-university-packaged.png")});
  check("no renderer errors",!errors.length,errors);
  check("no HTTP dependency for offline models",!requests.length,requests);
})().catch(e=>check("packaged Windows smoke completed",false,e.stack)).finally(async()=>{
  if(app)await app.close().catch(()=>{});
  if(temporary)fs.rmSync(temporary,{recursive:true,force:true});
  fs.mkdirSync(outputDir,{recursive:true});fs.writeFileSync(path.join(outputDir,"windows-university-smoke.json"),JSON.stringify({date:new Date().toISOString(),platform:process.platform,results,errors,requests},null,2));
  console.log(`RESULT ${results.filter(x=>x.passed).length}/${results.length}`);if(results.some(x=>!x.passed))process.exitCode=1;
});
