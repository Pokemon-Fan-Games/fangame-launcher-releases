import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const script = await readFile(new URL('../docs/i18n.js', import.meta.url), 'utf8');

// --- DOM simulado mínimo -----------------------------------------------
const SELECTORS = {
  '[data-i18n]': el => 'i18n' in el.dataset,
  '[data-i18n-alt]': el => 'i18nAlt' in el.dataset,
  '[data-i18n-aria]': el => 'i18nAria' in el.dataset,
  '[data-i18n-title]': el => 'i18nTitle' in el.dataset,
  '[data-i18n-content]': el => 'i18nContent' in el.dataset,
  '[data-lang-switch] button': el => el.kind === 'switch',
  '[data-lang-link]': el => 'langLink' in el.dataset,
};

function element({ dataset = {}, attrs = {}, html = '', text = '', kind = '' } = {}) {
  const attributes = { ...attrs };
  return {
    dataset,
    kind,
    innerHTML: html,
    textContent: text,
    href: '',
    getAttribute: name => (name in attributes ? attributes[name] : null),
    setAttribute: (name, value) => { attributes[name] = value; },
    removeAttribute: name => { delete attributes[name]; },
    addEventListener: () => {},
  };
}

function harness({ elements = [], search = '', stored = null, languages = ['es-ES'], dictionary = {} } = {}) {
  const listeners = {};
  const storage = new Map(stored === null ? [] : [['fangame-site-lang', stored]]);
  const document = {
    documentElement: { lang: 'es', dataset: {}, setAttribute() {}, removeAttribute() {} },
    querySelectorAll: selector => elements.filter(el => SELECTORS[selector]?.(el) ?? false),
    querySelector: selector => elements.find(el => SELECTORS[selector]?.(el) ?? false) ?? null,
    dispatchEvent: event => { for (const fn of listeners[event.type] ?? []) fn(event); },
    addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn); },
  };
  const context = {
    document,
    localStorage: {
      getItem: key => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, value),
    },
    location: { search, href: `https://example.test/${search}` },
    history: { replaceState() {} },
    navigator: { languages, language: languages[0] },
    CustomEvent: class {
      constructor(type, init) { this.type = type; this.detail = init?.detail; }
    },
    FANGAME_EN: dictionary,
    console,
  };
  vm.runInNewContext(script, context);
  return { context, storage, document };
}

// --- Pruebas ------------------------------------------------------------
test('pickLang usa el primer candidato válido y cae en español', () => {
  const { context } = harness();
  assert.equal(context.FangameI18n.pickLang('en', 'es'), 'en');
  assert.equal(context.FangameI18n.pickLang('fr', 'es'), 'es');
  assert.equal(context.FangameI18n.pickLang(null, undefined), 'es');
});

test('firstSupported entiende las etiquetas del navegador', () => {
  const { context } = harness();
  assert.equal(context.FangameI18n.firstSupported(['fr-FR', 'en-GB']), 'en');
  assert.equal(context.FangameI18n.firstSupported(['es-MX']), 'es');
  assert.equal(context.FangameI18n.firstSupported(['fr-FR']), null);
  assert.equal(context.FangameI18n.firstSupported([]), null);
});

test('readParam acepta el parámetro lang de la URL', () => {
  const { context } = harness();
  assert.equal(context.FangameI18n.readParam('?lang=en'), 'en');
  assert.equal(context.FangameI18n.readParam('?foo=1&lang=es&x=2'), 'es');
  assert.equal(context.FangameI18n.readParam('?lang=fr'), null);
  assert.equal(context.FangameI18n.readParam(''), null);
});

test('resolveLang prioriza el parámetro, la preferencia guardada y el navegador', () => {
  assert.equal(harness({ search: '?lang=en', stored: 'es', languages: ['es-ES'] }).context.FangameI18n.resolveLang(), 'en');
  assert.equal(harness({ search: '', stored: 'en', languages: ['es-ES'] }).context.FangameI18n.resolveLang(), 'en');
  assert.equal(harness({ search: '', stored: null, languages: ['en-US'] }).context.FangameI18n.resolveLang(), 'en');
  assert.equal(harness({ search: '', stored: null, languages: ['fr-FR'] }).context.FangameI18n.resolveLang(), 'es');
});

