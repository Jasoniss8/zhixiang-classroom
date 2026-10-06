'use strict';
/* Three-dimensional Euclidean geometry. Orthographic projection is intentional:
   lengths/areas are computed in world space, never from the screen image.
   Everything runs locally; there is no rendering library or network dependency. */
const GEO_CAMERA_CONTROLS = [
 ['yaw','','水平视角',-180,180,.1,'°'],['pitch','','俯仰视角',-90,90,.1,'°'],['scale','','视图缩放',.55,1.8,.01,'×']
];
const GEO_CAMERA = {yaw:-35,pitch:24,scale:1};
const SOLID_NAMES = {cube:'正方体',cuboid:'长方体',prism:'正三棱柱',tetra:'正三棱锥',pyramid:'正四棱锥',cylinder:'圆柱',cone:'圆锥',sphere:'球'};
const GEO_STUDY_DEFAULTS={study:'basic',angleKind:'line-line',edge1:'0:1',edge2:'0:4',face1:'0',face2:'2',vectorFrom:'0',vectorTo:'6',restoreFront:'cube',restoreTop:'cube',restoreSide:'cube',coordinates:true};
const GEO_STUDY_CHOICES={study:['basic','views','restore','angles','vectors'],angleKind:['line-line','line-plane','dihedral'],
 edge1:Array.from({length:8},(_,i)=>Array.from({length:7-i},(_,j)=>`${i}:${i+j+1}`)).flat(),edge2:[],face1:['0','1','2','3','4','5','cut'],face2:['0','1','2','3','4','5','cut'],
 vectorFrom:['O',...Array.from({length:8},(_,i)=>String(i)),...Array.from({length:6},(_,i)=>'cut'+i)],vectorTo:[],restoreFront:Object.keys(SOLID_NAMES),restoreTop:Object.keys(SOLID_NAMES),restoreSide:Object.keys(SOLID_NAMES)};
