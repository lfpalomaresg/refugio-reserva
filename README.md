# refugio-reserva

Maqueta del paso de reserva del Refugio Picón de Jérez (GitHub Pages, `noindex`). No es la web real
del refugio: no envía ni guarda nada.

| Fichero | Qué es |
|---|---|
| `index.html` | Marcado de la página (sin JS ni CSS inline: CSP estricta por `<meta>`) |
| `estilos.css` | Estilos, con la paleta y tipografía del refugio, modo claro/oscuro |
| `reserva.js` | Lógica pura: precios, fechas, validación, formato €, escenario en la URL (`window.Reserva`) |
| `app.js` | Interfaz: lee el formulario, pinta el desglose, Confirmar = resumen de maqueta |

## Tests

```bash
npm install
npm test
```

`node --test` + jsdom. Los tests de página sirven la maqueta bajo un origen ficticio
(`http://refugio.test/`), sin red (todo lo externo se bloquea y se registra), con el reloj congelado
y fallando ante cualquier error de consola inesperado.

## Enlace con un escenario

`index.html?e=2026-10-10&s=2026-10-12&ad=3&ni=1&tar=fed&pen=cp` abre con esas opciones. Solo se aceptan
valores de una lista blanca; la licencia federativa nunca va en la URL.
