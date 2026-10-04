// Lógica de precios de la maqueta. Sin DOM: se usa en el navegador (window.Reserva)
// y en los tests de Node (require).
(function (root) {
  'use strict';

  // Tarifas publicadas en la web del refugio. Menores de 14: cama reducida, comidas a precio normal.
  const PRECIOS = {
    gen: { cama: 25, camaMenor: 9, cena: 21, des: 10.5, pic: 15 },
    fed: { cama: 17, camaMenor: 6, cena: 18, des: 8.5, pic: 14 }
  };

  function comidaPorPersona(p, pension) {
    if (pension === 'md') return p.cena + p.des;
    if (pension === 'cp') return p.cena + p.des + p.pic;
    return 0;
  }

  function calcular({ adultos, menores, tarifa, pension, noches }) {
    const p = PRECIOS[tarifa];
    const cama = (adultos * p.cama + menores * p.camaMenor) * noches;
    const comidas = comidaPorPersona(p, pension) * (adultos + menores) * noches;
    return { cama, comidas, total: cama + comidas };
  }

  // Cuánto menos paga un federado que un cliente general por la misma reserva.
  function ahorroFederado(reserva) {
    return calcular({ ...reserva, tarifa: 'gen' }).total - calcular({ ...reserva, tarifa: 'fed' }).total;
  }

  // 'YYYY-MM-DD' -> días desde epoch (UTC, inmune al cambio de hora), o null si no es una fecha válida.
  function diaISO(txt) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(txt || '');
    if (!m) return null;
    const d = new Date(0);
    d.setUTCFullYear(+m[1], +m[2] - 1, +m[3]); // no Date.UTC: mapea los años 0-99 a 1900-1999
    const t = d.getTime();
    if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return t / 86400000;
  }

  const dos = n => String(n).padStart(2, '0');

  // Fecha local de un Date como 'YYYY-MM-DD' (no toISOString, que es UTC y cambia de día de madrugada).
  function hoyISO(d) {
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
  }

  // 'YYYY-MM-DD' + n días (n puede ser negativo); null si la fecha no es válida.
  function sumarDias(iso, n) {
    const base = diaISO(iso);
    if (base === null) return null;
    const d = new Date((base + n) * 86400000);
    return String(d.getUTCFullYear()).padStart(4, '0') + '-' + dos(d.getUTCMonth() + 1) + '-' + dos(d.getUTCDate());
  }

  // Noches entre entrada y salida; 0 si falta una fecha o la salida no es posterior.
  function contarNoches(entrada, salida) {
    const a = diaISO(entrada), b = diaISO(salida);
    if (a === null || b === null || b <= a) return 0;
    return b - a;
  }

  // Importe en euros con formato español fijo: punto de miles (también con 4 cifras) y coma decimal.
  function eur(n) {
    const centimos = Math.round(Math.abs(n) * 100);
    const enteros = String(Math.floor(centimos / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const dec = String(centimos % 100).padStart(2, '0');
    return (n < 0 && centimos ? '-' : '') + enteros + ',' + dec + ' €';
  }

  // '25 €' / '10,50 €': sin céntimos cuando son cero (para etiquetas de precio unitario).
  function eurCorto(n) {
    const largo = eur(n);
    return largo.endsWith(',00 €') ? largo.slice(0, -5) + ' €' : largo;
  }

  // "1 noche" / "3 noches"
  function cuenta(n, singular, plural) {
    return n + ' ' + (n === 1 ? singular : plural);
  }

  // Qué impide confirmar la reserva. Lista vacía = se puede confirmar.
  // Con entrada y hoy (ambos ISO) también rechaza llegar en un día ya pasado.
  function validar({ tarifa, licencia, noches, entrada, hoy }) {
    const errores = [];
    const a = diaISO(entrada), h = diaISO(hoy);
    if (a !== null && h !== null && a < h) errores.push('pasada');
    else if (!(noches > 0)) errores.push('fechas');
    if (tarifa === 'fed' && !String(licencia || '').trim()) errores.push('licencia');
    return errores;
  }

  // Al cambiar la entrada: si la salida ya no es posterior, se desplaza conservando las noches
  // que tenía la estancia (o 1 si no había). Si sigue siendo válida, no se toca.
  function ajustarSalida(entrada, salida, nochesPrevias) {
    if (diaISO(entrada) === null || contarNoches(entrada, salida) > 0) return salida;
    return sumarDias(entrada, nochesPrevias > 0 ? nochesPrevias : 1);
  }

  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // 'lunes 5 de octubre'. Tablas propias: no depende del idioma del navegador. '' si no es válida.
  function fechaLarga(iso) {
    const t = diaISO(iso);
    if (t === null) return '';
    const d = new Date(t * 86400000);
    return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + MESES[d.getUTCMonth()];
  }

  // Escenario compartible por URL. Lista blanca por clave (mismos valores que ofrece la página);
  // la licencia federativa NUNCA viaja en la URL.
  const CLAVES = {
    e: v => diaISO(v) !== null,
    s: v => diaISO(v) !== null,
    ad: v => ['1', '2', '3', '4'].includes(v),
    ni: v => ['0', '1', '2'].includes(v),
    tar: v => v === 'gen' || v === 'fed',
    pen: v => v === '0' || v === 'md' || v === 'cp'
  };

  function leerEstado(query) {
    const q = new URLSearchParams(query || '');
    const estado = {};
    for (const k of Object.keys(CLAVES)) {
      const v = q.get(k);
      if (v !== null && CLAVES[k](v)) estado[k] = v;
    }
    return estado;
  }

  function escribirEstado(estado) {
    estado = estado || {};
    const q = new URLSearchParams();
    for (const k of Object.keys(CLAVES)) {
      const v = estado[k] == null ? null : String(estado[k]);
      if (v !== null && CLAVES[k](v)) q.set(k, v);
    }
    const txt = q.toString();
    return txt ? '?' + txt : '';
  }

  const API = { PRECIOS, comidaPorPersona, calcular, contarNoches, eur, cuenta, validar, hoyISO, sumarDias, ajustarSalida, fechaLarga, eurCorto, ahorroFederado, leerEstado, escribirEstado };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Reserva = API;
})(this);
