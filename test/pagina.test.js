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

test('con tarifa federada aparece la línea de ahorro; con general, no', async () => {
  const p = await abrir();
  assert.equal(p.$('#l-ahorro-fila').hidden, true);
  p.marcar('input[name=tar][value=fed]');
  assert.equal(p.$('#l-ahorro-fila').hidden, false);
  assert.equal(p.$('#v-ahorro').textContent, '26,00 €');
  assert.equal(p.$('#v-tot').textContent, '87,00 €');
  p.marcar('input[name=tar][value=gen]');
  assert.equal(p.$('#l-ahorro-fila').hidden, true);
  p.cerrar();
});

test('abre con el escenario de la URL (enlace compartible)', async () => {
  const p = await abrir({ hoy: '2026-10-04', query: '?e=2026-10-10&s=2026-10-12&ad=3&ni=1&tar=fed&pen=cp' });
  assert.equal(p.$('#e').value, '2026-10-10');
  assert.equal(p.$('#s').value, '2026-10-12');
  assert.equal(p.$('#ad').value, '3');
  assert.equal(p.$('#ni').value, '1');
  assert.equal(p.$('input[name=tar][value=fed]').checked, true);
  assert.equal(p.$('input[name=pen][value=cp]').checked, true);
  // cama (3×17 + 6) × 2 = 114 · comidas 40,50 × 4 × 2 = 324
  assert.equal(p.$('#v-tot').textContent, '438,00 €');
  p.cerrar();
});

test('URL con fechas pasadas o basura: se ignoran y quedan las de por defecto', async () => {
  const p = await abrir({ hoy: '2026-10-04', query: '?e=2026-09-01&s=2026-09-03&ad=99&tar=vip' });
  assert.equal(p.$('#e').value, '2026-10-05');
  assert.equal(p.$('#s').value, '2026-10-06');
  assert.equal(p.$('#ad').value, '2');
  assert.equal(p.$('input[name=tar][value=gen]').checked, true);
  p.cerrar();
});

test('cada cambio actualiza la URL, que nunca lleva la licencia', async () => {
  const p = await abrir({ hoy: '2026-10-04' });
  p.cambiar('#ad', '4');
  p.marcar('input[name=tar][value=fed]');
  p.cambiar('#licencia', 'AND-0000');
  const q = new URLSearchParams(p.w.location.search);
  assert.equal(q.get('ad'), '4');
  assert.equal(q.get('tar'), 'fed');
  assert.equal(q.get('e'), '2026-10-05');
  assert.doesNotMatch(p.w.location.href, /AND-0000|licencia/);
  p.cerrar();
});

test('URL con solo la entrada, o con salida no posterior: fechas por defecto', async () => {
  for (const query of ['?e=2026-10-10', '?e=2026-10-10&s=2026-10-10']) {
    const p = await abrir({ hoy: '2026-10-04', query });
    assert.equal(p.$('#e').value, '2026-10-05', query);
    assert.equal(p.$('#s').value, '2026-10-06', query);
    p.cerrar();
  }
});

test('el total se anuncia a lectores de pantalla con un texto completo', async () => {
  const p = await abrir();
  const vivo = p.$('#total-vivo');
  assert.equal(vivo.getAttribute('aria-live'), 'polite');
  assert.equal(vivo.textContent, 'Total: 113,00 €');
  p.cambiar('#ad', '1');
  assert.equal(vivo.textContent, 'Total: 56,50 €'); // 25 + 31,50
  p.cambiar('#s', p.$('#e').value);
  assert.equal(vivo.textContent, 'Revisa las fechas para ver el total.');
  p.cerrar();
});

test('teclear la licencia no reescribe el total anunciado si no cambia (sin spam al lector)', async () => {
  const p = await abrir();
  p.marcar('input[name=tar][value=fed]');
  let cambios = 0;
  new p.w.MutationObserver(m => { cambios += m.length; })
    .observe(p.$('#total-vivo'), { childList: true, characterData: true, subtree: true });
  for (const parcial of ['A', 'AN', 'AND']) p.teclear('#licencia', parcial);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(cambios, 0);
  p.cerrar();
});

test('si el cálculo falla, no queda un total viejo ni se puede confirmar', async () => {
  const p = await abrir({ permitirErrores: true });
  const raro = p.d.createElement('option');
  raro.value = ''; raro.textContent = '—';
  p.$('#ad').append(raro);
  p.cambiar('#ad', ''); // 0 adultos: calcular lanza RangeError
  assert.equal(p.$('#v-tot').textContent, '—');
  assert.equal(p.$('#confirmar').disabled, true);
  assert.equal(p.$('#total-vivo').textContent, 'No se puede calcular el total.');
  assert.equal(p.erroresConsola.length, 1);
  assert.ok(p.erroresConsola[0][0] instanceof p.w.RangeError, 'el fallo esperado es el RangeError de calcular');
  p.cambiar('#ad', '2');
  assert.equal(p.$('#v-tot').textContent, '113,00 €');
  assert.equal(p.$('#confirmar').disabled, false);
  p.cerrar();
});
