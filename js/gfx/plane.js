// Avioneta que cruza el cielo de derecha a izquierda arrastrando una pancarta con texto.
// La pancarta se arma una sola vez en un canvas aparte y se dibuja en tiras que ondulan.
import { W } from '../engine/display.js';
import { C, rect } from '../engine/palette.js';
import { drawText, measure } from '../engine/font.js';

const SPEED = 30;     // px/s
const PLANE_Y = 10;   // altura en el cielo
const ROPE = 9;       // largo de la cuerda entre la cola y la pancarta
const SLICE = 6;      // ancho de cada tira de la pancarta
const WAVE = Uint8Array.of(0, 0, 1, 1);

// Mirando a la izquierda. o contorno, R/r rojo claro/medio, w ventana, y ala
const ART = [
  '..............oo..',
  '.............oRo..',
  '......ooo....oro..',
  '....oowwwo...oro..',
  '..ooRRRRRRooooroo.',
  '.oRRRRRRRRRRRRRRro',
  '.orrrrrrrrrrrrrro.',
  '..oorrrrrrrroooo..',
  '....ooyyyyyo......',
  '.....oooooo.......',
];
const PW = ART[0].length, PH = ART.length, TAIL_Y = 5;
const INK = { o: C.OUT, R: C.R2, r: C.R1, w: C.B2, y: C.Y2 };

let body = null, banner = null, bw = 0;
const plane = { on: false, wait: 0, x: 0, dx: 0, t: 0, tk: -1, bob: 0 };

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function buildBody() {
  body = canvas(PW, PH);
  const g = body.getContext('2d');
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const ch = ART[y][x];
    if (ch !== '.') rect(g, x, y, 1, 1, INK[ch]);
  }
}

const BH = 13;
function buildBanner(text) {
  bw = measure(text) + 12;
  banner = canvas(bw, BH);
  const g = banner.getContext('2d');
  rect(g, 0, 0, bw, BH, C.OUT);
  rect(g, 1, 1, bw - 2, BH - 2, C.CREAM);
  rect(g, 1, BH - 2, bw - 2, 1, C.CLOUD);
  drawText(g, text, 6, 3, C.DEEP);
}

export function planeFly(text, delay = 0) {
  if (!body) buildBody();
  buildBanner(text);
  // dx se fija ya: si no, el primer cuadro tras la espera se dibuja en una posición vieja (parpadeo)
  plane.on = true; plane.wait = delay; plane.x = W + 4; plane.dx = W + 4; plane.t = 0; plane.tk = 0; plane.bob = 0;
}

export function updatePlane(dt) {
  if (!plane.on) return;
  if (plane.wait > 0) { plane.wait -= dt; return; }
  plane.t += dt;
  plane.x -= SPEED * dt;
  const tk = Math.floor(plane.t * 10);
  if (tk !== plane.tk) {
    plane.tk = tk;
    plane.dx = Math.round(plane.x);
    plane.bob = (tk >> 2) & 1;
  }
  if (plane.x + PW + ROPE + bw < -4) plane.on = false;
}

export function drawPlane(ctx) {
  if (!plane.on || plane.wait > 0) return;
  const x = plane.dx, y = PLANE_Y + plane.bob, tk = plane.tk;
  // hélice: alterna entre larga y corta
  if (tk & 1) rect(ctx, x - 1, y + 3, 1, 6, C.G2);
  else { rect(ctx, x - 1, y + 4, 1, 1, C.G2); rect(ctx, x - 1, y + 7, 1, 1, C.G2); }
  ctx.drawImage(body, x, y);

  // cuerda y riendas hacia las esquinas de la pancarta
  const bx = x + PW + ROPE, by = y + TAIL_Y - (BH >> 1);
  rect(ctx, x + PW, y + TAIL_Y, ROPE - 3, 1, C.DEEP);
  const kx = bx - 3, ky = y + TAIL_Y;
  for (let i = 1; i <= 3; i++) {
    rect(ctx, kx + i, ky - Math.round(i * (BH >> 1) / 3), 1, 1, C.DEEP);
    rect(ctx, kx + i, ky + Math.round(i * (BH >> 1) / 3), 1, 1, C.DEEP);
  }

  // pancarta en tiras; la onda viaja hacia atrás
  for (let sx = 0; sx < bw; sx += SLICE) {
    const sw = Math.min(SLICE, bw - sx), k = sx / SLICE;
    const off = sx === 0 ? 0 : WAVE[(tk - k) & 3];
    ctx.drawImage(banner, sx, 0, sw, BH, bx + sx, by + off, sw, BH);
  }
}
