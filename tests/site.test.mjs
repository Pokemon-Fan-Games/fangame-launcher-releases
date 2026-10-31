import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8');

test('app and maker screenshots have accessible full-size links and local PNG assets', async () => {
  assert.ok(html.includes('href="#capturas"'));
  for (const name of ['biblioteca', 'catalogo', 'ficha', 'configuracion', 'makers-publicacion', 'makers-imagenes']) {
    const path = `assets/screenshots/${name}.png`;
    assert.ok(html.includes(`href="${path}"`), `Missing original link: ${name}`);
    assert.match(html, new RegExp(`<img[^>]+src="${path}"[^>]+alt="[^"]+"`));
    const png = await readFile(new URL(`../docs/${path}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
  }
});

test('copy describes save limitations and current library features', () => {
  assert.doesNotMatch(html, /sin perder tus partidas|sin dejar restos|se actualiza sola/);
  for (const text of ['juegos externos', 'Proton', 'Wine', 'compatibilidad', 'Novedades']) {
    assert.ok(html.includes(text), `Missing current information: ${text}`);
  }
});

test('FAQ explicitly includes free maker publishing', () => {
  const answer = html.match(/<summary[^>]*>¿Es gratis\?<\/summary><p[^>]*>(.*?)<\/p>/)?.[1];
  assert.match(answer, /publicar.*gratis/i);
  assert.match(answer, /makers/i);
});

test('no empty screenshot placeholders or malformed macOS code', () => {
  assert.doesNotMatch(html, /data-shot=/);
  assert.equal((html.match(/<code>/g) || []).length, (html.match(/<\/code>/g) || []).length);
});

const enDictionary = await readFile(new URL('../docs/locales/en.js', import.meta.url), 'utf8');

test('cada clave usada en el sitio está traducida y no sobran claves', async () => {
  const sources = [];
  for (const page of ['index.html', 'privacy.html']) {
    sources.push(await readFile(new URL(`../docs/${page}`, import.meta.url), 'utf8'));
  }
  sources.push(await readFile(new URL('../docs/app.js', import.meta.url), 'utf8'));
  const used = new Set();
  for (const source of sources) {
    for (const match of source.matchAll(/data-i18n(?:-alt|-aria|-title|-content)?="([^"]+)"/g)) used.add(match[1]);
    for (const match of source.matchAll(/i18n\.t\("([^"]+)"/g)) used.add(match[1]);
  }
  const defined = new Set([...enDictionary.matchAll(/^\s*"([^"]+)":/gm)].map(match => match[1]));
  for (const key of used) assert.ok(defined.has(key), `Missing English translation: ${key}`);
  for (const key of defined) assert.ok(used.has(key), `Unused English translation: ${key}`);
  assert.ok(used.size > 50, 'The site should expose a substantial amount of translatable text');
});

test('las traducciones inglesas no están vacías', () => {
  const entries = [...enDictionary.matchAll(/^\s*"([^"]+)":\s*"([^"]*)",?$/gm)];
  assert.ok(entries.length > 50);
  for (const [, key, value] of entries) assert.ok(value.trim().length > 0, `Empty translation: ${key}`);
});

const privacy = await readFile(new URL('../docs/privacy.html', import.meta.url), 'utf8');
const privacyPolicy = await readFile(new URL('../PRIVACY', import.meta.url), 'utf8');

test('la página de privacidad replica el documento del repositorio', () => {
  const plain = text => text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const page = plain(privacy);
  const [spanish] = privacyPolicy.split(/^## /m).slice(1);
  const blocks = spanish
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => plain(line.replace(/^- /, '')));
  assert.ok(blocks.length >= 8, 'The policy file should expose enough content to compare');
  for (const block of blocks) {
    assert.ok(page.includes(block), `Privacy page is missing: ${block.slice(0, 60)}`);
  }
});

test('la página de privacidad ofrece el conmutador y el enlace de vuelta', () => {
  assert.ok(privacy.includes('data-lang-switch'));
  assert.ok(privacy.includes('data-lang="en"'));
  assert.ok(privacy.includes('data-lang-link="index.html"'));
});

test('makers and downloads are announced as coming soon with no live links', () => {
  assert.equal((html.match(/data-i18n="common.soon"/g) || []).length, 5);
  assert.doesNotMatch(html, /dpserver\.es\/portal|data-ext=|releases\/download/);
  assert.doesNotMatch(html, /href="https:\/\/github\.com\/[^"]+\/releases"/);
});
