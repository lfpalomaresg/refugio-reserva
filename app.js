// Interfaz de la maqueta: lee el formulario, pinta el desglose y guarda el escenario en la URL.
// La lógica de precios y fechas vive en reserva.js (window.Reserva).
'use strict';

const $ = s => document.querySelector(s);
const eur = Reserva.eur;
let nochesPrevias = 1;
let salidaElegida = '';  // la salida que puso el usuario (o la URL / por defecto), no la arrastrada


// Solo toca la región aria-live si el texto cambia: reescribirlo igual hace que algunos lectores lo repitan.
function anuncia(txt){
  if ($('#total-vivo').textContent !== txt) $('#total-vivo').textContent = txt;
}

// La URL refleja el escenario para poder compartirlo. Nunca incluye la licencia.
function guardaEnUrl(){
  const q = Reserva.escribirEstado({
    e: $('#e').value, s: $('#s').value, ad: $('#ad').value, ni: $('#ni').value,
    tar: document.querySelector('input[name=tar]:checked').value,
    pen: document.querySelector('input[name=pen]:checked').value
  });
  try { history.replaceState(null, '', location.pathname + q + location.hash); } catch (e) { /* file:// o límite de llamadas (Safari): la URL deja de actualizarse, nada más */ }
}

// Si el cálculo falla (entrada que Reserva.calcular rechaza), nada de totales viejos ni botón activo.
function pinta(){
  try {
    pintaReserva();
  } catch (err) {
    console.error(err);
    $('#v-cama').textContent = $('#v-com').textContent = $('#v-tot').textContent = '—';
    $('#l-ahorro-fila').hidden = true;
    $('#confirmar').disabled = true;
    anuncia('No se puede calcular el total.');
  }
}

function pintaReserva(){
  $('#confirmacion').hidden = true;
  guardaEnUrl();
  const tar = document.querySelector('input[name=tar]:checked').value;
  const pen = document.querySelector('input[name=pen]:checked').value;
  const p = Reserva.PRECIOS[tar];
  const ad = +$('#ad').value, ni = +$('#ni').value, pax = ad + ni;
  const n = Reserva.contarNoches($('#e').value, $('#s').value);

  $('#lic').hidden = (tar !== 'fed');

  const r = Reserva.calcular({adultos:ad, menores:ni, tarifa:tar, pension:pen, noches:n});
  const porPax = Reserva.comidaPorPersona(p, pen);

  $('#p-gen').textContent = Reserva.eurCorto(Reserva.PRECIOS.gen.cama) + ' / noche';
  $('#p-fed').textContent = Reserva.eurCorto(Reserva.PRECIOS.fed.cama) + ' / noche';
  $('#p-md').textContent = '+' + eur(Reserva.comidaPorPersona(p, 'md'));
  $('#p-cp').textContent = '+' + eur(Reserva.comidaPorPersona(p, 'cp'));

  const hoy = Reserva.hoyISO(new Date());
  $('#s').min = Reserva.sumarDias($('#e').value, 1) || '';
  const errores = Reserva.validar({tarifa:tar, licencia:$('#licencia').value, noches:n,
                                   entrada:$('#e').value, hoy});
  const errFechas = errores.includes('pasada') ? 'pasada' : errores.includes('fechas') ? 'fechas' : null;
  $('#aviso-fechas').hidden = !errFechas;
  $('#aviso-fechas').textContent = errFechas === 'pasada'
    ? 'La entrada no puede ser anterior a hoy.'
    : 'La salida tiene que ser posterior a la entrada.';
  $('#aviso-licencia').hidden = !errores.includes('licencia');
  $('#confirmar').disabled = errores.length > 0;
  const malFechas = String(!!errFechas);
  $('#e').setAttribute('aria-invalid', malFechas);
  $('#s').setAttribute('aria-invalid', malFechas);
  $('#licencia').setAttribute('aria-invalid', String(errores.includes('licencia')));
  if (errFechas){
    $('#v-cama').textContent = $('#v-com').textContent = $('#v-tot').textContent = '—';
    $('#l-ahorro-fila').hidden = true;
    anuncia('Revisa las fechas para ver el total.');
    return;
  }

  const quien = Reserva.cuenta(pax, 'persona', 'personas') + ' × ' + Reserva.cuenta(n, 'noche', 'noches');
  $('#l-cama').textContent = 'Alojamiento · ' + quien;
  $('#v-cama').textContent = eur(r.cama);

  const fila = $('#l-com-fila');
  fila.style.display = porPax ? '' : 'none';
  $('#l-com').textContent = (pen === 'cp' ? 'Media pensión y picnic' : 'Media pensión') + ' · ' + quien;
  $('#v-com').textContent = eur(r.comidas);

  $('#v-tot').textContent = eur(r.total);
  anuncia('Total: ' + eur(r.total));

  const ahorro = Reserva.ahorroFederado({adultos:ad, menores:ni, pension:pen, noches:n});
  $('#l-ahorro-fila').hidden = !(tar === 'fed' && ahorro > 0);
  $('#v-ahorro').textContent = eur(ahorro);
}

