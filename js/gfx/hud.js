// Barra de experiencia (clon de Minecraft), orbes y toast de logro.
import { W, H } from '../engine/display.js';
import { C, rect, RAMP_SPARK, RAMP_XP } from '../engine/palette.js';
import { drawText, drawIntOutlined, intWidth } from '../engine/font.js';
import { play } from '../engine/audio.js';
import { burst } from '../engine/particles.js';
import { easeOutCubic, easeInOut } from '../util.js';
import { dogCheer } from './dog.js';

export const BAR_W = 182, BAR_X = (W - BAR_W) >> 1, BAR_Y = H - 8;
export const xp = { level: 0, fill: 0, shown: 0, pop: 0, t: 0 };

const NO = 12;
const ox0 = new Float32Array(NO), oy0 = new Float32Array(NO), ox1 = new Float32Array(NO), oy1 = new Float32Array(NO);
const ot = new Float32Array(NO), odur = new Float32Array(NO), oval = new Float32Array(NO);
const oon = new Uint8Array(NO);

// Lanza n orbes desde (x, y) hacia la barra; juntos suman un nivel
export function awardXP(x, y, n = 5) {
  for (let i = 0, k = 0; i < NO && k < n; i++) {
    if (oon[i]) continue;
    oon[i] = 1;
    ox0[i] = x; oy0[i] = y;
    ox1[i] = BAR_X + 12 + Math.random() * (BAR_W - 24); oy1[i] = BAR_Y + 2;
    ot[i] = -k * 0.1; odur[i] = 0.6 + Math.random() * 0.25; oval[i] = 1 / n;
    k++;
  }
}

export const toast = { on: false, t: 0, title: '', name: '' };
const T_IN = 0.5, T_STAY = 6, T_OUT = 0.5;
export function showToast(title, name) {
  toast.on = true; toast.t = 0; toast.title = title; toast.name = name;
}

export function updateHUD(dt) {
  xp.t += dt;
  if (xp.pop > 0) xp.pop -= dt;
  for (let i = 0; i < NO; i++) {
    if (!oon[i]) continue;
    ot[i] += dt;
    if (ot[i] >= odur[i]) {
      oon[i] = 0;
      xp.fill += oval[i];
      burst(ox1[i], oy1[i], 4, 20, 0.35, RAMP_XP);
    }
  }
  if (xp.shown < xp.fill) xp.shown = Math.min(xp.fill, xp.shown + dt * 1.6);
  if (xp.shown >= 0.999) {
    xp.level++;
    xp.fill = Math.max(0, xp.fill - 1);
    xp.shown = 0;
    xp.pop = 0.3;
    play('levelup');
    dogCheer();
    burst(W >> 1, BAR_Y - 5, 14, 40, 0.6, RAMP_SPARK);
  }
  if (toast.on) {
    toast.t += dt;
    if (toast.t > T_IN + T_STAY + T_OUT) toast.on = false;
  }
}

function drawBar(ctx) {
  rect(ctx, BAR_X, BAR_Y, BAR_W, 5, C.OUT);
  rect(ctx, BAR_X + 1, BAR_Y + 1, BAR_W - 2, 1, C.G2);
  rect(ctx, BAR_X + 1, BAR_Y + 2, BAR_W - 2, 2, C.G0);
  const fw = Math.round((BAR_W - 2) * xp.shown);
  if (fw > 0) {
    rect(ctx, BAR_X + 1, BAR_Y + 1, fw, 1, C.XP3);
    rect(ctx, BAR_X + 1, BAR_Y + 2, fw, 1, C.XP2);
    rect(ctx, BAR_X + 1, BAR_Y + 3, fw, 1, C.XP1);
  }
  for (let sx = 10; sx < BAR_W - 1; sx += 10) rect(ctx, BAR_X + sx, BAR_Y + 1, 1, 3, sx <= fw ? C.XP0 : C.OUT);
  if (xp.level > 0) {
    const lift = xp.pop > 0 ? 1 : 0;
    drawIntOutlined(ctx, xp.level, (W - intWidth(xp.level)) >> 1, BAR_Y - 9 - lift, C.XP2, C.OUT);
  }
}

function drawOrbs(ctx) {
  const tk = Math.floor(xp.t * 10);
  for (let i = 0; i < NO; i++) {
    if (!oon[i] || ot[i] < 0) continue;
    const k = easeInOut(ot[i] / odur[i]), u = 1 - k;
    const cx = (ox0[i] + ox1[i]) / 2, cy = Math.min(oy0[i], oy1[i]) - 45;
    const x = Math.round(u * u * ox0[i] + 2 * u * k * cx + k * k * ox1[i]);
    const y = Math.round(u * u * oy0[i] + 2 * u * k * cy + k * k * oy1[i]);
    rect(ctx, x - 1, y - 2, 2, 1, C.XP1);
    rect(ctx, x - 2, y - 1, 4, 2, C.XP2);
    rect(ctx, x - 1, y + 1, 2, 1, C.XP1);
    rect(ctx, x - 1, y - 1, 1, 1, (tk + i) & 1 ? C.Y3 : C.XP3);
  }
}

function drawToast(ctx) {
  if (!toast.on) return;
  const t = toast.t;
  const k = t < T_IN ? t / T_IN : t < T_IN + T_STAY ? 1 : 1 - (t - T_IN - T_STAY) / T_OUT;
  const x = W - Math.round(160 * easeOutCubic(Math.max(0, k)));
  rect(ctx, x + 1, 0, 158, 32, C.OUT);
  rect(ctx, x, 1, 160, 30, C.OUT);
  rect(ctx, x + 1, 1, 158, 30, C.G4);
  rect(ctx, x + 2, 2, 156, 28, C.G0);
  // ícono: carta
  const ix = x + 8, iy = 8;
  rect(ctx, ix, iy + 2, 16, 12, C.OUT);
  rect(ctx, ix + 1, iy + 3, 14, 10, C.WHITE);
  rect(ctx, ix + 1, iy + 12, 14, 1, C.CLOUD);
  for (let i = 0; i < 6; i++) {
    rect(ctx, ix + 1 + i, iy + 3 + i, 1, 1, C.G4);
    rect(ctx, ix + 14 - i, iy + 3 + i, 1, 1, C.G4);
  }
  rect(ctx, ix + 7, iy + 8, 2, 2, C.R1);
  drawText(ctx, toast.title, x + 30, 8, C.MCP, C.MCPS);
  drawText(ctx, toast.name, x + 30, 19, C.WHITE, C.G1);
}

export function drawHUD(ctx) {
  drawBar(ctx);
  drawOrbs(ctx);
  drawToast(ctx);
}
