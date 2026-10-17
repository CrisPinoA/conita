// Globo de texto de MiniCrispi e interfaz al estilo Minecraft (paneles, botones, campos).
import { W } from '../engine/display.js';
import { C, rect } from '../engine/palette.js';
import { wrap, drawRange, drawText, measure, measureRange, LINE_H } from '../engine/font.js';
import { input } from '../engine/input.js';
import { hit } from '../util.js';
import { npc } from './npc.js';
import { CR_H } from './sprites.js';

const CPS = 45, MAXW = 150, CH = 14, CGAP = 3; // botones dentro del globo: alto y separación

export const bubble = {
  on: false, str: '', pairs: [], n: 0, w: 0, h: 0, shown: 0, auto: 0, t: 0, minX: 2,
  x: 0, y: 0, choices: null, hover: -1, picked: -1,
};

// auto > 0: se cierra solo tras esos segundos (no espera clic)
// minX: el globo no se corre a la izquierda de esta x (para no tapar un panel abierto)
// choices: botones dentro del globo (aparecen al terminar de escribirse); el elegido queda en bubble.picked
export function say(str, auto = 0, minX = 2, choices = null) {
  const b = bubble;
  b.str = str;
  b.minX = minX;
  b.choices = choices; b.picked = -1; b.hover = -1;
  b.n = wrap(str, Math.min(MAXW, W - 2 - minX - 12), b.pairs);
  let mw = 0;
  for (let i = 0; i < b.n; i++) mw = Math.max(mw, measureRange(str, b.pairs[i * 2], b.pairs[i * 2 + 1]));
  b.w = mw + (auto > 0 || choices ? 12 : 18);
  b.h = b.n * LINE_H + 6;
  if (choices) {
    let cw = 0;
    for (let i = 0; i < choices.length; i++) cw = Math.max(cw, measure(choices[i]) + 16);
    b.w = Math.max(b.w, cw + 10);
    b.h += choices.length * (CH + CGAP) + 1;
  }
  b.shown = 0; b.auto = auto; b.t = 0; b.on = true;
}
export const bubbleDone = () => bubble.shown >= bubble.str.length;
export function bubbleSkip() { bubble.shown = bubble.str.length; }
export function bubbleHide() { bubble.on = false; npc.talking = false; }

// posición del globo sobre MiniCrispi, sin salirse de la pantalla ni pasar de minX
function place(b) {
  let x = npc.dx - (b.w >> 1);
  if (x > W - 2 - b.w) x = W - 2 - b.w;
  if (x < b.minX) x = b.minX;
  let y = npc.dy - CR_H - 6 - b.h;
  if (y < 2) y = 2;
  b.x = x; b.y = y;
}
const choiceY = (b, i) => b.y + 4 + b.n * LINE_H + 2 + i * (CH + CGAP);

export function updateBubble(dt) {
  const b = bubble;
  if (!b.on) return;
  b.t += dt;
  if (b.shown < b.str.length) b.shown = Math.min(b.str.length, b.shown + CPS * dt);
  npc.talking = b.shown < b.str.length;
  if (b.choices && !npc.talking && b.picked < 0) {
    place(b);
    b.hover = -1;
    for (let i = 0; i < b.choices.length; i++) if (hit(b.x + 5, choiceY(b, i), b.w - 10, CH, input.x, input.y)) b.hover = i;
    if (b.hover >= 0) { input.cursor = 1; if (input.pressed) b.picked = b.hover; }
  }
  if (b.auto > 0 && !npc.talking) {
    b.auto -= dt;
    if (b.auto <= 0) bubbleHide();
  }
}

