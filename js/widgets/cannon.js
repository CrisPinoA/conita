// Cañón: mantener presionado carga la potencia (va y vuelve), soltar dispara.
// La pelota cae exactamente donde indica la potencia: la distancia es el % de la respuesta.
// Se puede repetir las veces que quiera antes de confirmar.
import { input } from '../engine/input.js';
import { shake } from '../engine/display.js';
import { C, rect, dither, putPx, layer, RAMP_DUST, RAMP_SMOKE, RAMP_SPARK } from '../engine/palette.js';
import { emit, burst } from '../engine/particles.js';
import { wrap, drawRange, drawText, drawInt, intWidth, measure, LINE_H } from '../engine/font.js';
import { panel, button, BTN_NORMAL, BTN_HOVER } from '../gfx/ui.js';
import { GROUND_Y } from '../gfx/scene.js';
import { hit, lerp } from '../util.js';

const READY = 0, CHARGE = 1, FLY = 2, LANDED = 3;
const CX = 62, GY = GROUND_Y;     // centro de la rueda en x, suelo
const X0 = 102, X1 = 304;         // 0% y 100%
const MX = CX + 12, MY = GY - 18; // boca del cañón
const EDGE = 0.1;                 // la carga se queda un momento en 0% y en 100% para poder atinarles

let cannonImg = null, ballImg = null;

function build() {
  // cañón a 45°: banda diagonal en coordenadas rotadas (u a lo largo, v perpendicular)
  const ox = 9, oy = 14, L = 12, WD = 3;
  const inB = (x, y) => {
    const dx = x - ox, dy = y - oy, u = dx - dy, v = dx + dy;
    return u >= -2 && u <= 2 * L && Math.abs(v) <= WD;
  };
  cannonImg = layer(28, 22, img => {
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 28; x++) {
        if (!inB(x, y)) continue;
        const v = (x - ox) + (y - oy), u = (x - ox) - (y - oy);
        let ci = C.G2;
        if (!inB(x - 1, y) || !inB(x + 1, y) || !inB(x, y - 1) || !inB(x, y + 1)) ci = C.OUT;
        else if (u >= 2 * L - 2) ci = C.G1;
        else if (v <= -1) ci = C.G4;
        else if (v >= 2) ci = C.G1;
        putPx(img, x, y, ci);
      }
    }
    const wx = 9, wy = 17, r = 4.6;
    for (let y = -5; y <= 5; y++) {
      for (let x = -5; x <= 5; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d > r) continue;
        putPx(img, wx + x, wy + y, d > r - 1.2 ? C.OUT : d < 1.5 ? C.WD3 : x + y > 1 ? C.WD1 : C.WD2);
      }
    }
  });
  ballImg = layer(5, 5, img => {
    const rows = ['.ooo.', 'oaggo', 'ogggo', 'oggdo', '.ooo.'];
    const map = { o: C.OUT, a: C.G4, g: C.G2, d: C.G1 };
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (map[rows[y][x]] !== undefined) putPx(img, x, y, map[rows[y][x]]);
  });
}

