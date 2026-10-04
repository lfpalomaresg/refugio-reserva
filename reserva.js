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

  // 'YYYY-MM-DD' -> días desde epoch (UTC, inmune al cambio de hora), o null si no es una fecha válida.
  function diaISO(txt) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(txt || '');
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(t);
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
    return d.getUTCFullYear() + '-' + dos(d.getUTCMonth() + 1) + '-' + dos(d.getUTCDate());
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

  const API = { PRECIOS, comidaPorPersona, calcular, contarNoches, eur, cuenta, validar, hoyISO, sumarDias, ajustarSalida };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Reserva = API;
})(this);
