const test = require('node:test');
const assert = require('node:assert/strict');
const { abrir } = require('./helpers/pagina');

test('estado inicial: 2 adultos, general, media pensión, 1 noche = 113,00 €', async () => {
  const p = await abrir();
  assert.equal(p.$('#v-tot').textContent, '113,00 €');
  p.cerrar();
});

test('salida igual o anterior a la entrada: avisa y no deja confirmar (no cobra 1 noche fantasma)', async () => {
  const p = await abrir();
  p.cambiar('#e', '2026-09-15');
  p.cambiar('#s', '2026-09-13');
  assert.equal(p.$('#aviso-fechas').hidden, false);
  assert.match(p.$('#aviso-fechas').textContent, /posterior/);
  assert.equal(p.$('.cta').disabled, true);
  assert.equal(p.$('#v-tot').textContent, '—');
  p.cambiar('#s', '2026-09-17');
  assert.equal(p.$('#aviso-fechas').hidden, true);
  assert.equal(p.$('.cta').disabled, false);
  assert.equal(p.$('#v-tot').textContent, '226,00 €');
  p.cerrar();
});