export function drawBubble(ctx) {
  const b = bubble;
  if (!b.on || !npc.vis) return;
  const w = b.w, h = b.h;
  place(b);
  const x = b.x, y = b.y;

  rect(ctx, x + 1, y, w - 2, h, C.OUT);
  rect(ctx, x, y + 1, w, h - 2, C.OUT);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, C.WHITE);
  rect(ctx, x + 2, y + h - 2, w - 4, 1, C.CLOUD);

  let tx = npc.dx;
  if (tx < x + 5) tx = x + 5;
  if (tx > x + w - 6) tx = x + w - 6;
  for (let k = 0; k < 4; k++) {
    const hw = 3 - k;
    rect(ctx, tx - hw - 1, y + h - 1 + k, hw * 2 + 3, 1, C.OUT);
    if (hw > 0) rect(ctx, tx - hw, y + h - 1 + k, hw * 2 + 1, 1, k === 0 ? C.CLOUD : C.WHITE);
  }

  const lim = b.shown | 0;
  for (let i = 0; i < b.n; i++) {
    const a = b.pairs[i * 2];
    if (a >= lim) break;
    drawRange(ctx, b.str, a, Math.min(b.pairs[i * 2 + 1], lim), x + 6, y + 4 + i * LINE_H, C.G1);
  }
  if (b.choices && !npc.talking) {
    for (let i = 0; i < b.choices.length; i++) {
      button(ctx, x + 5, choiceY(b, i), w - 10, CH, b.choices[i], i === b.picked || i === b.hover ? BTN_HOVER : BTN_NORMAL);
    }
    return;
  }
  // flecha ▼ cuando espera un clic
  if (!npc.talking && b.auto === 0 && (Math.floor(b.t * 3) & 1) === 0) {
    const ax = x + w - 10, ay = y + h - 7;
    rect(ctx, ax, ay, 5, 1, C.G2); rect(ctx, ax + 1, ay + 1, 3, 1, C.G2); rect(ctx, ax + 2, ay + 2, 1, 1, C.G2);
  }
}

// Panel gris de inventario de Minecraft
export function panel(ctx, x, y, w, h) {
  rect(ctx, x + 1, y, w - 2, h, C.OUT);
  rect(ctx, x, y + 1, w, h - 2, C.OUT);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, C.G6);
  rect(ctx, x + 1, y + 1, w - 3, 2, C.WHITE);
  rect(ctx, x + 1, y + 1, 2, h - 3, C.WHITE);
  rect(ctx, x + 3, y + h - 3, w - 4, 2, C.G2);
  rect(ctx, x + w - 3, y + 3, 2, h - 4, C.G2);
  rect(ctx, x + 3, y + 3, w - 6, h - 6, C.G6);
}

// Estados de botón: relleno, luz, sombra, texto, sombra del texto, borde
export const BTN_NORMAL = 0, BTN_HOVER = 1, BTN_OFF = 2, BTN_SEL = 3, BTN_SEL_HOVER = 4;
const BTN = [
  [C.G3, C.G5, C.G2, C.WHITE, C.G1, C.OUT],
  [C.B1, C.B2, C.B0, C.MCY, C.MCYS, C.WHITE],
  [C.G1, C.G2, C.G0, C.G4, -1, C.OUT],
  [C.XP0, C.XP1, C.OUT, C.XP3, C.OUT, C.OUT],
  [C.XP1, C.XP2, C.XP0, C.WHITE, C.XP0, C.WHITE],
];

// lines (opcional): pares de índices de wrap() para un texto de varias líneas, centrado en alto
export function button(ctx, x, y, w, h, label, st, left = false, lines = null) {
  const p = BTN[st];
  rect(ctx, x, y, w, h, p[5]);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, p[0]);
  rect(ctx, x + 1, y + 1, w - 2, 1, p[1]);
  rect(ctx, x + 1, y + 1, 1, h - 2, p[1]);
  rect(ctx, x + 1, y + h - 2, w - 2, 1, p[2]);
  rect(ctx, x + w - 2, y + 2, 1, h - 3, p[2]);
  if (lines) {
    const n = lines.length >> 1, ty = y + ((h - (n - 1) * LINE_H - 7) >> 1);
    for (let i = 0; i < n; i++) drawRange(ctx, label, lines[i * 2], lines[i * 2 + 1], x + 6, ty + i * LINE_H, p[3], p[4]);
    return;
  }
  const tx = left ? x + 6 : x + ((w - measure(label)) >> 1);
  drawText(ctx, label, tx, y + ((h - 7) >> 1), p[3], p[4]);
}

// Campo de texto negro con borde gris, como los de Minecraft
export function field(ctx, x, y, w, h, focused) {
  rect(ctx, x, y, w, h, focused ? C.G6 : C.G5);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, C.OUT);
}
