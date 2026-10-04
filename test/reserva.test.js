const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../reserva.js');

// Valores esperados calculados a mano con las tarifas publicadas del refugio:
// general cama 25 / menor 9 · cena 21 · desayuno 10,50 · picnic 15
// federado cama 17 / menor 6 · cena 18 · desayuno 8,50 · picnic 14

test('2 adultos, general, media pensión, 1 noche = 50 + 63 = 113', () => {
  const r = R.calcular({ adultos: 2, menores: 0, tarifa: 'gen', pension: 'md', noches: 1 });
  assert.equal(r.cama, 50);
  assert.equal(r.comidas, 63);
  assert.equal(r.total, 113);
});

test('1 adulto + 2 menores, federado, MP y picnic, 2 noches = 58 + 243 = 301', () => {
  const r = R.calcular({ adultos: 1, menores: 2, tarifa: 'fed', pension: 'cp', noches: 2 });
  assert.equal(r.cama, 58);
  assert.equal(r.comidas, 243);
  assert.equal(r.total, 301);
});

test('solo dormir no suma comidas', () => {
  const r = R.calcular({ adultos: 3, menores: 1, tarifa: 'gen', pension: '0', noches: 1 });
  assert.equal(r.cama, 84);
  assert.equal(r.comidas, 0);
  assert.equal(r.total, 84);
});

test('contarNoches cuenta noches entre dos fechas ISO', () => {
  assert.equal(R.contarNoches('2026-09-12', '2026-09-15'), 3);
  assert.equal(R.contarNoches('2026-10-24', '2026-10-26'), 2); // cruza el cambio de hora
});

test('contarNoches devuelve 0 si la salida no es posterior o falta una fecha', () => {
  assert.equal(R.contarNoches('2026-09-12', '2026-09-12'), 0);
  assert.equal(R.contarNoches('2026-09-15', '2026-09-12'), 0);
  assert.equal(R.contarNoches('', '2026-09-12'), 0);
  assert.equal(R.contarNoches('2026-09-12', 'basura'), 0);
  assert.equal(R.contarNoches('2026-02-30', '2026-03-02'), 0); // fecha imposible
});

test('eur agrupa miles siempre (es-ES no agrupa 4 cifras con toLocaleString)', () => {
  assert.equal(R.eur(0), '0,00 €');
  assert.equal(R.eur(31.5), '31,50 €');
  assert.equal(R.eur(1228), '1.228,00 €');
  assert.equal(R.eur(12500.5), '12.500,50 €');
  assert.equal(R.eur(-5), '-5,00 €');
  assert.equal(R.eur(-0), '0,00 €');
});

test('cuenta: número con singular o plural', () => {
  assert.equal(R.cuenta(1, 'noche', 'noches'), '1 noche');
  assert.equal(R.cuenta(3, 'noche', 'noches'), '3 noches');
  assert.equal(R.cuenta(1, 'persona', 'personas'), '1 persona');
});
