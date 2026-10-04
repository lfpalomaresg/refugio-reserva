// Carga index.html en jsdom ejecutando sus scripts. Solo se cargan recursos locales (file:);
// cualquier petición de red (fuentes, etc.) se descarta: los tests nunca salen a internet.
const path = require('node:path');
const { JSDOM, requestInterceptor } = require('jsdom');

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
    beforeParse: opciones.beforeParse
  });
  await new Promise(res => dom.window.addEventListener('load', res));
  const w = dom.window, d = w.document;
  const $ = s => d.querySelector(s);
  const cambiar = (sel, valor) => {
    const el = $(sel);
    el.value = valor;
    el.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const marcar = sel => {
    const el = $(sel);
    el.checked = true;
    el.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  return { peticionesExternas, dom, w, d, $, cambiar, marcar, cerrar: () => w.close() };
}

module.exports = { abrir };
