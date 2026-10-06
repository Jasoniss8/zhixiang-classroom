"use strict";
// Question text is kept in memory only. Model storage and share links stay v1.
const questionDraft = { text: "", type: "auto", analysis: null, values: {}, revision: 0 };
let activeQuestion = null;

function questionType(id) {
  return ZhixiangQuestions.types.find((type) => type.id === id);
}
function questionMessages(messages, className = "") {
  return messages.length ? `<ul class="question-messages ${className}">${messages.map((message) => `<li>${esc(message)}</li>`).join("")}</ul>` : "";
}
function renderQuestionPage() {
  const limit = ZhixiangQuestions.MAX_TEXT_LENGTH || 4000;
  $("#main").innerHTML = mobileNav() + `
    <section class="question-page" aria-labelledby="questionHeading">
      <div class="page-title"><h1 id="questionHeading">做题</h1><p>粘贴一道题，核对条件后进入对应模型。</p></div>
      <div class="question-layout">
        <section class="question-input-panel" aria-label="输入题目">
          <form id="questionForm" novalidate>
            <label class="question-label" for="questionText">题目</label>
            <textarea id="questionText" maxlength="${limit}" placeholder="例如：物体从 20 m 高处以 10 m/s 水平抛出，忽略空气阻力，g=10 m/s²，求落地时间和水平位移。" aria-describedby="questionInputNote">${esc(questionDraft.text)}</textarea>
            <div class="question-input-meta"><span id="questionLength">${questionDraft.text.length} / ${limit}</span><button type="button" class="button text" id="questionImport">${icon("upload")}导入 TXT</button><button type="button" class="button text" id="questionClear">清空</button></div>
            <input type="file" id="questionFile" accept=".txt,text/plain" hidden>
            <label class="question-label" for="questionType">题型</label>
            <select id="questionType" class="control-select"><option value="auto">自动匹配</option>${ZhixiangQuestions.types.map((type) => `<option value="${esc(type.id)}" ${questionDraft.type === type.id ? "selected" : ""}>${esc(type.title)}</option>`).join("")}</select>
            <button type="submit" class="button primary" id="matchQuestion">${icon("search")}匹配模型</button>
            <p class="question-help" id="questionInputNote">支持下方四类文本题，可手动补充未识别的条件。图片识别暂未接入。题目不上传，仅保留在当前页面，刷新后清空。</p>
            <p class="question-help" id="questionImportStatus" role="status"></p>
          </form>
          <div class="question-examples"><h2>试一道例题</h2><div>${ZhixiangQuestions.types.map((type) => `<button class="button secondary small" data-question-example="${esc(type.id)}">${esc(type.title)}</button>`).join("")}</div></div>
          <details class="question-scope"><summary>支持范围</summary><ul>${ZhixiangQuestions.types.map((type) => `<li><strong>${esc(type.title)}</strong>：${esc(type.scope)}</li>`).join("")}</ul><p>一次输入一道题。需要新场景、反求未给参数或超出当前模型范围时，会提示修改题目或条件。</p></details>
        </section>
        <section id="questionResult" class="question-result-panel" aria-label="题目条件核对"></section>
      </div>
    </section>`;
  renderQuestionResult();
}
function renderQuestionResult() {
  const target = $("#questionResult");
  if (!target) return;
  const result = questionDraft.analysis;
  const type = questionType(result?.typeId);
  if (!result || !type) {
    target.innerHTML = `<div class="question-empty">${icon("book")}<h2>${result ? "暂未匹配到模型" : "先输入题目，再核对条件"}</h2><p>${result ? "可选择一种支持的题型，按原题补全数值；复杂组合题暂不支持。" : "这里会列出识别出的数值、单位和假设。确认后才会进入模型。"}</p>${result ? questionMessages(result.issues || [], "question-errors") : ""}</div>`;
    return;
  }
  const checked = ZhixiangQuestions.validate(type.id, questionDraft.values);
  target.innerHTML = `<div class="question-result-heading"><div><p class="question-eyebrow">匹配模型</p><h2>${esc(modelById(type.modelId)?.title || type.title)}</h2></div><span class="question-step">核对条件</span></div>
    ${result.asked ? `<p class="question-asked"><strong>题目所求：</strong>${esc(result.asked)}</p>` : ""}
    ${questionMessages(result.issues || [], "question-errors")}
    <div class="question-fields">${type.fields.map((field) => {
      const value = questionDraft.values[field.key] ?? "";
      const inputId = "question-field-" + field.key;
      const source = result.sources?.[field.key];
      return `<div class="question-field"><label for="${esc(inputId)}">${esc(field.label)}${field.unit ? `<span> / ${esc(field.unit)}</span>` : ""}</label>${field.type === "select"
        ? `<select id="${esc(inputId)}" data-question-field="${esc(field.key)}"><option value="">请选择</option>${field.options.map((option) => `<option value="${esc(option.value)}" ${String(value) === String(option.value) ? "selected" : ""}>${esc(option.label)}</option>`).join("")}</select>`
        : `<input id="${esc(inputId)}" data-question-field="${esc(field.key)}" type="number" step="any" ${Number.isFinite(field.min) ? `min="${field.min}"` : ""} ${Number.isFinite(field.max) ? `max="${field.max}"` : ""} value="${esc(value)}" placeholder="请按原题补充">`}
        <small id="question-source-${esc(field.key)}">${source ? "识别依据：" + esc(source) : "未从题干识别，请核对后填写。"}</small></div>`;
    }).join("")}</div>
    ${questionMessages(result.warnings || [], "question-notes")}
    <div id="questionModelNotes">${questionMessages(checked.notes || [], "question-notes")}</div>
    <div id="questionValidation" class="question-validation" role="status"></div>
    <label class="question-confirm"><input type="checkbox" id="questionConfirm">我已核对数值、单位与假设，确认与这道题一致。</label>
    <button class="button primary" id="openQuestionModel" disabled>进入模型 ${icon("arrow")}</button>
    <p class="question-help">这里匹配已有模型。进入后可查看公式与读数，不自动生成任意题目的完整解答。</p>`;
  updateQuestionValidation();
}
function updateQuestionValidation() {
  const result = questionDraft.analysis;
  if (!result || !questionType(result.typeId) || !$("#openQuestionModel")) return;
  const checked = ZhixiangQuestions.validate(result.typeId, questionDraft.values);
  const issues = result.issues || [];
  $("#questionValidation").innerHTML = questionMessages(checked.errors || [], "question-errors");
  $("#questionModelNotes").innerHTML = questionMessages(checked.notes || [], "question-notes");
  $("#openQuestionModel").disabled = !checked.ok || !!issues.length || !$("#questionConfirm").checked;
}
function matchQuestion() {
  questionDraft.text = $("#questionText").value;
  questionDraft.type = $("#questionType").value;
  questionDraft.revision++;
  questionDraft.analysis = ZhixiangQuestions.analyze(questionDraft.text, questionDraft.type);
  questionDraft.values = { ...questionDraft.analysis.values };
  renderQuestionResult();
  const region = $("#questionResult");
  region.setAttribute("tabindex", "-1");
  region.focus({ preventScroll: true });
  if (matchMedia("(max-width: 760px)").matches) region.scrollIntoView({ block: "start" });
}
function openQuestionModel() {
  const result = questionDraft.analysis;
  if (!result || result.issues?.length || !$("#questionConfirm")?.checked) return;
  const checked = ZhixiangQuestions.validate(result.typeId, questionDraft.values);
  if (!checked.ok) return updateQuestionValidation();
  const context = {
    typeId: result.typeId, modelId: result.modelId,
    text: questionDraft.text, asked: result.asked,
    values: { ...questionDraft.values }, issues: [],
    notes: [...(result.warnings || []), ...(checked.notes || [])],
  };
  openModel(result.modelId, checked.params, context);
}
function questionContextHTML() {
  const question = activeQuestion;
  const type = questionType(question.typeId);
  return `<section id="questionContext" class="question-context" aria-label="当前题目"><div class="question-context-heading"><h2>当前题目</h2><div><button id="questionEdit" class="button secondary small">修改题目</button><button id="questionOriginal" class="button secondary small">还原题目条件</button></div></div>
    <p class="question-original-text">${esc(question.text)}</p>
    ${question.asked ? `<p class="question-asked"><strong>题目所求：</strong>${esc(question.asked)}</p>` : ""}
    <dl class="question-known">${type.fields.map((field) => {
      const raw = question.values[field.key];
      const value = field.type === "select" ? field.options.find((option) => String(option.value) === String(raw))?.label : raw;
      return `<div><dt>${esc(field.label)}</dt><dd>${esc(value)}${field.unit ? " " + esc(field.unit) : ""}</dd></div>`;
    }).join("")}</dl>
    <details class="question-context-notes"><summary>核对说明与模型范围</summary>${questionMessages(question.notes)}<p>保存课堂与分享链接仅含模型参数，不包含原题。下方讨论问题是模型通用问题。</p></details>
    <p id="questionVariation" class="question-variation" role="status">当前使用已核对的题目条件。</p></section>`;
}
function updateQuestionVariation() {
  const target = $("#questionVariation");
  if (!activeQuestion || !target) return;
  const changed = Object.keys(activeQuestion.originalParams || {}).some((key) => state.p[key] !== activeQuestion.originalParams[key]);
  const message = changed ? "当前为变式：模型参数已调整，与上方题目条件不同。可点击「还原题目条件」。" : "当前使用已核对的题目条件。";
  if (target.textContent !== message) target.textContent = message;
  target.classList.toggle("is-variation", changed);
}
function invalidateQuestionResult() {
  questionDraft.revision++;
  questionDraft.analysis = null;
  questionDraft.values = {};
  renderQuestionResult();
}
document.addEventListener("submit", (event) => {
  if (event.target.id !== "questionForm") return;
  event.preventDefault();
  matchQuestion();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.dataset.questionExample) {
    const type = questionType(button.dataset.questionExample);
    if (!type) return;
    $("#questionText").value = type.example;
    $("#questionType").value = "auto";
    $("#questionLength").textContent = `${type.example.length} / ${ZhixiangQuestions.MAX_TEXT_LENGTH || 4000}`;
    matchQuestion();
  } else if (button.id === "openQuestionModel") openQuestionModel();
  else if (["questionEdit", "questionBack"].includes(button.id)) showLibrary("questions");
  else if (button.id === "questionOriginal" && activeQuestion) {
    openModel(activeQuestion.modelId, activeQuestion.originalParams, activeQuestion);
  } else if (button.id === "questionImport") $("#questionFile").click();
  else if (button.id === "questionClear") {
    Object.assign(questionDraft, { text: "", type: "auto", analysis: null, values: {} });
    questionDraft.revision++;
    renderQuestionPage();
    $("#questionText").focus();
  }
});
document.addEventListener("input", (event) => {
  const input = event.target;
  if (input.id === "questionText") {
    questionDraft.text = input.value;
    $("#questionLength").textContent = `${input.value.length} / ${ZhixiangQuestions.MAX_TEXT_LENGTH || 4000}`;
    invalidateQuestionResult();
  } else if (input.dataset.questionField) {
    const key = input.dataset.questionField;
    questionDraft.values[key] = input.type === "number" && input.value !== "" ? Number(input.value) : input.value;
    $("#questionConfirm").checked = false;
    const source = $("#question-source-" + key);
    if (source) source.textContent = "已手动修改，请再次核对原题。";
    updateQuestionValidation();
  }
});
document.addEventListener("change", async (event) => {
  const input = event.target;
  if (input.id === "questionType") {
    questionDraft.type = input.value;
    invalidateQuestionResult();
  } else if (input.id === "questionConfirm") updateQuestionValidation();
  else if (input.id === "questionFile") {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const revision = ++questionDraft.revision;
    const notice = $("#questionImportStatus");
    if (!/\.txt$/i.test(file.name) || file.size > 65536) {
      notice.textContent = "请选择不超过 64 KB 的 TXT 文本文件。";
      return;
    }
    try {
      const text = await file.text();
      if (revision !== questionDraft.revision || !notice.isConnected) return;
      if (text.length > (ZhixiangQuestions.MAX_TEXT_LENGTH || 4000) || /\u0000|\uFFFD/.test(text)) {
        notice.textContent = "文件过长或编码无法识别。请使用 UTF-8 文本，每次最多输入一道 4000 字以内的题目。";
        return;
      }
      $("#questionText").value = text;
      questionDraft.text = text;
      invalidateQuestionResult();
      $("#questionLength").textContent = `${text.length} / ${ZhixiangQuestions.MAX_TEXT_LENGTH || 4000}`;
      notice.textContent = "已读取文本，请点击「匹配模型」。";
    } catch {
      if (notice.isConnected) notice.textContent = "文件读取失败，可直接粘贴题目。";
    }
  }
});
