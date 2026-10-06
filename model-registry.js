"use strict";
/* Classic scripts work both on static hosting and file://. A model owns its
   metadata and rendering hooks; the registry never changes saved parameters. */
const ZhixiangModels = (() => {
  const entries = new Map();
  function register(model) {
    for (const key of [
      "id",
      "cat",
      "level",
      "title",
      "desc",
      "tags",
      "defaults",
      "controls",
    ]) {
      if (model[key] === undefined) throw new Error(`模型缺少 ${key}`);
    }
    if (!/^[a-z][a-z0-9-]*$/.test(model.id) || entries.has(model.id))
      throw new Error(`重复或无效模型 id：${model.id}`);
    if (typeof model.draw !== "function" || typeof model.readout !== "function")
      throw new Error(`模型 ${model.id} 缺少 draw/readout`);
    model.presets ??= [];
    model.sources ??= [];
    model.hint ??= "调整参数观察模型。";
    model.question ??= "";
    model.answer ??= "";
    model.note ??= "";
    // Optional lifecycle hooks have generic defaults, so adding a model only
    // requires its module and a manifest entry (then build.py).
    model.renderControls ??= () => {
      const root = document.querySelector("#controlBody");
      root.innerHTML =
        (model.presets || [])
          .map(
            (item, i) =>
              `<button class="preset" data-preset="${i}">${esc(item[0])}</button>`,
          )
          .join("") + model.controls.map((c) => paramHTML(c, state.p)).join("");
      updateRanges(root);
    };
    model.reset ??= () => {};
    model.advance ??= (dt) => {
      state.time += dt;
    };
    model.setParam ??= (key, value) => {
      if (!model.controls.some((c) => c[0] === key) || !Number.isFinite(value))
        return;
      stopAnimation();
      state.p = safeParams(model, { ...state.p, [key]: value });
      state.time = 0;
      model.reset();
      syncParam(key);
      renderReadout();
      requestDraw();
    };
    model.thumbnail ??= (canvas, m) => {
      const { ctx, w, h } = setupCanvas(canvas);
      text(ctx, m.title, w / 2, h / 2, 14, CATS[m.cat].color, "center");
    };
    entries.set(model.id, model);
    return model;
  }
  return Object.freeze({
    register,
    get: (id) => entries.get(id),
    list: () => [...entries.values()],
  });
})();
