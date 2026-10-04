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

test('la línea de comidas dice cuántas noches cobra, igual que la de alojamiento', async () => {
  const p = await abrir();
  p.cambiar('#e', '2026-09-12');
  p.cambiar('#s', '2026-09-15');
  assert.equal(p.$('#l-cama').textContent, 'Alojamiento · 2 personas × 3 noches');
  assert.equal(p.$('#l-com').textContent, 'Media pensión · 2 personas × 3 noches');
  assert.equal(p.$('#v-com').textContent, '189,00 €'); // 31,50 × 2 × 3
  p.marcar('input[name=pen][value=cp]');
  p.cambiar('#ad', '1');
  assert.equal(p.$('#l-com').textContent, 'Media pensión y picnic · 1 persona × 3 noches');
  p.cerrar();
});

test('federado sin número de licencia: avisa y no deja confirmar', async () => {
  const p = await abrir();
  p.marcar('input[name=tar][value=fed]');
  assert.equal(p.$('.cta').disabled, true);
  assert.equal(p.$('#aviso-licencia').hidden, false);
  // el precio federado se sigue mostrando: el aviso no esconde el ahorro
  assert.equal(p.$('#v-cama').textContent, '34,00 €');
  p.cambiar('#licencia', 'AND-0000');
  assert.equal(p.$('.cta').disabled, false);
  assert.equal(p.$('#aviso-licencia').hidden, true);
  p.marcar('input[name=tar][value=gen]');
  p.cambiar('#licencia', '');
  assert.equal(p.$('.cta').disabled, false);
  assert.equal(p.$('#aviso-licencia').hidden, true);
  p.cerrar();
});

test('campos con error quedan marcados aria-invalid y enlazados a su aviso', async () => {
  const p = await abrir();
  assert.equal(p.$('#s').getAttribute('aria-invalid'), 'false');
  assert.equal(p.$('#s').getAttribute('aria-describedby'), 'aviso-fechas');
  assert.equal(p.$('#e').getAttribute('aria-describedby'), 'aviso-fechas');
  assert.equal(p.$('#licencia').getAttribute('aria-describedby'), 'aviso-licencia');

  p.cambiar('#e', '2026-09-12');
  p.cambiar('#s', '2026-09-11');
  assert.equal(p.$('#e').getAttribute('aria-invalid'), 'true');
  assert.equal(p.$('#s').getAttribute('aria-invalid'), 'true');
  p.cambiar('#s', '2026-09-14');
  assert.equal(p.$('#s').getAttribute('aria-invalid'), 'false');

  p.marcar('input[name=tar][value=fed]');
  assert.equal(p.$('#licencia').getAttribute('aria-invalid'), 'true');
  p.cambiar('#licencia', 'AND-0000');
  assert.equal(p.$('#licencia').getAttribute('aria-invalid'), 'false');
  p.cerrar();
});

test('las fechas por defecto son mañana y pasado, nunca un día ya pasado', async () => {
  const p = await abrir({ hoy: '2026-10-04' });
  assert.equal(p.$('#e').value, '2026-10-05');
  assert.equal(p.$('#s').value, '2026-10-06');
  assert.equal(p.$('#e').min, '2026-10-04');
  assert.equal(p.$('#v-tot').textContent, '113,00 €');
  p.cerrar();
});
