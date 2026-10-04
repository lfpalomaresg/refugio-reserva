# Notas de sesión

## 2026-10-04 (Mac, Claude Opus 5.5) — pendientes del hilo: Safari y fuentes locales

**Hecho**
- Safari (WebKit de Playwright, motor de Safari): WebKit solo emite `input` al editar un `<input type=date>`
  y deja `change` para cuando se sale del campo, así que la salida no se arrastraba (aviso de fechas y
  Confirmar bloqueado hasta salir). Corregido: arrastre en `input` y `change`, siempre desde la salida
  ELEGIDA por el usuario (`salidaElegida`), para que el resultado no dependa del camino de tecleo (hallazgo
  IMPORTANTE de la revisión: teclear 12/09 dejaba la salida movida de más). `ea94b4b`.
- `test/navegadores.test.js` (antes `chrome.test.js`): mismos casos en Chrome y WebKit reales; fallan ante
  errores de consola o cualquier petición fuera del propio sitio.
- RGPD: Montserrat servida desde `fuentes/` (subconjunto latin de @fontsource/montserrat 5.3.0, OFL 1.1);
  fuera Google Fonts; CSP con `style-src`/`font-src 'self'`. `7056e31`.

**Pendiente**
- Safari real (no WebKit de Playwright) solo es automatizable activando «Permitir automatización remota»
  en Ajustes de Safari › Desarrollador: lo decide el operador.

**Decidido**
- Mientras la salida está arrastrada, sigue a la entrada conservando las noches; la salida que eligió el
  usuario no se toca mientras siga siendo posterior (test del loop 9 actualizado a propósito).
- `robots.txt` se deja: en una página de proyecto (`/refugio-reserva/`) los buscadores no lo leen; manda
  el `<meta name="robots" content="noindex">`.

## 2026-10-04 (Mac, Claude Opus 5.5) — bug de tecleo de la fecha de entrada en Chrome

**Hecho**
- Reproducido en Chrome real (test con `playwright-core`, teclado de verdad): con entrada 05/10 y salida
  08/10 (3 noches), teclear "10" en el día dejaba la salida en 17/10 (7 noches). Chrome emite `change`
  con cada valor intermedio ya válido (el "1" da 01/10) y eso redefinía las noches a conservar.
- Corrección en `app.js`: las noches a conservar solo las fija la salida (o la URL / valores por
  defecto); cambiar la entrada ya no las recalcula. 2 tests en Chrome + 1 en jsdom, vistos en rojo con el
  código anterior y en verde con la corrección.

**Pendiente**
- (Resuelto) La prueba manual del tecleo en Chrome que quedó abierta en la sesión anterior.
- ~~Safari no se ha probado~~ → probado con WebKit (ver la entrada siguiente de esta fecha).

**Decidido**
- Cambio de comportamiento asumido: si el usuario adelanta la entrada manteniendo la salida y después la
  retrasa más allá de la salida, se conservan las noches que eligió con la salida, no las intermedias.

## 2026-10-04 (Mac, Claude Opus 5.5) — 20 loops de automejora

**Hecho**
- 20 loops TDD (test en rojo → implementación → suite verde → revisión con subagente Sonnet → commit),
  de `079869a` a `cfd6e46`. Todos sellados "revisor: claude-sonnet APTO". 50 tests (node --test + jsdom).
- Runner montado desde cero; lógica extraída a `reserva.js`, interfaz a `app.js`, CSS a `estilos.css`.
- Bugs corregidos: salida ≤ entrada cobraba 1 noche fantasma; es-ES no agrupa miles con 4 cifras
  (`1228,00 €`); etiqueta de comidas sin noches; fechas por defecto fijas en septiembre (ya pasado);
  `Date.UTC` convertía años 0-99 en 1900+; `calcular` devolvía NaN en silencio.
- Funcional: licencia obligatoria en tarifa federada, entrada no pasada, la salida sigue a la entrada
  conservando noches, Confirmar = resumen de maqueta (fechas, tarifa, importes; sin red), ahorro como
  federado, escenario compartible por URL (lista blanca, sin licencia).
- Accesibilidad: `aria-invalid`/`aria-describedby`, `role=status` persistente, total en `aria-live`
  sin repeticiones.
- Seguridad: CSP sin `unsafe-*`, sin JS/CSS inline, `noscript`, guardarraíl de `noindex`.
- Comprobado en Chromium real (servidor local): sin errores de CSP, fuentes OK, totales correctos.

**Pendiente**
- ~~Probar a mano en un `<input type=date>` real tecleando la entrada~~ → reproducido y corregido
  (ver la entrada siguiente de esta misma fecha).
- ~~Opcional: alojar Montserrat en local~~ → hecho (`7056e31`).
- El repo sigue público mientras Fernando pueda abrir el enlace (ver ficha del proyecto).

**Decidido**
- Sin hook conclave instalado en este repo: el gate se hizo con revisor Sonnet por loop y sello en el
  mensaje de commit.
- No se inventan reglas de negocio: la licencia solo exige "no vacía"; límites de personas = los de los
  selectores existentes.
