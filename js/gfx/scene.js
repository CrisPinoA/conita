// Escenario al aire libre. Nunca se detiene: las transiciones del formulario
// son cortes secos, pero el fondo sigue vivo.
import { W, H } from '../engine/display.js';
import { C, rect, dither, putPx, layer } from '../engine/palette.js';
import { rand } from '../util.js';

export const GROUND_Y = 150; // donde pisan los personajes
export const SUN = { x: 236, y: 104, r: 13 };
const GRASS_TOP = 145;

export const farRidge = x => 108 + 7 * Math.sin(x * 0.021 + 0.5) + 4 * Math.sin(x * 0.057 + 2);
export const midRidge = x => 128 + 5 * Math.sin(x * 0.034 + 1.3) + 3 * Math.sin(x * 0.09);

function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

let t = 0, tk = 0;
let sky, far, mid;

const clouds = [];
const NT = 30, tx = new Int16Array(NT), ty = new Int16Array(NT), th = new Uint8Array(NT), tph = new Float32Array(NT);
const NF = 12, fx = new Int16Array(NF), fy = new Int16Array(NF), fc = new Uint8Array(NF), fph = new Float32Array(NF);
const NB = 5, bx = new Float32Array(NB), by = new Float32Array(NB), bv = new Float32Array(NB), bph = new Uint8Array(NB), bon = new Uint8Array(NB);
const NP = 12, px = new Float32Array(NP), py = new Float32Array(NP), pv = new Float32Array(NP), pph = new Float32Array(NP);
let birdIn = 4;

export function initScene() {
  // Cielo en bandas sólidas; el tramado solo aparece en la franja corta entre una banda y otra
  sky = layer(W, H, img => {
    const ramp = [C.SKY0, C.SKY1, C.SKY2, C.SKY3];
    for (let y = 0; y < H; y++) {
      const f = Math.min(2.999, (y / 120) * 3), k = f | 0, fr = f - k;
      const lvl = fr < 0.82 ? 0 : Math.round(((fr - 0.82) / 0.18) * 16);
      for (let x = 0; x < W; x++) putPx(img, x, y, dither(x, y, lvl) ? ramp[k + 1] : ramp[k]);
    }
    // sol bajo, medio escondido detrás de las montañas
    const sx = SUN.x, sy = SUN.y, r = SUN.r;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= r) putPx(img, sx + x, sy + y, y > 4 ? C.Y2 : C.Y3);
      }
    }
  });

  far = layer(W, H, img => {
    for (let x = 0; x < W; x++) {
      const top = Math.round(farRidge(x));
      for (let y = top; y < H; y++) putPx(img, x, y, y === top ? C.FAR1 : C.FAR0);
    }
  });

  mid = layer(W, H, img => {
    for (let x = 0; x < W; x++) {
      const top = Math.round(midRidge(x));
      for (let y = top; y < H; y++) {
        let ci;
        if (y < GRASS_TOP) ci = y === top ? C.GR3 : y <= top + 2 ? C.GR2 : C.GR1;
        else if (y === GRASS_TOP) ci = C.GR3;
        else if (y < 164) ci = hash(x, y) < 0.015 ? C.GR3 : C.GR2;
        else if (y < 168) ci = dither(x, y, (y - 163) * 3) ? C.GR1 : C.GR2;
        else ci = C.GR1;
        putPx(img, x, y, ci);
      }
    }
    // arbustos sobre la línea del pasto
    const bushes = [[64, 6], [112, 5], [196, 7], [232, 5], [304, 6]];
    for (const [cx, r] of bushes) {
      const cy = GRASS_TOP + 1;
      for (let y = cy - r; y <= cy; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
          if (d > r) continue;
          const ci = d > r - 1 ? C.GR0 : dx + dy < -r * 0.7 ? C.GR3 : dx + dy > r * 0.3 ? C.GR1 : C.GR2;
          putPx(img, x, y, ci);
        }
      }
    }
  });

  for (let i = 0; i < 4; i++) {
    const w = 30 + ((Math.random() * 26) | 0), h = 14 + ((Math.random() * 4) | 0);
    clouds.push({ c: makeCloud(w, h, i), x: Math.random() * W, y: 8 + Math.random() * 60, v: rand(1.5, 4) });
  }

  for (let i = 0; i < NT; i++) {
    tx[i] = (Math.random() * W) | 0;
    ty[i] = GRASS_TOP + 4 + ((Math.random() * (H - GRASS_TOP - 5)) | 0);
    th[i] = 2 + ((Math.random() * 3) | 0);
    tph[i] = Math.random() * 6;
  }
  const petals = [C.R2, C.WHITE, C.B2, C.Y3];
  for (let i = 0; i < NF; i++) {
    fx[i] = 4 + ((Math.random() * (W - 8)) | 0);
    fy[i] = GRASS_TOP + 6 + ((Math.random() * 26) | 0);
    fc[i] = petals[i % petals.length];
    fph[i] = Math.random() * 6;
  }
  for (let i = 0; i < NP; i++) {
    px[i] = Math.random() * W; py[i] = 20 + Math.random() * 130;
    pv[i] = rand(3, 8); pph[i] = Math.random() * 6;
  }
}

