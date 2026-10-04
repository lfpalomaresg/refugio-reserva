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
  assert.equal(p.$('#confirmar').disabled, true);
  assert.equal(p.$('#v-tot').textContent, '—');
  p.cambiar('#s', '2026-09-17');
  assert.equal(p.$('#aviso-fechas').hidden, true);
  assert.equal(p.$('#confirmar').disabled, false);
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
  assert.equal(p.$('#confirmar').disabled, true);
  assert.equal(p.$('#aviso-licencia').hidden, false);
  // el precio federado se sigue mostrando: el aviso no esconde el ahorro
  assert.equal(p.$('#v-cama').textContent, '34,00 €');
  p.cambiar('#licencia', 'AND-0000');
  assert.equal(p.$('#confirmar').disabled, false);
  assert.equal(p.$('#aviso-licencia').hidden, true);
  p.marcar('input[name=tar][value=gen]');
  p.cambiar('#licencia', '');
  assert.equal(p.$('#confirmar').disabled, false);
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

test('entrada en el pasado: aviso propio, no deja confirmar', async () => {
  const p = await abrir({ hoy: '2026-10-04' });
  p.cambiar('#e', '2026-10-01');
  p.cambiar('#s', '2026-10-03');
  assert.equal(p.$('#aviso-fechas').hidden, false);
  assert.match(p.$('#aviso-fechas').textContent, /anterior a hoy/);
  assert.equal(p.$('#confirmar').disabled, true);
  assert.equal(p.$('#v-tot').textContent, '—');
  p.cambiar('#e', '2026-10-10');
  p.cambiar('#s', '2026-10-08');
  assert.match(p.$('#aviso-fechas').textContent, /posterior/);
  p.cerrar();
});

test('la salida mínima sigue a la entrada (entrada + 1 día)', async () => {
  const p = await abrir({ hoy: '2026-10-04' });
  assert.equal(p.$('#s').min, '2026-10-06');
  p.cambiar('#e', '2026-10-20');
  assert.equal(p.$('#s').min, '2026-10-21');
  p.cerrar();
});

test('mover la entrada más allá de la salida arrastra la salida y conserva las noches', async () => {
  const p = await abrir({ hoy: '2026-10-04' });
  p.cambiar('#e', '2026-10-05');
  p.cambiar('#s', '2026-10-08'); // 3 noches
  p.cambiar('#e', '2026-10-10');
  assert.equal(p.$('#s').value, '2026-10-13');
  assert.equal(p.$('#aviso-fechas').hidden, true);
  assert.equal(p.$('#l-cama').textContent, 'Alojamiento · 2 personas × 3 noches');
  // si la salida sigue siendo posterior, no se toca
  p.cambiar('#e', '2026-10-11');
  assert.equal(p.$('#s').value, '2026-10-13');
  p.cerrar();
});

test('los valores a medias que se teclean en la entrada no cambian las noches a conservar', async () => {
  const p = await abrir({ hoy: '2026-10-04' });
  p.cambiar('#e', '2026-10-05');
  p.cambiar('#s', '2026-10-08'); // 3 noches
  p.teclear('#e', '2026-10-01');  // estado intermedio: daría 7 noches
  p.teclear('#e', '0002-10-10');  // año a medio escribir
  p.cambiar('#e', '2026-10-10');
  assert.equal(p.$('#s').value, '2026-10-13');
  p.cerrar();
});

test('Confirmar muestra el resumen de la maqueta sin enviar nada a ningún sitio', async () => {
  const p = await abrir({ hoy: '2026-10-04' });
  assert.equal(p.$('#confirmacion').hidden, true);
  const antes = p.peticionesExternas.length;
  p.$('#confirmar').click();
  const c = p.$('#confirmacion');
  assert.equal(c.hidden, false);
  assert.match(c.textContent, /no se ha enviado/i);
  assert.match(c.textContent, /113,00 €/);
  assert.match(c.textContent, /2 personas × 1 noche/);
  assert.equal(p.peticionesExternas.length, antes);
  // cambiar algo después invalida el resumen: no puede quedar uno con datos viejos
  p.cambiar('#ad', '3');
  assert.equal(c.hidden, true);
  p.cerrar();
});

test('el resumen de Confirmar incluye fechas y tarifa, y vive en una región que se anuncia', async () => {
  const p = await abrir({ hoy: '2026-10-04' });
  const vivo = p.$('#confirmacion').parentElement;
  assert.equal(vivo.getAttribute('role'), 'status');
  assert.equal(vivo.hidden, false); // la región existe siempre; lo que aparece es su contenido
  p.marcar('input[name=tar][value=fed]');
  p.cambiar('#licencia', 'AND-0000');
  p.marcar('input[name=pen][value="0"]');
  p.$('#confirmar').click();
  const txt = p.$('#confirmacion').textContent;
  assert.match(txt, /lunes 5 de octubre → martes 6 de octubre/);
  assert.match(txt, /Tarifa federado/);
  assert.match(txt, /34,00 €/);
  assert.doesNotMatch(txt, /pensión/); // solo dormir: sin línea de comidas
  p.cerrar();
});

test('los precios por noche de las tarifas salen de la tabla de precios, no del HTML', async () => {
  const p = await abrir();
  assert.equal(p.$('#p-gen').textContent, '25 € / noche');
  assert.equal(p.$('#p-fed').textContent, '17 € / noche');
  p.w.Reserva.PRECIOS.gen.cama = 27; // si cambia la tarifa, la etiqueta la sigue
  p.cambiar('#ad', '1');
  assert.equal(p.$('#p-gen').textContent, '27 € / noche');
  p.cerrar();
});
