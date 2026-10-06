/* Single-question matching only. No network, OCR, code evaluation or general solver. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ZhixiangQuestions = api;
})(typeof window === "object" ? window : globalThis, function () {
  "use strict";
  const MAX_TEXT_LENGTH = 4000;
  const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
  const assign = "\\s*(?:为|是|等于|=|:)?\\s*";
  const units = {
    length: "(?:cm|厘米|m|米)",
    mass: "(?:kg|千克|公斤|g|克)",
    speed: "(?:cm/s|厘米/秒|m/s|米/秒)",
    gravity: "(?:cm/s\\^2|厘米/秒\\^2|m/s\\^2|米/秒\\^2)",
  };
  const numericField = (key, label, unit, min, max) => ({ key, label, type: "number", unit, min, max });
  const types = [
    {
      id: "lens", modelId: "lens", title: "薄透镜成像",
      example: "凸透镜焦距为10cm，物距为30cm，求像距和像的性质。",
      scope: "单个薄透镜，已知焦距与物距，观察成像。暂不支持组合透镜或反求题。",
      fields: [
        { key: "kind", label: "透镜类型", type: "select", unit: "", options: [{ value: "convex", label: "凸透镜" }, { value: "concave", label: "凹透镜" }] },
        numericField("focal", "焦距大小", "cm", 1, 20),
        numericField("objectDistance", "物距", "cm", 0.5, 60),
      ],
    },
    {
      id: "projectile", modelId: "projectile", title: "理想平抛",
      example: "物体从20m高处以10m/s的初速度水平抛出，忽略空气阻力，g=10m/s²，求落地时间与水平射程。",
      scope: "单个物体水平抛出，落到水平地面；需初始高度、初速度与重力加速度。",
      fields: [numericField("height", "初始高度", "m", 0, 20), numericField("v", "水平初速度", "m/s", 5, 40), numericField("g", "重力加速度", "m/s²", 1.62, 15)],
    },
    {
      id: "collision", modelId: "collision", title: "一维两球碰撞",
      example: "光滑水平面上，球1在左，质量为1kg，初速度向右3m/s；球2在右，质量为2kg，初速度向左1m/s。两球发生弹性碰撞，求碰后速度。",
      scope: "一维正碰、无外界水平冲量；球1初始在左、球2在右，向右为正。",
      fields: [numericField("mass1", "球1质量", "kg", 0.1, 10), numericField("mass2", "球2质量", "kg", 0.1, 10), numericField("u1", "球1初速度（向右为正）", "m/s", -10, 10), numericField("u2", "球2初速度（向右为正）", "m/s", -10, 10), numericField("e", "恢复系数", "", 0, 1)],
    },
    {
      id: "parabola", modelId: "parabola", title: "二次函数图像",
      example: "已知二次函数y=2x²-4x+1，求顶点和对称轴，并观察开口方向。",
      scope: "单个明确的二次函数，支持ax²+bx+c与a(x-h)²+k；不支持联立、含参反求或分段式。",
      fields: [numericField("a", "二次项系数 a", "", -3, 3), numericField("h", "顶点横坐标 h", "", -5, 5), numericField("k", "顶点纵坐标 k", "", -4, 5)],
    },
  ];
  function normalize(text) {
    return text.replace(/²/g, "^2").replace(/³/g, "^3").normalize("NFKC")
      .replace(/[−–—﹣]/g, "-").replace(/[×·]/g, "*").replace(/[÷]/g, "/")
      .replace(/([cmkg]+)\s*\/\s*s\s*(\^\s*2)?/gi, (_, u, square) => u.toLowerCase() + "/s" + (square ? "^2" : ""))
      .replace(/m\/s2\b/g, "m/s^2").replace(/\r/g, "");
  }
  function convert(value, unit, target) {
    unit = unit.toLowerCase();
    if (target === "cm") return /^(m|米)$/.test(unit) ? value * 100 : value;
    if (target === "kg") return /^(g|克)$/.test(unit) ? value / 1000 : value;
    return /^(cm|厘米)/.test(unit) ? value / 100 : value;
  }
  function add(list, message) { if (!list.includes(message)) list.push(message); }
  function put(result, key, value, source) {
    if (!Number.isFinite(value) && typeof value !== "string") {
      add(result.issues, "题干中的数值不是有限数，请检查。" );
      return;
    }
    if (Object.hasOwn(result.values, key) && result.values[key] !== value) {
      add(result.issues, `“${key}”识别到不同条件，请只保留一道题并明确最终数值。`);
      return;
    }
    result.values[key] = value;
    result.sources[key] = source;
  }
  function quantities(result, text, key, prefixes, dimension, target, transform) {
    const pattern = new RegExp("(?:" + prefixes + ")" + assign + "(" + number + ")\\s*(" + units[dimension] + ")(?![A-Za-z0-9/^])", "gi");
    for (const match of text.matchAll(pattern)) {
      let value = convert(Number(match[1]), match[2], target);
      if (transform) value = transform(value, match);
      if (value === null) continue;
      put(result, key, value, `${match[0]}${match[2] !== target ? ` → ${value} ${target}` : ""}`);
    }
  }
  function scalar(result, text, key, prefixes) {
    const prefix = "(?:" + prefixes + ")" + assign;
    const pattern = new RegExp(prefix + "(" + number + ")(?:\\s*/\\s*(" + number + "))?\\s*(?=$|[，,。；;！？?!)])", "gi");
    const matches = Array.from(text.matchAll(pattern));
    for (const m of matches) {
      const value = Number(m[1]) / (m[2] === undefined ? 1 : Number(m[2]));
      put(result, key, value, m[0] + (m[2] === undefined ? "" : ` → ${value}`));
    }
    const candidates = Array.from(text.matchAll(new RegExp(prefix + "(?=[+\\-.\\d])", "gi")));
    if (candidates.some(candidate => !matches.some(match => match.index === candidate.index))) add(result.issues, "恢复系数只支持一个明确数值或数值分数，请检查表达式；不会只取表达式的前一项。" );
  }
  function askedText(text) {
    const fragments = text.match(/(?:求|问|判断|计算|分析|画出|绘制|观察)[^。；;？?\n]{0,180}/g);
    return fragments ? fragments.join("；") : "未明确待求内容；此入口仅匹配模型和参数。";
  }
  function detect(text) {
    const found = [];
    if (/透镜|物距|像距/.test(text)) found.push("lens");
    if (/平抛|水平抛出|水平投出|水平射出|斜抛|抛体/.test(text)) found.push("projectile");
    if (/碰撞|正碰|恢复系数|粘在一起|黏在一起/.test(text)) found.push("collision");
    if (/二次函数|抛物线|(?:\by|f\s*\(\s*x\s*\))\s*=/i.test(text) && !found.includes("projectile")) found.push("parabola");
    return found;
  }
  function lens(result, text) {
    if (/凸透镜/.test(text)) put(result, "kind", "convex", "凸透镜");
    if (/凹透镜/.test(text)) put(result, "kind", "concave", "凹透镜");
    quantities(result, text, "focal", "焦距(?:大小)?|\\bf\\b", "length", "cm", (v) => {
      if (v < 0 && result.values.kind === "concave") return -v;
      if (v < 0) { add(result.issues, "负焦距仅适用于明确的凹透镜；请检查类型与符号。" ); return null; }
      return v;
    });
    quantities(result, text, "objectDistance", "物距|\\bu\\b", "length", "cm");
    if (/组合透镜|两个透镜|两块透镜|透镜组|厚透镜|虚物|介质|水中/.test(text)) add(result.issues, "目前只支持空气中的单个薄透镜与实物，请改用对应单题。" );
    if (/(?:求|计算|确定|反求)[^。；?？]{0,14}(?:焦距|物距|物体位置|物体的?距离|透镜类型)/.test(result.asked)) add(result.issues, "目前只支持已知焦距与物距的正向成像，暂不处理反求焦距或物距。" );
    if (/物高|像高|放大.*倍|缩小.*倍/.test(text)) add(result.issues, "第一版暂不匹配含物高、像高或指定放大倍数的题，请使用已知焦距与物距的成像题。" );
    add(result.warnings, "按薄透镜、近轴、空气中成像处理；图示物高采用模型默认值，只是示意，不是题目已知条件。" );
  }
  function projectile(result, text) {
    quantities(result, text, "height", "初始高度|高度|离地|距地面|h(?:0)?\\b", "length", "m");
    const elevated = new RegExp("从\\s*(" + number + ")\\s*(" + units.length + ")(?![A-Za-z0-9/^])\\s*(?:的\\s*)?高(?:处|度)", "gi");
    for (const match of text.matchAll(elevated)) {
      const value = convert(Number(match[1]), match[2], "m");
      put(result, "height", value, `${match[0]} → ${value} m`);
    }
    quantities(result, text, "v", "水平初速度|初速度|水平速度|速度|v(?:0)?\\b|以", "speed", "m/s");
    quantities(result, text, "g", "重力加速度|\\bg\\b", "gravity", "m/s²");
    if (!/平抛|水平抛出|水平投出|水平射出/.test(text)) add(result.warnings, "题干未明确水平抛出；确认本题为理想平抛后再打开。" );
    if (/斜抛|仰角|俯角|斜面|坡面|台阶|障碍|墙|反弹|弹起|两物体|两个物体|两小球|两个小球|风速|升力|旋转球/.test(text)) add(result.issues, "目前只支持单个物体水平抛出并落到水平地面，暂不支持斜抛、障碍或多物体复合题。" );
    if (new RegExp("(?:末速度|落地速度|最终速度|水平射程|落地时间|飞行时间)" + assign + number).test(text)) add(result.issues, "题干含给定的落地结果或飞行时间；第一版暂不处理反求或附加结果约束。" );
    if (new RegExp("(?:经过|飞行|运动|抛出后|抛出|t\\s*=)\\s*" + number + "\\s*(?:s|秒)(?![A-Za-z])").test(text) || /中途|某时刻|某一时刻|瞬时速度/.test(text)) add(result.issues, "题干包含给定的中途时刻或运动状态，暂不处理这类附加条件，不能把中途速度当作初速度。" );
    if (/(?:不能|不可|不应|不允许|不要|无法|不宜|并非|不是|并不|未)(?:忽略|不计|没有|无)(?:空气)?阻力|阻力[^。；;]{0,8}(?:不能|不可|不应|无法)(?:忽略|不计)/.test(text)) add(result.issues, "题干否定了忽略阻力的假设；此入口不能使用理想平抛替代该题。" );
    const withoutIdeal = text.replace(/(?:忽略|不计|没有|无)(?:空气)?阻力/g, "");
    if (/阻力|摩擦/.test(withoutIdeal)) add(result.issues, "此题目入口只支持忽略空气阻力的平抛；含阻力题不能自动套用理想模型。" );
    if (!/(?:忽略|不计|没有|无)(?:空气)?阻力/.test(text)) add(result.warnings, "题干未说明阻力；打开前需确认本题忽略空气阻力。" );
    if (/(?:求|计算|确定|反求)[^。；?？]{0,16}(?:初速度|抛出速度|初始高度|抛出高度|重力加速度)/.test(result.asked)) add(result.issues, "目前只支持已知初始高度、水平初速度和 g 的正向演示，暂不处理反求初始条件。" );
  }
  function collision(result, text) {
    const knownClauses = text.split(/[，,。；;？?\n]/).filter(clause => !/(?:求|计算|问|判断|分析|观察)/.test(clause));
    if (knownClauses.some(clause => /碰(?:撞)?后/.test(clause) && /(?:速度|速率|静止|停下|停止|动量|动能|能量)/.test(clause)) || /(?:求|计算|确定|反求)[^。；?？]{0,20}(?:碰(?:撞)?前|初始动量|初速度)/.test(result.asked)) add(result.issues, "题干给定碰后状态或反求碰前条件；第一版只支持已知碰前质量、初速度和碰撞类型，不能把碰后速度当初速度。" );
    for (const i of [1, 2]) {
      quantities(result, text, `mass${i}`, `\\bm${i}\\b`, "mass", "kg");
      quantities(result, text, `u${i}`, `\\bu${i}\\b`, "speed", "m/s");
    }
    const marker = /(球\s*[12]|[12]\s*号球|[一二]号球|[甲乙](?:球|物体)?|[AB]球|球[AB])/gi;
    const markers = Array.from(text.matchAll(marker));
    const parts = { 1: [], 2: [] };
    markers.forEach((match, index) => {
      const id = /1|一|甲|a/i.test(match[0]) ? 1 : 2;
      parts[id].push(text.slice(match.index, markers[index + 1]?.index ?? text.length));
    });
    for (const i of [1, 2]) {
      for (const segment of parts[i]) {
        quantities(result, segment, `mass${i}`, "质量", "mass", "kg");
        if (i === 1 && /(?:初始)?在右|位于右/.test(segment) || i === 2 && /(?:初始)?在左|位于左/.test(segment)) add(result.issues, "现有模型要求球1初始在左、球2在右；请核对物体编号，不能直接颠倒套用。" );
        if (/静止/.test(segment)) put(result, `u${i}`, 0, segment.match(/[^，,。；;]*静止[^，,。；;]*/)[0]);
        const right = /向右/.test(segment), left = /向左/.test(segment);
        if (right && left) { add(result.issues, `球${i}出现多个运动方向，请明确碰前初速度。`); continue; }
        const speedPrefixes = "(?:初)?(?:速度|速率)(?:向右|向左)?|向右|向左";
        quantities(result, segment, `u${i}`, speedPrefixes, "speed", "m/s", (value) => {
          if (!right && !left) {
            if (value === 0) return 0;
            add(result.warnings, `球${i}速度的正方向未识别，需按向右为正补填。`);
            return null;
          }
          if (value < 0) { add(result.issues, `球${i}同时写了方向和负速度，请改为明确的带符号 u${i}，或方向加正的速率。`); return null; }
          return left ? -value : value;
        });
      }
    }
    scalar(result, text, "e", "恢复系数|\\be\\b");
    const negatedType = /(?:没有|未|没|不|并非|不是|并不|不再)(?:发生|是)?(?:粘在一起|黏在一起|粘连|共同运动|弹性碰撞|弹性正碰|完全非弹性)/.test(text);
    if (negatedType) add(result.issues, "题干否定了碰撞类型或粘连条件，不能据此确定恢复系数；请明确填写恢复系数并核对题意。" );
    else {
      if (/完全非弹性|粘在一起|黏在一起|碰后(?:粘连|共同运动)/.test(text)) put(result, "e", 0, "完全非弹性或碰后粘连：e=0");
      if (/(?:弹性碰撞|弹性正碰)/.test(text.replace(/(?:完全)?非弹性(?:碰撞|正碰)/g, ""))) put(result, "e", 1, "弹性碰撞：e=1");
    }
    if (/三(?:个|颗)?(?:球|物体)|第三|斜碰|斜面|反弹墙|碰墙|碰撞持续|摩擦系数|外力|爆炸|弹簧/.test(text.replace(/无外力|没有外力|无外界水平冲量|忽略外力/g, ""))) add(result.issues, "目前只支持两个物体的一维正碰且无外界水平冲量，暂不支持此复合条件。" );
    if (/(?:求|计算|确定|反求)[^。；?？]{0,18}(?:质量|初速度|恢复系数|碰撞时间|相遇时间|多久|距离|位置)/.test(result.asked) || /相距|间距|相隔/.test(text)) add(result.issues, "当前入口只匹配碰前条件并观察碰后结果；初始间距固定为演示值，暂不处理反求、碰撞时间或距离题。" );
    if (/向左为正|左为正方向/.test(text)) add(result.issues, "模型以向右为正；请先转换速度符号并明确球1在左、球2在右。" );
    add(result.warnings, "请核对球1/甲/A在左、球2/乙/B在右，速度向右为正；模型仅适用于无外界水平冲量的一维正碰。" );
  }
  function coefficient(raw) {
    if (raw === "" || raw === "+") return 1;
    if (raw === "-") return -1;
    const parts = raw.split("/");
    if (parts.length > 2 || parts.some(p => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(p))) return NaN;
    return Number(parts[0]) / (parts.length === 2 ? Number(parts[1]) : 1);
  }
  function parseQuadratic(expression) {
    const s = expression.replace(/\s/g, "");
    const unsigned = "(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:/(?:\\d+(?:\\.\\d*)?|\\.\\d+))?";
    const vertex = new RegExp("^([+-]?(?:" + unsigned + ")?)\\*?\\(x([+-]" + unsigned + ")?\\)\\^2([+-]" + unsigned + ")?$").exec(s);
    if (vertex) return { a: coefficient(vertex[1]), h: vertex[2] ? -coefficient(vertex[2]) : 0, k: vertex[3] ? coefficient(vertex[3]) : 0 };
    if (!s || !/^[\dx+\-*/.^]+$/.test(s)) return null;
    const terms = s.match(/[+-]?[^+-]+/g);
    if (!terms || terms.join("") !== s) return null;
    const termPattern = new RegExp("^([+-]?)(" + unsigned + ")?(\\*?x(?:\\^([12]))?)?$");
    const c = [0, 0, 0];
    for (const term of terms) {
      const m = termPattern.exec(term);
      if (!m || (!m[2] && !m[3])) return null;
      const degree = m[3] ? (m[4] === "2" ? 2 : 1) : 0;
      c[degree] += coefficient(m[1] + (m[2] || ""));
    }
    if (!c.every(Number.isFinite) || c[2] === 0) return null;
    return { a: c[2], h: -c[1] / (2 * c[2]), k: c[0] - c[1] * c[1] / (4 * c[2]) };
  }
  function parabola(result, text) {
    const equations = Array.from(text.matchAll(/(?:\by|f\s*\(\s*x\s*\))\s*=\s*([^，,。；;？?\n]+)/gi));
    if (equations.length !== 1) {
      add(result.issues, "请提供一个完整的 y=… 或 f(x)=… 二次函数式，暂不支持多个函数或方程。" );
      return;
    }
    const match = equations[0];
    // Require an explicit punctuation boundary; never discard an unparsed suffix.
    const expression = match[1].trim();
    const parsed = parseQuadratic(expression);
    if (!parsed || !Object.values(parsed).every(Number.isFinite) || parsed.a === 0) {
      add(result.issues, "只支持数值系数的 ax²+bx+c 或 a(x-h)²+k；请检查额外项、括号、分母和二次项系数，不能省略不支持的部分。" );
      return;
    }
    for (const key of ["a", "h", "k"]) put(result, key, parsed[key], `${match[0]} → ${key}=${parsed[key]}（配方）`);
    if (/联立|交点|直线|分段|绝对值|定义域|取值范围|区间|满足|经过|过点|已知点|含参|参数范围|不等式|方程组|[<>≤≥∈]|(?:x|自变量)\s*(?:大于|小于|不大于|不小于|不超过|至少|至多|属于|取|在)/i.test(text) || /(?:求|确定|计算)[^。；?？]{0,16}(?:系数|函数解析式|函数表达式|参数)/.test(result.asked)) add(result.issues, "第一版只展示已知完整二次函数的图像、顶点与对称轴，暂不处理附加约束、交点或反求参数。" );
    add(result.warnings, "只映射已知函数的图像；题目的求根、证明或其他解题步骤不会自动生成。" );
  }
  function analyze(text, typeId = "auto") {
    const result = { typeId: null, modelId: null, values: {}, sources: {}, issues: [], warnings: [], asked: "" };
    if (typeof text !== "string" || !text.trim()) { result.issues.push("请粘贴一道题目文字。"); return result; }
    if (text.length > MAX_TEXT_LENGTH) { result.issues.push(`题目最多 ${MAX_TEXT_LENGTH} 字符，请只保留一道题。`); return result; }
    if (typeId !== "auto" && !types.some(t => t.id === typeId)) { result.issues.push("不支持所选题型。"); return result; }
    const normalized = normalize(text);
    result.asked = askedText(normalized);
    const detected = detect(normalized);
    if (detected.length > 1) add(result.issues, "识别到多个不同模型，请一次只输入一道单模型题目。" );
    const selected = typeId === "auto" ? detected[0] : typeId;
    if (!selected) { result.warnings.push("暂未匹配支持的题型，可以手动选择并补填条件。"); return result; }
    result.typeId = selected;
    result.modelId = selected;
    if (typeId !== "auto" && detected.length && !detected.includes(typeId)) add(result.issues, "所选题型与题干不一致，请修改题干或重新选择。" );
    if (/(?:第[二三四五六七八九十2-9]题|第二问|另一道题|\(2\)|(?:^|\s)2[.、)])/u.test(normalized)) add(result.issues, "请一次只输入一道题，暂不处理多题或多情景组合。" );
    if (/如图|图中|图示|见图/.test(normalized)) add(result.warnings, "题干引用了图示，当前只识别文字；请核对图中的条件是否已完整补入。" );
    if (/<\/?(?:script|iframe|img|svg)|javascript:|\beval\s*\(|\brequire\s*\(|=>|\bfunction\s*\(/i.test(normalized)) add(result.issues, "输入包含不支持的代码或标记，请仅保留题目文字与数学式。" );
    ({ lens, projectile, collision, parabola })[selected](result, normalized);
    const missing = types.find(t => t.id === selected).fields.filter(f => !Object.hasOwn(result.values, f.key)).map(f => f.label);
    if (missing.length) add(result.warnings, `自动识别未提取：${missing.join("、")}。请在条件栏补填并核对。`);
    return result;
  }
  function validate(typeId, values) {
    const result = { ok: false, errors: [], params: {}, notes: [] };
    const type = types.find(t => t.id === typeId);
    if (!type) { result.errors.push("请选择支持的题型。"); return result; }
    if (!values || typeof values !== "object" || Array.isArray(values)) { result.errors.push("条件格式无效。"); return result; }
    for (const f of type.fields) {
      const value = Object.hasOwn(values, f.key) ? values[f.key] : undefined;
      if (f.type === "select") {
        if (!f.options.some(o => o.value === value)) result.errors.push(`请选择${f.label}。`);
        else result.params[f.key] = value;
      } else if (typeof value !== "number" || !Number.isFinite(value)) result.errors.push(`请填写有限数值：${f.label}。`);
      else if (value < f.min || value > f.max) result.errors.push(`${f.label}超出当前模型范围 ${f.min}–${f.max}${f.unit ? " " + f.unit : ""}；不会自动改写题目数值。`);
      else result.params[f.key] = value;
    }
    if (typeId === "parabola" && values.a === 0) result.errors.push("a=0 不是二次函数，请检查题目。");
    if (typeId === "projectile") {
      result.params.angle = 0; result.params.motionMode = "ideal";
      result.notes.push("水平抛出、忽略空气阻力，地面为 y=0；到达地面后停止。", "g 使用你确认的题设值，不默认替换为9.8或10。");
      if (values.height === 0) result.notes.push("初始高度为0，模型在t=0即位于地面，没有空中轨迹。");
    }
    if (typeId === "lens") {
      result.notes.push("单个薄透镜、近轴、空气中成像；实物物距为正，凸透镜焦距为正、凹透镜为负。", "模型默认物高仅为画图示意，不属于本题已知条件，不能据此回答像高。");
      if (values.kind === "convex" && values.focal === values.objectDistance) result.notes.push("u=f：无有限位置的像，不能在屏上成像。");
    }
    if (typeId === "collision") {
      result.notes.push("球1/甲/A初始在左，球2/乙/B初始在右，向右为正；一维正碰、无外界水平冲量。", "模型两球初始中心为−3m和3m，半径0.25m；间距与碰撞时间只是演示设置，不是题设结果。");
      if (Number.isFinite(values.u1) && Number.isFinite(values.u2) && values.u1 <= values.u2) result.errors.push("按球1在左、球2在右的约定，两球不会相遇；请检查题目、编号和速度方向。");
    }
    if (typeId === "parabola") result.notes.push("用y=a(x−h)²+k绘制完整函数；只展示图像、顶点和对称轴，不自动生成解题步骤。");
    result.ok = result.errors.length === 0;
    if (!result.ok) result.params = {};
    return result;
  }
  return { MAX_TEXT_LENGTH, types, analyze, validate };
});
