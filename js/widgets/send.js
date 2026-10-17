// Botón ENVIAR que se arranca. Primer clic: empieza a moverse lento.
// Cada vez que ella logra presionarlo pega un dash y sigue con otro patrón, más rápido.
// Tras `escapes` dashes se cansa y se deja atrapar.
import { input } from '../engine/input.js';
import { W, shake } from '../engine/display.js';
import { C, rect, RAMP_SPARK, RAMP_SMOKE } from '../engine/palette.js';
import { emit, burst } from '../engine/particles.js';
import { button, BTN_NORMAL, BTN_HOVER, BTN_OFF } from '../gfx/ui.js';
import { hit, clamp, lerp, easeOutCubic } from '../util.js';

const BW = 64, BH = 18;
const MINX = 4, MAXX = W - 4 - BW, MINY = 4, MAXY = 140 - BH;
const AX0 = 56, AX1 = W - 56 - BW, AY0 = 34, AY1 = 108; // zona donde se ancla cada patrón
const DASH = 0.2;

const tri = p => { const f = p - Math.floor(p); return f < 0.5 ? f * 2 : 2 - f * 2; };

export function createSend(escapes, onEscape) {
  let x = (W - BW) >> 1, y = 64, ax = x, ay = y;
  let k = -1;          // -1 quieto, 0..escapes-1 huyendo, escapes = cansado
  let ph = 0, vx = 0, vy = 0, wx = 0, wy = 0;
  let dashT = 0, dsx = 0, dsy = 0, dex = 0, dey = 0;
  let hover = false, t = 0;

  function newWaypoint() { wx = AX0 + Math.random() * (AX1 - AX0); wy = AY0 + Math.random() * (AY1 - AY0); }

  function startDash() {
    // el punto más lejano del cursor entre varios candidatos
    let best = -1;
    for (let i = 0; i < 10; i++) {
      const cx = AX0 + Math.random() * (AX1 - AX0), cy = AY0 + Math.random() * (AY1 - AY0);
      const d = (cx + BW / 2 - input.x) ** 2 + (cy + BH / 2 - input.y) ** 2;
      if (d > best) { best = d; dex = cx; dey = cy; }
    }
    dsx = x; dsy = y; dashT = DASH;
    shake(1, 4);
    burst(x + BW / 2, y + BH / 2, 10, 50, 0.4, RAMP_SMOKE);
  }

  const self = {
    done: false, label: 'ENVIAR',
    update(dt) {
      t += dt;
      hover = hit(x, y, BW, BH, input.x, input.y);
      if (hover && !self.done) input.cursor = 1;

      if (dashT > 0) {
        dashT -= dt;
        const e = easeOutCubic(1 - Math.max(0, dashT) / DASH);
        x = lerp(dsx, dex, e); y = lerp(dsy, dey, e);
        emit(x + Math.random() * BW, y + Math.random() * BH, 0, 0, 0.3, RAMP_SPARK);
        if (dashT <= 0) {
          ax = dex; ay = dey; ph = 0;
          const sp = 45 + k * 9, a = Math.random() * Math.PI * 2;
          vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
          newWaypoint();
        }
        return;
      }

      if (input.pressed && hover && !self.done) {
        if (k < 0) { k = 0; ax = x; ay = y; ph = 0; onEscape(0); }
        else if (k < escapes) { startDash(); k++; onEscape(k); }
        else {
          self.done = true;
          shake(2, 6);
          burst(x + BW / 2, y + BH / 2, 24, 60, 0.7, RAMP_SPARK);
        }
        return;
      }
      if (k < 0 || self.done) return;
      if (k >= escapes) { // cansado: tiembla en su lugar
        if (Math.random() < 0.05) emit(x + BW - 3, y + 2, 4, 6, 0.5, RAMP_SMOKE, 40);
        return;
      }

      const sp = 0.7 + k * 0.28;
      ph += dt * sp;
      let ox = 0, oy = 0, abs = false;
      switch (k % 12) {
        case 0: ox = Math.sin(ph) * 34; break;                                   // vaivén
        case 1: oy = Math.sin(ph) * 26; break;                                   // sube y baja
        case 2: ox = Math.cos(ph) * 32; oy = Math.sin(ph) * 22; break;           // círculo
        case 3:                                                                  // rebota en los bordes
          abs = true; x += vx * dt; y += vy * dt;
          if (x < MINX || x > MAXX) vx = -vx;
          if (y < MINY || y > MAXY) vy = -vy;
          break;
        case 4: ox = Math.sin(ph) * 44; oy = Math.sin(ph * 2) * 20; break;       // ocho
        case 5: ox = tri(ph * 0.25) * 80 - 40; oy = (tri(ph * 1.5) * 2 - 1) * 14; break; // zigzag
        case 6: {                                                                // cuadrado
          const p = (ph * 0.4) % 4, f = p - Math.floor(p), s = 30;
          if (p < 1) { ox = -s + 2 * s * f; oy = -s * 0.6; }
          else if (p < 2) { ox = s; oy = -s * 0.6 + 1.2 * s * f; }
          else if (p < 3) { ox = s - 2 * s * f; oy = s * 0.6; }
          else { ox = -s; oy = s * 0.6 - 1.2 * s * f; }
          break;
        }
        case 7: {                                                                // huye del cursor
          abs = true;
          const dx = x + BW / 2 - input.x, dy = y + BH / 2 - input.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (d < 55) { x += (dx / d) * 95 * dt; y += (dy / d) * 95 * dt; }
          else { x += (ax - x) * 0.8 * dt; y += (ay - y) * 0.8 * dt; }
          break;
        }
        case 8: {                                                                // espiral
          const r = 8 + (Math.sin(ph * 0.4) * 0.5 + 0.5) * 40;
          ox = Math.cos(ph * 1.5) * r; oy = Math.sin(ph * 1.5) * r * 0.6;
          break;
        }
        case 9: {                                                                // puntos al azar
          abs = true;
          const dx = wx - x, dy = wy - y, d = Math.sqrt(dx * dx + dy * dy);
          const v = 95 + k * 4;
          if (d < 3) newWaypoint();
          else { x += (dx / d) * v * dt; y += (dy / d) * v * dt; }
          break;
        }
        case 10: ox = Math.sin(ph * 1.5) * 48; oy = Math.sin(ph) * 26; break;   // lissajous
        case 11: {                                                               // orbita el cursor
          abs = true;
          const gx = input.x + Math.cos(ph * 1.6) * 46 - BW / 2, gy = input.y + Math.sin(ph * 1.6) * 32 - BH / 2;
          x += (gx - x) * 4 * dt; y += (gy - y) * 4 * dt;
          break;
        }
      }
      if (!abs) { x = ax + ox; y = ay + oy; }
      x = clamp(x, MINX, MAXX); y = clamp(y, MINY, MAXY);
    },
    draw(ctx) {
      let dx = Math.round(x), dy = Math.round(y);
      if (k >= escapes && !self.done) dx += (Math.floor(t * 12) & 1); // tiritando
      button(ctx, dx, dy, BW, BH, self.label, self.done ? BTN_OFF : hover ? BTN_HOVER : BTN_NORMAL);
      if (k >= escapes && !self.done) rect(ctx, dx + BW - 3, dy - 3, 1, 2, C.SKY3); // gota de sudor
    },
  };
  return self;
}
