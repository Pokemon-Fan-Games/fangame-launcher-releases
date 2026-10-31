// Motor de idioma del sitio: el español vive en el HTML y este script aplica el
// diccionario inglés (docs/locales/en.js) cuando el visitante elige inglés.
(() => {
  const LANGS = ["es", "en"];
  const STORAGE_KEY = "fangame-site-lang";
  const DEFAULT_LANG = "es";
  const textOriginals = new WeakMap();
  const attrOriginals = new WeakMap();
  const listeners = new Set();
  let current = DEFAULT_LANG;

  const dictionary = () => globalThis.FANGAME_EN || {};

  function pickLang(...candidates) {
    for (const candidate of candidates) {
      if (LANGS.includes(candidate)) return candidate;
    }
    return DEFAULT_LANG;
  }

  function baseLang(tag) {
    const base = String(tag || "").toLowerCase().split("-")[0];
    return LANGS.includes(base) ? base : null;
  }

  function firstSupported(tags) {
    for (const tag of tags || []) {
      const base = baseLang(tag);
      if (base) return base;
    }
    return null;
  }

  function readParam(search) {
    const match = /[?&]lang=(es|en)(&|$)/.exec(search || "");
    return match ? match[1] : null;
  }

  function readStorage() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return LANGS.includes(value) ? value : null;
    } catch {
      return null;
    }
  }

  function writeStorage(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Sin almacenamiento disponible el idioma se mantiene solo en memoria.
    }
  }

  function detectBrowser() {
    try {
      const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
      return firstSupported(tags);
    } catch {
      return null;
    }
  }

  function resolveLang() {
    const param = typeof location === "object" ? readParam(location.search) : null;
    return pickLang(param, readStorage(), detectBrowser());
  }

  function t(key, vars, fallback) {
    const source = current === "en" ? (dictionary()[key] ?? fallback ?? key) : (fallback ?? key);
    return vars ? source.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : source;
  }

  function pick(key, dict, original) {
    if (current !== "en") return original;
    if (key in dict) return dict[key];
    console.warn(`FangameI18n: falta la traducción de "${key}"`);
    return original;
  }

  function apply(lang) {
    current = pickLang(lang);
    const dict = dictionary();
    if (document.documentElement) document.documentElement.lang = current;

    for (const el of document.querySelectorAll("[data-i18n]")) {
      if (!textOriginals.has(el)) textOriginals.set(el, el.innerHTML);
      el.innerHTML = pick(el.dataset.i18n, dict, textOriginals.get(el));
    }
    for (const el of document.querySelectorAll("[data-i18n-title]")) {
      if (!textOriginals.has(el)) textOriginals.set(el, el.textContent);
      el.textContent = pick(el.dataset.i18nTitle, dict, textOriginals.get(el));
    }
    for (const el of document.querySelectorAll("[data-i18n-alt]")) {
      if (!attrOriginals.has(el)) attrOriginals.set(el, el.getAttribute("alt") || "");
      el.setAttribute("alt", pick(el.dataset.i18nAlt, dict, attrOriginals.get(el)));
    }
    for (const el of document.querySelectorAll("[data-i18n-aria]")) {
      if (!attrOriginals.has(el)) attrOriginals.set(el, el.getAttribute("aria-label") || "");
      el.setAttribute("aria-label", pick(el.dataset.i18nAria, dict, attrOriginals.get(el)));
    }
    for (const el of document.querySelectorAll("[data-i18n-content]")) {
      if (!attrOriginals.has(el)) attrOriginals.set(el, el.getAttribute("content") || "");
      el.setAttribute("content", pick(el.dataset.i18nContent, dict, attrOriginals.get(el)));
    }
    for (const button of document.querySelectorAll("[data-lang-switch] button")) {
      if (button.dataset.lang === current) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    }
    for (const link of document.querySelectorAll("[data-lang-link]")) {
      link.href = `${link.dataset.langLink}?lang=${current}`;
    }
  }

  function syncUrl(lang) {
    try {
      const url = new URL(location.href);
      url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
    } catch {
      // Sin API de historial el idioma sigue aplicado en la página.
    }
  }

  function emitChange(lang) {
    if (typeof CustomEvent === "function" && typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("fangame:languagechange", { detail: { lang } }));
    }
    for (const listener of listeners) listener(lang);
  }

  function setLang(lang) {
    current = pickLang(lang);
    writeStorage(current);
    apply(current);
    syncUrl(current);
    emitChange(current);
  }

  function onChange(callback) {
    if (typeof callback === "function") listeners.add(callback);
  }

  function bindSwitcher() {
    for (const button of document.querySelectorAll("[data-lang-switch] button")) {
      button.addEventListener("click", () => setLang(button.dataset.lang));
    }
  }

  function init() {
    const lang = resolveLang();
    writeStorage(lang);
    apply(lang);
    bindSwitcher();
    globalThis.__fangameI18nApplied = true;
    if (document.documentElement) document.documentElement.removeAttribute("data-i18n-pending");
  }

  globalThis.FangameI18n = {
    LANGS,
    pickLang,
    firstSupported,
    readParam,
    resolveLang,
    getLang: () => current,
    setLang,
    t,
    apply,
    onChange,
  };

  if (typeof document !== "undefined" && document.documentElement) init();
})();