test('apply traduce el texto, los atributos y el título, y vuelve al español', () => {
  const heading = element({ dataset: { i18n: 'hero.title' }, html: 'Todos tus fangames en un solo lugar.' });
  const image = element({ dataset: { i18nAlt: 'hero.imageAlt' }, attrs: { alt: 'Biblioteca de Fangame Launcher' } });
  const label = element({ dataset: { i18nAria: 'lang.group' }, attrs: { 'aria-label': 'Idioma' } });
  const title = element({ dataset: { i18nTitle: 'meta.title' }, text: 'Fangame Launcher: instala, actualiza y juega fangames' });
  const meta = element({ dataset: { i18nContent: 'meta.description' }, attrs: { content: 'Descripción en español' } });
  const { context, document } = harness({
    elements: [heading, image, label, title, meta],
    dictionary: {
      'hero.title': 'All your fan games in one place.',
      'hero.imageAlt': 'Fangame Launcher library',
      'lang.group': 'Language',
      'meta.title': 'Fangame Launcher: install, update and play fan games',
      'meta.description': 'Desktop launcher',
    },
  });

  context.FangameI18n.apply('en');
  assert.equal(heading.innerHTML, 'All your fan games in one place.');
  assert.equal(image.getAttribute('alt'), 'Fangame Launcher library');
  assert.equal(label.getAttribute('aria-label'), 'Language');
  assert.equal(title.textContent, 'Fangame Launcher: install, update and play fan games');
  assert.equal(meta.getAttribute('content'), 'Desktop launcher');
  assert.equal(document.documentElement.lang, 'en');

  context.FangameI18n.apply('es');
  assert.equal(heading.innerHTML, 'Todos tus fangames en un solo lugar.');
  assert.equal(image.getAttribute('alt'), 'Biblioteca de Fangame Launcher');
  assert.equal(label.getAttribute('aria-label'), 'Idioma');
  assert.equal(title.textContent, 'Fangame Launcher: instala, actualiza y juega fangames');
  assert.equal(meta.getAttribute('content'), 'Descripción en español');
  assert.equal(document.documentElement.lang, 'es');
});

test('una clave ausente deja el texto español y avisa por consola', () => {
  const heading = element({ dataset: { i18n: 'hero.title' }, html: 'Texto original' });
  const warnings = [];
  const original = console.warn;
  console.warn = message => warnings.push(message);
  try {
    const { context } = harness({ elements: [heading], dictionary: {} });
    context.FangameI18n.apply('en');
  } finally {
    console.warn = original;
  }
  assert.equal(heading.innerHTML, 'Texto original');
  assert.ok(warnings.some(message => String(message).includes('hero.title')));
});

test('t devuelve el respaldo en español y la traducción en inglés', () => {
  const { context } = harness({ dictionary: { 'hero.detected': 'Detected: {os}' } });
  assert.equal(context.FangameI18n.t('hero.detected', { os: 'Linux' }, 'Detectado: {os}'), 'Detectado: Linux');
  context.FangameI18n.setLang('en');
  assert.equal(context.FangameI18n.t('hero.detected', { os: 'Linux' }, 'Detectado: {os}'), 'Detected: Linux');
  assert.equal(context.FangameI18n.t('hero.ausente', { os: 'Linux' }, 'Respaldo'), 'Respaldo');
});

test('setLang guarda la preferencia y avisa a los callbacks', () => {
  const { context, storage } = harness({ stored: null });
  const cambios = [];
  context.FangameI18n.onChange(lang => cambios.push(lang));
  context.FangameI18n.setLang('en');
  assert.equal(context.FangameI18n.getLang(), 'en');
  assert.equal(storage.get('fangame-site-lang'), 'en');
  assert.deepEqual(cambios, ['en']);
});

test('el conmutador marca el idioma activo con aria-current', () => {
  const es = element({ dataset: { lang: 'es' }, kind: 'switch', attrs: { 'aria-current': 'true' } });
  const en = element({ dataset: { lang: 'en' }, kind: 'switch' });
  const { context } = harness({ elements: [es, en] });
  context.FangameI18n.apply('en');
  assert.equal(es.getAttribute('aria-current'), null);
  assert.equal(en.getAttribute('aria-current'), 'true');
});

test('los enlaces internos reciben el parámetro de idioma', () => {
  const link = element({ dataset: { langLink: 'privacy.html' } });
  const { context } = harness({ elements: [link] });
  context.FangameI18n.apply('en');
  assert.equal(link.href, 'privacy.html?lang=en');
  context.FangameI18n.apply('es');
  assert.equal(link.href, 'privacy.html?lang=es');
});
