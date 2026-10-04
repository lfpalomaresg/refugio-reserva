// Carga index.html en jsdom ejecutando sus scripts. Solo se cargan recursos locales (file:);
// cualquier petición de red (fuentes, etc.) se descarta: los tests nunca salen a internet.
const path = require('node:path');
const { JSDOM, requestInterceptor } = require('jsdom');

// Fija "hoy" (hora local, a mediodía) para que los tests no dependan del día en que se ejecutan.
function congelarReloj(window, hoyISO) {
  const D = window.Date;
  const [a, m, d] = hoyISO.split('-').map(Number);
  const fijo = new D(a, m - 1, d, 12).getTime();
  class Congelada extends D {
    constructor(...args) { if (args.length) super(...args); else super(fijo); }
    static now() { return fijo; }
  }
  window.Date = Congelada;
}

async function abrir(opciones = {}) {
  const peticionesExternas = [];
  const soloLocal = requestInterceptor(request => {
    if (request.url.startsWith('file:')) return undefined;
    peticionesExternas.push(request.url);
    return new Response('', { status: 204 });
  });
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', '..', 'index.html'), {
    runScripts: 'dangerously',
    resources: { interceptors: [soloLocal] },
    pretendToBeVisual: true,
    beforeParse(window) {
      congelarReloj(window, opciones.hoy || '2026-09-01');
      if (opciones.beforeParse) opciones.beforeParse(window);
    }
  });
  await new Promise(res => dom.window.addEventListener('load', res));
  const w = dom.window, d = w.document;
  const $ = s => d.querySelector(s);
  const cambiar = (sel, valor) => {
    const el = $(sel);
    el.value = valor;
    el.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  // Solo 'input', sin 'change': lo que emite un date real mientras se teclea un valor a medias.
  const teclear = (sel, valor) => {
    const el = $(sel);
    el.value = valor;
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
  };
  const marcar = sel => {
    const el = $(sel);
    el.checked = true;
    el.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  return { peticionesExternas, dom, w, d, $, cambiar, teclear, marcar, cerrar: () => w.close() };
}

module.exports = { abrir };
