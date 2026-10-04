# Notas de sesión

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
- Probar a mano en un `<input type=date>` real (Chrome/Safari) tecleando la entrada: en Chrome puede
  emitir `change` con valores intermedios válidos y desplazar la salida de más (revisor loop 9).
- Opcional: alojar Montserrat en local (Google Fonts envía la IP del visitante a Google).
- El repo sigue público mientras Fernando pueda abrir el enlace (ver ficha del proyecto).

**Decidido**
- Sin hook conclave instalado en este repo: el gate se hizo con revisor Sonnet por loop y sello en el
  mensaje de commit.
- No se inventan reglas de negocio: la licencia solo exige "no vacía"; límites de personas = los de los
  selectores existentes.
