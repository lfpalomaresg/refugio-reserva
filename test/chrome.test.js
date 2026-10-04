// Tests en Google Chrome real (no jsdom): tecleo de fechas en <input type=date>, que jsdom no simula.
// Chrome emite input/change con cada valor intermedio que ya es una fecha válida mientras se teclea.
// Si Chrome no está instalado, estos tests se saltan (los de jsdom siguen cubriendo la lógica).
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

let chromium = null;
try { ({ chromium } = require('playwright-core')); } catch { /* sin playwright-core */ }

function servir() {
  const servidor = http.createServer((req, res) => {
    const ruta = path.join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!ruta.startsWith(RAIZ + path.sep) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] || 'text/plain' }).end(fs.readFileSync(ruta));
  });
  return new Promise(ok => servidor.listen(0, '127.0.0.1', () => ok(servidor)));
}

// Devuelve { navegador } o { motivo } si no se puede arrancar Chrome (el skip dice por qué).
async function lanzar() {
  if (!chromium) return { motivo: 'playwright-core no instalado' };
  try {
    return { navegador: await chromium.launch({ channel: 'chrome', headless: true, args: ['--lang=es-ES'] }) };
  } catch (e) {
    return { motivo: 'Google Chrome no arranca: ' + String(e.message).split('\n')[0] };
  }
}

// Abre la maqueta en Chrome (es-ES, hoy = 2026-10-04) y ejecuta prueba(pagina, errores).
async function enChrome(t, query, prueba) {
  const { navegador, motivo } = await lanzar();
  if (!navegador) { t.skip(motivo); return; }
  let servidor;
  try {
    servidor = await servir();
    const contexto = await navegador.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
    const pagina = await contexto.newPage();
    const errores = [];
    pagina.on('pageerror', e => errores.push(e));
    // Fuera de la red: solo se sirve el repo local.
    await pagina.route(u => !u.href.startsWith('http://127.0.0.1:'), r => r.fulfill({ status: 200, body: '' }));
    await pagina.clock.setFixedTime(new Date('2026-10-04T12:00:00+02:00'));
    await pagina.goto(`http://127.0.0.1:${servidor.address().port}/index.html${query}`);
    await prueba(pagina);
    assert.deepEqual(errores, []);
  } finally {
    if (servidor) servidor.close();
    await navegador.close();
  }
}

test('Chrome real: teclear el día de la entrada no desplaza la salida de más', t =>
  enChrome(t, '?e=2026-10-05&s=2026-10-08', async pagina => { // 3 noches
    // Foco en la entrada (dd/mm/aaaa en es-ES: el primer segmento es el día) y teclear "10".
    await pagina.focus('#e');
    await pagina.keyboard.type('10');
    await pagina.keyboard.press('Tab');

    assert.equal(await pagina.inputValue('#e'), '2026-10-10');
    assert.equal(await pagina.inputValue('#s'), '2026-10-13', 'la estancia debía seguir siendo de 3 noches');
    assert.equal(await pagina.textContent('#l-cama'), 'Alojamiento · 2 personas × 3 noches');
  }));

test('Chrome real: teclear la entrada entera (día, mes y año) conserva las noches', t =>
  enChrome(t, '?e=2026-10-05&s=2026-10-08', async pagina => {
    await pagina.focus('#e');
    await pagina.keyboard.type('12112026'); // 12/11/2026: pasa por 01/10, 12/10, 12/01, año 0002…
    await pagina.keyboard.press('Tab');
    assert.equal(await pagina.inputValue('#e'), '2026-11-12');
    assert.equal(await pagina.inputValue('#s'), '2026-11-15');
    assert.equal(await pagina.textContent('#l-cama'), 'Alojamiento · 2 personas × 3 noches');
  }));
