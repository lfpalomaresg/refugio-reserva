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

test('validar: reserva general con fechas correctas no tiene errores', () => {
  assert.deepEqual(R.validar({ tarifa: 'gen', licencia: '', noches: 2 }), []);
});

test('validar: federado sin licencia (o solo espacios) es error; con licencia, no', () => {
  assert.deepEqual(R.validar({ tarifa: 'fed', licencia: '', noches: 1 }), ['licencia']);
  assert.deepEqual(R.validar({ tarifa: 'fed', licencia: '   ', noches: 1 }), ['licencia']);
  assert.deepEqual(R.validar({ tarifa: 'fed', licencia: 'AND-0000', noches: 1 }), []);
});

test('validar: sin noches válidas es error de fechas', () => {
  assert.deepEqual(R.validar({ tarifa: 'fed', licencia: '', noches: 0 }), ['fechas', 'licencia']);
});

test('hoyISO usa la fecha local, no la UTC', () => {
  assert.equal(R.hoyISO(new Date(2026, 9, 4, 0, 30)), '2026-10-04');
  assert.equal(R.hoyISO(new Date(2026, 0, 9, 23, 59)), '2026-01-09');
});

test('sumarDias cruza meses, años y febrero bisiesto', () => {
  assert.equal(R.sumarDias('2026-10-04', 1), '2026-10-05');
  assert.equal(R.sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(R.sumarDias('2028-02-28', 1), '2028-02-29');
  assert.equal(R.sumarDias('2026-03-01', -1), '2026-02-28');
});

test('sumarDias con fecha inválida devuelve null (no una fecha de 1970)', () => {
  assert.equal(R.sumarDias('basura', 1), null);
  assert.equal(R.sumarDias('', 1), null);
});

test('validar: entrada anterior a hoy es error "pasada"; hoy mismo vale', () => {
  const base = { tarifa: 'gen', licencia: '', noches: 1, hoy: '2026-10-04' };
  assert.deepEqual(R.validar({ ...base, entrada: '2026-10-03' }), ['pasada']);
  assert.deepEqual(R.validar({ ...base, entrada: '2026-10-04' }), []);
  assert.deepEqual(R.validar({ ...base, entrada: '2026-10-03', noches: 0 }), ['pasada']); // pasada manda
  assert.deepEqual(R.validar({ ...base, entrada: '', noches: 0 }), ['fechas']);
});

test('ajustarSalida: solo mueve la salida si ya no es posterior a la entrada', () => {
  assert.equal(R.ajustarSalida('2026-10-10', '2026-10-08', 3), '2026-10-13');
  assert.equal(R.ajustarSalida('2026-10-10', '2026-10-10', 2), '2026-10-12');
  assert.equal(R.ajustarSalida('2026-10-10', '2026-10-12', 5), '2026-10-12');
  assert.equal(R.ajustarSalida('2026-10-10', '', 0), '2026-10-11'); // sin noches previas: 1
  assert.equal(R.ajustarSalida('', '2026-10-12', 2), '2026-10-12'); // entrada inválida: no toca
});

test('fechaLarga escribe la fecha en castellano, sin depender del idioma del navegador', () => {
  assert.equal(R.fechaLarga('2026-10-05'), 'lunes 5 de octubre');
  assert.equal(R.fechaLarga('2027-01-01'), 'viernes 1 de enero');
  assert.equal(R.fechaLarga('2028-02-29'), 'martes 29 de febrero');
  assert.equal(R.fechaLarga('basura'), '');
});

test('eurCorto omite los céntimos solo si son cero', () => {
  assert.equal(R.eurCorto(25), '25 €');
  assert.equal(R.eurCorto(10.5), '10,50 €');
  assert.equal(R.eurCorto(1250), '1.250 €');
  assert.equal(R.eurCorto(0), '0 €');
});

test('ahorroFederado: diferencia entre tarifa general y federada para la misma reserva', () => {
  // general 113 (50 + 63) · federado 87 (34 + 2×26,50)
  assert.equal(R.ahorroFederado({ adultos: 2, menores: 0, pension: 'md', noches: 1 }), 26);
  // 1 adulto + 1 menor, solo dormir, 2 noches: general (25+9)×2=68 · federado (17+6)×2=46
  assert.equal(R.ahorroFederado({ adultos: 1, menores: 1, pension: '0', noches: 2 }), 22);
});