GEO_STUDY_CHOICES.edge2=[...GEO_STUDY_CHOICES.edge1];GEO_STUDY_CHOICES.vectorTo=[...GEO_STUDY_CHOICES.vectorFrom];

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
// Meshes are immutable display geometry. Camera rotation never rebuilds them.
// 48 segments is also the numerical cross-check floor; zoom only adds detail.
const solidMeshCache = new Map();
function curvedResolution(scale=1){
 const zoom=Number.isFinite(scale)?Math.max(.55,Math.min(4,scale)):1;
 const segments=Math.max(48,Math.min(96,Math.ceil(48*Math.sqrt(zoom)/8)*8));
 return {segments,latitudes:Math.round(20*segments/48)};
}
function solidMesh(p){
 if(!['cylinder','cone','sphere'].includes(p.shape))return createSolidMesh(p);
 const resolution=curvedResolution(p.scale),key=[p.shape,p.r,p.height,resolution.segments].join('|');
 if(solidMeshCache.has(key))return solidMeshCache.get(key);
 const mesh=createSolidMesh(p,resolution);
 solidMeshCache.set(key,mesh);
 if(solidMeshCache.size>24)solidMeshCache.delete(solidMeshCache.keys().next().value);
 return mesh;
}
function createSolidMesh(p,resolution=curvedResolution(p.scale)){
 const a=p.a,b=p.b,h=p.height,r=p.r;
 if(p.shape==='cube')return geoBox(a,a,a);
 if(p.shape==='cuboid')return geoBox(a,b,h);
 if(p.shape==='pyramid')return geoMesh([[-a/2,-h/2,a/2],[a/2,-h/2,a/2],[a/2,-h/2,-a/2],[-a/2,-h/2,-a/2],[0,h/2,0]],[[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]],{labels:['A','B','C','D','P']});
 if(p.shape==='prism'||p.shape==='tetra'){
  const base=[[-a/2,-h/2,a*Math.sqrt(3)/6],[a/2,-h/2,a*Math.sqrt(3)/6],[0,-h/2,-a*Math.sqrt(3)/3]];
  return p.shape==='prism'?geoMesh([...base,...base.map(v=>[v[0],h/2,v[2]])],[[0,2,1],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]],{labels:['A','B','C','A₁','B₁','C₁']}):geoMesh([...base,[0,h/2,0]],[[0,2,1],[0,1,3],[1,2,3],[2,0,3]],{labels:['A','B','C','P']});
 }
 const N=resolution.segments;
 if(p.shape==='sphere'){
  const lat=resolution.latitudes,vertices=[[0,r,0]];
  for(let j=1;j<lat;j++)for(let i=0;i<N;i++){const t=Math.PI*j/lat,u=2*Math.PI*i/N;vertices.push([r*Math.sin(t)*Math.cos(u),r*Math.cos(t),r*Math.sin(t)*Math.sin(u)]);}
  const south=vertices.push([0,-r,0])-1,faces=[];
  for(let i=0;i<N;i++)faces.push([0,1+i,1+(i+1)%N]);
  for(let j=0;j<lat-2;j++)for(let i=0;i<N;i++){let a=1+j*N+i,b=1+j*N+(i+1)%N;faces.push([a,b,b+N,a+N]);}
  for(let i=0;i<N;i++)faces.push([south,1+(lat-2)*N+(i+1)%N,1+(lat-2)*N+i]);
  return geoMesh(vertices,faces,{curved:true,sphere:true,r,segments:N,latitudes:lat});
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
function geoStudyMesh(m,p){return m.id==='sections'?geoBox(p.a,p.a,p.a):solidMesh(p);}
function geoStudyPoints(m,p,mesh=geoStudyMesh(m,p)){
 const points=[{id:'O',name:'O',value:[0,0,0]},...(!mesh.curved?mesh.vertices.map((v,i)=>({id:String(i),name:mesh.labels[i],value:v})):[])];
 if(m.id==='sections')points.push(...sectionData(p).points.map((v,i)=>({id:'cut'+i,name:String.fromCharCode(80+i),value:v})));
 return points;
}
function geoStudyFaces(m,p,mesh=geoStudyMesh(m,p)){
 if(mesh.curved)return [];
 const faces=mesh.faces.map((f,i)=>({...f,id:String(i),name:f.ids.map(j=>mesh.labels[j]).join('')}));
 if(m.id==='sections'){const cut=sectionData(p);if(cut.points.length>=3)faces.push({id:'cut',name:'截平面',normal:cut.normal,points:cut.points,ids:[]});}
 return faces;
}
function geoStudyEdges(mesh){return mesh.curved?[]:mesh.edges.map(e=>{const a=Math.min(e.a,e.b),b=Math.max(e.a,e.b);return {...e,a,b,id:`${a}:${b}`,name:mesh.labels[a]+mesh.labels[b],vector:V3.sub(mesh.vertices[b],mesh.vertices[a])};});}
function normalizeGeometryParams(m,p){
 if(!['solids','sections'].includes(m.id))return p;
 const mesh=geoStudyMesh(m,p),edges=geoStudyEdges(mesh),faces=geoStudyFaces(m,p,mesh),points=geoStudyPoints(m,p,mesh);
 for(const key of['edge1','edge2'])if(edges.length&&!edges.some(e=>e.id===p[key]))p[key]=edges[key==='edge2'?Math.min(1,edges.length-1):0].id;
 for(const key of['face1','face2'])if(faces.length&&!faces.some(f=>f.id===p[key]))p[key]=faces[key==='face2'?Math.min(1,faces.length-1):0].id;
 for(const key of['vectorFrom','vectorTo'])if(!points.some(q=>q.id===p[key]))p[key]=points[key==='vectorTo'?Math.min(1,points.length-1):0].id;
 return p;
}
function geoAngleData(m,p){
 const mesh=geoStudyMesh(m,p),edges=geoStudyEdges(mesh),faces=geoStudyFaces(m,p,mesh);
 if(!edges.length)return {valid:false,reason:'请选择正方体、棱柱或正棱锥；曲面网格线不是棱。'};
 const e1=edges.find(e=>e.id===p.edge1)||edges[0],e2=edges.find(e=>e.id===p.edge2)||edges[1];
 const f1=faces.find(f=>f.id===p.face1)||faces[0],f2=faces.find(f=>f.id===p.face2)||faces[1];
 const kind=p.angleKind||'line-line',u=kind==='dihedral'?f1.normal:e1.vector,v=kind==='line-line'?e2.vector:kind==='line-plane'?f1.normal:f2.normal;
 const dot=V3.dot(u,v),length1=V3.len(u),length2=V3.len(v),cos=Math.min(1,Math.max(-1,dot/(length1*length2)));
 const acute=Math.acos(Math.abs(cos))*180/Math.PI,common=kind==='dihedral'?f1.ids.filter(i=>f2.ids.includes(i)):[];
 const adjacent=common.length===2&&f1.id!==f2.id&&mesh.edges.some(e=>common.includes(e.a)&&common.includes(e.b));
 return {valid:true,kind,u,v,dot,length1,length2,cos,acute,angle:kind==='line-plane'?Math.asin(Math.abs(cos))*180/Math.PI:kind==='dihedral'?(adjacent?180-Math.acos(cos)*180/Math.PI:null):acute,
   adjacent,common,e1,e2,f1,f2,mesh};
}
function geoVectorData(m,p){
 const mesh=geoStudyMesh(m,p),points=geoStudyPoints(m,p,mesh),from=points.find(q=>q.id===p.vectorFrom)||points[0],to=points.find(q=>q.id===p.vectorTo)||points.at(-1);
 const vector=V3.sub(to.value,from.value);return {mesh,points,from,to,vector,length:V3.len(vector)};
}
// Orthographic coordinates are fixed world axes, independent of the camera.
function geoOrthoPoint(p,view){return view==='front'?[p[0],p[1],p[2]]:view==='top'?[p[0],-p[2],p[1]]:[p[2],p[1],-p[0]];}
function geoMergeProjection(segments){
 const groups=new Map(),eps=1e-7;
 for(const seg of segments){
  let dx=seg.b[0]-seg.a[0],dy=seg.b[1]-seg.a[1],length=Math.hypot(dx,dy);if(length<eps)continue;
  dx/=length;dy/=length;if(dx< -eps||(Math.abs(dx)<eps&&dy<0)){dx=-dx;dy=-dy;}
  const c=-dy*seg.a[0]+dx*seg.a[1],key=[dx,dy,c].map(v=>Math.round(v/eps)).join(':');
  if(!groups.has(key))groups.set(key,{dx,dy,c,visible:[],hidden:[]});
  groups.get(key)[seg.hidden?'hidden':'visible'].push([dx*seg.a[0]+dy*seg.a[1],dx*seg.b[0]+dy*seg.b[1]].sort((a,b)=>a-b));
 }
 const merge=rs=>{const out=[];for(const r of rs.sort((a,b)=>a[0]-b[0])){const last=out.at(-1);if(last&&r[0]<=last[1]+eps)last[1]=Math.max(last[1],r[1]);else out.push([...r]);}return out;},out=[];
 for(const g of groups.values()){
  const visible=merge(g.visible),hidden=[];
  for(const r of merge(g.hidden)){let pieces=[r];for(const v of visible)pieces=pieces.flatMap(([a,b])=>v[1]<=a+eps||v[0]>=b-eps?[[a,b]]:[[a,Math.min(b,v[0])],[Math.max(a,v[1]),b]].filter(q=>q[1]-q[0]>eps));hidden.push(...pieces);}
  for(const [rs,isHidden] of[[visible,false],[hidden,true]])for(const [a,b] of rs)out.push({a:[g.dx*a-g.dy*g.c,g.dy*a+g.dx*g.c],b:[g.dx*b-g.dy*g.c,g.dy*b+g.dx*g.c],hidden:isHidden});
 }
 return out;
}
function geoOrthographic(mesh,view){
 let segments=[];
 if(mesh.sphere){for(let i=0;i<48;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24;segments.push({a:[mesh.r*Math.cos(a),mesh.r*Math.sin(a)],b:[mesh.r*Math.cos(b),mesh.r*Math.sin(b)],hidden:false});}}
 else{
  const visible=mesh.faces.map(f=>geoOrthoPoint(f.normal,view)[2]>1e-7);
  for(const e of mesh.edges){if(mesh.curved){const cap=e.faces.some(i=>mesh.faces[i].ids.length>4),silhouette=e.faces.some(i=>visible[i])&&e.faces.some(i=>!visible[i]);if(!cap&&!silhouette)continue;}
   segments.push({a:geoOrthoPoint(mesh.vertices[e.a],view).slice(0,2),b:geoOrthoPoint(mesh.vertices[e.b],view).slice(0,2),hidden:!e.faces.some(i=>visible[i])});}
 }
 segments=geoMergeProjection(segments);
 const points=segments.flatMap(s=>[s.a,s.b]);
 const bounds={xmin:Math.min(...points.map(q=>q[0])),xmax:Math.max(...points.map(q=>q[0])),ymin:Math.min(...points.map(q=>q[1])),ymax:Math.max(...points.map(q=>q[1]))};
 const signature=segments.map(s=>[s.hidden,...s.a,...s.b].map(v=>typeof v==='boolean'?Number(v):Math.round(v*1e6)).join(',')).sort().join(';');
 return {segments,bounds,signature,view};
}
let geoProjectionBankCache=null;
function geoProjectionBank(){
 if(geoProjectionBankCache)return geoProjectionBankCache;
 const names={cube:['正方形','正方形','正方形'],cuboid:['正方形','长方形','长方形'],prism:['四边形 · 含隐棱','三角形','四边形'],tetra:['三角形 · 含隐棱','三角形 · 内连线','三角形'],pyramid:['等腰三角形','正方形 · 对角线','等腰三角形'],cylinder:['正方形','圆','正方形'],cone:['等腰三角形','圆','等腰三角形'],sphere:['圆','圆','圆']};
 const samples=Object.keys(SOLID_NAMES).map(shape=>{const p={shape,a:3,b:2,height:3,r:1.5},mesh=solidMesh(p);return {id:shape,p,mesh,views:Object.fromEntries(['front','top','side'].map(view=>[view,geoOrthographic(mesh,view)]))};});
 const options={};for(const [j,view] of ['front','top','side'].entries()){
  options[view]=[];for(const sample of samples){const q=sample.views[view];if(options[view].some(o=>o.signature===q.signature))continue;const b=q.bounds,n=v=>Number(v.toFixed(3));options[view].push({id:sample.id,signature:q.signature,label:`${names[sample.id][j]}（${n(b.xmax-b.xmin)}×${n(b.ymax-b.ymin)} cm）`,projection:q});}
 }
 return geoProjectionBankCache={samples,options};
}
function geoReconstruction(p){
 const bank=geoProjectionBank(),keys={front:'restoreFront',top:'restoreTop',side:'restoreSide'},selected={};
 for(const [view,key] of Object.entries(keys))selected[view]=(bank.samples.find(s=>s.id===p[key])||bank.samples[0]).views[view];
 return {selected,candidates:bank.samples.filter(s=>Object.keys(keys).every(view=>s.views[view].signature===selected[view].signature))};
}
function geoStudyReadout(m,p){
 const coords=a=>'('+a.map(v=>num(v,4)).join(', ')+')';
 if(p.study==='views')return {formula:'正视：(x,y)　俯视：(x,−z)　侧视：(z,y)',caption:'沿 +z、+y、−x 方向观察；三图共用长度比例，实线遮盖重合的虚线。',metrics:[['正视方向','从 +z 看向原点',''],['俯视方向','从 +y 看向原点',''],['侧视方向','从 −x 看向原点','']],details:[['长度单位','cm；三视图使用固定坐标轴正投影，旋转主模型不改变三视图。'],['虚线','表示被实体遮挡且未与可见棱重合的棱；圆和曲面轮廓不是多面体棱。']]};
 if(p.study==='restore'){const d=geoReconstruction(p);return {formula:d.candidates.length?`匹配立体：${d.candidates.map(s=>SOLID_NAMES[s.id]).join(' / ')}`:'这组三视图在样例库中没有匹配',caption:'选择三幅投影，以固定尺寸的 8 种样例匹配；不声称任意三视图都能唯一还原。',metrics:[['匹配数量',String(d.candidates.length),'个'],['样例库','8 种固定尺寸几何体',''],['结果',d.candidates.length===1?SOLID_NAMES[d.candidates[0].id]:d.candidates.length?'有多个匹配':'无匹配','']],details:[['样例尺寸','a=3 cm，b=2 cm，h=3 cm，r=1.5 cm。下方显示当前选择的真实投影。'],['局限','一般三视图可能对应不同立体；本功能只检索所列样例，不推断内部孔洞或任意组合体。']]};}
 if(p.study==='vectors'){
  const d=geoVectorData(m,p);return {formula:`${d.from.name}${d.to.name} = ${coords(d.to.value)} − ${coords(d.from.value)} = ${coords(d.vector)}\n|${d.from.name}${d.to.name}| = √(${d.vector.map(v=>`(${num(v,4)})²`).join(' + ')}) = ${num(d.length,4)} cm`,caption:'原点为模型中心，y 轴竖直；坐标、向量及其模均在空间坐标中计算。',metrics:[['起点 '+d.from.name,coords(d.from.value),'cm'],['终点 '+d.to.name,coords(d.to.value),'cm'],['向量的模',num(d.length,4),'cm']],details:[['向量分量',coords(d.vector)+' cm'],['零向量',d.length<1e-12?'起点与终点重合，模为 0，方向未定义。':'模与视角、投影和缩放无关。']]};
 }
 const d=geoAngleData(m,p);if(!d.valid)return {formula:'曲面辅助线不作为棱或平面',caption:d.reason,metrics:[]};
 const n=(x)=>num(x,5),linePlane=d.kind==='line-plane',dihedral=d.kind==='dihedral';
 const process=`u=${coords(d.u)}，${linePlane?'n':'v'}=${coords(d.v)}\nu·${linePlane?'n':'v'}=${n(d.dot)}，|u|=${n(d.length1)}，|${linePlane?'n':'v'}|=${n(d.length2)}\n`;
 const formula=dihedral?`n₁=${coords(d.u)}，n₂=${coords(d.v)}\nn₁·n₂=${n(d.dot)}；|n₁|=${n(d.length1)}，|n₂|=${n(d.length2)}\n${d.adjacent?`内二面角 δ=180°−acos(n₁·n₂/(|n₁||n₂|))=${n(d.angle)}°`:`两平面锐夹角=acos(|n₁·n₂|/(|n₁||n₂|))=${n(d.acute)}°`}`:process+`${linePlane?'sin':'cos'} α=|u·${linePlane?'n':'v'}|/(|u||${linePlane?'n':'v'}|)=${n(Math.abs(d.cos))}，α=${n(d.angle)}°`;
 return {formula,caption:dihedral?(d.adjacent?'所选面共享一条棱；使用凸多面体的外法向量计算内二面角。':'所选面不共棱或含截平面；只给两平面的锐夹角，不指定内二面角。'):linePlane?'线面角取 0°–90°；法向量垂直于所选平面。':'两棱所在直线的夹角取 0°–90°；异面直线平移方向向量后计算。',metrics:[[dihedral?'面 1':'棱 1',dihedral?d.f1.name:d.e1.name,''],[linePlane?'平面':dihedral?'面 2':'棱 2',d.kind==='line-line'?d.e2.name:linePlane?d.f1.name:d.f2.name,''],[dihedral?'内二面角 δ':'夹角 α',d.angle===null?'不定义':n(d.angle),d.angle===null?'':'°']],details:dihedral?[['两平面的锐夹角',n(d.acute)+'°'],['定义','相邻面内二面角可为钝角；不能一律把法向量夹角的绝对值当作内二面角。']]:[['计算坐标','全部向量取自顶点坐标或截平面法向量，未使用屏幕投影。']]};
}
function geometryReadout(m,p){
 if(p.study&&p.study!=='basic'&&m.id!=='nets')return geoStudyReadout(m,p);
 if(m.id==='solids'){const d=solidData(p),extra=['pyramid','tetra'].includes(p.shape)?'l 为侧面斜高；h 为垂直高度':p.shape==='cone'?'l = √(r² + h²)，为圆锥母线长':'长度单位 cm；投影长度不等于实际长度';return{formula:d.formula,caption:extra,metrics:[['体积 V',num(d.volume,2),'cm³'],['表面积 S',num(d.area,2),'cm²'],['结构',d.topology,'']]};}
 if(m.id==='sections'){const d=sectionData(p);return{formula:`${num(d.normal[0],3)}x + ${num(d.normal[1],3)}y + ${num(d.normal[2],3)}z = ${num(d.d,3)}`,caption:'截平面方程 · 原点为正方体中心，y 轴竖直向上',metrics:[['截面形状',d.kind,''],['截面面积',num(d.area,3),'cm²'],['截面周长',d.points.length<3?'—':num(d.perimeter,3),d.points.length<3?'':'cm']]};}
 const d=netMesh(p);return{formula:p.shape==='cube'?'S = 6a²':'S = 2(ab + ah + bh)',caption:'中间状态不是封闭几何体；体积数值指完全闭合后的体积',metrics:[['六个面的总面积',num(d.area,2),'cm²'],['闭合后的体积',num(d.volume,2),'cm³'],['展开程度',num(p.fold,0),'%']]};
}
function geoVisibleControls(m,p){if(p.study==='restore')return [];return m.controls.filter(c=>{
 const key=c[0];if(['yaw','pitch','scale'].includes(key))return false;
 if(m.id==='sections')return true;
 if(m.id==='nets')return !(['b','height'].includes(key)&&p.shape==='cube');
 return key==='r'?['sphere','cone','cylinder'].includes(p.shape):key==='a'?!['sphere','cone','cylinder'].includes(p.shape):key==='b'?p.shape==='cuboid':key==='height'?!['sphere','cube'].includes(p.shape):true;
 }).map(c=>c[0]==='a'&&p.shape==='cube'?[c[0],c[1],'棱长',...c.slice(3)]:c);}
function renderGeometryControls(){
 const m=state.model,p=state.p,root=$('#controlBody');
 $('#stage').dataset.study=p.study||'basic';
 root.innerHTML=geoStudyControls(m,p)+(m.choices?.shape&&p.study!=='restore'?`<label class="control-select-label" for="solidSelect">${m.id==='nets'?'展开对象':'几何体'}</label><select id="solidSelect" class="control-select" data-geo-select="shape">${m.choices.shape.map(k=>`<option value="${k}" ${p.shape===k?'selected':''}>${SOLID_NAMES[k]}</option>`).join('')}</select>`:'')+`${p.study==='restore'?'':`<h3>预设</h3><div class="preset-list">${m.presets.map((s,i)=>`<button class="preset" data-preset="${i}">${s[0]}</button>`).join('')}</div><div class="params-grid">${geoVisibleControls(m,p).map(c=>paramHTML(c,p)).join('')}</div>`}<div class="control-divider"></div><h3>显示</h3><label class="checkline"><input type="checkbox" data-flag="labels" ${state.labels?'checked':''}>显示标注</label>${(['angles','vectors','restore'].includes(p.study)?[['hidden','显示遮挡棱线']]:m.id==='nets'?[['faceLabels','显示面名称']]:m.id==='sections'?[['plane','显示截平面'],['hidden','显示遮挡棱线']]:[['hidden','显示遮挡棱线'],['ghost','透明显示'],['dimensions','显示尺寸']]).map(([k,label])=>`<label class="checkline"><input type="checkbox" data-geo-toggle="${k}" ${p[k]?'checked':''}>${label}</label>`).join('')}<p class="control-note">${m.id==='nets'?'同色面在闭合时相对。这里只展示一种展开方式。':m.id==='sections'?'位置 ±100% 对应两个支撑平面，可能出现点或线段。':'曲面上的辅助线不是棱。改变尺寸后，数值会重新计算。'}</p><button class="source-link" data-action="model-info">模型条件与参考资料</button>`;
 updateRanges(root);
}

function syncGeometrySelections(m,p){
 if(!['solids','sections'].includes(m.id))return;
 const mesh=geoStudyMesh(m,p),edges=geoStudyEdges(mesh),faces=geoStudyFaces(m,p,mesh),points=geoStudyPoints(m,p,mesh);
 for(const [keys,items] of [[['edge1','edge2'],edges],[['face1','face2'],faces],[['vectorFrom','vectorTo'],points]])for(const key of keys){const el=$('#geo-'+key);if(el)el.innerHTML=items.map(q=>`<option value="${q.id}" ${p[key]===q.id?'selected':''}>${q.name}</option>`).join('');}
}
function geoStudyControls(m,p){
 if(m.id==='nets')return '';
 const select=(key,label,options)=>`<label class="control-select-label" for="geo-${key}">${label}</label><select id="geo-${key}" class="control-select" data-geo-select="${key}">${options.map(([id,name])=>`<option value="${id}" ${p[key]===id?'selected':''}>${name}</option>`).join('')}</select>`;
 let html=select('study','观察内容',[['basic','立体与尺寸'],['views','三视图'],['restore','由三视图匹配立体'],['angles','棱、平面与夹角'],['vectors','空间向量']]);
 if(p.study==='restore'){
  const bank=geoProjectionBank();for(const [view,key,label] of [['front','restoreFront','正视图'],['top','restoreTop','俯视图'],['side','restoreSide','侧视图']]){
   const signature=bank.samples.find(s=>s.id===p[key])?.views[view].signature;p[key]=bank.options[view].find(o=>o.signature===signature)?.id||'cube';
   html+=select(key,label,bank.options[view].map(o=>[o.id,o.label]));
  }
 }
 if(p.study==='angles'){
  html+=select('angleKind','夹角类型',[['line-line','两棱所在直线'],['line-plane','棱与平面'],['dihedral','二面角 / 平面夹角']]);
  const mesh=geoStudyMesh(m,p),edges=geoStudyEdges(mesh).map(e=>[e.id,e.name]),faces=geoStudyFaces(m,p,mesh).map(f=>[f.id,f.name]);
  if(edges.length){if(p.angleKind!=='dihedral')html+=select('edge1','棱 1',edges);if(p.angleKind==='line-line')html+=select('edge2','棱 2',edges);else html+=select('face1','平面 1',faces);if(p.angleKind==='dihedral')html+=select('face2','平面 2',faces);}
  else html+='<p class="control-note">请选择多面体；曲面网格线不作为棱。</p>';
 }
 if(p.study==='vectors'){
  const points=geoStudyPoints(m,p).map(q=>[q.id,q.name]);html+=select('vectorFrom','向量起点',points)+select('vectorTo','向量终点',points)+`<label class="checkline"><input type="checkbox" data-geo-toggle="coordinates" ${p.coordinates?'checked':''}>显示所选点坐标</label>`;
 }
 return html;
}
function drawGeoProjection(ctx,projection,rect,scale,title){
 const {x,y,w,h}=rect,b=projection.bounds,cx=x+w/2-(b.xmin+b.xmax)*scale/2,cy=y+h/2+10+(b.ymin+b.ymax)*scale/2;
 roundRect(ctx,x,y,w,h,7,'#fbfcfa','#dfe6dc',1);text(ctx,title,x+12,y+21,12,PALETTE.ink);
 ctx.save();ctx.beginPath();ctx.rect(x+5,y+32,w-10,h-48);ctx.clip();
 for(const hidden of [true,false])for(const e of projection.segments.filter(e=>e.hidden===hidden))line(ctx,cx+e.a[0]*scale,cy-e.a[1]*scale,cx+e.b[0]*scale,cy-e.b[1]*scale,hidden?'#8a9b91':PALETTE.green,hidden?1.2:1.8,hidden?[5,4]:[]);
 ctx.restore();text(ctx,`${num(b.xmax-b.xmin,2)} × ${num(b.ymax-b.ymin,2)} cm`,x+w/2,y+h-12,12,PALETTE.muted,'center');
}
function geoArrow3(ctx,a,b,cam,color,label){const x=cam.project(a),y=cam.project(b);if(Math.hypot(y.x-x.x,y.y-x.y)<2)circle(ctx,y.x,y.y,4,color);else arrow(ctx,x.x,x.y,y.x,y.y,color,2.3);if(label)geoText(ctx,label,y.x+12,y.y-12,color,12);}
function drawGeoStudy(ctx,w,h,p,m){
 const isViews=['views','restore'].includes(p.study),mesh=geoStudyMesh(m,p),mainH=isViews?(w<540?260:h*.55):h;
 let cam;
 if(p.study==='restore'){
  const d=geoReconstruction(p);if(d.candidates.length){const each=w/d.candidates.length;d.candidates.forEach((q,i)=>{ctx.save();ctx.translate(i*each,0);drawSolidStage(ctx,each,mainH,{...p,...q.p,dimensions:false,study:'basic'});ctx.restore();});}
  else text(ctx,'这组投影在样例库中没有匹配',w/2,mainH/2,14,PALETTE.muted,'center');
 }else if(isViews){cam=m.id==='sections'?drawSectionStage(ctx,w,mainH,p):drawSolidStage(ctx,w,mainH,p);}
 else{
  cam=geoCamera(p,w,h,mesh.vertices);geoBackdrop(ctx,w,h,cam);geoDrawMesh(ctx,mesh,cam,{ghost:true,hidden:p.hidden,labels:state.labels});
  if(m.id==='sections'){const cut=sectionData(p);if(cut.points.length>=3){geoPath(ctx,cut.points,cam);ctx.fillStyle='#cf9d562d';ctx.fill();ctx.strokeStyle=PALETTE.orange;ctx.stroke();}}
 }
 if(isViews){
  const views=p.study==='restore'?geoReconstruction(p).selected:Object.fromEntries(['front','top','side'].map(v=>[v,geoOrthographic(mesh,v)])),stacked=w<540;
  const pw=stacked?w-24:(w-48)/3,ph=stacked?(h-mainH-38)/3:h-mainH-26;
  const scale=Math.min(...Object.values(views).map(q=>Math.min((pw-40)/(q.bounds.xmax-q.bounds.xmin||1),(ph-70)/(q.bounds.ymax-q.bounds.ymin||1))));
  ['front','top','side'].forEach((v,i)=>drawGeoProjection(ctx,views[v],{x:12+(stacked?0:i*(pw+12)),y:mainH+8+(stacked?i*(ph+8):0),w:pw,h:ph},scale,['正视 · 从 +z','俯视 · 从 +y','侧视 · 从 −x'][i]));
 }
 if(p.study==='angles'){
  const d=geoAngleData(m,p);if(d.valid){
   const edge=(e,color)=>geoArrow3(ctx,mesh.vertices[e.a],mesh.vertices[e.b],cam,color,e.name);
   const face=(f,color)=>{geoPath(ctx,f.points,cam);ctx.fillStyle=color+'35';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();const c=f.mid||V3.mean(f.points),len=Math.max(.6,p.a*.38);geoArrow3(ctx,c,V3.add(c,V3.mul(V3.unit(f.normal),len)),cam,color,'n');};
   if(d.kind==='line-line'){edge(d.e1,PALETTE.orange);edge(d.e2,PALETTE.purple);}else if(d.kind==='line-plane'){face(d.f1,PALETTE.purple);edge(d.e1,PALETTE.orange);}else{face(d.f1,PALETTE.orange);face(d.f2,PALETTE.purple);}
   text(ctx,`${d.kind==='dihedral'?'内二面角':'夹角'}：${d.angle===null?'不定义':num(d.angle,3)+'°'}`,18,25,13,PALETTE.ink);
  }else text(ctx,'选择多面体后可测角',w/2,30,14,PALETTE.muted,'center');
 }
 if(p.study==='vectors'){
  const d=geoVectorData(m,p),span=Math.max(...mesh.vertices.map(v=>V3.len(v)))*1.1;
  [[1,0,0],[0,1,0],[0,0,1]].forEach((axis,i)=>geoArrow3(ctx,V3.mul(axis,-span*.25),V3.mul(axis,span),cam,[PALETTE.orange,PALETTE.green,PALETTE.purple][i],['x','y','z'][i]));
  geoArrow3(ctx,d.from.value,d.to.value,cam,PALETTE.orange,`${d.from.name}${d.to.name}`);
  for(const q of[d.from,d.to]){const pt=cam.project(q.value);circle(ctx,pt.x,pt.y,4,PALETTE.orange,'#fff',1);if(p.coordinates)geoText(ctx,`${q.name} (${q.value.map(v=>num(v,2)).join(', ')})`,clamp(pt.x,90,w-90),pt.y+22,PALETTE.ink,12);}
  text(ctx,`|${d.from.name}${d.to.name}| = ${num(d.length,4)} cm`,18,25,13,PALETTE.ink);
 }
 stageInfo={kind:'geometry',study:p.study};return cam;
}
window.ZhixiangGeometryTools=Object.freeze({V3,solidMesh,geoBox,geoOrthographic,geoProjectionBank,geoReconstruction,geoAngleData,geoVectorData,normalizeGeometryParams});

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
 // Project each vertex and normal once, instead of projecting face midpoints
 // repeatedly during sorting and projecting shared vertices for each face.
 const projected=mesh.vertices.map(v=>cam.project(v));
 const normals=mesh.faces.map(f=>cam.rotate(f.normal));
 const vis=normals.map(n=>n[2]>.000001);
 const depths=mesh.faces.map(f=>f.ids.reduce((sum,id)=>sum+projected[id].z,0)/f.ids.length);
 const sorted=mesh.faces.filter(f=>ghost||vis[f.index]).sort((a,b)=>depths[a.index]-depths[b.index]);
 const light=V3.unit([-.3,.85,.5]);
 for(const f of sorted){
  const front=vis[f.index],shade=clamp(V3.dot(normals[f.index],light)*.22+.78,.5,1);
  ctx.beginPath();f.ids.forEach((id,i)=>{const q=projected[id];i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();
  ctx.fillStyle=ghost?(front?'rgba(128,170,151,0.14)':'rgba(128,170,151,0.04)'):`rgb(${Math.round(171*shade+51)},${Math.round(197*shade+37)},${Math.round(181*shade+43)})`;
  ctx.fill();if(mesh.curved&&!ghost){ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.5;ctx.stroke();}
 }
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
function drawGeometryStage(ctx,w,h,p,thumbnail=false,id=state.model?.id){if(!thumbnail&&['solids','sections'].includes(id)&&p.study&&p.study!=='basic')return drawGeoStudy(ctx,w,h,p,{id});if(id==='solids')return drawSolidStage(ctx,w,h,p,thumbnail);if(id==='sections')return drawSectionStage(ctx,w,h,p,thumbnail);if(id==='nets')return drawNetStage(ctx,w,h,p,thumbnail);}
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

// Analytic geometry and calculus: all inputs and outputs are mathematical coordinates.
// Kept independent of the DOM/canvas so numerical identities can be tested directly.
window.ZhixiangMathTools = (() => {
 function conicGeometry(p) {
  const unified=p.mode==='unified', e=unified?p.e:p.kind==='parabola'?1:p.kind==='hyperbola'?Math.hypot(p.a,p.b)/p.a:Math.sqrt(Math.max(0,(p.a-p.b)*(p.a+p.b)))/p.a;
  const type=e===0?'circle':e===1?'parabola':e<1?'ellipse':'hyperbola';
  let a=p.a,b=p.b,c=0,cx=p.cx,cy=p.cy,vertex=null,foci=[],directrices=[],vertices=[],slope=null;
  if(unified){
   if(e===1){vertex={x:cx+p.p/2,y:cy};foci=[{x:cx,y:cy}];directrices=[cx+p.p];vertices=[vertex];c=p.p/2;}
   else{
    const q=Math.abs(1-e*e);a=p.p/q;b=p.p/Math.sqrt(q);c=e*a;cx+=e<1?-c:c;
    foci=[{x:p.cx,y:cy},{x:2*cx-p.cx,y:cy}];
    directrices=e?[p.cx+p.p/e,2*cx-p.cx-p.p/e]:[];
   }
  }else if(type==='parabola'){
   vertex={x:cx,y:cy};c=p.p/2;foci=[{x:cx+c,y:cy}];directrices=[cx-c];vertices=[vertex];
  }else{
   c=e*a;foci=[{x:cx-c,y:cy},{x:cx+c,y:cy}];directrices=e?[cx-a/e,cx+a/e]:[];
  }
  if(type!=='parabola'){
   vertices=[{x:cx-a,y:cy},{x:cx+a,y:cy}];
   if(e<1)vertices.push({x:cx,y:cy-b},{x:cx,y:cy+b});
   else slope=b/a;
  }
  return {type,e,a,b,c,cx,cy,vertex,foci,directrices,vertices,slope,unified};
 }
 function conicPoint(p, parameter) {
  if(p.mode==='unified'){
   const theta=(parameter??p.angle)*Math.PI/180,den=1+p.e*Math.cos(theta);
   if(Math.abs(den)<1e-10)return null; // The point is at infinity, not a finite drawable point.
   const r=p.p/den;
   return {x:p.cx+r*Math.cos(theta),y:p.cy+r*Math.sin(theta)};
  }
  if(p.kind==='ellipse'){
   const t=(parameter??p.angle)*Math.PI/180;
   return{x:p.cx+p.a*Math.cos(t),y:p.cy+p.b*Math.sin(t)};
  }
  const t=parameter??p.u;
  if(p.kind==='hyperbola')return{x:p.cx+(p.branch==='left'?-1:1)*p.a*Math.cosh(t),y:p.cy+p.b*Math.sinh(t)};
  return{x:p.cx+p.p*t*t/2,y:p.cy+p.p*t};
 }
 function conicMeasurements(p) {
  const g=conicGeometry(p),point=conicPoint(p);
  if(!point)return {...g,point,pf:[],directrixDistance:null,ratio:null,invariant:null};
  const pf=g.foci.map(f=>Math.hypot(point.x-f.x,point.y-f.y));
  const directrixDistance=g.directrices.length?Math.abs(point.x-g.directrices[0]):null;
  const invariant=g.type==='hyperbola'?Math.abs(pf[0]-pf[1]):g.type==='parabola'?pf[0]:pf[0]+pf[1];
  return {...g,point,pf,directrixDistance,ratio:directrixDistance?pf[0]/directrixDistance:null,invariant};
 }
 function derivativeDomain(kind,x) {return Number.isFinite(x)&&(kind==='log'?x>0:kind==='reciprocal'?x!==0:true);}
 function derivativeValue(p,x) {
  if(!derivativeDomain(p.kind,x))return NaN;
  if(p.kind==='poly')return ((p.a*x+p.b)*x+p.c)*x+p.d;
  return p.a*(p.kind==='sin'?Math.sin(x):p.kind==='exp'?Math.exp(x):p.kind==='log'?Math.log(x):1/x)+p.d;
 }
 function derivativeAnalytic(p,x) {
  if(!derivativeDomain(p.kind,x))return NaN;
  if(p.kind==='poly')return (3*p.a*x+2*p.b)*x+p.c;
  return p.a*(p.kind==='sin'?Math.cos(x):p.kind==='exp'?Math.exp(x):p.kind==='log'?1/x:-1/(x*x));
 }
 function centralDerivative(p,x) {
  if(!derivativeDomain(p.kind,x))return {value:NaN,delta:NaN};
  const singular=p.kind==='log'||p.kind==='reciprocal';
  let delta=Math.cbrt(Number.EPSILON)*(singular?Math.abs(x):Math.max(1,Math.abs(x)));
  if(singular)delta=Math.min(delta,Math.abs(x)/4);
  if(!delta||x+delta===x||x-delta===x)return{value:NaN,delta};
  return {value:(derivativeValue(p,x+delta)-derivativeValue(p,x-delta))/(2*delta),delta};
 }
 function derivativeReadings(p) {
  const valid=derivativeDomain(p.kind,p.x0),y=derivativeValue(p,p.x0),analytic=derivativeAnalytic(p,p.x0),central=centralDerivative(p,p.x0),x1=p.x0+p.h;
  let reason='';
  if(!valid)reason=p.kind==='log'?'x₀ 必须大于 0；切线与割线已禁用。':'x₀ = 0 不在定义域内；切线与割线已禁用。';
  else if(p.h===0)reason='h = 0 时割线斜率未定义；图中保留切线极限。';
  else if(!derivativeDomain(p.kind,x1)||(p.kind==='reciprocal'&&p.x0*x1<=0))reason='割线端点或区间越过 x = 0；割线已禁用，请减小 |h|。';
  const secant=reason?NaN:(derivativeValue(p,x1)-y)/p.h;
  const near=valid&&['log','reciprocal'].includes(p.kind)&&Math.abs(p.x0)<.05;
  return{valid,y,analytic,numeric:central.value,delta:central.delta,error:Math.abs(central.value-analytic),secant,x1,reason,near};
 }
 function derivativeAnalysis(p,lo=-6,hi=6) {
  let zeros=[],constant=p.kind==='poly'?p.a===0&&p.b===0&&p.c===0:p.a===0;
  if(!constant&&p.kind==='poly'){
   const A=3*p.a,B=2*p.b,C=p.c;
   if(A===0){if(B!==0)zeros=[-C/B];}
   else {
    const disc=B*B-4*A*C;
    if(disc===0)zeros=[-B/(2*A)];
    else if(disc>0){const q=-.5*(B+(B>=0?1:-1)*Math.sqrt(disc));zeros=[q/A,C/q];}
   }
  }else if(!constant&&p.kind==='sin'){
   for(let k=Math.ceil((lo-Math.PI/2)/Math.PI);k<=Math.floor((hi-Math.PI/2)/Math.PI);k++)zeros.push(Math.PI/2+k*Math.PI);
  }
  zeros=[...new Set(zeros.filter(x=>x>=lo&&x<=hi))].sort((a,b)=>a-b);
  const boundaries=[lo,...zeros.filter(x=>x>lo&&x<hi),...(['log','reciprocal'].includes(p.kind)&&lo<0&&hi>0?[0]:[]),hi].sort((a,b)=>a-b);
  const intervals=[];
  for(let i=1;i<boundaries.length;i++){
   const a=boundaries[i-1],b=boundaries[i];if(a===b||!derivativeDomain(p.kind,(a+b)/2))continue;
   const slope=derivativeAnalytic(p,(a+b)/2);
   const sign=constant?0:Math.sign(slope),previous=intervals[intervals.length-1];
   // A horizontal tangent need not interrupt monotonicity; domain holes do.
   if(previous&&previous.to===a&&previous.sign===sign&&derivativeDomain(p.kind,a))previous.to=b;
   else intervals.push({from:a,to:b,sign});
  }
  const critical=zeros.filter(x=>x>lo&&x<hi).map(x=>{
   const step=Math.min(.001,...zeros.filter(y=>y!==x).map(y=>Math.abs(x-y)/4)),left=derivativeAnalytic(p,x-step),right=derivativeAnalytic(p,x+step);
   return{x,y:derivativeValue(p,x),type:left>0&&right<0?'极大值':left<0&&right>0?'极小值':'驻点（非极值）'};
  });
  return{zeros,critical,intervals,constant,lo,hi};
 }
 return Object.freeze({conicGeometry,conicPoint,conicMeasurements,derivativeDomain,derivativeValue,derivativeAnalytic,centralDerivative,derivativeReadings,derivativeAnalysis});
})();
