from pathlib import Path
from playwright.sync_api import sync_playwright
import json, math, time, os
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'qa').mkdir(exist_ok=True)
HTML=(ROOT/'standalone.html').read_text(encoding='utf-8')
results=[]
def check(name, value, details=None):
 result={'name':name,'passed':bool(value)}
 if details is not None: result['details']=details
 results.append(result)
 print(('PASS ' if value else 'FAIL ')+name+((' '+str(details)) if not value and details else ''),flush=True)

def mem(page):
 page.evaluate('''() => { const m=new Map(); Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()},configurable:true}); }''')

with sync_playwright() as pl:
 options={'headless':True}
 if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'):
  options['executable_path']=os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']
 browser=pl.chromium.launch(**options)
 context=browser.new_context(viewport={'width':1440,'height':1050},device_scale_factor=1,accept_downloads=True)
 page=context.new_page();errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append(r.url))
 mem(page);page.set_content(HTML,wait_until='load');page.wait_for_timeout(350)
 check('首页 13 个模型',page.locator('.model-card').count()==13)
 check('首页无旧宣传文案',all(t not in page.inner_text('body') for t in ['给老师的互动教学实验室','原来如此','无限种探索方式','看得见的理解']))
 check('首页无大幅封面',page.locator('.hero').count()==0)
 page.locator('#threeDFilter').check();check('只看三维筛选 3 个模块',page.locator('.model-card').count()==3)
 page.locator('#threeDFilter').uncheck();page.locator('[data-filter="math"]').click();check('数学包含 6 个模块',page.locator('.model-card').count()==6)
 page.locator('[data-filter="all"]').click();page.locator('#searchInput').fill('球');check('搜索球命中几何体',page.locator('[data-open="solids"]').count()==1)
 page.locator('#searchInput').fill('');page.locator('[data-favorite="solids"]').click();check('收藏写入适配器',page.evaluate('loadStore().favorites.includes("solids")'))
 page.locator('[data-open="solids"]').click();page.wait_for_timeout(100)
 check('几何体有 8 个选项',page.locator('#solidSelect option').count()==8)
 # Mesh topology, analytics and independently integrated areas and volumes.
 solid_tests=page.evaluate('''() => Object.keys(SOLID_NAMES).map(shape=>{const p={...GEOMETRY_MODELS[0].defaults,shape,a:3,b:2,height:4,r:1.5},m=solidMesh(p),d=solidData(p);let area=0,volume=0;for(const f of m.faces){for(let i=1;i<f.points.length-1;i++){const a=f.points[0],b=f.points[i],c=f.points[i+1];area+=V3.len(V3.cross(V3.sub(b,a),V3.sub(c,a)))/2;volume+=V3.dot(a,V3.cross(b,c))/6;}}return{shape,vertices:m.vertices.length,edges:m.edges.length,faces:m.faces.length,count:d.count,area:d.area,meshArea:area,volume:d.volume,meshVolume:volume};})''')
 for item in solid_tests:
  shape=item['shape'];page.select_option('#solidSelect',shape);page.wait_for_timeout(70)
  check('绘制几何体 '+shape,not errors)
  if item.get('count'):
   check('多面体拓扑 '+shape,[item['vertices'],item['edges'],item['faces']]==item['count'])
   tolerance=1e-9
  else:tolerance=.012
  check('体积与网格交叉校验 '+shape,abs(item['volume']-item['meshVolume'])/item['volume']<tolerance)
  check('面积与网格交叉校验 '+shape,abs(item['area']-item['meshArea'])/item['area']<tolerance)
  page.screenshot(path=str(ROOT/'qa'/f'shape-{shape}.png'),full_page=True)
 page.select_option('#solidSelect','cube');page.fill('#number-a','4');page.locator('#number-a').press('Tab');check('尺寸输入更新体积',page.evaluate('solidData(state.p).volume')==64)
 page.fill('#number-a','100');page.locator('#number-a').press('Tab');check('尺寸输入限幅',page.evaluate('state.p.a')==5)
 page.locator('[data-action="reset"]').click();page.wait_for_timeout(100)
 before=page.evaluate('[state.p.yaw,state.p.pitch]');box=page.locator('#simCanvas').bounding_box()
 x=box['x']+box['width']*.47;y=box['y']+box['height']*.4
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+75,y+30,steps=6);page.mouse.up()
 after=page.evaluate('[state.p.yaw,state.p.pitch]');check('鼠标拖动旋转',before!=after)
 page.mouse.wheel(0,-150);page.wait_for_timeout(80);check('滚轮缩放',page.evaluate('state.p.scale')>1)
 page.locator('[data-geo-view="top"]').click();check('精确俯视 90°',page.evaluate('state.p.pitch')==90)
 page.locator('[data-geo-view="front"]').click();check('正视',page.evaluate('state.p.yaw===0&&state.p.pitch===0'))
 page.locator('[data-geo-view="side"]').click();check('侧视',page.evaluate('state.p.yaw')==90)
 page.locator('[data-geo-view="iso"]').click();page.locator('#simCanvas').focus();page.keyboard.press('ArrowRight');check('键盘旋转',page.evaluate('state.p.yaw')==-30)
 page.locator('[data-geo-toggle="ghost"]').check();check('透明显示',page.evaluate('state.p.ghost'))
 page.locator('[data-geo-toggle="hidden"]').uncheck();check('隐藏遮挡棱线',page.evaluate('!state.p.hidden'))
 page.locator('[data-geo-action="rotate"]').click();angle=page.evaluate('state.p.yaw');page.wait_for_timeout(250);check('自动旋转推进',page.evaluate('state.p.yaw')!=angle)
 page.locator('[data-geo-action="rotate"]').click();angle=page.evaluate('state.p.yaw');page.wait_for_timeout(100);check('停止自动旋转',page.evaluate('state.p.yaw')==angle)
 # Annotation must capture gestures instead of rotating the scene.
 page.locator('[data-action="ink"]').click();before=page.evaluate('state.p.yaw');page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+40,y+20,steps=4);page.mouse.up()
 check('板书不触发模型旋转',page.evaluate('state.strokes.length>0&&state.p.yaw===JSON.parse('+json.dumps(json.dumps(before))+')'))
 page.locator('[data-action="ink"]').click();page.locator('[data-action="clear-ink"]').click();check('板书清除',page.evaluate('state.strokes.length')==0)
 config=page.evaluate('currentConfig()');restored=page.evaluate('(c)=>safeParams(modelById(c.model),c.params)',config)
 check('配置保留视角与显示选项',all(abs(restored[k]-config['params'][k])<.000051 if k in ['yaw','pitch','scale'] else restored[k]==config['params'][k] for k in ['shape','yaw','pitch','scale','ghost','hidden']))
 page.locator('[data-action="save"]').click();page.fill('#classTitle','三维测试 <b>');page.locator('[data-action="confirm-save"]').click()
 check('课堂保存逻辑',page.evaluate('loadStore().classes.some(c=>c.title==="三维测试 <b>"&&c.p.shape==="cube")'))
 page.evaluate('showLibrary("classes")');check('课堂标题转义',page.locator('.saved-card h3 b').count()==0)
 page.locator('[data-class-open]').click();check('课堂恢复视角',page.evaluate('state.p.yaw')==restored['yaw'])
 # Incompatible or hostile import values are sanitized, not executed.
 bad=page.evaluate('safeParams(modelById("solids"),{shape:"<script>",a:Infinity,yaw:999,pitch:-999,ghost:"yes",hidden:false})')
 check('导入参数安全校验',bad['shape']=='cube' and bad['a']==3 and bad['yaw']==180 and bad['pitch']==-90 and bad['ghost']==False and bad['hidden']==False)
 # Cross sections: exact limiting cases and all named presets.
 page.evaluate('openModel("sections")');page.wait_for_timeout(100)
 for i,name in enumerate(['三角形','正方形','五边形','正六边形']):
  page.locator(f'[data-preset="{i}"]').click();d=page.evaluate('sectionData(state.p)');check('截面预设 '+name,len(d['points'])==[3,4,5,6][i])
 check('正六边形面积',abs(d['area']-3*math.sqrt(3)/4*3**2)<1e-8)
 page.evaluate('Object.assign(state.p,{tilt:0,offset:0});renderControls();renderReadout();requestDraw()');d=page.evaluate('sectionData(state.p)')
 check('水平截面积与周长',d['area']==9 and d['perimeter']==12)
 page.evaluate('Object.assign(state.p,{tilt:54.735610317,azimuth:45,offset:100})');d=page.evaluate('sectionData(state.p)');check('支撑点退化',len(d['points'])==1 and d['area']==0)
 page.evaluate('Object.assign(state.p,{tilt:90,azimuth:45,offset:100})');d=page.evaluate('sectionData(state.p)');check('支撑棱退化',len(d['points'])==2 and d['area']==0)
 page.evaluate('Object.assign(state.p,{tilt:0,offset:100})');d=page.evaluate('sectionData(state.p)');check('支撑面为正方形',len(d['points'])==4 and abs(d['area']-9)<1e-8)
 rand=page.evaluate('''() => {let bad=0,max=0;let seed=81;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<1600;i++){const p={a:1+4*rnd(),tilt:90*rnd(),azimuth:180*rnd(),offset:-100+200*rnd()},d=sectionData(p);max=Math.max(max,d.points.length);if(d.points.length>6||!Number.isFinite(d.area+d.perimeter)||d.area<0||d.area>3*Math.sqrt(3)/2*p.a*p.a+1e-5||d.points.some(v=>Math.abs(V3.dot(d.normal,v)-d.d)>1e-6||v.some(x=>Math.abs(x)>p.a/2+1e-6)))bad++;}return {bad,max};}''')
 check('1600 组随机截面几何约束',rand['bad']==0 and rand['max']==6,rand)
 # Net face lengths/areas and shared hinge endpoints remain invariant.
 nd=page.evaluate('''() => {const out=[];for(const shape of ['cube','cuboid'])for(const fold of [0,10,32,50,75,100]){const d=netMesh({shape,a:3,b:2,height:4,fold});const areas=d.panels.map(f=>V3.len(V3.cross(V3.sub(f.points[1],f.points[0]),V3.sub(f.points[3],f.points[0]))));const fs=d.panels.map(f=>f.points),pairs=[[[0,3],[1,0]],[[0,2],[1,1]],[[0,0],[2,3]],[[0,1],[2,2]],[[2,0],[5,3]],[[2,1],[5,2]],[[0,0],[3,1]],[[0,3],[3,2]],[[0,1],[4,0]],[[0,2],[4,3]]];const gap=Math.max(...pairs.map(([a,b])=>V3.len(V3.sub(fs[a[0]][a[1]],fs[b[0]][b[1]]))));const pts=fs.flat();out.push({shape,fold,gap,total:areas.reduce((a,b)=>a+b),expected:d.area,dimensions:[0,1,2].map(j=>Math.max(...pts.map(p=>p[j]))-Math.min(...pts.map(p=>p[j])))});}return out;}''')
 check('展开过程面积不变',all(abs(d['total']-d['expected'])<1e-8 for d in nd))
 check('展开过程共享棱保持连接',all(d['gap']<1e-8 for d in nd))
 check('闭合形状尺寸正确',all(all(abs(a-b)<1e-8 for a,b in zip(d['dimensions'],[3,3,3] if d['shape']=='cube' else [3,4,2])) for d in nd if d['fold']==0))
 check('完全展开共面',all(d['dimensions'][1]<1e-8 for d in nd if d['fold']==100))
 page.evaluate('openModel("nets")');page.locator('[data-preset="0"]').click();page.locator('[data-geo-action="fold"]').click();page.wait_for_timeout(250);check('展开动画推进',page.evaluate('state.p.fold')>0)
 page.evaluate('updateSimulation(10);renderReadout();drawStage()');check('展开动画到终点停止',page.evaluate('state.p.fold===100&&!state.running'))
 page.locator('[data-geo-action="fold"]').click();page.evaluate('updateSimulation(10);renderReadout();drawStage()');check('折叠动画到起点停止',page.evaluate('state.p.fold===0&&!state.running'))
 # All original models and every visible control boundary remain operational.
 ids=page.evaluate('MODELS.map(m=>m.id)')
 for id in ids:
  page.evaluate('(id)=>openModel(id)',id);page.wait_for_timeout(40)
  controls=page.evaluate('state.model.threeD?geoVisibleControls(state.model,state.p):state.model.controls')
  for c in controls:
   for value in [c[3],c[4]]:page.evaluate('([k,v])=>{setParam(k,v);drawStage();}',[c[0],value])
  check('模型与控件边界 '+id,not errors)
 # Existing formula regression.
 regress=page.evaluate('''() => ({solar:solarData({lat:0,dec:0,hour:12,pole:2}).elevation,gas:gasData({moles:.5,vol:20,temp:300}).pressure,range:projectileData({v:20,angle:45,height:0,g:10}).range,tir:opticalData({n1:1.5,n2:1,angle:55}).tir})''')
 check('原模型计算回归',regress['solar']==90 and abs(regress['gas']-62.358469635)<1e-8 and abs(regress['range']-40)<1e-8 and regress['tir'])
 # PNG export and JSON export.
 page.evaluate('openModel("sections")');page.wait_for_timeout(100)
 with page.expect_download() as download:page.locator('[data-action="screenshot"]').click()
 dl=download.value;dl.save_as(str(ROOT/'qa'/'export-section.png'));check('实际 PNG 导出', (ROOT/'qa'/'export-section.png').stat().st_size>1000)
 page.locator('[data-action="share"]').click()
 with page.expect_download() as download:page.locator('[data-action="export-config"]').click()
 dl=download.value;dl.save_as(str(ROOT/'qa'/'export-config.json'));export=json.loads((ROOT/'qa'/'export-config.json').read_text())
 check('实际 JSON 导出',export['model']=='sections' and 'yaw' in export['params'])
 page.locator('[data-action="close-dialog"]').click()
 page.locator('[data-action="present"]').click();check('三维大屏布局',page.evaluate('state.presenting'));page.keyboard.press('Escape');check('退出大屏',page.evaluate('!state.presenting'))
 for width in [390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':950})
  for id in ['home','solids','sections','nets']:
   page.evaluate('id=>id==="home"?showLibrary():openModel(id)',id);page.wait_for_timeout(80)
   overflow=page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1')
   check(f'{width}px {id} 无横向溢出',not overflow)
 # Capture final normal-state screens using the documented in-memory storage adapter.
 page.set_viewport_size({'width':1440,'height':1000});page.evaluate('store={favorites:[],classes:[]};persist();showLibrary()');page.wait_for_timeout(3600)
 page.screenshot(path=str(ROOT/'qa'/'home-final.png'),full_page=False)
 for id in ['solids','sections','nets']:
  page.evaluate('id=>openModel(id)',id);page.wait_for_timeout(120)
  if id=='nets':page.evaluate('state.p.fold=55;syncParam("fold");renderReadout();drawStage()')
  page.screenshot(path=str(ROOT/'qa'/f'{id}-final.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844});page.evaluate('openModel("sections")');page.wait_for_timeout(120);page.screenshot(path=str(ROOT/'qa'/'sections-mobile.png'),full_page=True)
 check('页面无 JavaScript 运行异常',len(errors)==0,errors)
 check('无自动网络请求',not requests,requests)
 # Fallback behavior without localStorage (separate, unmodified HTML).
 fallback=context.new_page();fallback.set_content(HTML,wait_until='load');fallback.wait_for_timeout(600)
 check('存储不可用有明确提示',fallback.locator('.storage-warning').count()>0)
 check('无存储也可打开三维模型',fallback.evaluate('openModel("solids");!!document.querySelector("#solidSelect")'))
 # Multitouch uses browser PointerEvent dispatch for independent pointer tracking, not real-device testing.
 page.set_viewport_size({'width':390,'height':844});page.evaluate('openModel("solids")');page.wait_for_timeout(60)
 page.evaluate('''() => {const c=document.querySelector('#simCanvas');for(const [type,id,x,y] of [['pointerdown',1,100,200],['pointerdown',2,200,200],['pointermove',2,250,200],['pointerup',1,100,200],['pointerup',2,250,200]])c.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:x,clientY:y,pointerType:'touch',bubbles:true}));}''')
 check('双指缩放事件逻辑',abs(page.evaluate('state.p.scale')-1.5)<1e-8)
 browser.close()
(ROOT/'qa'/'test-results.json').write_text(json.dumps({'results':results,'errors':errors,'request_urls':requests},ensure_ascii=False,indent=2))
print('RESULT',sum(r['passed'] for r in results),'/',len(results),flush=True)
