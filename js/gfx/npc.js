// MiniCrispi: máquina de estados simple (fuera → sube/camina → quieto).
// La posición se mueve suave, pero lo que se dibuja avanza a 10 fps.
// Se dibuja por cortes: la cabeza se mueve aparte del cuerpo y las piernas se alternan al caminar.
// Quieto, casi no se mueve: solo de vez en cuando balancea la cabeza un momento.
// Poses del guion: 'laugh' (se ríe, se sacude) y 'glasses' (se sube los lentes, un gesto corto).
import { W, H } from '../engine/display.js';
import { sprites, CR_W, CR_H, POSE } from './sprites.js';
import { GROUND_Y } from './scene.js';
import { lerp, easeOutBack } from '../util.js';

const OFF = 0, IDLE = 1, RISE = 2, WALK = 3;
const HEAD = 11;  // filas de la cabeza
const LEGS = 21;  // fila donde empiezan las piernas

export const npc = {
  vis: false, mode: OFF, x: 0, y: 0, sy: 0, tx: 0, mt: 0, t: 0, face: -1,
  talking: false, blinkIn: 2, blink: 0, fidget: 0, fidgetIn: 5,
  dx: 0, dy: 0, tk: -1, hop: 0, bob: 0, pose: null, poseT: 0, shake: 0,
};

// seconds = Infinity: la pose se mantiene hasta que se cambie o se quite con npcPose(null)
export function npcPose(name, seconds = Infinity) {
  npc.pose = POSE[name] && name !== 'stand' ? name : null;
  npc.poseT = seconds;
}

export function npcPlace(x) {
  npc.vis = true; npc.mode = IDLE; npc.x = x; npc.y = GROUND_Y; npc.tk = -1;
  npc.face = x > W / 2 ? -1 : 1;
}

export function npcEnter(from, x) {
  npc.vis = true; npc.tk = -1;
  if (from === 'bottom') {
    npc.mode = RISE; npc.mt = 0; npc.x = x;
    npc.sy = H + CR_H + 4; npc.y = npc.sy;
    npc.face = x > W / 2 ? -1 : 1;
  } else {
    npc.x = from === 'left' ? -CR_W : W + CR_W;
    npc.y = GROUND_Y;
    npcWalkTo(x);
  }
}

export function npcWalkTo(x) {
  npc.tx = x; npc.mode = WALK;
  npc.face = x < npc.x ? -1 : 1;
}

export const npcBusy = () => npc.mode === RISE || npc.mode === WALK;
export const npcWalking = () => npc.mode === WALK;

export function updateNpc(dt) {
  if (!npc.vis) return;
  npc.t += dt;
  npc.blinkIn -= dt;
  if (npc.blinkIn <= 0) { npc.blink = 0.14; npc.blinkIn = 2 + Math.random() * 3; }
  if (npc.blink > 0) npc.blink -= dt;
  if (npc.pose) { npc.poseT -= dt; if (npc.poseT <= 0) npc.pose = null; }
  if (npc.mode === IDLE && !npc.talking && !npc.pose) {
    npc.fidgetIn -= dt;
    if (npc.fidgetIn <= 0) { npc.fidget = 1.2; npc.fidgetIn = 5 + Math.random() * 6; }
  }
  if (npc.fidget > 0) npc.fidget -= dt;

  if (npc.mode === RISE) {
    npc.mt += dt;
    const k = Math.min(1, npc.mt / 0.7);
    npc.y = lerp(npc.sy, GROUND_Y, easeOutBack(k));
    if (k >= 1) { npc.y = GROUND_Y; npc.mode = IDLE; }
  } else if (npc.mode === WALK) {
    const step = 64 * dt, d = npc.tx - npc.x;
    if (Math.abs(d) <= step) {
      npc.x = npc.tx; npc.mode = IDLE;
      npc.face = npc.x > W / 2 ? -1 : 1;
    } else npc.x += d > 0 ? step : -step;
  }

  const tk = Math.floor(npc.t * 10);
  if (tk !== npc.tk) {
    npc.tk = tk;
    npc.dx = Math.round(npc.x);
    npc.dy = Math.round(npc.y);
    npc.hop = npc.mode === WALK && (tk & 1) ? 1 : 0;
    npc.bob = npc.mode === IDLE && npc.fidget > 0 && tk % 6 >= 3 ? 1 : 0;
    npc.shake = tk & 2 ? 1 : 0;
  }
}

export function drawNpc(ctx) {
  if (!npc.vis) return;
  const flip = npc.face < 0;
  if (npc.pose && npc.mode === IDLE) {
    const p = POSE[npc.pose], ox = npc.dx - (CR_W >> 1) - (flip ? p.w - CR_W - p.ax : p.ax);
    if (npc.pose === 'laugh') {
      // se encoge de la cintura para arriba al ritmo de la risa; las piernas quedan fijas
      const img = flip ? sprites.crispiLaughFlip : sprites.crispiLaugh, oy = npc.dy - CR_H, lh = CR_H - LEGS;
      ctx.drawImage(img, 0, 0, p.w, LEGS, ox, oy + npc.shake, p.w, LEGS);
      ctx.drawImage(img, 0, LEGS, p.w, lh, ox, oy + LEGS, p.w, lh);
    } else {
      const open = npc.talking && (npc.tk & 1) === 0;
      const set = flip ? sprites.crispiGlassesFlip : sprites.crispiGlasses;
      ctx.drawImage(set[(open ? 2 : 0) + (npc.blink > 0 ? 1 : 0)], ox, npc.dy - CR_H);
    }
    return;
  }
  const open = npc.talking && (npc.tk & 1) === 0;
  const idx = (open ? 2 : 0) + (npc.blink > 0 ? 1 : 0);
  const img = (flip ? sprites.crispiFlip : sprites.crispi)[idx];
  const ox = npc.dx - (CR_W >> 1), oy = npc.dy - CR_H - npc.hop;

  if (npc.mode === WALK) {
    const a = npc.tk & 1, lh = CR_H - LEGS;
    ctx.drawImage(img, 0, HEAD, CR_W, LEGS - HEAD, ox, oy + HEAD, CR_W, LEGS - HEAD);
    ctx.drawImage(img, 0, LEGS, 8, lh, ox, oy + LEGS - a, 8, lh);
    ctx.drawImage(img, 8, LEGS, 8, lh, ox + 8, oy + LEGS - 1 + a, 8, lh);
  } else {
    ctx.drawImage(img, 0, HEAD, CR_W, CR_H - HEAD, ox, oy + HEAD, CR_W, CR_H - HEAD);
  }
  ctx.drawImage(img, 0, 0, CR_W, HEAD, ox, oy + npc.bob, CR_W, HEAD);
}
