// Tests en navegadores reales (no jsdom): tecleo de fechas en <input type=date>, que jsdom no simula.
// Chrome emite input/change con cada valor intermedio que ya es una fecha válida mientras se teclea.
// Motores: Google Chrome instalado (channel 'chrome') y WebKit de Playwright (el motor de Safari;
// requiere `npx playwright-core install webkit`). Si un motor no está disponible, sus tests se saltan.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

let pw = null;
try { pw = require('playwright-core'); } catch { /* sin playwright-core */ }

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

const MOTORES = {
  Chrome: () => pw.chromium.launch({ channel: 'chrome', headless: true, args: ['--lang=es-ES'] }),
  WebKit: () => pw.webkit.launch({ headless: true })
};

// Devuelve { navegador } o { motivo } si no se puede arrancar el motor (el skip dice por qué).
async function lanzar(motor) {
  if (!pw) return { motivo: 'playwright-core no instalado' };
  try {
    return { navegador: await MOTORES[motor]() };
  } catch (e) {
    return { motivo: motor + ' no arranca: ' + String(e.message).split('\n')[0] };
  }
}

// Abre la maqueta en el motor (es-ES, hoy = 2026-10-04) y ejecuta prueba(pagina).
async function enNavegador(t, motor, query, prueba) {
  const { navegador, motivo } = await lanzar(motor);
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

for (const motor of Object.keys(MOTORES)) {
  test(`${motor}: teclear el día de la entrada no desplaza la salida de más`, t =>
    enNavegador(t, motor, '?e=2026-10-05&s=2026-10-08', async pagina => { // 3 noches
      // Foco en la entrada (dd/mm/aaaa en es-ES: el primer segmento es el día) y teclear "10".
      // Sin salir del campo: WebKit/Safari solo emite 'input' mientras se edita ('change' llega al salir).
      await pagina.focus('#e');
      await pagina.keyboard.type('10');

      assert.equal(await pagina.inputValue('#e'), '2026-10-10');
      assert.equal(await pagina.inputValue('#s'), '2026-10-13', 'la estancia debía seguir siendo de 3 noches');
      assert.equal(await pagina.textContent('#l-cama'), 'Alojamiento · 2 personas × 3 noches');
      assert.equal(await pagina.isHidden('#aviso-fechas'), true);
      assert.equal(await pagina.isEnabled('#confirmar'), true);
    }));

  test(`${motor}: teclear la entrada entera (día, mes y año) conserva las noches`, t =>
    enNavegador(t, motor, '?e=2026-10-05&s=2026-10-08', async pagina => {
      await pagina.focus('#e');
      // Con separadores: WebKit no salta solo de segmento tras dos cifras; Chrome acepta ambos.
      await pagina.keyboard.type('12/11/2026'); // pasa por 01/10, 12/10, 12/01, año 0002…
      await pagina.keyboard.press('Tab');
      assert.equal(await pagina.inputValue('#e'), '2026-11-12');
      assert.equal(await pagina.inputValue('#s'), '2026-11-15');
      assert.equal(await pagina.textContent('#l-cama'), 'Alojamiento · 2 personas × 3 noches');
    }));

  test(`${motor}: el resultado no depende del camino de tecleo (el mes retrocede tras un día intermedio)`, t =>
    enNavegador(t, motor, '?e=2026-11-05&s=2026-11-08', async pagina => { // salida elegida: 08/11
      await pagina.focus('#e');
      // El día 12 pasa la salida (11-12 → la empuja); el mes 10 la deja otra vez antes de la salida elegida.
      await pagina.keyboard.type('12/10/2026');
      assert.equal(await pagina.inputValue('#e'), '2026-10-12');
      assert.equal(await pagina.inputValue('#s'), '2026-11-08', 'igual que si se hubiera tecleado 12/10 de golpe');
    }));
}