function makeCloud(w, h, seed) {
  return layer(w, h, img => {
    const n = 5, blobs = [];
    for (let i = 0; i < n; i++) {
      const r = 3 + hash(seed, i) * (h / 2 - 3);
      blobs.push([4 + (w - 8) * i / (n - 1), h - 2 - r, r + 1]);
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let inside = y >= h - 5 && y < h - 1 && x > 3 && x < w - 4;
        for (const b of blobs) if ((x - b[0]) ** 2 + (y - b[1]) ** 2 <= b[2] * b[2]) inside = true;
        if (inside && y < h - 1) putPx(img, x, y, y >= h - 4 ? C.CLOUD : C.CREAM);
      }
    }
  });
}

export function updateScene(dt) {
  t += dt;
  tk = Math.floor(t * 10);
  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    c.x += c.v * dt;
    if (c.x > W + 4) { c.x = -c.c.width - 4; c.y = 8 + Math.random() * 60; }
  }
  birdIn -= dt;
  if (birdIn <= 0) {
    birdIn = rand(7, 15);
    const dir = Math.random() < 0.5 ? 1 : -1, y = rand(18, 70), n = 1 + ((Math.random() * 3) | 0);
    for (let k = 0, i = 0; i < NB && k < n; i++) {
      if (bon[i]) continue;
      bon[i] = 1; bv[i] = dir * rand(22, 30);
      bx[i] = dir > 0 ? -6 - k * 9 : W + 6 + k * 9; by[i] = y + k * 4; bph[i] = k;
      k++;
    }
  }
  for (let i = 0; i < NB; i++) {
    if (!bon[i]) continue;
    bx[i] += bv[i] * dt;
    if (bx[i] < -40 || bx[i] > W + 40) bon[i] = 0;
  }
  for (let i = 0; i < NP; i++) {
    px[i] += pv[i] * dt;
    py[i] += Math.sin(t * 1.3 + pph[i]) * 4 * dt;
    if (px[i] > W + 2) { px[i] = -2; py[i] = 20 + Math.random() * 130; }
  }
}

// Cielo, nubes, montañas, pájaros y colinas con el suelo
export function drawSceneBack(ctx) {
  ctx.drawImage(sky, 0, 0);
  for (let i = 0; i < clouds.length; i++) ctx.drawImage(clouds[i].c, Math.round(clouds[i].x), Math.round(clouds[i].y));
  ctx.drawImage(far, 0, 0);
  for (let i = 0; i < NB; i++) {
    if (!bon[i]) continue;
    const x = Math.round(bx[i]), y = Math.round(by[i]);
    const up = ((tk >> 1) + bph[i]) & 1;
    rect(ctx, x, y, 1, 1, C.DEEP);
    rect(ctx, x - 1, y - up, 1, 1, C.DEEP); rect(ctx, x + 1, y - up, 1, 1, C.DEEP);
    rect(ctx, x - 2, y - 1 + up, 1, 1, C.DEEP); rect(ctx, x + 2, y - 1 + up, 1, 1, C.DEEP);
  }
  ctx.drawImage(mid, 0, 0);
}

// Flores (detrás de los personajes)
export function drawSceneMid(ctx) {
  const tq = tk / 10;
  for (let i = 0; i < NF; i++) {
    const s = Math.round(Math.sin(tq * 2.2 + fph[i]));
    const x = fx[i], y = fy[i];
    rect(ctx, x, y - 2, 1, 3, C.GR1);
    rect(ctx, x + s - 1, y - 3, 3, 1, fc[i]);
    rect(ctx, x + s, y - 4, 1, 3, fc[i]);
    rect(ctx, x + s, y - 3, 1, 1, C.Y2);
  }
}

// Pasto y polen (delante de los personajes)
export function drawSceneFront(ctx) {
  const tq = tk / 10;
  for (let i = 0; i < NT; i++) {
    const x = tx[i], y = ty[i], h = th[i];
    const s = Math.round(Math.sin(tq * 2.4 + tph[i] + x * 0.03));
    for (let b = -1; b <= 1; b++) {
      const bh = b === 0 ? h + 1 : h;
      rect(ctx, x + b, y - bh + 2, 1, bh - 1, C.GR1);
      rect(ctx, x + b + (b === 0 ? s : b < 0 ? Math.min(0, s) : Math.max(0, s)), y - bh + 1, 1, 1, C.GR3);
    }
  }
  for (let i = 0; i < NP; i++) {
    rect(ctx, Math.round(px[i]), Math.round(py[i]), 1, 1, (tk + i * 3) % 8 < 4 ? C.Y3 : C.CREAM);
  }
}
