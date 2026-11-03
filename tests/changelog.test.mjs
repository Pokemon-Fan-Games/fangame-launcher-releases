import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const script = await readFile(new URL('../docs/changelog.js', import.meta.url), 'utf8');

function harness() {
  const doc = {
    createElement: tag => ({ tag, children: [], append(...children) { this.children.push(...children); } }),
    createTextNode: text => ({ textContent: text }),
  };
  const context = { document: { ...doc, querySelector: () => null }, FangameI18n: { getLang: () => 'es', onChange() {} } };
  vm.runInNewContext(script, context);
  return { api: context.FangameChangelog, doc };
}

test('release language falls back to English for missing or blank translations', () => {
  const { api } = harness();
  assert.equal(api.selectNotes({ en: '- English', es: '- Español' }, 'es'), '- Español');
  assert.equal(api.selectNotes({ en: '- English', es: '' }, 'es'), '- English');
  assert.equal(api.selectNotes({ en: '- English' }, 'es'), '- English');
  assert.equal(api.notesForLanguage('- English', '', 'en'), '- English');
  assert.equal(api.notesForLanguage('- English', '', 'es'), '- English');
  assert.equal(api.notesForLanguage('- English', '- Español', 'es'), '- Español');
});

test('release markdown builds safe text nodes, lists, and supported inline emphasis', () => {
  const { api, doc } = harness();
  const root = doc.createElement('div');
  api.renderMarkdown('- **bold** and *italic* `code` <img src=x>', root, doc);
  assert.equal(root.children[0].tag, 'ul');
  const item = root.children[0].children[0];
  assert.deepEqual(item.children.map(node => node.tag || node.textContent), [
    'strong', ' and ', 'em', ' ', 'code', ' <img src=x>',
  ]);
  assert.equal(item.children[0].textContent, 'bold');
  assert.equal(item.children[2].textContent, 'italic');
  assert.equal(item.children.some(node => node.tag === 'img'), false);
});

test('changelog links exist in both navigation and footer, with translated page labels', async () => {
  const index = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8');
  const page = await readFile(new URL('../docs/changelog.html', import.meta.url), 'utf8');
  const en = await readFile(new URL('../docs/locales/en.js', import.meta.url), 'utf8');
  const scriptSource = await readFile(new URL('../docs/changelog.js', import.meta.url), 'utf8');
  assert.match(index, /href="changelog\.html"/);
  const footer = index.match(/<footer>([\s\S]*?)<\/footer>/)?.[1] || '';
  assert.match(footer, /href="changelog\.html"/);
  assert.match(page, /href="index\.html"/);
  assert.match(page, /data-lang-switch/);
  assert.match(page, /role="status"/);
  assert.match(scriptSource, /releases\/index\.json/);
  assert.match(en, /"changelog\./);
});


test('every indexed version has English and Spanish notes', async () => {
  const versions = JSON.parse(await readFile(new URL('../docs/releases/index.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(versions));
  for (const version of versions) {
    for (const language of ['en', 'es']) {
      const suffix = language === 'en' ? '' : `.${language}`;
      const note = await readFile(new URL(`../docs/releases/${version}${suffix}.md`, import.meta.url), 'utf8');
      assert.ok(note.trim(), `Missing ${language} notes for ${version}`);
    }
  }
});