export function createCannon(step) {
  if (!cannonImg) build();
  const pw = step.w || 220;
  const pairs = [];
  const n = wrap(step.prompt, pw - 12, pairs);
  const ph = 6 + n * LINE_H + 4 + 14 + 6;
  const px = step.x ?? 90, py = step.y ?? 8;
  const rowY = py + 6 + n * LINE_H + 4;
  const hint = step.hint || 'Mantén presionado y suelta';
  const BW = 70, rbx = px + 6, cbx = px + pw - 6 - BW;

  let state = READY, ct = 0, power = 0, ft = 0, dur = 1, apex = 40, tx = X0;
  let bx = 0, by = 0, recoil = 0, rt = 0, t = 0, trail = 0, hoverR = false, hoverC = false;

  const self = {
    done: false, value: null, cx: X0, cy: GY - 10,
    update(dt) {
      t += dt;
      if (recoil > 0) { rt += dt; if (rt >= 0.1) { rt = 0; recoil--; } }
      if (state === READY) {
        if (input.pressed || input.key) { state = CHARGE; ct = 0; power = 0; }
      } else if (state === CHARGE) {
        ct += dt;
        const p = (ct / 1.3) % 2, tri = p > 1 ? 2 - p : p;
        power = Math.min(1, Math.max(0, (tri - EDGE) / (1 - 2 * EDGE)));
        if (!input.down && !input.keyHeld) {
          state = FLY; ft = 0;
          tx = X0 + power * (X1 - X0);
          dur = 0.5 + power * 0.9;
          apex = Math.min(GY - 20, 22 + power * 75);
          recoil = 2; rt = 0;
          shake(1, 4);
          for (let i = 0; i < 10; i++) emit(MX, MY, 10 + Math.random() * 30, -10 - Math.random() * 30, 0.5 + Math.random() * 0.4, RAMP_SMOKE, -10);
        }
      } else if (state === FLY) {
        ft += dt;
        const k = Math.min(1, ft / dur);
        bx = lerp(MX, tx, k);
        by = lerp(MY, GY - 2, k) - apex * 4 * k * (1 - k);
        if (++trail % 3 === 0) emit(bx, by, 0, -4, 0.4, RAMP_SMOKE);
        if (k >= 1) {
          state = LANDED;
          self.value = Math.round(power * 100);
          self.cx = Math.round(tx);
          shake(2, 8);
          burst(tx, GY - 1, 14, 45, 0.6, RAMP_DUST, 90);
          burst(tx, GY - 12, 6, 25, 0.5, RAMP_SPARK);
        }
      } else {
        hoverR = hit(rbx, rowY, BW, 14, input.x, input.y);
        hoverC = hit(cbx, rowY, BW, 14, input.x, input.y);
        if (hoverR || hoverC) input.cursor = 1;
        if (input.pressed && hoverR) state = READY;
        else if (input.pressed && hoverC) self.done = true;
      }
    },
    // suelo, marcas, cañón y pelota (detrás de la interfaz)
    drawWorld(ctx) {
      for (let p = 0; p <= 100; p += 5) {
        const x = Math.round(X0 + (p / 100) * (X1 - X0));
        if (p % 25 === 0) {
          rect(ctx, x, GY - 3, 1, 5, C.WD0);
          drawInt(ctx, p, x - (intWidth(p) >> 1), GY + 4, C.WHITE, C.OUT);
        } else rect(ctx, x, GY, 1, 2, C.GR0);
      }
      // etiquetas de los extremos (labels: ['0%', '100%']); la de la derecha se alinea al borde
      if (step.labels) {
        const a = step.labels[0], z = step.labels[1];
        drawText(ctx, a, X0 - (measure(a) >> 1), GY + 14, C.CREAM, C.OUT);
        drawText(ctx, z, Math.min(X1 - (measure(z) >> 1), 318 - measure(z)), GY + 14, C.CREAM, C.OUT);
      }
      ctx.drawImage(cannonImg, CX - 9 - recoil, GY - 21 + (recoil >> 1));
      if (state === CHARGE) {
        const mx = CX - 14, my = GY - 40;
        rect(ctx, mx, my, 32, 5, C.OUT);
        rect(ctx, mx + 1, my + 1, 30, 3, C.G1);
        rect(ctx, mx + 1, my + 1, Math.round(30 * power), 3, power < 0.34 ? C.GR3 : power < 0.67 ? C.Y2 : C.R2);
        const ex = drawInt(ctx, Math.round(power * 100), mx + 35, my - 1, C.WHITE, C.OUT);
        drawText(ctx, '%', ex, my - 1, C.WHITE, C.OUT);
      }
      if (state === FLY) ctx.drawImage(ballImg, Math.round(bx) - 2, Math.round(by) - 2);
      if (state === LANDED) {
        const fx = Math.round(tx), wave = Math.floor(t * 6) & 1;
        ctx.drawImage(ballImg, fx - 2, GY - 4);
        rect(ctx, fx + 2, GY - 14, 1, 12, C.WD0);
        rect(ctx, fx + 3, GY - 14, 6, 4, C.R1);
        rect(ctx, fx + 3, GY - 14, 6, 1, C.R2);
        if (wave) rect(ctx, fx + 7, GY - 14, 2, 1, C.R1);
        const lw = intWidth(self.value) + 1 + measure('%');
        const lx = fx + 2 - (lw >> 1);
        const ex = drawInt(ctx, self.value, lx, GY - 25, C.WHITE, C.OUT);
        drawText(ctx, '%', ex, GY - 25, C.WHITE, C.OUT);
      }
    },
    draw(ctx) {
      panel(ctx, px, py, pw, ph);
      for (let i = 0; i < n; i++) drawRange(ctx, step.prompt, pairs[i * 2], pairs[i * 2 + 1], px + 6, py + 6 + i * LINE_H, C.G1);
      if (state === LANDED) {
        button(ctx, rbx, rowY, BW, 14, 'Otra vez', hoverR ? BTN_HOVER : BTN_NORMAL);
        button(ctx, cbx, rowY, BW, 14, '¡Esa!', hoverC ? BTN_HOVER : BTN_NORMAL);
      } else {
        drawText(ctx, hint, px + ((pw - measure(hint)) >> 1), rowY + 4, C.G2);
      }
    },
  };
  return self;
}
