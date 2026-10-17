// Partículas en un pool preasignado. Cada una recorre una rampa de la paleta durante su vida.
import { RAMPS, rect } from './palette.js';

const N = 384;
const px = new Float32Array(N), py = new Float32Array(N);
const vx = new Float32Array(N), vy = new Float32Array(N);
const age = new Float32Array(N), life = new Float32Array(N), grav = new Float32Array(N);
const ramp = new Uint8Array(N), on = new Uint8Array(N);
let cursor = 0;

export function emit(x, y, vx_, vy_, life_, ramp_, g = 0) {
  for (let k = 0; k < N; k++) {
    const i = (cursor + k) % N;
    if (on[i]) continue;
    on[i] = 1; px[i] = x; py[i] = y; vx[i] = vx_; vy[i] = vy_;
    age[i] = 0; life[i] = life_; ramp[i] = ramp_; grav[i] = g;
    cursor = (i + 1) % N;
    return;
  }
}

export function burst(x, y, n, speed, life_, ramp_, g = 0) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
    emit(x, y, Math.cos(a) * s, Math.sin(a) * s, life_ * (0.6 + Math.random() * 0.4), ramp_, g);
  }
}

export function updateParticles(dt) {
  for (let i = 0; i < N; i++) {
    if (!on[i]) continue;
    age[i] += dt;
    if (age[i] >= life[i]) { on[i] = 0; continue; }
    vy[i] += grav[i] * dt;
    px[i] += vx[i] * dt;
    py[i] += vy[i] * dt;
  }
}

export function drawParticles(ctx) {
  for (let i = 0; i < N; i++) {
    if (!on[i]) continue;
    const r = RAMPS[ramp[i]];
    let k = (age[i] / life[i] * r.length) | 0;
    if (k >= r.length) k = r.length - 1;
    rect(ctx, Math.round(px[i]), Math.round(py[i]), 1, 1, r[k]);
  }
}
