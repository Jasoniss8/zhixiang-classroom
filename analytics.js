/* Anonymous usage statistics for the public website only; a no-op everywhere else. */
(function () {
  const SITE_HOST = "zhixiang-classroom.pages.dev";
  const FEATURE_TARGETS = [
    ['[data-action="present"]', "present", () => !state.presenting],
    ['[data-action="confirm-save"]', "save"],
    ['[data-action="screenshot"]', "screenshot"],
    ['[data-action="share"]', "export_params"],
    ["[data-export-data]", "export_data"],
    ['[data-action="copy-link"], [data-class-share]', "share"],
    ['[data-action="ink"]', "ink", () => !state.inking],
    ["[data-package-download]", "download_desktop"],
  ];
  let lastPage = null,
    referrerSent = false;
  const recent = new Map(),
    searched = new Set();

  function config() {
    // Tests may enable reporting on a local host; Do Not Track and the desktop app still win.
    const test = window.__ZHIXIANG_ANALYTICS_TEST__;
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return null;
    if (typeof IS_DESKTOP_APP !== "undefined" && IS_DESKTOP_APP) return null;
    if (test && typeof test.endpoint === "string") return { endpoint: test.endpoint };
    if (location.protocol !== "https:" || location.hostname !== SITE_HOST) return null;
    return { endpoint: "/api/event" };
  }

  function track(type, fields = {}) {
    const settings = config();
    if (!settings) return;
    const body = JSON.stringify({ type, ...fields });
    const now = Date.now();
    if (now - (recent.get(body) || 0) < 1000) return;
    recent.set(body, now);
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon?.(settings.endpoint, blob))
        fetch(settings.endpoint, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    } catch {
      /* Statistics must never interrupt teaching. */
    }
  }

  function referrerHost() {
    if (referrerSent) return undefined;
    referrerSent = true;
    try {
      const host = new URL(document.referrer).hostname;
      return host && host !== location.hostname ? host : undefined;
    } catch {
      return undefined;
    }
  }

  // Counts a page view only when the kind of page changes.
  function view(page) {
    if (page === lastPage) return;
    lastPage = page;
    track("view", { page, ref: referrerHost() });
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      for (const [selector, name, when] of FEATURE_TARGETS) {
        const el = target.closest(selector);
        if (el && !el.disabled && (!when || when())) {
          track("feature", { name, model: state.model?.id });
          return;
        }
      }
    },
    true,
  );
  document.addEventListener(
    "submit",
    (event) => {
      if (event.target.id === "questionForm") track("feature", { name: "question_submit" });
    },
    true,
  );
  let searchTimer = 0;
  document.addEventListener("input", (event) => {
    if (event.target.id !== "searchInput") return;
    clearTimeout(searchTimer);
    const q = event.target.value.trim();
    searchTimer = setTimeout(() => {
      if ([...q].length < 2 || searched.has(q)) return;
      searched.add(q);
      track("search", { q: [...q].slice(0, 40).join("") });
    }, 1500);
  });

  window.ZhixiangAnalytics = Object.freeze({ track, view });
})();
