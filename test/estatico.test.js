// Invariantes del HTML publicado (sin ejecutar scripts).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const doc = new JSDOM(html).window.document;

test('no hay JavaScript inline: todo script es un fichero propio (permite CSP sin unsafe-inline)', () => {
  const scripts = [...doc.querySelectorAll('script')];
  assert.ok(scripts.length > 0);
  for (const s of scripts) {
    assert.ok(s.src, 'script inline encontrado');
    assert.equal(s.textContent.trim(), '');
    assert.ok(!/^https?:|^\/\//.test(s.getAttribute('src')), 'script de un origen externo: ' + s.src);
    assert.ok(fs.existsSync(path.join(__dirname, '..', s.getAttribute('src'))), 'no existe ' + s.src);
  }
  for (const el of doc.querySelectorAll('*')) {
    for (const a of el.attributes) assert.ok(!/^on/i.test(a.name), `manejador inline ${a.name} en <${el.localName}>`);
  }
});

function csp() {
  const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
  assert.ok(meta, 'falta la CSP');
  const dirs = {};
  for (const parte of meta.content.split(';')) {
    const [nombre, ...valores] = parte.trim().split(/\s+/);
    if (nombre) dirs[nombre] = valores;
  }
  return dirs;
}

test('CSP estricta: scripts, estilos y fuentes solo propios, sin unsafe-*', () => {
  const d = csp();
  assert.deepEqual(d['default-src'], ["'none'"]);
  assert.deepEqual(d['script-src'], ["'self'"]);
  assert.deepEqual(d['style-src'], ["'self'"]);
  assert.deepEqual(d['font-src'], ["'self'"]);
  assert.deepEqual(d['form-action'], ["'none'"]);
  assert.deepEqual(d['base-uri'], ["'none'"]);
  assert.ok(!/unsafe-/.test(JSON.stringify(d)));
});

test('sin CSS inline (lo exige la CSP) y la hoja propia existe', () => {
  assert.equal(doc.querySelectorAll('style').length, 0);
  assert.equal(doc.querySelectorAll('[style]').length, 0);
  const hojas = [...doc.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href'));
  const propias = hojas.filter(h => !/^https:/.test(h));
  assert.ok(propias.length > 0);
  for (const h of propias) assert.ok(fs.existsSync(path.join(__dirname, '..', h)), 'no existe ' + h);
});

test('la maqueta sigue fuera de buscadores y avisa si no hay JavaScript', () => {
  assert.match(doc.querySelector('meta[name=robots]').content, /noindex/);
  const ns = new JSDOM(html, { runScripts: undefined }).window.document.querySelector('noscript');
  assert.ok(ns, 'falta <noscript>');
  assert.match(ns.textContent, /JavaScript/);
});

test('ningún recurso de terceros: la visita no envía su IP a nadie (fuentes servidas desde el repo)', () => {
  for (const el of doc.querySelectorAll('[src], link[href]')) {
    const url = el.getAttribute('src') || el.getAttribute('href');
    assert.ok(!/^(https?:)?\/\//.test(url), 'recurso externo: ' + url);
  }
  const css = fs.readFileSync(path.join(__dirname, '..', 'estilos.css'), 'utf8');
  const fuentes = [...css.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/["']/g, ''));
  assert.ok(fuentes.length >= 4, 'faltan las @font-face de Montserrat (400, 500, 600, 700)');
  for (const f of fuentes) {
    assert.ok(!/^(https?:)?\/\//.test(f), 'fuente externa: ' + f);
    assert.ok(fs.existsSync(path.join(__dirname, '..', f)), 'no existe ' + f);
  }
});
