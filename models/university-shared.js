"use strict";
// Shared UI only. Numerical work belongs to the pure university modules.
function uniRenderControls(model = state.model) {
  const root = $("#controlBody"), p = state.p;
  if (!root || !model) return;
  const choices = Object.entries(model.choices || {}).filter(([key]) => !model.choiceVisible || model.choiceVisible(key, p));
  const controls = model.visibleControls ? model.visibleControls(p) : model.controls.filter(([key]) => !model.controlVisible || model.controlVisible(key, p));
  root.innerHTML = `<h3>例题预设</h3><div class="preset-list">${model.presets.map(([name], i) => `<button class="preset" data-preset="${i}">${esc(name)}</button>`).join("")}</div>${model.presetDescriptions ? `<p class="control-note" id="uniPresetDescription">${esc(model.presetDescriptions[model.presets.findIndex(([,q])=>Object.keys(q).every(k=>p[k]===q[k]))] || "选择例题预设可查看题意，再调整参数观察变式。")}</p>` : ""}${choices.map(([key, values]) => `<label class="uni-select-label" for="uni-${esc(key)}">${esc(model.choiceTitles?.[key] || {kind:"类型",surface:"函数",mode:"模式",axisUnit:"自变量单位",eigen:"特征方向"}[key] || key)}</label><select id="uni-${esc(key)}" class="control-select" data-uni-choice="${esc(key)}">${values.map(value => `<option value="${esc(value)}" ${p[key] === value ? "selected" : ""}>${esc(model.choiceLabels?.[key]?.[value] || value)}</option>`).join("")}</select>`).join("")}${controls.map(c => paramHTML(c,p)).join("")}${(model.bools || []).map(key => `<label class="checkline"><input type="checkbox" data-uni-bool="${esc(key)}" ${p[key] ? "checked" : ""}>${esc(model.boolLabels?.[key] || key)}</label>`).join("")}<p id="uniNotice" class="control-note" role="status">${esc(model.notice?.(p) || "")}</p><div class="control-divider"></div><label class="checkline"><input type="checkbox" data-flag="labels" ${state.labels ? "checked" : ""}>显示标注</label><p class="control-note">${esc(model.note)}</p><button class="source-link" data-action="model-info">模型条件与参考资料</button>`;
  updateRanges(root);
}
function uniSetParam(key, value) {
  const model = state.model;
  if (!model?.university || !model.controls.some(c => c[0] === key) || !Number.isFinite(value)) return;
  stopAnimation();
  state.p = safeParams(model, {...state.p, [key]:value});
  state.time = 0;
  model.reset();
  for (const [name] of model.controls) syncParam(name);
  renderReadout();
  const notice = $("#uniNotice");
  if (notice) notice.textContent = model.notice?.(state.p) || "";
  requestDraw();
}
function uniBindStage() {
  const canvas = $("#simCanvas");
  if (!canvas) return;
  let drag = null;
  const point = e => { const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*canvas.clientWidth/r.width,y:(e.clientY-r.top)*canvas.clientHeight/r.height}; };
  canvas.addEventListener("pointerdown", e => {
    if (state.inking || e.button > 0 || !stageInfo?.uniDrag) return;
    const p=point(e), start={...p,dx:0,dy:0,startX:p.x,startY:p.y,phase:"start"};
    if (stageInfo.uniDrag(start) === false) return;
    drag={...p,startX:p.x,startY:p.y,id:e.pointerId};
    canvas.focus({preventScroll:true});
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  canvas.addEventListener("pointermove",e=>{
    if (!drag || drag.id!==e.pointerId || state.inking) return;
    const p=point(e);
    stageInfo?.uniDrag?.({...p,dx:p.x-drag.x,dy:p.y-drag.y,startX:drag.startX,startY:drag.startY,phase:"move"});
    Object.assign(drag,p);
  });
  const end=e=>{
    if (!drag || drag.id!==e.pointerId) return;
    stageInfo?.uniDrag?.({...point(e),dx:0,dy:0,startX:drag.startX,startY:drag.startY,phase:"end"});
    drag=null;
    if(canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  canvas.addEventListener("pointerup",end);
  canvas.addEventListener("pointercancel",end);
  canvas.addEventListener("wheel",e=>{
    if(state.inking || !stageInfo?.uniWheel) return;
    e.preventDefault();stageInfo.uniWheel(e.deltaY,point(e));
  },{passive:false});
  canvas.addEventListener("keydown",e=>{
    if(stageInfo?.uniKey?.(e.key,e)){e.preventDefault();}
  });
}
document.addEventListener("change",e=>{
  const model=state.model,el=e.target;
  if(!model?.university) return;
  const key=el.dataset.uniChoice, bool=el.dataset.uniBool;
  if(key && model.choices?.[key]?.includes(el.value)){
    stopAnimation();state.p=safeParams(model,{...state.p,[key]:el.value});state.time=0;model.reset();
    uniRenderControls(model);renderReadout();updatePlayback();requestDraw();
  }else if(bool && model.bools?.includes(bool)){
    state.p[bool]=el.checked;renderReadout();requestDraw();
  }
});
