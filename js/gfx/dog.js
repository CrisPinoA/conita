// Molly (nariz negra) y Kitty (nariz café): de vez en cuando entran juntas a la pantalla,
// hacen un par de cosas (sentarse, jugar a perseguirse, saltar, pasear, mirar) y se van.
// No siguen a nadie. Si están en pantalla cuando sube un nivel, saltan de alegría.
// La primera vez entran por guion (dogsEnter) y se quedan sentadas hasta dogsFree();
// recién ahí empiezan a ir y venir solas. Corriendo, jugando o saltando se dibujan paradas.
import { W } from '../engine/display.js';
import { sprites, DOG_W, DOG_H, POSE } from './sprites.js';
import { GROUND_Y } from './scene.js';
import { npc } from './npc.js';
import { clamp } from '../util.js';

const HEAD = 9; // filas de la cabeza (orejas a nariz)
const JUMP = Uint8Array.of(0, 3, 5, 5, 3, 0);
const LANE = 2;
const OFF = 0, ENTER = 1, ACT = 2, EXIT = 3, HOLD = 4;
const SIT = 0, PLAY = 1, HOP = 2, WANDER = 3, LOOK = 4, N_ACTS = 5;

function makeDog(kitty) {
  return {
    kitty, x: -100, tx: -100, speed: 80, face: 1, running: false,
    t: Math.random() * 5, tk: -1, dx: 0, hop: 0, bob: 0, jump: 0, cheer: 0,
    vface: 1, vstand: false, vrun: false, // lo que se dibuja: se fija a 10 fps junto con dx
    blinkIn: 2 + Math.random() * 3, blink: 0,
  };
}
export const dogs = [makeDog(false), makeDog(true)];
const pair = { mode: OFF, auto: false, scripted: false, stand: false, wait: 8, t: 0, act: SIT, actT: 0, left: 0, cx: 160 };

// Entrada por guion: llegan a x (por el lado más cercano) y se quedan sentadas mirándose
export function dogsEnter(x = 110) {
  const side = x < W / 2 ? -1 : 1;
  pair.cx = x; pair.scripted = true; pair.stand = false;
  for (let i = 0; i < 2; i++) dogs[i].x = side < 0 ? -DOG_W - i * 22 : W + DOG_W + i * 22;
  sendTo(x - 9 * side, x + 9 * side, 80);
  pair.mode = ENTER;
}
export const dogsArrived = () => pair.mode === HOLD;

// Desde aquí van y vienen solas. Si estaban en pantalla, siguen con sus cosas antes de irse.
export function dogsFree() {
  pair.auto = true; pair.scripted = false;
  if (pair.mode === HOLD || pair.mode === ENTER) { pair.mode = ACT; pair.left = 2 + ((Math.random() * 2) | 0); startAct(); }
}

export function dogCheer(seconds = 1.2) {
  if (pair.mode === OFF) return;
  dogs[0].cheer = seconds; dogs[1].cheer = seconds;
}

// Un lugar lejos de MiniCrispi
function pickCenter() {
  let best = W / 2, bestD = -1;
  for (let i = 0; i < 10; i++) {
    const x = 40 + Math.random() * (W - 80), d = Math.abs(x - npc.x);
    if (d > 60) return x;
    if (d > bestD) { bestD = d; best = x; }
  }
  return best;
}

function sendTo(a, b, speed) {
  dogs[0].tx = a; dogs[1].tx = b;
  dogs[0].speed = speed; dogs[1].speed = speed;
  dogs[0].running = dogs[1].running = true; // para que no cuenten como llegadas antes de moverse
}

function enter() {
  const side = Math.random() < 0.5 ? -1 : 1;
  pair.stand = false;
  pair.cx = pickCenter();
  for (let i = 0; i < 2; i++) dogs[i].x = side < 0 ? -DOG_W - i * 22 : W + DOG_W + i * 22;
  sendTo(pair.cx - 9 * side, pair.cx + 9 * side, 80);
  pair.mode = ENTER;
}

function startAct() {
  pair.act = (Math.random() * N_ACTS) | 0;
  pair.actT = 2.2 + Math.random() * 2;
  pair.t = 0;
  pair.stand = pair.act === PLAY || pair.act === HOP || (pair.act === WANDER && Math.random() < 0.5);
  if (pair.act === SIT) sendTo(pair.cx - 9, pair.cx + 9, 35);
  else if (pair.act === PLAY) { dogs[0].speed = 95; dogs[1].speed = 95; }
  else if (pair.act === HOP) dogCheer(pair.actT);
  else if (pair.act === WANDER) {
    pair.cx = clamp(pair.cx + Math.random() * 80 - 40, 30, W - 30);
    sendTo(pair.cx - 8 - Math.random() * 12, pair.cx + 8 + Math.random() * 12, 35);
  } else if (pair.act === LOOK) {
    dogs[0].face = Math.random() < 0.5 ? 1 : -1;
    dogs[1].face = Math.random() < 0.5 ? 1 : -1;
  }
}

