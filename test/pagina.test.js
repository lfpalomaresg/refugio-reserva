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

test('totales de cuatro cifras se muestran con punto de miles', async () => {
  const p = await abrir();
  p.cambiar('#ad', '4');
  p.cambiar('#ni', '2');
  p.cambiar('#e', '2026-09-12');
  p.cambiar('#s', '2026-09-16');
  // cama (4×25 + 2×9) × 4 = 472 · comidas 31,50 × 6 × 4 = 756
  assert.equal(p.$('#v-com').textContent, '756,00 €');
  assert.equal(p.$('#v-tot').textContent, '1.228,00 €');
  p.cerrar();
});
