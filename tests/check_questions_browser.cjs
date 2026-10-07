/* Text question -> reviewed parameters -> existing model. No OCR/API dependency. */
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {baseURL, outputDir, loadPlaywright} = require('./runtime.cjs');
const {chromium} = loadPlaywright();
const root = path.resolve(__dirname, '..');
const results = [], errors = [], remote = [];
let browser;

function check(name, passed, details) {
  results.push({name, passed: !!passed, details});
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${passed ? '' : ' ' + JSON.stringify(details)}`);
}
const near = (actual, expected, tolerance = 1e-10) => Math.abs(actual - expected) <= tolerance;
const fixture = {
  lens: {
    text: '凸透镜焦距为 10 cm，物距为 30 cm，求像距和放大率。',
    params: {kind: 'convex', focal: 10, objectDistance: 30},
  },
  projectile: {
    text: '物体从 20 m 高处，以 10 m/s 的初速度水平抛出。忽略空气阻力，g=10 m/s²，求落地时间和水平位移。',
    params: {height: 20, v: 10, angle: 0, g: 10, motionMode: 'ideal'},
  },
  collision: {
    text: '一维两球碰撞，向右为正，m1=1 kg，m2=2 kg，u1=3 m/s，u2=-1 m/s，恢复系数 e=1，求碰撞后的速度。',
    params: {mass1: 1, mass2: 2, u1: 3, u2: -1, e: 1},
  },
  parabola: {
    text: '已知二次函数 y=2x²-4x+1，求顶点和对称轴。',
    params: {a: 2, h: 1, k: -1},
  },
};

async function usable(locator) {
  return await locator.count() > 0 && await locator.first().isVisible() && await locator.first().isEnabled();
}
async function goQuestions(page) {
  const button = page.locator('[data-nav="questions"]:visible').first();
  if (await button.count()) await button.click();
  else await page.locator('#questionEdit').click();
  await page.locator('#questionText').waitFor({state: 'visible'});
}
async function analyze(page, text, type = 'auto') {
  if (!await page.locator('#questionText').isVisible()) await goQuestions(page);
  await page.locator('#questionText').fill(text);
  await page.locator('#questionType').selectOption(type);
  await page.locator('#matchQuestion').click();
  await page.locator('#questionResult').waitFor({state: 'visible'});
}
async function approveAndOpen(page) {
  await page.locator('#questionConfirm').check();
  if (!await page.locator('#openQuestionModel').isEnabled()) {
    throw new Error('条件已确认但未能进入模型：' + await page.locator('#questionResult').innerText());
  }
  await page.locator('#openQuestionModel').click();
  await page.locator('#simCanvas').waitFor({state: 'visible'});
}
async function readParams(page) {
  return page.evaluate(() => ({id: state.model?.id, params: {...state.p}, running: state.running}));
}
function matches(actual, expected) {
  return Object.entries(expected).every(([key, value]) => typeof value === 'number'
    ? near(actual[key], value)
    : actual[key] === value);
}
async function fillField(page, key, value) {
  const input = page.locator(`[data-question-field="${key}"]`);
  if (await input.evaluate(el => el.tagName === 'SELECT')) await input.selectOption(String(value));
  else { await input.fill(String(value)); await input.press('Tab'); }
}
async function saveAndReopen(page, title) {
  await page.locator('[data-action="save"]').click();
  await page.locator('#classTitle').fill(title);
  await page.locator('[data-action="confirm-save"]').click();
  await page.locator('.sidebar [data-nav="classes"]').click();
  await page.locator('[data-class-open]').first().click();
  await page.locator('#simCanvas').waitFor({state: 'visible'});
}
async function followShareHash(page) {
  await page.locator('[data-action="share"]').click();
  await page.locator('[data-action="copy-link"]').click();
  const sharedURL = await page.locator('#shareURL').inputValue();
  // Resolve the generated public link against the test server so the test
  // exercises the real share decoder without making an external request.
  await page.goto(baseURL + '/index.html' + new URL(sharedURL).hash);
  await page.locator('#simCanvas').waitFor({state: 'visible'});
}
function observe(page, offline = false) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = request.url();
    if (/^https?:/.test(url) && (offline || !url.startsWith(baseURL + '/'))) remote.push(url);
  });
}

(async () => {
  browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, acceptDownloads: true, reducedMotion: 'reduce'});
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  observe(page);
  await page.goto(baseURL + '/index.html?qa=questions');
  check('模型库首页保留全部 28 个模型', await page.locator('.model-card').count() === 28);
  check('首页沿用模型库常规导航，没有上课 / 做题分段切换', await page.locator('.workspace-switch, [data-workspace]').count() === 0
    && await page.locator('.sidebar [data-nav="all"]').evaluate(el => el.classList.contains('active')));
  check('桌面做题导航位于模型库后并使用铅笔图标', await page.locator('.sidebar [data-nav="questions"]').evaluate(el =>
    el.previousElementSibling?.dataset.nav === 'all' && !!el.querySelector('[data-icon="pencil"] svg')));
  await goQuestions(page);
  check('常规做题导航进入单题文本工作区并高亮', await page.locator('#questionText').isVisible()
    && await page.locator('.sidebar [data-nav="questions"]').evaluate(el => el.classList.contains('active') && el.getAttribute('aria-current') === 'page'));
  check('做题入口提供自动匹配及四类明确题型', await page.locator('#questionType option').evaluateAll(options => {
    const values = options.map(option => option.value);
    return ['auto', 'lens', 'projectile', 'collision', 'parabola'].every(value => values.includes(value));
  }));
  const questionRoute = new URLSearchParams(new URL(page.url()).hash.slice(1));
  check('做题路由不包含题干或外部服务', questionRoute.get('view') === 'questions'
    && [...questionRoute.keys()].every(key => ['view', 'category'].includes(key)));
  check('十个示例入口均可见', await page.locator('[data-question-example]').count() === 10);
  check('页面明确文本匹配范围、图片尚未识别及不上传', await page.locator('#questionInputNote').innerText().then(text =>
    text.includes('图片识别暂未接入') && text.includes('不上传')));
  await page.locator('#questionFile').setInputFiles({name: '一道平抛题.txt', mimeType: 'text/plain', buffer: Buffer.from(fixture.projectile.text)});
  await page.waitForFunction(() => document.querySelector('#questionImportStatus').textContent.includes('已读取'));
  check('实际导入 UTF-8 TXT 保留完整题目且等待主动分析', await page.locator('#questionText').inputValue() === fixture.projectile.text
    && !await usable(page.locator('#openQuestionModel')));
  await page.locator('#questionFile').setInputFiles({name: '题目.png', mimeType: 'image/png', buffer: Buffer.from('not an image')});
  await page.waitForFunction(() => document.querySelector('#questionImportStatus').textContent.includes('TXT'));
  check('非 TXT 文件明确拒绝且不改变原文', await page.locator('#questionText').inputValue() === fixture.projectile.text);
  await page.locator('#questionFile').setInputFiles({name: '过长题目.txt', mimeType: 'text/plain', buffer: Buffer.from('题'.repeat(4001))});
  await page.waitForFunction(() => document.querySelector('#questionImportStatus').textContent.includes('4000'));
  check('超长 TXT 明确拒绝且不截断原文', await page.locator('#questionText').inputValue() === fixture.projectile.text);
  await page.locator('#questionFile').setInputFiles({name: '过大题目.txt', mimeType: 'text/plain', buffer: Buffer.alloc(65537, 65)});
  await page.waitForFunction(() => document.querySelector('#questionImportStatus').textContent.includes('64 KB'));
  check('超过 64 KB 的文件明确拒绝', await page.locator('#questionText').inputValue() === fixture.projectile.text);
  await page.locator('#questionClear').click();
  check('清空按钮删除草稿并清除结果', await page.locator('#questionText').inputValue() === ''
    && !await usable(page.locator('#openQuestionModel')));
  await analyze(page, '求三角形 ABC 的面积，已知 AB=3 cm，BC=4 cm。');
  check('不支持的题型明确不匹配，不随意打开现有模型', !await usable(page.locator('#openQuestionModel'))
    && /未匹配|支持/.test(await page.locator('#questionResult').innerText()));
  for (const id of Object.keys(fixture)) {
    await page.locator(`[data-question-example="${id}"]`).click();
    check(`${id} 示例填入文本并展示核对区`, (await page.locator('#questionText').inputValue()).length > 10
      && await page.locator('#questionResult').isVisible());
  }

  // Fixed inputs and independently calculated expectations, not copied from parser output.
  for (const [id, input] of Object.entries(fixture)) {
    await analyze(page, input.text);
    check(`${id} 未核对前禁止进入模型`, !await usable(page.locator('#openQuestionModel')));
    await approveAndOpen(page);
    const actual = await readParams(page);
    check(`${id} 自动匹配且准确填入原题数值`, actual.id === id && matches(actual.params, input.params), actual);
    check(`${id} 题目模型页仍高亮做题导航`, await page.locator('.sidebar [data-nav="questions"]').evaluate(el =>
      el.classList.contains('active') && el.getAttribute('aria-current') === 'page'));
    check(`${id} 保留原题、已知条件与假设`, await page.locator('#questionContext').isVisible()
      && (await page.locator('#questionContext').innerText()).includes(input.text));
    check(`${id} 原题上下文不写进地址栏`, !decodeURIComponent(new URL(page.url()).hash).includes(input.text)
      && !new URL(page.url()).searchParams.has('question'));
    check(`${id} 原题不自动写入本地存储`, await page.evaluate(text => !Object.keys(localStorage)
      .some(key => String(localStorage.getItem(key)).includes(text)), input.text));
    check(`${id} 默认不自动播放`, !actual.running);
    if (id === 'lens') {
      const d = await page.evaluate(() => SCIENCE.lensData(state.p));
      check('原题透镜独立数值核对：v=15 cm，M=-0.5', near(d.v, 15) && near(d.magnification, -.5), d);
    } else if (id === 'projectile') {
      const d = await page.evaluate(() => projectileData(state.p));
      check('原题平抛独立数值核对：2 s、20 m', near(d.flight, 2) && near(d.range, 20), d);
      await page.locator('#number-height').fill('5');
      await page.locator('#number-height').press('Tab');
      check('修改模型参数明确显示变式', await page.locator('#questionVariation').isVisible()
        && await page.locator('#questionVariation').innerText().then(text => text.includes('变式')));
      check('变式仍保留原题文字', (await page.locator('#questionContext').innerText()).includes(input.text));
      await page.locator('#questionOriginal').click();
      check('还原题目条件精确恢复且暂停', matches((await readParams(page)).params, input.params)
        && !await page.evaluate(() => state.running));
      check('还原后不再标示为变式', !await page.locator('#questionVariation').isVisible()
        || !(await page.locator('#questionVariation').innerText()).includes('变式'));
      await page.screenshot({path: path.join(outputDir, 'questions-projectile-desktop.png'), fullPage: true});
    } else if (id === 'collision') {
      const d = await page.evaluate(() => SCIENCE.collisionSolution(state.p));
      check('原题碰撞独立核对速度、动量与动能', near(d.after.v1, -7 / 3) && near(d.after.v2, 5 / 3)
        && near(d.before.momentum, 1) && near(d.after.momentum, 1) && near(d.energyLoss, 0), d);
    } else {
      check('原题二次函数一般式转换准确', await page.evaluate(() => [-2, -.5, 0, 1, 3].every(x =>
        Math.abs(state.p.a * (x - state.p.h) ** 2 + state.p.k - (2 * x * x - 4 * x + 1)) < 1e-12)));
    }
    await page.locator('#questionEdit').click();
    check(`${id} 返回修改保留原始题目文本`, await page.locator('#questionText').inputValue() === input.text);
  }

  await analyze(page, '物体从 20 m 高处水平抛出。忽略空气阻力，g=10 m/s²，求落地时间。', 'projectile');
  check('缺少初速度不擅自填入模型默认值', await page.locator('[data-question-field="v"]').inputValue() === '');
  check('缺参时不能打开模型', !await usable(page.locator('#openQuestionModel')));
  await fillField(page, 'v', 10);
  await approveAndOpen(page);
  check('手动补齐缺少条件后使用核对值', matches((await readParams(page)).params, fixture.projectile.params));

  await analyze(page, fixture.projectile.text.replace('20 m 高', '50 m 高'), 'projectile');
  check('原题高度超范围时保留 50、不静默限幅为 20', await page.locator('[data-question-field="height"]').inputValue() === '50');
  check('原题超范围时明确提示且不能打开', !await usable(page.locator('#openQuestionModel'))
    && /范围|上限|20/.test(await page.locator('#questionResult').innerText()));

  await analyze(page, fixture.collision.text.replace('，恢复系数 e=1', ''), 'collision');
  check('碰撞未说明恢复系数时不擅自按弹性碰撞', await page.locator('[data-question-field="e"]').inputValue() === ''
    && !await usable(page.locator('#openQuestionModel')));

  await analyze(page, '凸透镜焦距10cm，物距10cm，求像距。', 'lens');
  check('透镜在焦点时核对区提示 u=f', /u\s*=\s*f/.test(await page.locator('#questionModelNotes').innerText()));
  await fillField(page, 'objectDistance', 20);
  check('手填物距后实时清除已失效的 u=f 提示', !/u\s*=\s*f/.test(await page.locator('#questionModelNotes').innerText()));
  await approveAndOpen(page);
  check('修改后的透镜条件实际成有限像', await page.evaluate(() => state.p.objectDistance === 20
    && !SCIENCE.lensData(state.p).atFocus && SCIENCE.lensData(state.p).v === 20));

  await analyze(page, '已知二次函数 y=0.00001x²，求顶点。', 'parabola');
  await approveAndOpen(page);
  check('极小非零二次项进入模型时保留且公式不显示为零', await page.evaluate(() => state.p.a === .00001
    && /0\.00001|1e-5/.test(document.querySelector('#formula').textContent)
    && !document.querySelector('#formulaCaption').textContent.includes('常数函数')));
  await saveAndReopen(page, '二次项精度回归');
  check('极小二次项保存课堂后重开保留精度', await page.evaluate(() => state.model.id === 'parabola' && state.p.a === .00001));
  await page.locator('[data-action="share"]').click();
  const tinyDownloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="export-config"]').click();
  const tinyPath = path.join(outputDir, 'question-small-coefficient-v1.json');
  await (await tinyDownloadPromise).saveAs(tinyPath);
  const tinyConfig = JSON.parse(fs.readFileSync(tinyPath, 'utf8'));
  check('极小二次项实际导出仍为 v1 且数值不变', tinyConfig.version === 1 && tinyConfig.params.a === .00001);
  await page.locator('[data-action="close-dialog"]').click();
  await followShareHash(page);
  check('极小二次项经过实际分享链接解码仍保留', await page.evaluate(() => state.model.id === 'parabola' && state.p.a === .00001));
  await page.reload();
  check('极小二次项刷新后公式和参数仍非零', await page.evaluate(() => state.p.a === .00001
    && /0\.00001|1e-5/.test(document.querySelector('#formula').textContent)));

  await analyze(page, '凸透镜焦距10cm，物距10.00000000001cm，求像距。', 'lens');
  await approveAndOpen(page);
  check('极近焦点保留物距精度，不能误判为 u=f', await page.evaluate(() => {
    const d = SCIENCE.lensData(state.p);
    return state.p.objectDistance === 10.00000000001 && !d.atFocus && Number.isFinite(d.v) && d.v > 1e10;
  }));
  check('近焦点透镜公式显示准确物距，避免误显 u=f', await page.locator('#formula').innerText()
    .then(text => text.includes('10.00000000001')));
  await saveAndReopen(page, '近焦点精度回归');
  check('近焦点透镜保存课堂重开不变为焦点', await page.evaluate(() => state.p.objectDistance === 10.00000000001
    && !SCIENCE.lensData(state.p).atFocus));
  await followShareHash(page);
  await page.reload();
  check('近焦点透镜分享及刷新保留物距且像距有限', await page.evaluate(() => state.p.objectDistance === 10.00000000001
    && !SCIENCE.lensData(state.p).atFocus && Number.isFinite(SCIENCE.lensData(state.p).v)));

  await analyze(page, '物体从12.345678m高处以10.123456m/s水平抛出，忽略空气阻力，g=9.876543m/s²，求落地时间。', 'projectile');
  await approveAndOpen(page);
  check('题目条件进入模型时保留原始小数精度', matches((await readParams(page)).params,
    {height: 12.345678, v: 10.123456, g: 9.876543}));

  await analyze(page, fixture.projectile.text, 'projectile');
  await page.locator('#questionConfirm').check();
  await fillField(page, 'height', 10);
  check('手动修改核对值后必须重新确认', !await page.locator('#questionConfirm').isChecked()
    && !await usable(page.locator('#openQuestionModel')));
  await approveAndOpen(page);
  check('核对区手动修正后的参数用于实际模型', near((await readParams(page)).params.height, 10));
  await page.locator('#questionEdit').click();
  await page.locator('#matchQuestion').click();
  await page.locator('#questionConfirm').check();
  await page.locator('#questionText').fill(fixture.projectile.text.replace('20 m 高', '15 m 高'));
  check('原文变化立即使旧识别结果失效', !await usable(page.locator('#openQuestionModel')));
  await page.locator('#matchQuestion').click();
  await approveAndOpen(page);
  check('重新分析采用新的题目数值', near((await readParams(page)).params.height, 15));

  const injected = fixture.projectile.text + '<img src=x onerror="window.questionInjected=1">';
  await analyze(page, injected, 'projectile');
  check('核对区注入文本不生成图片或执行事件', await page.evaluate(() => !window.questionInjected
    && !document.querySelector('#questionResult img[src="x"]')));
  await page.locator('#questionConfirm').check();
  check('含代码标记的题目被明确拒绝，确认不能绕过', !await usable(page.locator('#openQuestionModel'))
    && /代码|标记/.test(await page.locator('#questionResult').innerText()));

  // Counterexamples: a reported output is not an initial condition, and
  // explicitly required drag cannot be silently changed into an ideal model.
  const rejectedQuestions = [
    ['lens', '像距不可冒充物距', '凸透镜焦距10cm，像距离透镜30cm，求物体位置。'],
    ['projectile', '经过一段时间的速度不可冒充初速度', '物体从20m高处水平抛出，g=10m/s²，经过1s速度10m/s，求落地时间。'],
    ['collision', '碰后速度不可冒充碰前速度', '球1质量1kg，碰后速度向右3m/s；球2质量2kg，碰后静止。弹性碰撞，求碰前动量。'],
    ['projectile', '不能忽略空气阻力不可当作理想平抛', '平抛，高度10m，初速度10m/s，g=10m/s²，不能忽略空气阻力。'],
  ];
  for (const [type, label, text] of rejectedQuestions) {
    await analyze(page, text, type);
    const confirmation = page.locator('#questionConfirm');
    if (await confirmation.count()) await confirmation.check();
    check(`${label}：确认也不能进入错误模型`, !await usable(page.locator('#openQuestionModel')));
    check(`${label}：显示拒绝或缺参的具体原因`, await page.locator('#questionResult').innerText().then(value =>
      /不支持|不能|仅支持|请填写|请补|未提取|未识别|未给出|未匹配|缺少|不适用/.test(value)));
  }

  await analyze(page, fixture.lens.text, 'lens');
  await approveAndOpen(page);
  await page.locator('.sidebar [data-nav="all"]').click();
  await page.locator('[data-open="pendulum"]').click();
  check('从模型库打开普通模型清除题干上下文', !await page.locator('#questionContext').count()
    || !await page.locator('#questionContext').isVisible());

  await analyze(page, fixture.projectile.text, 'projectile');
  await approveAndOpen(page);
  await page.reload();
  check('刷新模型页不假称保留原题上下文', !await page.locator('#questionContext').count()
    || !await page.locator('#questionContext').isVisible());
  check('刷新仍为有效原有模型页面', await page.locator('#simCanvas').isVisible()
    && await page.evaluate(() => state.model?.id === 'projectile'));

  // Exercise an actual legacy file import, then actual version:1 export.
  const legacy = {app: 'zhixiang', version: 1, type: 'model', model: 'pendulum', params: {length: 2}, title: '旧版单摆课堂'};
  await page.locator('#importFile').setInputFiles({name: 'legacy-v1.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy))});
  await page.locator('[data-action="confirm-import"]').click();
  check('旧 version:1 课堂导入保持兼容', await page.evaluate(() => state.model.id === 'pendulum'
    && state.p.length === 2 && state.p.motionMode === 'ideal'));
  await analyze(page, fixture.lens.text, 'lens');
  await approveAndOpen(page);
  await page.locator('[data-action="share"]').click();
  const downloaded = page.waitForEvent('download');
  await page.locator('[data-action="export-config"]').click();
  const download = await downloaded;
  const configPath = path.join(outputDir, 'question-model-v1.json');
  await download.saveAs(configPath);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  check('做题模型仍导出 version:1 参数配置，不附带题干', config.version === 1 && config.model === 'lens'
    && matches(config.params, fixture.lens.params) && !JSON.stringify(config).includes(fixture.lens.text), config);
  await page.locator('[data-action="close-dialog"]').click();

  await page.setViewportSize({width: 390, height: 844});
  await page.waitForFunction(() => !document.querySelector('#toast')?.classList.contains('show'));
  await goQuestions(page);
  check('390px 做题使用常规导航铅笔图标，位于模型库后且高亮', await page.locator('.mobile-nav [data-nav="questions"]').evaluate(el =>
    el.previousElementSibling?.dataset.nav === 'all' && !!el.querySelector('[data-icon="pencil"] svg')
    && el.classList.contains('active') && el.getAttribute('aria-current') === 'page'));
  check('390px 做题入口和输入区域无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await analyze(page, fixture.projectile.text);
  check('390px 条件核对区无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.evaluate(() => window.scrollTo({top: 0, left: 0, behavior: 'instant'}));
  await page.screenshot({path: path.join(outputDir, 'questions-review-390.png'), fullPage: true});
  await approveAndOpen(page);
  check('390px 原题上下文和模型无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({path: path.join(outputDir, 'questions-model-390.png'), fullPage: true});

  const offline = await context.newPage();
  observe(offline, true);
  await offline.goto(pathToFileURL(path.join(root, 'standalone.html')).href + '#view=questions');
  check('单文件可直接离线打开做题工作区', await offline.locator('#questionText').isVisible());
  await analyze(offline, fixture.projectile.text);
  await approveAndOpen(offline);
  check('离线单文件可完整核对并打开对应模型', matches((await readParams(offline)).params, fixture.projectile.params)
    && await offline.locator('#questionContext').isVisible());
  check('读题和模型运行无外部请求', remote.length === 0, remote);
  check('做题全流程无浏览器脚本异常', errors.length === 0, errors);
})().catch(error => check('做题浏览器检查完成', false, error.stack)).finally(async () => {
  await browser?.close();
  const summary = {total: results.length, passed: results.filter(result => result.passed).length,
    failed: results.filter(result => !result.passed).length};
  fs.writeFileSync(path.join(outputDir, 'questions-browser-results.json'), JSON.stringify({date: new Date().toISOString(), summary, results, errors, remote}, null, 2));
  console.log(`RESULT ${summary.passed}/${summary.total}`);
  if (summary.failed) process.exitCode = 1;
});