function exit() {
  const side = Math.random() < 0.5 ? -1 : 1;
  const base = side < 0 ? -DOG_W * 2 : W + DOG_W * 2;
  const order = dogs[0].x < dogs[1].x === side < 0 ? 0 : 12; // la que va adelante sale primero
  sendTo(base + side * order, base + side * (12 - order), 85);
  pair.mode = EXIT;
}

export function updateDogs(dt) {
  if (!npc.vis) return; // recién después del primer clic
  pair.t += dt;
  const settled = !dogs[0].running && !dogs[1].running;
  if (pair.mode === OFF) {
    if (!pair.auto) return;
    pair.wait -= dt;
    if (pair.wait <= 0) enter();
  } else if (pair.mode === ENTER) {
    if (settled && pair.scripted) pair.mode = HOLD;
    else if (settled) { pair.mode = ACT; pair.left = 2 + ((Math.random() * 3) | 0); startAct(); }
  } else if (pair.mode === ACT) {
    if (pair.act === PLAY) { // se persiguen alrededor del centro
      dogs[0].tx = pair.cx + Math.sin(pair.t * 2.4) * 26;
      dogs[1].tx = pair.cx + Math.sin(pair.t * 2.4 + 2.2) * 26;
    } else if (pair.act === LOOK && pair.t > pair.actT * 0.5 && pair.t - dt <= pair.actT * 0.5) {
      dogs[1].face = -dogs[1].face;
    }
    pair.actT -= dt;
    if (pair.actT <= 0) { if (--pair.left <= 0) exit(); else startAct(); }
  } else if (pair.mode === EXIT) {
    if (settled) { pair.mode = OFF; pair.wait = 14 + Math.random() * 14; }
  }

  for (let i = 0; i < 2; i++) {
    const d = dogs[i], other = dogs[1 - i];
    d.t += dt;
    d.blinkIn -= dt;
    if (d.blinkIn <= 0) { d.blink = 0.12; d.blinkIn = 2.5 + Math.random() * 3; }
    if (d.blink > 0) d.blink -= dt;
    if (d.cheer > 0) d.cheer -= dt;
    // Con histéresis: empieza a correr si el destino está a más de 2 px y para solo al llegar.
    // Jugando a perseguirse, el destino se mueve todo el rato: siguen corriendo sin cortes.
    const diff = d.tx - d.x, step = d.speed * dt, chasing = pair.mode === ACT && pair.act === PLAY;
    if (!d.running && Math.abs(diff) > 2) d.running = true;
    if (d.running) {
      const mv = Math.abs(diff) <= step ? diff : diff > 0 ? step : -step;
      d.x += mv;
      if (mv > 0.05) d.face = 1; else if (mv < -0.05) d.face = -1;
      if (d.x === d.tx && !chasing) d.running = false;
    } else if (!(pair.mode === ACT && pair.act === LOOK) && Math.abs(other.x - d.x) >= 6) {
      d.face = other.x > d.x ? 1 : -1; // se miran entre ellas (encima una de otra, no se dan vuelta)
    }
    const tk = Math.floor(d.t * 10);
    if (tk !== d.tk) {
      d.tk = tk;
      d.dx = Math.round(d.x);
      d.vface = d.face;
      d.vrun = d.running;
      d.vstand = d.running || d.cheer > 0 || pair.stand;
      d.hop = d.vrun ? ((tk & 1) ? (d.speed > 50 ? 2 : 1) : 0) : 0;
      d.bob = !d.vrun && tk % 10 >= 5 ? 1 : 0;
      d.jump = d.cheer > 0 ? JUMP[tk % 6] : 0;
    }
  }
}

function drawOne(ctx, d) {
  const fast = d.cheer > 0 || d.vrun;
  const tail = fast ? (d.tk & 1) : (d.tk % 8 < 2 ? 1 : 0);
  const idx = tail * 2 + (d.blink > 0 ? 1 : 0);
  const stand = d.vstand, flip = d.vface < 0;
  const set = d.kitty
    ? (stand ? (flip ? sprites.kittyStandFlip : sprites.kittyStand) : (flip ? sprites.kittyFlip : sprites.kitty))
    : (stand ? (flip ? sprites.mollyStandFlip : sprites.mollyStand) : (flip ? sprites.mollyFlip : sprites.molly));
  const img = set[idx];
  const w = stand ? POSE.stand.w : DOG_W, ax = stand ? (flip ? w - DOG_W - POSE.stand.ax : POSE.stand.ax) : 0;
  // Kitty va 2 px más adelante (más cerca de la cámara) y se dibuja encima: al cruzarse se lee como dos perritas
  const ox = d.dx - (DOG_W >> 1) - ax, oy = GROUND_Y - DOG_H - d.hop - d.jump + (d.kitty ? LANE : 0);
  ctx.drawImage(img, 0, HEAD, w, DOG_H - HEAD, ox, oy + HEAD, w, DOG_H - HEAD);
  ctx.drawImage(img, 0, 0, w, HEAD, ox, oy + d.bob, w, HEAD);
}

export function drawDogs(ctx) {
  if (pair.mode === OFF) return;
  drawOne(ctx, dogs[0]);
  drawOne(ctx, dogs[1]);
}
