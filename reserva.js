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

  const API = { PRECIOS, comidaPorPersona, calcular };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Reserva = API;
})(this);
