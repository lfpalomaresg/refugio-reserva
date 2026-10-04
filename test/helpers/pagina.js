// Carga index.html en jsdom ejecutando sus scripts, servida bajo un origen http ficticio
// (como en GitHub Pages: history.replaceState no funciona en file:). Los ficheros de ese origen
// se leen del repo; cualquier otra petición (fuentes, etc.) se descarta y se registra:
// los tests nunca salen a internet.
const path = require('node:path');
const fs = require('node:fs');

const RAIZ = path.join(__dirname, '..', '..');
const ORIGEN = 'http://refugio.test/';
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole, requestInterceptor } = require('jsdom');

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
    if (request.url.startsWith(ORIGEN)) {
      const ruta = path.join(RAIZ, new URL(request.url).pathname);
      if (!ruta.startsWith(RAIZ + path.sep) || !fs.existsSync(ruta)) return new Response('', { status: 404 });
      const tipo = ruta.endsWith('.js') ? 'text/javascript' : ruta.endsWith('.css') ? 'text/css' : 'text/plain';
      return new Response(fs.readFileSync(ruta), { headers: { 'Content-Type': tipo } });
    }
    peticionesExternas.push(request.url);
    return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } }); // vacío: no sale a la red
  });
  // Errores de consola y excepciones de la página: un test falla si aparecen sin esperarlos
  // (pinta() captura errores para no dejar la página rota; esto evita que los tape en los tests).
  const erroresConsola = [];
  const consola = new VirtualConsole();
  consola.on('error', (...args) => erroresConsola.push(args));
  consola.on('jsdomError', e => erroresConsola.push([e]));
  const dom = await JSDOM.fromFile(path.join(RAIZ, 'index.html'), {
    url: ORIGEN + 'index.html' + (opciones.query || ''),
    runScripts: 'dangerously',
    virtualConsole: consola,
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
  return { peticionesExternas, dom, w, d, $, cambiar, teclear, marcar, erroresConsola,
    cerrar: () => {
      w.close();
      if (!opciones.permitirErrores) assert.deepEqual(erroresConsola, [], 'errores inesperados en la página');
    } };
}

module.exports = { abrir };
