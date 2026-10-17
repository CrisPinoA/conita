// Control de sonido en la esquina inferior izquierda: parlante (silenciar/activar) y 4 barras de volumen.
// El clic sobre el control no cuenta para el formulario. El nivel se recuerda en este navegador.
import { H } from '../engine/display.js';
import { input } from '../engine/input.js';
import { C, rect } from '../engine/palette.js';
import { setMaster } from '../engine/audio.js';
import { hit } from '../util.js';

const X = 3, Y = H - 13, PW = 24, PH = 11;
const BX = X + 9, BAR_H = Uint8Array.of(2, 3, 5, 7);
const LEVELS = [0, 0.25, 0.5, 0.75, 1];
const KEY = 'mc_volume', DEFAULT = 3;
const SPEAKER = ['...o', '..oo', 'oooo', 'oooo', 'oooo', '..oo', '...o'];

let level = DEFAULT, last = DEFAULT, hover = false;

export function initSound() {
  try {
    const v = parseInt(localStorage.getItem(KEY), 10);
    if (v >= 0 && v <= 4) level = v;
  } catch (e) { /* sin almacenamiento: queda el nivel por defecto */ }
  if (level > 0) last = level;
  setMaster(LEVELS[level]);
}

function setLevel(v) {
  level = v;
  if (v > 0) last = v;
  setMaster(LEVELS[v]);
  try { localStorage.setItem(KEY, String(v)); } catch (e) { /* no se guarda */ }
}

export function updateSound() {
  hover = hit(X, Y, PW, PH, input.x, input.y);
  if (!hover) return;
  input.cursor = 1;
  if (!input.pressed) return;
  if (input.x < BX - 1) setLevel(level > 0 ? 0 : last);         // parlante: silenciar / volver
  else setLevel(Math.min(4, Math.max(1, ((input.x - BX + 1) / 3 | 0) + 1))); // barra elegida
  input.pressed = false; // que el clic no avance el formulario
}

export function drawSound(ctx) {
  rect(ctx, X, Y, PW, PH, hover ? C.CREAM : C.OUT);
  rect(ctx, X + 1, Y + 1, PW - 2, PH - 2, C.G1);
  const ink = level > 0 ? C.CREAM : C.G4;
  for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) if (SPEAKER[y][x] === 'o') rect(ctx, X + 3 + x, Y + 2 + y, 1, 1, ink);
  if (level === 0) {
    for (let i = 0; i < 5; i++) { // una X roja en vez de las barras
      rect(ctx, BX + 1 + i, Y + 3 + i, 1, 1, C.R2);
      rect(ctx, BX + 5 - i, Y + 3 + i, 1, 1, C.R2);
    }
    return;
  }
  for (let i = 0; i < 4; i++) {
    const h = BAR_H[i];
    rect(ctx, BX + i * 3, Y + 9 - h, 2, h, i < level ? C.CREAM : C.G3);
  }
}
