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
