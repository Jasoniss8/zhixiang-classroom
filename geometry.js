'use strict';
/* Three-dimensional Euclidean geometry. Orthographic projection is intentional:
   lengths/areas are computed in world space, never from the screen image.
   Everything runs locally; there is no rendering library or network dependency. */
const GEO_CAMERA_CONTROLS = [
 ['yaw','','水平视角',-180,180,.1,'°'],['pitch','','俯仰视角',-90,90,.1,'°'],['scale','','视图缩放',.55,1.8,.01,'×']
];
const GEO_CAMERA = {yaw:-35,pitch:24,scale:1};
const SOLID_NAMES = {cube:'正方体',cuboid:'长方体',prism:'正三棱柱',tetra:'正三棱锥',pyramid:'正四棱锥',cylinder:'圆柱',cone:'圆锥',sphere:'球'};
const GEOMETRY_MODELS = [
 {id:'solids',cat:'math',level:'初中 · 高中',title:'常见几何体',desc:'旋转观察顶点、棱和面，比较体积与表面积。',tags:'三维 3D 立体几何 正方体 长方体 三棱柱 三棱锥 四棱锥 圆柱 圆锥 球 体积 表面积',threeD:true,time:false,
 defaults:{shape:'cube',a:3,b:2,height:3,r:1.5,hidden:true,ghost:false,dimensions:true,...GEO_CAMERA},
 choices:{shape:Object.keys(SOLID_NAMES)},bools:['hidden','ghost','dimensions'],
 controls:[['a','a','底边长',1,5,.1,'cm'],['b','b','底面宽',1,5,.1,'cm'],['height','h','高',1,5,.1,'cm'],['r','r','半径',.5,2.5,.1,'cm'],...GEO_CAMERA_CONTROLS],
 presets:[['正方体',{shape:'cube',a:3}],['圆柱',{shape:'cylinder',r:1.5,height:3}],['球',{shape:'sphere',r:1.5}]],
 hint:'拖动旋转 · 滚轮或双指缩放 · 上方按钮切换视角',
 question:'圆柱和圆锥的底面积、高分别相等时，它们的体积有什么关系？',
 answer:'圆柱 V = πr²h，圆锥 V = ⅓πr²h。同底等高时，圆锥体积是圆柱的三分之一。切换几何体会保留半径和高度，可直接比较。',
 note:'正投影三维模型，画面长度受视角影响，标注和计算使用空间真实尺寸。三棱柱为正三棱柱；三棱锥底面为正三角形、顶点在底面中心正上方，不一定是正四面体；四棱锥为正四棱锥。圆柱、圆锥为直圆柱、直圆锥。曲面用多边形近似显示，体积与表面积使用解析公式，曲面网格线不是几何体的棱。全部长度单位为 cm。',sources:['geometry']},
 {id:'sections',cat:'math',level:'高中',title:'正方体截面',desc:'移动、倾斜截平面，观察截面形状的变化。',tags:'三维 3D 立体几何 正方体 截面 截平面 三角形 四边形 五边形 六边形',threeD:true,time:false,
 defaults:{a:3,azimuth:45,tilt:54.7356,offset:0,plane:true,hidden:true,...GEO_CAMERA},bools:['plane','hidden'],
 controls:[['a','a','正方体棱长',1,5,.1,'cm'],['offset','d','截平面位置',-100,100,1,'%'],['tilt','β','与水平面的夹角',0,90,.1,'°'],['azimuth','γ','倾斜方向',0,180,.1,'°'],...GEO_CAMERA_CONTROLS],
 presets:[['三角形',{azimuth:45,tilt:54.7356,offset:64}],['正方形',{azimuth:0,tilt:0,offset:0}],['五边形',{azimuth:24,tilt:57,offset:25}],['正六边形',{azimuth:45,tilt:54.7356,offset:0}]],
 hint:'橙色区域为截面；右上角为等比例正视图；移动截平面时保持比例',
 question:'用一个平面截正方体，截面最多能有几条边？',
 answer:'非退化截面最多有 6 条边。截平面与正方体的每个面至多产生一条截面边；正方体只有 6 个面。过中心且垂直于体对角线时，可得到正六边形。',
 note:'将截平面与正方体 12 条棱求交，合并重复交点，按截平面内的角度排序。面积、周长在空间坐标中求得，不取投影后的面积。位置 ±100% 为沿法线的两个支撑平面；一般斜切时在端点退化为点，特殊角度可为棱或整面。β 为截平面与水平面的锐夹角，γ 为法线水平投影相对 +x 的方向角。正六边形预设使用约 54.7356° 的夹角，有舍入误差。',sources:['geometry']},
 {id:'nets',cat:'math',level:'初中 · 高中',title:'展开与折叠',desc:'把六个面逐步展开，核对相邻面与表面积。',tags:'三维 3D 立体几何 正方体 长方体 展开图 表面积 折叠 空间想象',threeD:true,time:false,
 defaults:{shape:'cube',a:2,b:2,height:2,fold:32,faceLabels:true,...GEO_CAMERA,pitch:38},choices:{shape:['cube','cuboid']},bools:['faceLabels'],
 controls:[['fold','','展开程度',0,100,1,'%'],['a','a','长 / 棱长',1,4,.1,'cm'],['b','b','宽',1,4,.1,'cm'],['height','h','高',1,4,.1,'cm'],...GEO_CAMERA_CONTROLS],
 presets:[['闭合',{fold:0}],['展开一半',{fold:50}],['完全展开',{fold:100}]],
 hint:'拖动旋转 · 调整展开程度 · 同色的两个面互为对面；虚线为折叠棱',
 question:'完全展开以后，六个面的面积之和会改变吗？哪两个面在折叠后相对？',
 answer:'不会改变。展开只改变各面的相对位置，不改变每个面的形状与面积。同色的面在闭合后相对：上与下、前与后、左与右。长方体表面积为 2(ab + ah + bh)。',
 note:'仅展示正方体、长方体的一种十字形展开图，不代表全部可能的展开图。六个刚性矩形面绕共享棱旋转，上面随其父面进行嵌套旋转，展开过程中面尺寸和面积不变。中间状态为有开口的曲面，不作为封闭几何体计算当前体积；下方体积始终指闭合后的体积。',sources:['geometry']}
];
const V3 = {
 add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),
 dot:(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 len:a=>Math.hypot(...a),unit:a=>{const l=Math.hypot(...a);return l?a.map(v=>v/l):[0,1,0];},
 mean:ps=>ps.length?ps.reduce((a,p)=>a.map((v,i)=>v+p[i]/ps.length),[0,0,0]):[0,0,0]
};
function geoBox(a,b,h){
 const vertices=[[-a/2,-h/2,b/2],[a/2,-h/2,b/2],[a/2,-h/2,-b/2],[-a/2,-h/2,-b/2],[-a/2,h/2,b/2],[a/2,h/2,b/2],[a/2,h/2,-b/2],[-a/2,h/2,-b/2]];
 return geoMesh(vertices,[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],{labels:['A','B','C','D','A₁','B₁','C₁','D₁']});
}
function geoMesh(vertices,faces,extra={}){
 const center=V3.mean(vertices);
 const fs=faces.map((ids,index)=>{let points=ids.map(i=>vertices[i]),normal=V3.unit(V3.cross(V3.sub(points[1],points[0]),V3.sub(points[2],points[0])));const mid=V3.mean(points);if(V3.dot(normal,V3.sub(mid,center))<0){ids=[...ids].reverse();points=ids.map(i=>vertices[i]);normal=V3.mul(normal,-1);}return{ids,points,normal,mid,index};});
 const em=new Map();fs.forEach((f,fi)=>f.ids.forEach((id,i)=>{const next=f.ids[(i+1)%f.ids.length],key=[id,next].sort((a,b)=>a-b).join(',');if(!em.has(key))em.set(key,{a:id,b:next,faces:[]});em.get(key).faces.push(fi);}));
 return{vertices,faces:fs,edges:[...em.values()],...extra};
}
function solidData(p){
 const a=p.a,b=p.b,h=p.height,r=p.r,rt=Math.sqrt,pi=Math.PI;
 switch(p.shape){
 case'cube':return{name:SOLID_NAMES.cube,volume:a**3,area:6*a*a,formula:'V = a³     S = 6a²',topology:'8 顶点 · 12 棱 · 6 面',count:[8,12,6]};
 case'cuboid':return{name:SOLID_NAMES.cuboid,volume:a*b*h,area:2*(a*b+a*h+b*h),formula:'V = abh     S = 2(ab + ah + bh)',topology:'8 顶点 · 12 棱 · 6 面',count:[8,12,6]};
 case'prism':return{name:SOLID_NAMES.prism,volume:rt(3)*a*a*h/4,area:rt(3)*a*a/2+3*a*h,formula:'V = (√3/4)a²h     S = (√3/2)a² + 3ah',topology:'6 顶点 · 9 棱 · 5 面',count:[6,9,5]};
 case'tetra':return{name:SOLID_NAMES.tetra,volume:rt(3)*a*a*h/12,area:rt(3)*a*a/4+1.5*a*rt(h*h+a*a/12),formula:'V = ⅓S底h     S = S底 + ½C底l',topology:'4 顶点 · 6 棱 · 4 面',count:[4,6,4]};
 case'pyramid':return{name:SOLID_NAMES.pyramid,volume:a*a*h/3,area:a*a+2*a*rt(h*h+a*a/4),formula:'V = ⅓a²h     S = a² + 2al',topology:'5 顶点 · 8 棱 · 5 面',count:[5,8,5]};
 case'cylinder':return{name:SOLID_NAMES.cylinder,volume:pi*r*r*h,area:2*pi*r*(r+h),formula:'V = πr²h     S = 2πr(r + h)',topology:'2 个圆面 · 1 个曲面'};
 case'cone':return{name:SOLID_NAMES.cone,volume:pi*r*r*h/3,area:pi*r*(r+rt(r*r+h*h)),formula:'V = ⅓πr²h     S = πr(r + l)',topology:'1 个圆面 · 1 个曲面'};
 case'sphere':return{name:SOLID_NAMES.sphere,volume:4*pi*r**3/3,area:4*pi*r*r,formula:'V = ⁴⁄₃πr³     S = 4πr²',topology:'球面 · 无棱、无顶点'};
 default:throw new Error('Unknown solid');
 }
}
function solidMesh(p){
 const a=p.a,b=p.b,h=p.height,r=p.r;
 if(p.shape==='cube')return geoBox(a,a,a);
 if(p.shape==='cuboid')return geoBox(a,b,h);
 if(p.shape==='pyramid')return geoMesh([[-a/2,-h/2,a/2],[a/2,-h/2,a/2],[a/2,-h/2,-a/2],[-a/2,-h/2,-a/2],[0,h/2,0]],[[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]],{labels:['A','B','C','D','P']});
 if(p.shape==='prism'||p.shape==='tetra'){
  const base=[[-a/2,-h/2,a*Math.sqrt(3)/6],[a/2,-h/2,a*Math.sqrt(3)/6],[0,-h/2,-a*Math.sqrt(3)/3]];
  return p.shape==='prism'?geoMesh([...base,...base.map(v=>[v[0],h/2,v[2]])],[[0,2,1],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]],{labels:['A','B','C','A₁','B₁','C₁']}):geoMesh([...base,[0,h/2,0]],[[0,2,1],[0,1,3],[1,2,3],[2,0,3]],{labels:['A','B','C','P']});
 }
 const N=48;
 if(p.shape==='sphere'){
  const lat=20,vertices=[[0,r,0]];
  for(let j=1;j<lat;j++)for(let i=0;i<N;i++){const t=Math.PI*j/lat,u=2*Math.PI*i/N;vertices.push([r*Math.sin(t)*Math.cos(u),r*Math.cos(t),r*Math.sin(t)*Math.sin(u)]);}
  const south=vertices.push([0,-r,0])-1,faces=[];
  for(let i=0;i<N;i++)faces.push([0,1+i,1+(i+1)%N]);
  for(let j=0;j<lat-2;j++)for(let i=0;i<N;i++){let a=1+j*N+i,b=1+j*N+(i+1)%N;faces.push([a,b,b+N,a+N]);}
  for(let i=0;i<N;i++)faces.push([south,1+(lat-2)*N+(i+1)%N,1+(lat-2)*N+i]);
  return geoMesh(vertices,faces,{curved:true,sphere:true,r});
 }
 const vs=Array.from({length:N},(_,i)=>[r*Math.cos(i*2*Math.PI/N),-h/2,r*Math.sin(i*2*Math.PI/N)]),fs=[Array.from({length:N},(_,i)=>i)];
 if(p.shape==='cylinder'){
  vs.push(...vs.map(v=>[v[0],h/2,v[2]]));fs.push(Array.from({length:N},(_,i)=>i+N));
  for(let i=0;i<N;i++)fs.push([i,(i+1)%N,(i+1)%N+N,i+N]);
 }else{vs.push([0,h/2,0]);for(let i=0;i<N;i++)fs.push([i,(i+1)%N,N]);}
 return geoMesh(vs,fs,{curved:true,segments:N,shape:p.shape});
}
function sectionData(p){
 const t=rad(p.tilt),az=rad(p.azimuth),normal=[Math.sin(t)*Math.cos(az),Math.cos(t),Math.sin(t)*Math.sin(az)],half=p.a/2;
 const support=half*normal.reduce((s,v)=>s+Math.abs(v),0),d=p.offset/100*support,box=geoBox(p.a,p.a,p.a),eps=1e-7*Math.max(p.a,1),hits=[];
 const add=q=>{if(!hits.some(v=>V3.len(V3.sub(v,q))<eps*10))hits.push(q);};
 for(const edge of box.edges){const a=box.vertices[edge.a],b=box.vertices[edge.b],da=V3.dot(normal,a)-d,db=V3.dot(normal,b)-d;if(Math.abs(da)<eps)add(a);if(Math.abs(db)<eps)add(b);if(da*db<0){const f=da/(da-db);add(V3.add(a,V3.mul(V3.sub(b,a),f)));}}
 const center=V3.mean(hits),u=V3.unit(V3.cross(Math.abs(normal[1])>.9?[1,0,0]:[0,1,0],normal)),v=V3.cross(normal,u);
 hits.sort((a,b)=>Math.atan2(V3.dot(V3.sub(a,center),v),V3.dot(V3.sub(a,center),u))-Math.atan2(V3.dot(V3.sub(b,center),v),V3.dot(V3.sub(b,center),u)));
 // Remove collinear intersections at cube vertices to report polygon edges, not subdivision points.
 let points=hits;
 if(points.length>2){let changed=true;while(changed&&points.length>2){changed=false;for(let i=0;i<points.length;i++){const prev=points[(i+points.length-1)%points.length],cur=points[i],next=points[(i+1)%points.length];if(V3.len(V3.cross(V3.sub(cur,prev),V3.sub(next,cur)))<eps*eps*100){points.splice(i,1);changed=true;break;}}}}
 let area=0,perimeter=0;const flat=points.map(q=>[V3.dot(V3.sub(q,center),u),V3.dot(V3.sub(q,center),v)]);
 if(points.length>2)for(let i=0;i<points.length;i++){const j=(i+1)%points.length;area+=flat[i][0]*flat[j][1]-flat[j][0]*flat[i][1];perimeter+=V3.len(V3.sub(points[i],points[j]));}
 return{points,flat,center,normal,u,v,d,support,area:Math.abs(area)/2,perimeter,kind:['不相交','点（退化）','线段（退化）','三角形','四边形','五边形','六边形'][points.length]||`${points.length} 边形`};
}
function geoRotateHinge(p,o,axis,a){const q=V3.sub(p,o),c=Math.cos(a),s=Math.sin(a);return V3.add(o,V3.add(V3.add(V3.mul(q,c),V3.mul(V3.cross(axis,q),s)),V3.mul(axis,V3.dot(axis,q)*(1-c))));}
function netMesh(p){
 const a=p.a,b=p.shape==='cube'?a:p.b,h=p.shape==='cube'?a:p.height,y=-h/2,t=(1-p.fold/100)*Math.PI/2;
 const bottom=[[-a/2,y,-b/2],[a/2,y,-b/2],[a/2,y,b/2],[-a/2,y,b/2]];
 const front=[[-a/2,y,b/2],[a/2,y,b/2],[a/2,y,b/2+h],[-a/2,y,b/2+h]].map(q=>geoRotateHinge(q,[0,y,b/2],[1,0,0],-t));
 const backBase=[[-a/2,y,-b/2-h],[a/2,y,-b/2-h],[a/2,y,-b/2],[-a/2,y,-b/2]];
 const back=backBase.map(q=>geoRotateHinge(q,[0,y,-b/2],[1,0,0],t));
 const top=[[-a/2,y,-b/2-h-b],[a/2,y,-b/2-h-b],[a/2,y,-b/2-h],[-a/2,y,-b/2-h]].map(q=>geoRotateHinge(geoRotateHinge(q,[0,y,-b/2-h],[1,0,0],t),[0,y,-b/2],[1,0,0],t));
 const left=[[-a/2-h,y,-b/2],[-a/2,y,-b/2],[-a/2,y,b/2],[-a/2-h,y,b/2]].map(q=>geoRotateHinge(q,[-a/2,y,0],[0,0,1],-t));
 const right=[[a/2,y,-b/2],[a/2+h,y,-b/2],[a/2+h,y,b/2],[a/2,y,b/2]].map(q=>geoRotateHinge(q,[a/2,y,0],[0,0,1],t));
 const panels=[{name:'下',points:bottom,color:0},{name:'前',points:front,color:1},{name:'后',points:back,color:1},{name:'左',points:left,color:2},{name:'右',points:right,color:2},{name:'上',points:top,color:0}];
 panels.forEach(f=>{f.mid=V3.mean(f.points);f.normal=V3.unit(V3.cross(V3.sub(f.points[1],f.points[0]),V3.sub(f.points[2],f.points[0])));});
 return{panels,a,b,h,area:2*(a*b+a*h+b*h),volume:a*b*h,hinge:deg(t)};
}
function geometryReadout(m,p){
 if(m.id==='solids'){const d=solidData(p),extra=['pyramid','tetra'].includes(p.shape)?'l 为侧面斜高；h 为垂直高度':p.shape==='cone'?'l = √(r² + h²)，为圆锥母线长':'长度单位 cm；投影长度不等于实际长度';return{formula:d.formula,caption:extra,metrics:[['体积 V',num(d.volume,2),'cm³'],['表面积 S',num(d.area,2),'cm²'],['结构',d.topology,'']]};}
 if(m.id==='sections'){const d=sectionData(p);return{formula:`${num(d.normal[0],3)}x + ${num(d.normal[1],3)}y + ${num(d.normal[2],3)}z = ${num(d.d,3)}`,caption:'截平面方程 · 原点为正方体中心，y 轴竖直向上',metrics:[['截面形状',d.kind,''],['截面面积',num(d.area,3),'cm²'],['截面周长',d.points.length<3?'—':num(d.perimeter,3),d.points.length<3?'':'cm']]};}
 const d=netMesh(p);return{formula:p.shape==='cube'?'S = 6a²':'S = 2(ab + ah + bh)',caption:'中间状态不是封闭几何体；体积数值指完全闭合后的体积',metrics:[['六个面的总面积',num(d.area,2),'cm²'],['闭合后的体积',num(d.volume,2),'cm³'],['展开程度',num(p.fold,0),'%']]};
}
function geoVisibleControls(m,p){return m.controls.filter(c=>{
 const key=c[0];if(['yaw','pitch','scale'].includes(key))return false;
 if(m.id==='sections')return true;
 if(m.id==='nets')return !(['b','height'].includes(key)&&p.shape==='cube');
 return key==='r'?['sphere','cone','cylinder'].includes(p.shape):key==='a'?!['sphere','cone','cylinder'].includes(p.shape):key==='b'?p.shape==='cuboid':key==='height'?!['sphere','cube'].includes(p.shape):true;
 }).map(c=>c[0]==='a'&&p.shape==='cube'?[c[0],c[1],'棱长',...c.slice(3)]:c);}
