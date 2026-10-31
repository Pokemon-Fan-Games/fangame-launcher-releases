import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const run = promisify(execFile);
const session = `fangame-gallery-${process.pid}`;
const browser = (...args) => run('agent-browser', ['--session', session, ...args]);
const base = process.env.SITE_URL || 'http://127.0.0.1:8768/';
const site = `${base}?lang=es`;

test('screenshots close with the button, Escape and backdrop without leaving the page', async () => {
  try {
    await browser('open', site);
    await browser('wait', '--load', 'networkidle');
    await browser('set', 'viewport', '1440', '1000');
    for (const name of ['biblioteca', 'catalogo', 'ficha', 'configuracion', 'makers-publicacion', 'makers-imagenes']) {
      await browser('click', `.screen a[href="assets/screenshots/${name}.png"]`);
      await browser('eval', `if(!document.querySelector('dialog[open] img[src="assets/screenshots/${name}.png"]'))throw Error('Screenshot did not open in a dialog')`);
      await browser('wait', '--fn', "document.querySelector('dialog[open] img')?.complete && document.querySelector('dialog[open] img')?.naturalWidth > 0");
      await browser('eval', "if(document.activeElement?.textContent.trim()!=='Cerrar')throw Error('Close button did not receive focus')");
      await browser('click', '#preview-close');
      await browser('eval', "if(document.querySelector('dialog[open]'))throw Error('Dialog remained open');if(!document.activeElement.matches('.screen a'))throw Error('Focus was not restored')");
      const { stdout } = await browser('get', 'url');
      if (stdout.trim() !== site) throw Error('Opening a screenshot navigated away');
    }
    await browser('set', 'viewport', '390', '844');
    await browser('click', '.screen a');
    await browser('eval', "const r=document.querySelector('dialog[open]').getBoundingClientRect();if(r.width>innerWidth||r.height>innerHeight)throw Error('Dialog exceeds viewport')");
    await browser('press', 'Escape');
    await browser('eval', "if(document.querySelector('dialog[open]'))throw Error('Escape did not close the dialog')");
    await browser('click', '.screen a');
    await browser('mouse', 'move', '1', '1');
    await browser('mouse', 'down');
    await browser('mouse', 'up');
    await browser('eval', "if(document.querySelector('dialog[open]'))throw Error('Backdrop did not close the dialog')");
  } finally {
    await browser('close');
  }
});

test('native window captures hide their bottom edge, but portal captures are not cropped', async () => {
  try {
    await browser('open', site);
    await browser('wait', '--load', 'networkidle');
    for (const name of ['biblioteca', 'makers-publicacion']) {
      await browser('click', `.screen a[href="assets/screenshots/${name}.png"]`);
      await browser('eval', `if((getComputedStyle(document.getElementById('preview-image')).clipPath !== 'none') !== ${name === 'biblioteca'})throw Error('Incorrect screenshot edge treatment')`);
      await browser('click', '#preview-close');
    }
  } finally {
    await browser('close');
  }
});

test('download cards stay compact on desktop and fit narrow screens', async () => {
  try {
    await browser('open', site);
    for (const width of [320, 390, 768, 1440]) {
      await browser('set', 'viewport', String(width), '1000');
      await browser('eval', "if(document.documentElement.scrollWidth>innerWidth)throw Error('Horizontal page overflow'); if(innerWidth===1440&&[...document.querySelectorAll('.dl .card')].some(c=>c.getBoundingClientRect().height>360))throw Error('Download cards are too tall')");
    }
  } finally {
    await browser('close');
  }
});

test('the language switch swaps the whole page and keeps the layout intact', async () => {
  try {
    await browser('open', site);
    await browser('wait', '--load', 'networkidle');
    await browser('set', 'viewport', '1440', '1000');
    await browser('eval', "if(document.documentElement.lang!=='es')throw Error('Spanish is not the default')");
    const text = async code => (await browser('eval', code)).stdout;
    const spanish = await text("document.querySelector('h1').textContent");
    await browser('click', '.lang-switch button[data-lang="en"]');
    await browser('eval', "if(document.documentElement.lang!=='en')throw Error('The page did not switch to English')");
    const english = await text("document.querySelector('h1').textContent");
    if (english === spanish) throw Error('The headline did not change');
    if (!/All your fan games/.test(english)) throw Error(`Unexpected English headline: ${english}`);
    if (!/Fangame Launcher: install/.test(await text("document.title"))) throw Error('The document title was not translated');
    if (!/Coming soon/.test(await text("document.querySelector('#descargar h2').textContent"))) throw Error('The downloads heading was not translated');
    for (const width of [320, 390, 768, 1440]) {
      await browser('set', 'viewport', String(width), '1000');
      await browser('eval', "if(document.documentElement.scrollWidth>innerWidth)throw Error('Horizontal page overflow')");
    }
    await browser('click', '.lang-switch button[data-lang="es"]');
    await browser('eval', "if(document.documentElement.lang!=='es')throw Error('The page did not switch back to Spanish')");
  } finally {
    await browser('close');
  }
});

test('the privacy page is translated and keeps the switch', async () => {
  try {
    await browser('open', `${base}privacy.html`);
    await browser('wait', '--load', 'networkidle');
    await browser('eval', "if(!document.querySelector('h1'))throw Error('The privacy page did not render')");
    await browser('click', '.lang-switch button[data-lang="en"]');
    await browser('eval', "if(document.documentElement.lang!=='en')throw Error('The privacy page did not switch to English')");
    await browser('eval', "if(!/Privacy policy/.test(document.querySelector('h1').textContent))throw Error('The privacy heading was not translated')");
    await browser('eval', "if(!/Google API Services User Data Policy/.test(document.body.textContent))throw Error('The English policy text is missing')");
    await browser('eval', "if(document.documentElement.scrollWidth>innerWidth)throw Error('Horizontal page overflow')");
  } finally {
    await browser('close');
  }
});