// Maqueta: confirmar solo enseña el resumen. Nada sale del navegador.
$('#confirmar').addEventListener('click', () => {
  const tar = document.querySelector('input[name=tar]:checked').value;
  $('#c-fechas').textContent = Reserva.fechaLarga($('#e').value) + ' → ' + Reserva.fechaLarga($('#s').value);
  const lineas = [(tar === 'fed' ? 'Tarifa federado' : 'Tarifa general'), $('#l-cama').textContent + ': ' + $('#v-cama').textContent];
  if ($('#l-com-fila').style.display !== 'none') lineas.push($('#l-com').textContent + ': ' + $('#v-com').textContent);
  $('#c-resumen').textContent = lineas.join(' · ') + ' — Total ' + $('#v-tot').textContent;
  $('#confirmacion').hidden = false;
});

// Fechas por defecto: mañana y pasado. La maqueta no debe abrir con una fecha ya pasada.
const hoy = Reserva.hoyISO(new Date());
$('#e').min = hoy;
$('#e').value = Reserva.sumarDias(hoy, 1);
$('#s').value = Reserva.sumarDias(hoy, 2);
salidaElegida = $('#s').value;

// Escenario compartido por enlace (?e=&s=&ad=&ni=&tar=&pen=). Lo inválido se ignora; las fechas
// solo se aceptan juntas, sin entrada pasada y con la salida posterior.
const url = Reserva.leerEstado(location.search);
if (url.e && url.s && url.e >= hoy && Reserva.contarNoches(url.e, url.s) > 0){
  $('#e').value = url.e;
  $('#s').value = url.s;
  nochesPrevias = Reserva.contarNoches(url.e, url.s);
  salidaElegida = url.s;
}
if (url.ad) $('#ad').value = url.ad;
if (url.ni) $('#ni').value = url.ni;
document.querySelectorAll('input[name=tar], input[name=pen]').forEach(r => {
  if (url[r.name] === r.value) r.checked = true;
});

// Noches a conservar al mover la entrada: las define la SALIDA que elige el usuario (o la URL / los
// valores por defecto), nunca la entrada. Chrome emite 'input' y también 'change' con cada valor
// intermedio que ya es una fecha válida mientras se teclea (teclear "10" en el día pasa por el 01),
// así que recalcularlas al cambiar la entrada las contaminaría y la salida se desplazaría de más.
function fijaNoches(){
  const n = Reserva.contarNoches($('#e').value, $('#s').value);
  if (n > 0) nochesPrevias = n;
}
// En 'input' además de 'change': WebKit/Safari solo emite 'input' mientras se edita la fecha y deja
// 'change' para cuando se sale del campo, así que sin esto la salida no se movería (y aparecería el
// aviso de fechas) hasta salir. Es seguro con valores intermedios: al teclear, cada intermedio es
// anterior al valor final, y el último evento siempre lleva el valor final.
// Se registra antes que pinta para que el total ya salga con la salida desplazada.
// Se parte siempre de la salida ELEGIDA, no de la ya arrastrada: si un intermedio la empujó (día 12)
// y el valor final queda antes (mes 10), vuelve a la elegida. Así el resultado no depende del camino.
function arrastraSalida(){
  $('#s').value = Reserva.ajustarSalida($('#e').value, salidaElegida, nochesPrevias);
}
function eligeSalida(){
  salidaElegida = $('#s').value;
  fijaNoches();
}
for (const tipo of ['input', 'change']){
  $('#e').addEventListener(tipo, arrastraSalida);
  $('#s').addEventListener(tipo, eligeSalida);
}

document.querySelectorAll('input,select').forEach(el => {
  el.addEventListener('change', pinta);
  el.addEventListener('input', pinta);
});
pinta();
