/* Bounded university question templates. No evaluation of user code or general CAS. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ZhixiangUniversityQuestions = api;
})(typeof window === "object" ? window : globalThis, function (root) {
  "use strict";
  const number = "(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
  const atom = "[+-]?(?:" + number + "(?:\\s*\\*?\\s*(?:π|pi))?|π|pi)(?:\\s*/\\s*" + number + ")?";
  const numeric = (key, label, min, max, extra = {}) => ({key, label, type: "number", unit: "", min, max, ...extra});
  const select = (key, label, values, extra = {}) => ({key, label, type: "select", unit: "", options: values.map(([value, label]) => ({value, label})), ...extra});
  const types = [
    {id:"taylor",modelId:"taylor",title:"泰勒展开",university:true,
      example:"f(x)=sin(x)，在a=0处作5阶泰勒展开，计算x=0.5处的近似值与误差。",
      scope:"A·sin x、A·cos x、A·e^x、A·ln x、A/x加常数；明确展开点和阶数，可给求值点。",
      fields:[select("kind","函数",[["sin","sin x"],["cos","cos x"],["exp","e^x"],["log","ln x"],["reciprocal","1/x"]]),numeric("amp","函数系数 A",-3,3),numeric("offset","常数 D",-4,4),numeric("center","展开点 a",-5,5),numeric("degree","最高次数 N",0,12,{integer:true}),numeric("probe","求值点 x",-8,8,{optional:true})],viewFields:["span"]},
    {id:"linear-transform",modelId:"linear-transform",title:"矩阵与线性变换",university:true,
      example:"矩阵A=[[1,2],[0,1]]，列向量v=(2,-1)，求Av与det(A)。",
      scope:"实2×2矩阵与二维列向量；计算Av、行列式，不求特征值、逆矩阵或未知矩阵。",
      fields:[select("task","计算内容",[["vector","Av与行列式"],["det","行列式"]],{parameter:false,readOnly:true}),...[["m11","a₁₁"],["m12","a₁₂"],["m21","a₂₁"],["m22","a₂₂"]].map(([k,l])=>numeric(k,l,-5,5)),numeric("vx","列向量第1项",-5,5,{when:{task:"vector"}}),numeric("vy","列向量第2项",-5,5,{when:{task:"vector"}})],viewFields:["tau","eigen"]},
    {id:"fourier",modelId:"fourier",title:"傅里叶级数",university:true,
      example:"标准奇方波，半幅A=1，周期T=2π，最高谐波阶数N=9，计算x=π/4处的傅里叶部分和。",
      scope:"标准零均值奇方波、奇锯齿波和标准三角波；指定半幅、周期和最高谐波次数，可给相位和求值点。",
      fields:[select("kind","标准波形",[["square","奇方波"],["sawtooth","奇锯齿波"],["triangle","标准三角波"]]),numeric("amplitude","半幅 A",.1,3),numeric("period","周期 T",.1,20),select("axisUnit","横轴单位",[["1","无量纲"],["s","秒"]]),numeric("terms","最高谐波次数 N",1,50,{integer:true}),numeric("phase","相位 φ",-Math.PI,Math.PI,{optional:true,unit:"rad"}),numeric("probe","求值位置",-40,40,{optional:true})],viewFields:["probe","harmonic"]},
    {id:"gradient",modelId:"gradient",title:"偏导数与切平面",university:true,
      example:"f(x,y)=x²+xy+2y²，在P=(1,2)处求梯度与切平面。",
      scope:"ax²+bxy+cy²+dx+ey+f与已知点；方向导数需明确角度或非零方向向量。",
      fields:[select("task","计算内容",[["tangent","梯度与切平面"],["directional","梯度与方向导数"]],{parameter:false,readOnly:true}),...[["a","x²系数"],["b","xy系数"],["c","y²系数"],["d","x系数"],["e","y系数"],["f","常数项"]].map(([k,l])=>numeric(k,l,-3,3)),numeric("x0","点的x坐标",-3,3),numeric("y0","点的y坐标",-3,3),numeric("theta","方向与+x轴夹角",-180,180,{unit:"°",when:{task:"directional"}})],viewFields:["yaw","pitch","scale"]},
    {id:"ode",modelId:"ode",title:"一阶微分方程",university:true,
      example:"一阶微分方程dy/dx=x-y，y(0)=1，步长h=0.1，求y(2)。",
      scope:"y′=ax+by+c或Logistic方程y′=ry(1−y/K)；给定初值与正向目标点或区间长度，可给数值步长。",
      fields:[select("kind","方程",[["linear","y′=ax+by+c"],["logistic","y′=ry(1−y/K)"]]),numeric("a","x系数 a",-2,2,{when:{kind:"linear"}}),numeric("b","y系数 b",-2,2,{when:{kind:"linear"}}),numeric("c","常数 c",-2,2,{when:{kind:"linear"}}),numeric("r","增长率 r",.1,2,{when:{kind:"logistic"}}),numeric("K","容量 K",.5,5,{when:{kind:"logistic"}}),numeric("t0","初始自变量 x₀",-2,2),numeric("y0","初值 y₀",-3,5),numeric("target","目标自变量（或填写正向区间长度）",-1.5,8,{optional:true,parameter:false}),numeric("span","正向区间长度（或填写目标点）",.5,6,{optional:true}),numeric("h","数值步长 h",.02,.5,{optional:true})],viewFields:[]},
    {id:"rlc",modelId:"rlc",title:"串联RLC稳态",university:true,
      example:"串联RLC电路，R=20Ω，L=100mH，C=100μF，正弦电源峰值U0=10V，频率f=50Hz，求稳态电流幅值与相位。",
      scope:"串联RLC正弦稳态；明确电阻、电感、电容、频率与电源峰值或有效值，不处理接通暂态。",
      fields:[numeric("resistance","电阻 R",0,500,{unit:"Ω"}),numeric("inductance","电感 L",10,1000,{unit:"mH"}),numeric("capacitance","电容 C",1,1000,{unit:"μF"}),select("voltageKind","电源数值类型",[["peak","峰值"],["rms","有效值"]],{parameter:false}),numeric("voltageValue","电源电压",0,400,{unit:"V",parameter:false}),numeric("frequency","频率 f",1,2000,{unit:"Hz"})],viewFields:["voltage0","current0"]},
  ];
  const byId = id => types.find(t=>t.id===id);
  const fieldsFor = (id,values={}) => (byId(id)?.fields||[]).filter(f=>!f.when||Object.entries(f.when).every(([k,v])=>values[k]===v)).map(f=>f.key==='probe'&&values.requiresProbe===true?{...f,optional:false}:f);
  function scalar(s) {
    const clean=String(s).replace(/\s|\*/g,"").replace(/pi/gi,"π");
    if (!new RegExp("^[+-]?(?:"+number+"π?|π)(?:/"+number+")?$").test(clean)) return NaN;
    const [n,d]=clean.split('/');
    const nValue=n.includes('π') ? (n.replace('π','')===''||n.replace('π','')==='+'?1:n.replace('π','')==='-'?-1:Number(n.replace('π','')))*Math.PI:Number(n);
    return nValue/(d===undefined?1:Number(d));
  }
  function issue(r,message){if(!r.issues.includes(message))r.issues.push(message);}
  function put(r,key,value,source){
    if((typeof value==='number'&&!Number.isFinite(value))||value===undefined){issue(r,'数值或分数无效，请检查分母、单位和有限值。');return;}
    if(Object.hasOwn(r.values,key)&&r.values[key]!==value){issue(r,`${key}出现冲突条件，请只保留一道题并核对数值。`);return;}
    r.values[key]=value;r.sources[key]=source;
  }
  function normalize(s){return s.replace(/²/g,'^2').replace(/³/g,'^3').normalize('NFKC').replace(/[−–—﹣]/g,'-').replace(/[×·]/g,'*').replace(/′/g,"'").replace(/μ/g,'µ');}
  function context(text){return {original:text,text,consume(re,fn){this.text=this.text.replace(re,(...args)=>{fn?.(...args);return ' '.repeat(args[0].length);});}};}
  function literal(c,r,key,prefix,options={}){
    const suffix=options.suffix||'';
    const re=new RegExp('(?:'+prefix+')\\s*(?:=|为|是|:)?\\s*('+atom+')'+suffix+'(?=$|[\\s，,。；;？?处阶次度])','gi');
    c.consume(re,(full,value)=>put(r,key,(options.transform||scalar)(value),full));
  }
  function plainNumbers(s){return s.split(',').map(scalar);}
  function rejectRest(c,r){
    // Every formula/number/assignment must be consumed by a complete template.
    // Ordinary Chinese explanatory text can remain, but unsupported constraints cannot.
    const rest=c.text.replace(/\b(?:Taylor|Maclaurin|Fourier|Logistic|RLC|RK4|Euler|SI|CSV|SVG)\b/gi,'')
      .replace(/det\s*\(\s*A\s*\)|Av|∇f|f[xyz]|f\s*\(?x,?y?\)?|[xyztPA]\s*轴|[xyzt]\s*处/gi,'');
    if(/[=<>≤≥∈+*/π√%!-]|[0-9]|\^|\[|\]|\b(?:sin|cos|tan|exp|ln|log)\b/i.test(rest))issue(r,'题干还含有未支持或未完整识别的公式、数值或约束；不会省略这些条件后套用模型。');
    if(/为奇数|为偶数|为正数|为负数|大于|小于|不在|并非|不是|积分|原函数|求根|方程的根|拉普拉斯|联立|方程组|求证|证明|反求|最小阶|至少|至多|不超过|误差上界|误差界|逆矩阵|未知矩阵|参数范围|取值范围|约束|不等式|分段函数|边值|边界条件|初始导数/.test(c.original))issue(r,'本入口仅支持列出的正向计算，不处理证明、反求、附加约束或组合问题。');
  }
  function detect(text){
    const found=[];
    if(/泰勒|麦克劳林|Taylor|Maclaurin/i.test(text))found.push('taylor');
    if(/矩阵|线性变换|det\s*\(|A\s*=\s*\[\[/i.test(text))found.push('linear-transform');
    if(/傅里叶|Fourier|谐波|方波|锯齿波|三角波/i.test(text))found.push('fourier');
    if(/偏导|梯度|切平面|方向导数|f\s*\(\s*x\s*,\s*y\s*\)/i.test(text))found.push('gradient');
    if(/微分方程|方向场|Logistic|逻辑斯蒂|d\s*y\s*\/\s*d\s*[tx]|y\s*['′]/i.test(text))found.push('ode');
    if(/RLC|电感.*电容|电容.*电感/i.test(text))found.push('rlc');
    return found;
  }
  function parsePolynomial(expression,terms){
    const s=expression.replace(/\s/g,'');
    const coefficients=Object.fromEntries(terms.map(t=>[t,0]));
    let offset=0;
    const monomials=terms.filter(Boolean).sort((a,b)=>b.length-a.length).map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
    const re=new RegExp('([+-]?)('+number+'(?:/'+number+')?)?(?:\\*?('+monomials+'))?','y');
    while(offset<s.length){
      re.lastIndex=offset;const m=re.exec(s);
      if(!m||!m[0]||!m[2]&&!m[3]||offset&& !m[1])return null;
      const term=m[3]||'';if(!Object.hasOwn(coefficients,term))return null;
      const coefficient=scalar((m[1]||'')+(m[2]||'1'));
      if(!Number.isFinite(coefficient))return null;
      coefficients[term]+=coefficient;offset=re.lastIndex;
    }
    return offset&&Object.values(coefficients).every(Number.isFinite)?coefficients:null;
  }
  function parseTaylor(r,c){
    if(/近似值|求值|数值|计算.*处/.test(c.original))put(r,'requiresProbe',true,'题目要求在指定点求值，必须给出求值点');
    let equations=0;
    c.consume(/(?:f\s*\(\s*x\s*\)|\by)\s*=\s*([^，,。；;？?\n]+)/gi,(full,raw)=>{
      equations++;const expression=raw.replace(/\s/g,'').replace(/eˣ/g,'e^x');
      const re=new RegExp('^([+-]?(?:'+number+'(?:/'+number+')?)?)\\*?(sin\\(x\\)|sinx|cos\\(x\\)|cosx|exp\\(x\\)|e\\^x|ln\\(x\\)|lnx|1/x)([+-]'+number+'(?:/'+number+')?)?$');
      let m=re.exec(expression);
      if(!m){const reciprocal=new RegExp('^([+-]?(?:'+number+'(?:/'+number+')?))/x([+-]'+number+'(?:/'+number+')?)?$').exec(expression);if(reciprocal)m=[reciprocal[0],reciprocal[1],'1/x',reciprocal[2]];}
      if(!m){issue(r,'泰勒题只支持A·sin(x)、A·cos(x)、A·e^x、A·ln(x)、A/x加常数；不能省略其他函数项。');return;}
      const kind=/^sin/.test(m[2])?'sin':/^cos/.test(m[2])?'cos':/exp|e\^/.test(m[2])?'exp':/^ln/.test(m[2])?'log':'reciprocal';
      put(r,'kind',kind,full);put(r,'amp',m[1]===''||m[1]==='+'?1:m[1]==='-'?-1:scalar(m[1]),full);put(r,'offset',m[3]?scalar(m[3]):0,full);
    });
    if(equations!==1)issue(r,'请写一个完整的f(x)=函数式；暂不处理多个函数。');
    if(/麦克劳林|Maclaurin/i.test(c.original))put(r,'center',0,'麦克劳林展开：a=0');
    literal(c,r,'center','展开点(?:a)?|中心(?:a)?|\\ba\\b');
    c.consume(new RegExp('(?:在)?\\s*x0\\s*=\\s*('+atom+')\\s*处?','gi'),(s,v)=>put(r,'center',scalar(v),s));
    literal(c,r,'degree','最高次数(?:N)?|阶数(?:N)?|\\bN\\b');
    c.consume(/(?:到|作|取|为)?\s*(\d+)\s*阶/g,(s,v)=>put(r,'degree',Number(v),s));
    literal(c,r,'probe','求值点(?:x)?|\\bx\\b');
    if(/余项证明|拉格朗日|皮亚诺|收敛区间.*求|求.*收敛区间/.test(c.original))issue(r,'这里只给有限展开与指定点的数值误差，不自动证明余项或求一般收敛区间。');
  }
  function parseLinear(r,c){
    let matrices=0;
    c.consume(/A\s*=\s*\[\[([^\[\]]+)\],\s*\[([^\[\]]+)\]\]/gi,(full,row1,row2)=>{
      matrices++;const values=[...plainNumbers(row1),...plainNumbers(row2)];
      if(plainNumbers(row1).length!==2||plainNumbers(row2).length!==2||!values.every(Number.isFinite)){issue(r,'只支持明确的实2×2矩阵，例如A=[[1,2],[0,1]]。');return;}
      ['m11','m12','m21','m22'].forEach((key,i)=>put(r,key,values[i],full));
    });
    if(matrices!==1)issue(r,'请提供且只提供一个A=[[a,b],[c,d]]实2×2矩阵。');
    let vectors=0;
    c.consume(/(?:列向量\s*)?(?:v|向量)\s*=\s*\(([^()]*)\)/gi,(full,raw)=>{
      vectors++;const values=plainNumbers(raw);
      if(values.length!==2||!values.every(Number.isFinite)){issue(r,'只支持二维实列向量v=(x,y)。');return;}
      put(r,'vx',values[0],full);put(r,'vy',values[1],full);
    });
    if(vectors>1)issue(r,'请只给一个列向量，暂不处理多个变换对象。');
    const vector=/Av|变换后|像向量|列向量/.test(c.original)||vectors>0;
    if(!vector&&!/行列式|det\s*\(/i.test(c.original))issue(r,'请明确求Av或行列式；不会把未识别的所求改为行列式。');
    put(r,'task',vector?'vector':'det','题目所求');
    if(/特征值|特征向量/.test(c.original))issue(r,'本做题入口只支持Av与行列式；特征值可在模型中观察，但这里不自动解析该题。');
    if(/v\s*A|转置|伴随|矩阵平方|矩阵幂|矩阵的平方|求秩|矩阵的秩|行向量|三维向量|3[×x*]3|复数|逆|相似|对角化|基变换|先.*后|AB|BA|A\s*\^/.test(c.original))issue(r,'只支持单个实2×2矩阵作用于列向量、行列式与特征值，不处理逆、矩阵组合或基变换。');
  }
  function parseFourier(r,c){
    if(/求值|数值|计算.*部分和|处.*(?:级数|部分和|误差)|(?:级数|部分和).*值/.test(c.original))put(r,'requiresProbe',true,'题目要求在指定点求值，必须给出求值点');
    const forms=[[/标准奇方波|奇方波/,'square'],[/标准奇锯齿波|奇锯齿波/,'sawtooth'],[/标准三角波|奇三角波/,'triangle']];
    for(const [re,kind]of forms)if(re.test(c.original))put(r,'kind',kind,c.original.match(re)[0]);
    if(!r.values.kind)issue(r,'请明确标准奇方波、奇锯齿波或标准三角波；波形的均值和相位不能靠猜测。');
    literal(c,r,'amplitude','半幅(?:A)?|振幅(?:A)?|\\bA\\b');
    c.consume(new RegExp('(?:周期\\s*T?|\\bT)\\s*(?:=|为|:)?\\s*('+atom+')\\s*(s|秒)?(?=$|[\\s，,。；;])','g'),(full,value,unit)=>{
      put(r,'period',scalar(value),full);put(r,'axisUnit',unit?'s':'1',unit?'周期单位为秒':'周期未带单位，使用无量纲横轴');
    });
    literal(c,r,'terms','最高谐波(?:次数|阶数)(?:N)?|最高阶(?:N)?|\\bN\\b');
    c.consume(/(?:前|取)\s*\d+\s*(?:项|个非零)/g,full=>issue(r,'请写最高谐波次数N；前N项与前N个非零谐波的含义不同，不能自动替换。'));
    c.consume(new RegExp('(?:相位\\s*(?:φ|phi)?|φ|phi)\\s*(?:=|为|:)?\\s*('+atom+')\\s*(rad|弧度|°|度)?(?=$|[\\s，,。；;])','gi'),(full,value,unit)=>put(r,'phase',scalar(value)*(unit==='°'||unit==='度'?Math.PI/180:1),full));
    c.consume(new RegExp('(?:求值点\\s*)?\\b([xt])\\s*=\\s*('+atom+')\\s*(s|秒)?(?=$|[\\s，,。；;处])','gi'),(full,variable,value,unit)=>{
      put(r,'probe',scalar(value),full);if(unit&&r.values.axisUnit==='1')issue(r,'求值点与周期的单位不一致，请明确横轴单位。');
    });
    if(/占空比|偏置|直流|偶方波|偶锯齿|自定义|分段|移位|平移|延迟|周期外|非周期/.test(c.original))issue(r,'本题型只支持页面给出的标准零均值波形，可用相位φ；不支持其他分段定义、占空比或直流偏置。');
    r.warnings.push('N表示最高谐波次数，部分谐波系数可能为零；跳跃点的级数极限取左右极限平均。未给相位时使用标准波形φ=0。');
  }
  function parseGradient(r,c){
    let count=0;
    c.consume(/(?:f\s*\(\s*x\s*,\s*y\s*\)|\bz)\s*=\s*([^，,。；;？?\n]+)/gi,(full,raw)=>{
      count++;const coefficients=parsePolynomial(raw.replace(/x\*y/g,'xy'),['x^2','xy','y^2','x','y','']);
      if(!coefficients){issue(r,'只支持完整的数值系数二元二次式ax²+bxy+cy²+dx+ey+f，不会忽略额外函数项。');return;}
      ['a','b','c','d','e','f'].forEach((key,i)=>put(r,key,coefficients[['x^2','xy','y^2','x','y',''][i]],full));
    });
    if(count!==1)issue(r,'请提供一个完整的f(x,y)=二元二次函数式。');
    c.consume(/(?:点\s*)?P\s*=?\s*\(([^()]*)\)/gi,(full,raw)=>{
      const values=plainNumbers(raw);if(values.length!==2||!values.every(Number.isFinite)){issue(r,'点P须为明确的两个有限坐标。');return;}put(r,'x0',values[0],full);put(r,'y0',values[1],full);
    });
    const directional=/方向导数|沿.*方向/.test(c.original);
    put(r,'task',directional?'directional':'tangent','题目所求');
    c.consume(new RegExp('(?:θ|theta|角度)\\s*(?:=|为|:)?\\s*('+atom+')\\s*(°|度|rad|弧度)?(?=$|[\\s，,。；;])','gi'),(full,value,unit)=>put(r,'theta',scalar(value)*(unit==='rad'||unit==='弧度'?180/Math.PI:1),full));
    c.consume(/(?:方向向量|方向|向量)\s*(?:v|u|d)?\s*=\s*\(([^()]*)\)/gi,(full,raw)=>{
      const values=plainNumbers(raw);if(values.length!==2||!values.every(Number.isFinite)||!Math.hypot(...values)){issue(r,'方向向量必须是非零的二维有限向量。');return;}
      put(r,'theta',Math.atan2(values[1],values[0])*180/Math.PI,full+'，先单位化方向向量');
    });
    if(!directional&&Object.hasOwn(r.values,'theta'))issue(r,'题干给了方向条件，但所求未说明方向导数；请明确所求后再核对。');
    if(/极值|最值|驻点|隐函数|曲面交线|法平面|拉格朗日|边界|约束/.test(c.original))issue(r,'本入口只在给定点计算偏导、梯度、方向导数或切平面，不处理极值、隐函数与附加约束。');
  }
  function parseODE(r,c){
    let count=0;let independent='t';
    c.consume(/(?:dy\s*\/\s*d([tx])|y\s*')\s*=\s*([^，,。；;？?\n]+)/gi,(full,variable,raw)=>{
      count++;if(variable)independent=variable;
      if(variable==='t'&&/x/.test(raw)||variable==='x'&&/t/.test(raw)||!variable&&/x/.test(raw)&&/t/.test(raw))issue(r,'方程自变量不一致：dy/dx右侧使用x，dy/dt右侧使用t；不会把另一个变量自动替换。');
      if(!variable&&/x/.test(raw))independent='x';
      const s=raw.replace(/\s/g,'').replace(/x/g,'t');
      const log=new RegExp('^('+atom+')\\*?y\\*?\\(1-y/('+atom+')\\)$').exec(s);
      if(log){put(r,'kind','logistic',full);put(r,'r',scalar(log[1]),full);put(r,'K',scalar(log[2]),full);return;}
      if(/^r\*?y\*?\(1-y\/K\)$/.test(s)){put(r,'kind','logistic',full);return;}
      const p=parsePolynomial(s,['t','y','']);
      if(!p){issue(r,'只支持y′=at+by+c或y′=ry(1−y/K)，其他项不能删去后套用。');return;}
      put(r,'kind','linear',full);['a','b','c'].forEach((key,i)=>put(r,key,p[['t','y',''][i]],full));
    });
    if(/Logistic|逻辑斯蒂/i.test(c.original)&&!count)put(r,'kind','logistic','明确的Logistic模板');
    if(count>1||!count&&r.values.kind!=='logistic')issue(r,'请提供一个明确的一阶微分方程。');
    if(r.values.kind==='logistic'){literal(c,r,'r','\\br\\b|增长率');literal(c,r,'K','\\bK\\b|容量');}
    let initial=0;
    c.consume(new RegExp('y\\s*\\(\\s*('+atom+')\\s*\\)\\s*=\\s*('+atom+')(?=$|[\\s，,。；;])','gi'),(full,t,y)=>{
      initial++;put(r,'t0',scalar(t),full);put(r,'y0',scalar(y),full);
    });
    if(initial>1)issue(r,'只支持一个初值条件，不支持两点边值或附加结果约束。');
    c.consume(new RegExp('(?:求|计算|估计)\\s*y\\s*\\(\\s*('+atom+')\\s*\\)','gi'),(full,t)=>put(r,'target',scalar(t),full));
    literal(c,r,'h','步长(?:h)?|\\bh\\b');
    literal(c,r,'span','正向区间长度|区间长度|积分长度|\\bspan\\b');
    c.consume(/(?:积分区间|正向区间|区间)\s*\[([^\[\]]+)\]/g,(full,raw)=>{const values=plainNumbers(raw);if(values.length!==2||!values.every(Number.isFinite)){issue(r,'正向区间须写为[初值点,目标点]。');return;}put(r,'t0',values[0],full);put(r,'target',values[1],full);});
    if(/二阶|y\s*''|二次导数|隐式|精确到|误差小于|初始斜率|边值|反向积分|向后积分|终值/.test(c.original))issue(r,'只支持给定初值的正向一阶演示，不处理二阶、边值、精度承诺或反向求初值。');
    r.warnings.push(`自变量${independent}为无量纲；模型横轴统一标x，不表示秒。数值结果与解析对照区分显示。`);
  }
  function parseRLC(r,c){
    if(!/串联/.test(c.original)||/并联|混联|支路|并串联|串并联/.test(c.original))issue(r,'只支持明确的单个串联RLC电路，不能猜测或改写电路连接方式。');
    if(!/正弦/.test(c.original)||/非正弦|不(?:是|采用|使用|为)正弦|并非正弦|不能忽略|不可忽略|考虑寄生|含寄生|接通|开关|暂态|瞬态|初始|直流|方波|交流阶跃|非线性|互感/.test(c.original))issue(r,'只匹配正弦稳态，不处理接通暂态、初始条件或其他电源波形。');
    const quantities=[['resistance','R|电阻','kΩ|Ω|ohm|欧姆|欧',u=>u==='kΩ'?1000:1],['inductance','L|电感','mH|µH|H|毫亨|亨',u=>u==='H'||u==='亨'?1000:u==='µH'?.001:1],['capacitance','C|电容','µF|uF|nF|F|微法',u=>u==='F'?1e6:u==='nF'?.001:1],['frequency','f|频率','kHz|Hz|赫兹',u=>u==='kHz'?1000:1]];
    for(const [key,prefix,unit,factor]of quantities){
      const re=new RegExp('(?:\\b(?:'+prefix.split('|')[0]+')\\b|'+prefix.split('|').slice(1).join('|')+')\\s*(?:=|为|:)?\\s*('+atom+')\\s*('+unit+')(?![A-Za-z])','g');
      c.consume(re,(full,v,u)=>put(r,key,scalar(v)*factor(u),full));
    }
    c.consume(new RegExp('(?:电源(?:电压)?(?:峰值|幅值|有效值)?|电压(?:峰值|幅值|有效值)?|峰值|幅值|有效值|U0|U|Um|Vm|V0)\\s*(?:U0|Um|Vm|U)?\\s*(?:=|为|:)?\\s*('+atom+')\\s*V(?![A-Za-z])','g'),(full,v)=>{put(r,'voltageValue',scalar(v),full);const peak=/峰值|幅值|最大值/.test(full),rms=/有效值|RMS/i.test(full);if(peak||rms)put(r,'voltageKind',peak?'peak':'rms',full+'：电源数值类型');});
    if(/反求|求.*(?:电阻|电感|电容)|品质因数.*给定|截止频率|带宽/.test(c.original))issue(r,'当前模板只由已知元件与电源计算稳态响应，不反求元件或其他附加条件。');
    r.warnings.push('电流相位相对电源电压；有效值先乘√2换算为峰值。忽略寄生参数，电阻稳态须大于0。');
  }
  const parsers={taylor:parseTaylor,'linear-transform':parseLinear,fourier:parseFourier,gradient:parseGradient,ode:parseODE,rlc:parseRLC};
  function analyze(id,text,result){
    const r=result||{typeId:id,modelId:id,values:{},sources:{},issues:[],warnings:[],asked:''};
    const c=context(normalize(text));parsers[id]?.(r,c);rejectRest(c,r);return r;
  }
  function validate(id,values){
    const out={ok:false,errors:[],params:{},notes:[]};const type=byId(id);
    if(!type||!values||typeof values!=='object'||Array.isArray(values)){out.errors.push('题目条件格式无效。');return out;}
    for(const f of fieldsFor(id,values)){
      const value=Object.hasOwn(values,f.key)?values[f.key]:undefined;
      if(f.optional&&(value===undefined||value===''))continue;
      if(f.type==='select'){
        if(!f.options.some(o=>o.value===value))out.errors.push('请选择'+f.label+'。');
        else if(f.parameter!==false)out.params[f.key]=value;
      }else if(typeof value!=='number'||!Number.isFinite(value))out.errors.push('请填写有限数值：'+f.label+'。');
      else if(value<f.min||value>f.max||f.integer&&!Number.isInteger(value))out.errors.push(`${f.label}须${f.integer?'为整数且':''}在${f.min}–${f.max}${f.unit||''}内；不会改写题目数值。`);
      else if(f.parameter!==false)out.params[f.key]=value;
    }
    const p=out.params;
    if(id==='taylor'){
      if(p.kind==='log'&&!(p.center>=.05))out.errors.push('ln x的展开点须至少为0.05。');
      if(p.kind==='reciprocal'&&Math.abs(p.center)<.05)out.errors.push('1/x的展开点绝对值须至少为0.05。');
      if(p.probe===undefined)p.probe=p.center;
      if(p.kind==='log'&&p.probe<=0||p.kind==='reciprocal'&&p.probe===0)out.errors.push('求值点不在原函数定义域内。');
      if(!Object.hasOwn(values,'probe')||values.probe==='')out.notes.push('未给求值点：模型探针放在展开点，只作为演示，不是题目附加条件。');
      if(['log','reciprocal'].includes(p.kind))out.notes.push('局部幂级数的收敛范围受展开点到奇点的距离限制；有限多项式可计算，不代表在范围外收敛。');
    }else if(id==='linear-transform'){
      p.tau=1;if(values.task!=='vector')out.notes.push('未指定列向量：页面向量只是演示，计算步骤仅回答矩阵本身的问题。');
    }else if(id==='fourier'){
      p.phase??=0;p.probe??=0;
      out.notes.push('采用页面给出的标准零均值波形；N为最高谐波次数，跳跃点取左右极限中值。未给位置时，探针0仅供演示。');
    }else if(id==='gradient'){
      p.surface='quadratic';if(values.task!=='directional')out.notes.push('未指定方向导数：页面方向箭头是演示，固定步骤仅计算梯度与切平面。');
    }else if(id==='ode'){
      p.h??=.1;
      if(Object.hasOwn(values,'target')&&values.target!==''){
        const derived=values.target-p.t0;if(p.span!==undefined&&Math.abs(p.span-derived)>1e-12)out.errors.push('目标点与正向区间长度冲突，请核对。');p.span=derived;if(!(p.span>=.5&&p.span<=6))out.errors.push('目标点须在初值点之后0.5–6个自变量单位内，不会限制到其他点。');
      }else if(p.span===undefined)out.errors.push('请填写目标自变量或正向区间长度；不使用默认区间代替题目。');
      if(p.kind==='logistic'&&(p.y0<0||p.y0>p.K))out.errors.push('Logistic模板要求0≤y₀≤K。');
      if(!Object.hasOwn(values,'h')||values.h==='')out.notes.push('题目未给步长，Euler/RK4演示使用h=0.1；数值近似不是精确解。');
    }else if(id==='rlc'){
      p.mode='steady';p.driveVoltage=values.voltageValue*(values.voltageKind==='rms'?Math.SQRT2:1);
      if(!(p.resistance>0))out.errors.push('本稳态模板要求R>0；无阻尼谐振不产生有限稳态，不能改成小正电阻。');
      if(!Number.isFinite(p.driveVoltage)||p.driveVoltage>400)out.errors.push('换算后的电源峰值须在0–400V内，不会限制原题电压。');
      out.notes.push('输入L为mH、C为μF，公式内部转为H和F；输出电流为峰值，正相位表示电流超前电源。');
    }
    out.ok=out.errors.length===0;if(!out.ok)out.params={};return out;
  }
  function dependencies(){
    return {math:root.ZhixiangUniversityMath||(typeof require==='function'?require('./university-math.js'):null),dynamics:root.ZhixiangUniversityDynamics||(typeof require==='function'?require('./university-dynamics.js'):null),physics:root.ZhixiangPhysics};
  }
  const fmt=v=>typeof v==='number'&&Number.isFinite(v)?String(Number(v.toPrecision(12))):'不定义';
  function steps(id,values){
    const checked=validate(id,values);if(!checked.ok)return [];
    const p=checked.params,{math,dynamics,physics}=dependencies();
    const row=(title,formula,substitution,result)=>({title,formula,substitution,result});
    try{
      if(id==='taylor'){
        const d=math.taylorData(p);if(!d.valid)return [row('适用范围','','',d.reason||'参数不适用')];
        const rows=[row('展开公式','T_N(x)=Σ[n=0…N] f⁽ⁿ⁾(a)(x−a)^n/n!',`a=${fmt(p.center)}，N=${p.degree}`,d.expression),row('幂系数','c_n=f⁽ⁿ⁾(a)/n!','按n=0至N排列',d.coefficients.map((x,i)=>`c${i}=${fmt(x)}`).join('；'))];
        if(Object.hasOwn(values,'probe')&&values.probe!=='')rows.push(row('代入求值与误差','ε=T_N(x)−f(x)',`x=${fmt(p.probe)}`,`T=${fmt(d.approx)}；f=${fmt(d.value)}；ε=${fmt(d.error)}；|ε|=${fmt(d.absError)}`));
        if(d.converges===false)rows.push(row('收敛说明','','','该点不在本展开的收敛范围内；上述有限多项式数值不代表收敛。'));
        return rows;
      }
      if(id==='linear-transform'){
        const d=math.linearData({...p,vx:p.vx??1,vy:p.vy??1,eigen:'show'}),rows=[];
        if(values.task==='vector')rows.push(row('矩阵乘列向量','Av=(a₁₁v₁+a₁₂v₂, a₂₁v₁+a₂₂v₂)',`(${fmt(p.m11)}×${fmt(p.vx)}+${fmt(p.m12)}×${fmt(p.vy)}, ${fmt(p.m21)}×${fmt(p.vx)}+${fmt(p.m22)}×${fmt(p.vy)})`,`Av=(${d.output.map(fmt).join(', ')})`));
        rows.push(row('行列式','det A=a₁₁a₂₂−a₁₂a₂₁',`${fmt(p.m11)}×${fmt(p.m22)}−${fmt(p.m12)}×${fmt(p.m21)}`,`det A=${fmt(d.det)}；面积倍率=${fmt(Math.abs(d.det))}`));
        if(values.task==='eigen')rows.push(row('特征值','λ²−tr(A)λ+det(A)=0',`tr(A)=${fmt(d.trace)}；det(A)=${fmt(d.det)}`,d.eigenvalues.map(v=>`${fmt(v.re)}${v.im>=0?'+':''}${fmt(v.im)}i`).join('，')));
        return rows;
      }
      if(id==='fourier'){
        const d=dynamics.fourierData(p),rows=[row('截断级数','S_N(x)=Σ[n=1…N] b_n sin(n(ωx−φ))',`ω=2π/${fmt(p.period)}；N=${p.terms}；φ=${fmt(p.phase)}`,d.coefficients.filter(c=>c.a||c.b).map(c=>`n=${c.n}: a=${fmt(c.a)}, b=${fmt(c.b)}`).join('；'))];
        if(Object.hasOwn(values,'probe')&&values.probe!=='')rows.push(row('代入位置','误差=S_N(x)−f(x)',`x=${fmt(p.probe)}`,`S=${fmt(dynamics.fourierSum(p,p.probe))}；目标=${fmt(dynamics.fourierTarget(p,p.probe))}；跳跃点目标按中值定义`));
        return rows;
      }
      if(id==='gradient'){
        const d=math.gradientData({...p,theta:p.theta??0}),rows=[row('偏导数','f_x=2ax+by+d；f_y=bx+2cy+e',`P=(${fmt(p.x0)}, ${fmt(p.y0)})`,`f(P)=${fmt(d.value)}；f_x(P)=${fmt(d.fx)}；f_y(P)=${fmt(d.fy)}`),row('梯度','∇f(P)=(f_x(P),f_y(P))','偏导数沿坐标正方向取值',`∇f=(${fmt(d.fx)}, ${fmt(d.fy)})；模=${fmt(d.norm)}`)];
        if(values.task==='directional')rows.push(row('单位方向上的方向导数','D_u f=∇f·u；u=(cosθ,sinθ)',`θ=${fmt(p.theta)}°；u=(${d.unit.map(fmt).join(', ')})`,fmt(d.directional)));
        rows.push(row('切平面','z=f(P)+f_x(P)(x−x₀)+f_y(P)(y−y₀)','代入函数值与两个偏导数',`z=${fmt(d.value)}+(${fmt(d.fx)})(x−(${fmt(p.x0)}))+(${fmt(d.fy)})(y−(${fmt(p.y0)}))`));
        return rows;
      }
      if(id==='ode'){
        const d=dynamics.odeSolve(p),rhs=p.kind==='linear'?'y′=ax+by+c':'y′=ry(1−y/K)';
        if(!d.valid)return [row('适用范围',rhs,'',d.message||'无法计算')];
        const rows=[row('初值问题',rhs,`y(${fmt(p.t0)})=${fmt(p.y0)}`,`初始斜率=${fmt(dynamics.odeRHS(p,p.t0,p.y0))}`),row('数值递推','Euler: y_(n+1)=y_n+hF(x_n,y_n)；RK4使用四个斜率加权',`h=${fmt(p.h)}，最后一步到端点时缩短；解析曲线作对照`,'数值算法在数学坐标中计算，画布大小不影响解')];
        if(Object.hasOwn(values,'target')&&values.target!==''||Object.hasOwn(values,'span')&&values.span!==''){
          const last=d.points[d.points.length-1];rows.push(row('目标点计算','误差=数值近似−解析对照',`x=${fmt(p.t0+p.span)}`,`解析=${fmt(last.exact)}；Euler=${fmt(last.euler)}；RK4=${fmt(last.rk4)}；RK4误差=${fmt(last.rk4-last.exact)}`));
        }
        return rows;
      }
      if(id==='rlc'){
        if(!physics?.rlcResponse)return [row('计算说明','','','请在模型页面查看稳态读数。')];
        const d=physics.rlcResponse(p),L=p.inductance*1e-3,C=p.capacitance*1e-6,w=2*Math.PI*p.frequency;
        return [row('统一单位与电源幅值','L[mH]×10⁻³；C[μF]×10⁻⁶；U峰=√2 U有效',`L=${fmt(L)}H；C=${fmt(C)}F`, `U峰=${fmt(p.driveVoltage)}V`),row('阻抗','X=ωL−1/(ωC)；|Z|=√(R²+X²)',`ω=2πf=${fmt(w)}rad/s；R=${fmt(p.resistance)}Ω`,`X=${fmt(d.reactance)}Ω；|Z|=${fmt(d.impedance)}Ω`),row('稳态电流','I峰=U峰/|Z|；φ_I=−atan2(X,R)','电流相位相对电源电压',`I峰=${fmt(d.currentAmplitude)}A；相位=${fmt(-d.phase*180/Math.PI)}°`)];
      }
    }catch(error){return [row('计算状态','','','参数已核对，计算暂不可用；请检查模型范围。')];}
    return [];
  }
  function variationKeys(id,values,params){
    const type=byId(id);if(!type)return Object.keys(params||{});
    const ignored=new Set(type.viewFields||[]);
    if(id==='fourier'&&values.probe!==undefined&&values.probe!=='')ignored.delete('probe');
    if(id==='taylor'&&(values.probe===undefined||values.probe===''))ignored.add('probe');
    if(id==='ode'){for(const k of (values.kind==='linear'?['r','K']:['a','b','c']))ignored.add(k);}
    if(id==='gradient'&&values.task!=='directional')ignored.add('theta');
    if(id==='linear-transform'&&values.task!=='vector'){ignored.add('vx');ignored.add('vy');}
    return Object.keys(params||{}).filter(k=>!ignored.has(k));
  }
  return {types,detect,analyze,validate,steps,fieldsFor,variationKeys,scalar,parsePolynomial};
});
