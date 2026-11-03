(() => {
  const versionPattern = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;

  function selectNotes(notes, language) {
    return notes[language]?.trim() ? notes[language] : notes.en || '';
  }

  function notesForLanguage(english, translated, language) {
    return language === 'en' ? english : selectNotes({ en: english, [language]: translated }, language);
  }

  function appendInline(parent, source, doc) {
    const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
    let offset = 0;
    for (const match of source.matchAll(pattern)) {
      if (match.index > offset) parent.append(doc.createTextNode(source.slice(offset, match.index)));
      const element = doc.createElement(match[1] ? 'strong' : match[2] ? 'em' : 'code');
      element.textContent = match[1] || match[2] || match[3];
      parent.append(element);
      offset = match.index + match[0].length;
    }
    if (offset < source.length) parent.append(doc.createTextNode(source.slice(offset)));
  }

  function renderMarkdown(source, target, doc = document) {
    let list;
    for (const line of source.split(/\r?\n/)) {
      if (!line.trim()) {
        list = undefined;
      } else if (line.startsWith('- ')) {
        if (!list) {
          list = doc.createElement('ul');
          target.append(list);
        }
        const item = doc.createElement('li');
        appendInline(item, line.slice(2), doc);
        list.append(item);
      } else {
        list = undefined;
        const paragraph = doc.createElement('p');
        appendInline(paragraph, line, doc);
        target.append(paragraph);
      }
    }
  }

  async function readNote(version, language) {
    const response = await fetch(`releases/${version}${language === 'en' ? '' : `.${language}`}.md`);
    return response.ok ? response.text() : '';
  }

  let renderGeneration = 0;
  async function render() {
    const generation = ++renderGeneration;
    const root = document.querySelector('#release-list');
    const status = document.querySelector('#release-status');
    if (!root) return;
    root.replaceChildren();
    if (status) {
      status.hidden = false;
      status.textContent = FangameI18n.t("changelog.loading", undefined, 'Cargando novedades…');
    }
    try {
      const response = await fetch('releases/index.json');
      if (!response.ok) throw new Error('index');
      const versions = await response.json();
      if (!Array.isArray(versions) || versions.some(version => typeof version !== 'string' || !versionPattern.test(version))) throw new Error('index');
      if (generation !== renderGeneration) return;
      for (const version of versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))) {
        const language = FangameI18n.getLang();
        const [english, translated] = await Promise.all([
          readNote(version, 'en'),
          language === 'en' ? '' : readNote(version, language),
        ]);
        if (generation !== renderGeneration) return;
        if (!english.trim()) continue;
        const article = document.createElement('article');
        article.className = 'release-entry';
        const heading = document.createElement('h2');
        heading.textContent = version;
        article.append(heading);
        const notes = document.createElement('div');
        renderMarkdown(notesForLanguage(english, translated, language), notes);
        article.append(notes);
        root.append(article);
      }
      if (status) {
        status.hidden = root.children.length > 0;
        if (status.hidden === false) status.textContent = FangameI18n.t("changelog.empty", undefined, 'Todavía no hay novedades disponibles.');
      }
    } catch {
      if (status) {
        status.hidden = false;
        status.textContent = FangameI18n.t("changelog.error", undefined, 'No se pudieron cargar las novedades.');
      }
    }
  }

  globalThis.FangameChangelog = { selectNotes, notesForLanguage, renderMarkdown };
  if (typeof document !== 'undefined') {
    render();
    FangameI18n.onChange(render);
  }
})();