function renderGeometryControls(){
 const m=state.model,p=state.p,root=$('#controlBody');
 root.innerHTML=(m.choices?.shape?`<label class="control-select-label" for="solidSelect">${m.id==='nets'?'展开对象':'几何体'}</label><select id="solidSelect" class="control-select" data-geo-select="shape">${m.choices.shape.map(k=>`<option value="${k}" ${p.shape===k?'selected':''}>${SOLID_NAMES[k]}</option>`).join('')}</select>`:'')+`<h3>预设</h3><div class="preset-list">${m.presets.map((s,i)=>`<button class="preset" data-preset="${i}">${s[0]}</button>`).join('')}</div><div class="params-grid">${geoVisibleControls(m,p).map(c=>paramHTML(c,p)).join('')}</div><div class="control-divider"></div><h3>显示</h3><label class="checkline"><input type="checkbox" data-flag="labels" ${state.labels?'checked':''}>显示标注</label>${(m.id==='nets'?[['faceLabels','显示面名称']]:m.id==='sections'?[['plane','显示截平面'],['hidden','显示遮挡棱线']]:[['hidden','显示遮挡棱线'],['ghost','透明显示'],['dimensions','显示尺寸']]).map(([k,label])=>`<label class="checkline"><input type="checkbox" data-geo-toggle="${k}" ${p[k]?'checked':''}>${label}</label>`).join('')}<p class="control-note">${m.id==='nets'?'同色面在闭合时相对。这里只展示一种展开方式。':m.id==='sections'?'位置 ±100% 对应两个支撑平面，可能出现点或线段。':'曲面上的辅助线不是棱。改变尺寸后，数值会重新计算。'}</p><button class="source-link" data-action="model-info">模型条件与参考资料</button>`;
 updateRanges(root);
}
function geometryToolbar(){return `<div class="geo-toolbar"><div class="geo-views" role="group" aria-label="切换观察方向">${[['iso','立体'],['front','正视'],['top','俯视'],['side','侧视']].map(([id,name])=>`<button class="geo-view" data-geo-view="${id}">${name}</button>`).join('')}</div><div class="geo-zoom"><button class="icon-button" data-geo-action="zoom-out" aria-label="缩小视图">−</button><span id="geoZoomValue">100%</span><button class="icon-button" data-geo-action="zoom-in" aria-label="放大视图">＋</button></div></div>`;}
function geometryPlayback(){return `<button class="button secondary small" id="geoRotateButton" data-geo-action="rotate">${icon('rotate')}自动旋转</button>${state.model.id==='nets'?`<button class="button primary small" id="geoFoldButton" data-geo-action="fold">${icon('play')}展开 / 折叠</button>`:''}<button class="icon-button" data-action="reset" title="恢复默认参数（R）" aria-label="恢复默认参数">${icon('reset')}</button><span class="geo-key-hint">方向键旋转 · ＋ / − 缩放</span>`;}
function geoCamera(p,w,h,points,options={}){
 const ya=rad(p.yaw),pi=rad(p.pitch),cy=Math.cos(ya),sy=Math.sin(ya),cp=Math.cos(pi),sp=Math.sin(pi);
 const rotate=v=>{const x=cy*v[0]+sy*v[2],z=-sy*v[0]+cy*v[2];return[x,cp*v[1]-sp*z,sp*v[1]+cp*z];};
 let center=options.center||[0,0,0];
 const pts=points.map(q=>rotate(V3.sub(q,center))),spanX=Math.max(...pts.map(v=>v[0]))-Math.min(...pts.map(v=>v[0])),spanY=Math.max(...pts.map(v=>v[1]))-Math.min(...pts.map(v=>v[1]));
 const base=options.net?Math.min(w/8.6,h/7.3):Math.min(w/7.4,h/6.3);
 const fit=Math.min((w*(options.inset?.64:.84))/Math.max(spanX,.1),(h*.74)/Math.max(spanY,.1));
 const scale=Math.min(base,fit)*p.scale,x=options.inset?w*.4:w*.5,y=options.net?h*.53:options.inset&&w<450?h*.6:h*.5;
 return{rotate,scale,center,project:q=>{const v=rotate(V3.sub(q,center));return{x:x+v[0]*scale,y:y-v[1]*scale,z:v[2]};},x,y};
}
function geoPath(ctx,points,camera){ctx.beginPath();points.forEach((p,i)=>{const q=camera.project(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();}
function geoText(ctx,label,x,y,color='#456259',size=12){ctx.save();ctx.font=`${size}px -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=4;ctx.strokeStyle='#fbfcfaf2';ctx.strokeText(label,x,y);ctx.fillStyle=color;ctx.fillText(label,x,y);ctx.restore();}
function geoLine3(ctx,a,b,cam,color,width=1.3,dash=[]){const x=cam.project(a),y=cam.project(b);line(ctx,x.x,x.y,y.x,y.y,color,width,dash);}
function geoBackdrop(ctx,w,h,cam,ground=null){
 ctx.fillStyle='#fbfcfa';ctx.fillRect(0,0,w,h);
 if(ground!==null){ctx.save();ctx.beginPath();ctx.rect(0,0,w,h-35);ctx.clip();for(let i=-4;i<=4;i++){geoLine3(ctx,[i,ground,-4],[i,ground,4],cam,'#e8ede7',.7);geoLine3(ctx,[-4,ground,i],[4,ground,i],cam,'#e8ede7',.7);}ctx.restore();}
}
function drawOrientation(ctx,w,h,cam){
 const cx=37,cy=h-47,axes=[[[1,0,0],'x','#b68165'],[[0,1,0],'y','#749a7b'],[[0,0,1],'z','#7c8eaf']];
 for(const[a,label,col]of axes){const p=cam.rotate(a);line(ctx,cx,cy,cx+21*p[0],cy-21*p[1],col,1.5);geoText(ctx,label,cx+29*p[0],cy-29*p[1],col,10);}circle(ctx,cx,cy,2,'#8b9a8e');
}
function geoDrawMesh(ctx,mesh,cam,{ghost=false,hidden=true,labels=true,edges=true}={}){
 const vis=mesh.faces.map(f=>cam.rotate(f.normal)[2]>.000001),sorted=[...mesh.faces].sort((a,b)=>cam.project(a.mid).z-cam.project(b.mid).z);
 const light=V3.unit([-.3,.85,.5]);
 for(const f of sorted){const front=vis[f.index];if(!front&&!ghost)continue;const ln=cam.rotate(f.normal),shade=clamp(V3.dot(ln,light)*.22+.78,.5,1);geoPath(ctx,f.points,cam);ctx.fillStyle=ghost?(front?'rgba(128,170,151,0.14)':'rgba(128,170,151,0.04)'):`rgb(${Math.round(171*shade+51)},${Math.round(197*shade+37)},${Math.round(181*shade+43)})`;ctx.fill();if(mesh.curved&&!ghost){ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.5;ctx.stroke();}}
 if(edges&&!mesh.sphere){
  const drawEdge=(e,isHidden)=>{if(mesh.curved){const fs=e.faces.map(i=>mesh.faces[i]),silhouette=e.faces.some(i=>vis[i])&&e.faces.some(i=>!vis[i]);const cap=fs.some(f=>f.ids.length>4);if(!silhouette&&!cap)return;}geoLine3(ctx,mesh.vertices[e.a],mesh.vertices[e.b],cam,isHidden?'#9aad9f':'#4b7561',isHidden?1:1.5,isHidden?[4,4]:[]);};
  if(hidden)mesh.edges.filter(e=>!e.faces.some(i=>vis[i])).forEach(e=>drawEdge(e,true));
  mesh.edges.filter(e=>e.faces.some(i=>vis[i])).forEach(e=>drawEdge(e,false));
 }
 if(mesh.sphere){
  const o=cam.project([0,0,0]);circle(ctx,o.x,o.y,mesh.r*cam.scale,null,'#537963',1.4);
  for(const plane of ['equator','meridian']){let prev=null,prevFront=false;for(let i=0;i<=96;i++){const a=i*Math.PI/48,q=plane==='equator'?[mesh.r*Math.cos(a),0,mesh.r*Math.sin(a)]:[mesh.r*Math.cos(a),mesh.r*Math.sin(a),0],front=cam.rotate(q)[2]>=0;if(prev&&(front||hidden))geoLine3(ctx,prev,q,cam,front?'#87a08f':'#a2b4a6',.9,front?[]:[3,3]);prev=q;prevFront=front;}}
 }
 if(labels&&mesh.labels){
  const center=cam.project(V3.mean(mesh.vertices)),groups=[];mesh.vertices.forEach((v,i)=>{const p=cam.project(v),visible=mesh.faces.some((f,j)=>vis[j]&&f.ids.includes(i));if(!visible&&!hidden)return;let group=groups.find(g=>Math.hypot(g.p.x-p.x,g.p.y-p.y)<2);if(!group){group={p,front:[],back:[]};groups.push(group);}group[visible?'front':'back'].push(mesh.labels[i]);});for(const g of groups){const delta=[g.p.x-center.x,g.p.y-center.y],length=Math.hypot(...delta)||1,label=g.front.join(' / ')+(g.back.length?(g.front.length?' ('+g.back.join(' / ')+')':g.back.join(' / ')):''),visible=g.front.length>0;circle(ctx,g.p.x,g.p.y,2.9,visible?'#507a62':'#97aa9e','#fff',1);geoText(ctx,label,g.p.x+15*delta[0]/length,g.p.y+15*delta[1]/length,visible?'#345e49':'#92a399',12);}
 }
}
function geoDimension(ctx,a,b,label,cam,offset=[0,0],color='#a1794a'){
 const p=cam.project(a),q=cam.project(b);line(ctx,p.x,p.y,q.x,q.y,color,1,[3,3]);const mx=(p.x+q.x)/2+offset[0],my=(p.y+q.y)/2+offset[1];geoText(ctx,label,mx,my,color,11);
}
function drawSolidStage(ctx,w,h,p,thumbnail=false){
 const mesh=solidMesh(p),cam=geoCamera(p,w,h,mesh.vertices);if(!thumbnail)geoBackdrop(ctx,w,h,cam,p.shape==='sphere'?-p.r:-(p.shape==='cube'?p.a:p.height)/2-.06);
 geoDrawMesh(ctx,mesh,cam,{ghost:p.ghost,hidden:p.hidden,labels:!thumbnail&&state.labels});
 if(!thumbnail&&p.dimensions&&state.labels){
  const hh=p.shape==='cube'?p.a:p.height;
  if(['sphere','cone','cylinder'].includes(p.shape)){const y=p.shape==='sphere'?0:-p.height/2;geoDimension(ctx,[0,y,0],[p.r,y,0],`r = ${num(p.r)}`,cam,[0,-12]);if(p.shape!=='sphere')geoDimension(ctx,[0,-p.height/2,0],[0,p.height/2,0],`h = ${num(p.height)}`,cam,[-22,0]);geoText(ctx,'O',cam.project([0,y,0]).x-9,cam.project([0,y,0]).y+12,'#829584',11);
  }else{
   const bb=p.shape==='cube'?p.a:p.shape==='cuboid'?p.b:p.shape==='pyramid'?p.a:p.a*Math.sqrt(3)/3;
   geoDimension(ctx,[-p.a/2,-hh/2,bb/2],[p.a/2,-hh/2,bb/2],`a = ${num(p.a)}`,cam,[0,24]);
   if(p.shape!=='cube')geoDimension(ctx,[0,-hh/2,0],[0,hh/2,0],`h = ${num(hh)}`,cam,[21,0]);
   if(p.shape==='cuboid')geoDimension(ctx,[p.a/2,-hh/2,bb/2],[p.a/2,-hh/2,-bb/2],`b = ${num(p.b)}`,cam,[21,8]);
  }
 }
 if(!thumbnail){geoText(ctx,SOLID_NAMES[p.shape],w/2,24,'#88988f',11);drawOrientation(ctx,w,h,cam);stageInfo={kind:'geometry'};}
 return cam;
}
function sectionInsetLayout(w,a){const size=w<450?120:156;return{size,scale:(size-46)/(Math.sqrt(3)*a)};}
function drawSectionInset(ctx,w,h,d,a){
 const {size,scale:s}=sectionInsetLayout(w,a),x=w-size-15,y=18;
 roundRect(ctx,x,y,size,size+22,9,'#ffffffee','#e1e6df',1);text(ctx,'截面正视图',x+12,y+16,12,'#5d6e62');
 const cx=x+size/2,cy=y+size/2+3,centerU=V3.dot(d.center,d.u),centerV=V3.dot(d.center,d.v),flat=d.flat.map(([u,v])=>[u+centerU,v+centerV]);
 if(d.points.length>2){ctx.beginPath();flat.forEach(([a,b],i)=>{const px=cx+a*s,py=cy-b*s;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();ctx.fillStyle='#f4e9d9';ctx.strokeStyle='#b8884b';ctx.lineWidth=1.6;ctx.fill();ctx.stroke();}
 if(d.points.length===2)line(ctx,cx+flat[0][0]*s,cy-flat[0][1]*s,cx+flat[1][0]*s,cy-flat[1][1]*s,'#b8884b',2);
 flat.forEach(([a,b],i)=>{circle(ctx,cx+a*s,cy-b*s,2.5,'#b8884b');if(state.labels&&d.points.length>2)geoText(ctx,String.fromCharCode(80+i),cx+a*s+(a>0?8:-8),cy-b*s+(b>0?-8:8),'#a67d49',9);});
 if(!flat.length)geoText(ctx,'不相交',cx,cy,'#a0a59b',11);
 const bar=a/2*s;line(ctx,x+12,y+size-8,x+12+bar,y+size-8,'#68796d',1.5);line(ctx,x+12,y+size-11,x+12,y+size-5,'#68796d');line(ctx,x+12+bar,y+size-11,x+12+bar,y+size-5,'#68796d');text(ctx,`${num(a/2)} cm`,x+14+bar,y+size-8,10,'#68796d');text(ctx,d.kind,x+size/2,y+size+10,11,'#8f754f','center');
}
function drawSectionStage(ctx,w,h,p,thumbnail=false){
 const box=geoBox(p.a,p.a,p.a),d=sectionData(p),cam=geoCamera(p,w,h,box.vertices,{inset:!thumbnail});if(!thumbnail)geoBackdrop(ctx,w,h,cam);
 if(p.plane){const c=V3.mul(d.normal,d.d),s=p.a*.79,plane=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>V3.add(c,V3.add(V3.mul(d.u,a*s),V3.mul(d.v,b*s))));geoPath(ctx,plane,cam);ctx.fillStyle='#dcbe8c16';ctx.fill();ctx.strokeStyle='#d3b583';ctx.lineWidth=.7;ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);}
 geoDrawMesh(ctx,box,cam,{ghost:true,hidden:p.hidden,labels:false});
 if(d.points.length>=3){geoPath(ctx,d.points,cam);ctx.fillStyle='#cf9d5660';ctx.fill();ctx.strokeStyle='#b7833f';ctx.lineWidth=2.2;ctx.stroke();}else if(d.points.length===2)geoLine3(ctx,d.points[0],d.points[1],cam,'#b7833f',3);
 d.points.forEach((v,i)=>{const q=cam.project(v);circle(ctx,q.x,q.y,thumbnail?2.3:3.6,'#b7833f','#fff',1);if(!thumbnail&&state.labels){const c=cam.project(d.center),dx=q.x-c.x,dy=q.y-c.y,l=Math.hypot(dx,dy)||1;geoText(ctx,String.fromCharCode(80+i),q.x+15*dx/l,q.y+15*dy/l,'#986927',11);}});
 if(!thumbnail){drawSectionInset(ctx,w,h,d,p.a);drawOrientation(ctx,w,h,cam);stageInfo={kind:'geometry'};}
 return cam;
}
function geoFaceCoversPoint(face,q,cam){
 const pts=face.points.map(v=>cam.project(v));
 for(let i=1;i<pts.length-1;i++){
  const [a,b,c]=[pts[0],pts[i],pts[i+1]],den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
  if(Math.abs(den)<1e-8)continue;
  const u=((b.y-c.y)*(q.x-c.x)+(c.x-b.x)*(q.y-c.y))/den,v=((c.y-a.y)*(q.x-c.x)+(a.x-c.x)*(q.y-c.y))/den,t=1-u-v;
  if(u>=-1e-6&&v>=-1e-6&&t>=-1e-6&&u*a.z+v*b.z+t*c.z>q.z+1e-5)return true;
 }
 return false;
}
function drawNetStage(ctx,w,h,p,thumbnail=false){
 const d=netMesh(p),points=d.panels.flatMap(f=>f.points),center=V3.mean(points),cam=geoCamera(p,w,h,points,{net:true,center});if(!thumbnail)geoBackdrop(ctx,w,h,cam);
 const colors=[[163,190,171],[203,175,139],[159,176,202]];
 const visible=d.panels.map(f=>({...f,depth:cam.project(f.mid).z})).sort((a,b)=>a.depth-b.depth);
 for(const f of visible){const n=cam.rotate(f.normal),base=colors[f.color],shade=.88+.12*Math.abs(n[2]);geoPath(ctx,f.points,cam);ctx.fillStyle=`rgb(${base.map(c=>Math.round(c*shade)).join(',')})`;ctx.fill();ctx.strokeStyle='#fffefb';ctx.lineWidth=thumbnail?1:1.6;ctx.stroke();ctx.strokeStyle='#6e817173';ctx.lineWidth=.8;ctx.stroke();if(!thumbnail&&p.faceLabels&&state.labels&&Math.abs(n[2])>.08){const q=cam.project(f.mid);geoText(ctx,f.name,q.x,q.y,'#435b4c',14);}}
 if(!thumbnail){
 const hinges=[[d.panels[0].points[2],d.panels[0].points[3]],[d.panels[0].points[0],d.panels[0].points[1]],[d.panels[0].points[0],d.panels[0].points[3]],[d.panels[0].points[1],d.panels[0].points[2]],[d.panels[2].points[0],d.panels[2].points[1]]];
 hinges.forEach(([a,b])=>{const q=cam.project(V3.mean([a,b])),occluded=d.panels.some(f=>geoFaceCoversPoint(f,q,cam));if(!occluded)geoLine3(ctx,a,b,cam,'#4b6255',1.2,[4,3]);});
 drawOrientation(ctx,w,h,cam);const names=['上 / 下','前 / 后','左 / 右'];names.forEach((s,i)=>{ctx.fillStyle=`rgb(${colors[i].join(',')})`;ctx.fillRect(18+i*83,16,8,8);text(ctx,s,31+i*83,24,10,'#7a897e');});stageInfo={kind:'geometry'};}
 return cam;
}
function drawGeometryStage(ctx,w,h,p,thumbnail=false,id=state.model?.id){if(id==='solids')return drawSolidStage(ctx,w,h,p,thumbnail);if(id==='sections')return drawSectionStage(ctx,w,h,p,thumbnail);if(id==='nets')return drawNetStage(ctx,w,h,p,thumbnail);}
function geometryThumb(canvas){const m=modelById(canvas.dataset.thumb),{ctx,w,h}=setupCanvas(canvas);ctx.save();ctx.translate(0,13);const p={...m.defaults,scale:m.id==='nets'?1.34:1.17,fold:45};drawGeometryStage(ctx,w,h-16,p,true,m.id);ctx.restore();}
function geometrySyncView(){
 if(!state.model?.threeD)return;
 if($('#geoZoomValue'))$('#geoZoomValue').textContent=`${Math.round(state.p.scale*100)}%`;
 const views={iso:[-35,state.model.id==='nets'?38:24],front:[0,0],top:[0,90],side:[90,0]};
 $$('[data-geo-view]').forEach(b=>{const v=views[b.dataset.geoView],active=Math.abs(state.p.yaw-v[0])<.2&&Math.abs(state.p.pitch-v[1])<.2;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 if($('#geoRotateButton')){$('#geoRotateButton').innerHTML=icon(state.geoSpin?'pause':'rotate')+(state.geoSpin?'停止旋转':'自动旋转');$('#geoRotateButton').setAttribute('aria-pressed',String(!!state.geoSpin));}
 if($('#geoFoldButton'))$('#geoFoldButton').innerHTML=icon(state.geoFold?'pause':'play')+(state.geoFold?'暂停折叠':'展开 / 折叠');
}
function geoStop(){state.geoSpin=false;state.geoFold=false;state.running=false;geometrySyncView();}
function geometryAction(action){
 if(!state.model?.threeD)return;
 if(action==='zoom-in'||action==='zoom-out'){state.p.scale=clamp(state.p.scale+(action==='zoom-in'?.1:-.1),.55,1.8);}
 if(action==='rotate'){state.geoSpin=!state.geoSpin;state.geoFold=false;state.running=state.geoSpin;prevFrame=0;}
 if(action==='fold'&&state.model.id==='nets'){state.geoFold=!state.geoFold;state.geoSpin=false;state.geoDirection=state.p.fold>=99?-1:1;state.running=state.geoFold;prevFrame=0;}
 geometrySyncView();requestDraw();
}
function geometryTick(dt){
 if(state.geoSpin)state.p.yaw=((state.p.yaw+dt*20+540)%360)-180;
 if(state.geoFold){state.p.fold=clamp(state.p.fold+state.geoDirection*dt*22,0,100);syncParam('fold');if(state.p.fold===0||state.p.fold===100){state.geoFold=false;state.running=false;}}
 geometrySyncView();
}
function bindGeometryStage(){
 const canvas=$('#simCanvas');if(!canvas)return;canvas.style.cursor='grab';canvas.tabIndex=0;canvas.setAttribute('aria-label','三维模型。拖动旋转，双指或滚轮缩放。键盘方向键旋转，加减键缩放。');
 const pointers=new Map();let distance=0;
 const capture=e=>{try{canvas.setPointerCapture(e.pointerId);}catch{/* Synthetic test events may not have an active pointer. */}};
 const pinch=()=>{const ps=[...pointers.values()];return ps.length>=2?Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y):0;};
 canvas.addEventListener('pointerdown',e=>{if(state.inking||!state.model?.threeD||e.button>0)return;geoStop();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});capture(e);distance=pinch();canvas.style.cursor='grabbing';});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||state.inking||!state.model?.threeD)return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){const d=pinch();if(distance>0)state.p.scale=clamp(state.p.scale*d/distance,.55,1.8);distance=d;}else{state.p.yaw=((state.p.yaw+(e.clientX-old.x)*.5+540)%360)-180;state.p.pitch=clamp(state.p.pitch+(e.clientY-old.y)*.4,-90,90);}geometrySyncView();requestDraw();});
 ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,e=>{pointers.delete(e.pointerId);distance=pinch();canvas.style.cursor=pointers.size?'grabbing':'grab';}));
 canvas.addEventListener('wheel',e=>{if(!state.model?.threeD||state.inking)return;e.preventDefault();state.p.scale=clamp(state.p.scale*Math.exp(-e.deltaY*.001),.55,1.8);geometrySyncView();requestDraw();},{passive:false});
 canvas.addEventListener('keydown',e=>{if(!state.model?.threeD)return;let used=true;if(e.key==='ArrowLeft')state.p.yaw-=5;else if(e.key==='ArrowRight')state.p.yaw+=5;else if(e.key==='ArrowUp')state.p.pitch-=5;else if(e.key==='ArrowDown')state.p.pitch+=5;else if(e.key==='+'||e.key==='=')state.p.scale+=.1;else if(e.key==='-')state.p.scale-=.1;else used=false;if(used){e.preventDefault();geoStop();state.p.yaw=((state.p.yaw+540)%360)-180;state.p.pitch=clamp(state.p.pitch,-90,90);state.p.scale=clamp(state.p.scale,.55,1.8);geometrySyncView();requestDraw();}});
}
