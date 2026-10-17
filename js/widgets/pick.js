// Elegir uno entre varios recuadros con ícono (p. ej. animales). Un clic elige y avanza.
// step: { options: ['Nombre', ...], icons: ['clave', ...] }  (claves de gfx/icons.js)
import { input } from '../engine/input.js';
import { C, rect } from '../engine/palette.js';
import { wrap, drawRange, drawText, measure, LINE_H } from '../engine/font.js';
import { panel } from '../gfx/ui.js';
import { icon } from '../gfx/icons.js';
import { hit } from '../util.js';

const S = 48, GAP = 6, PICKED = 0.35; // lado del recuadro, separación, pausa tras elegir

export function createPick(step) {
  const w = step.w || 228, m = step.options.length;
  const pairs = [];
  const n = wrap(step.prompt, w - 12, pairs);
  const h = 6 + n * LINE_H + 4 + S + 4 + 9 + 4;
  const x = step.x ?? 8, y = step.y ?? Math.max(4, (140 - h) >> 1);
  const sy = y + 6 + n * LINE_H + 4, rowW = m * S + (m - 1) * GAP, sx0 = x + ((w - rowW) >> 1);
  const imgs = step.icons.map(icon);
  let t = 0, hover = -1, picked = -1, pt = 0;

  const self = {
    done: false, value: null, cx: x + (w >> 1), cy: y + (h >> 1),
    update(dt) {
      t += dt;
      if (picked >= 0) {
        pt += dt;
        if (pt >= PICKED) self.done = true;
        return;
      }
      hover = -1;
      for (let i = 0; i < m; i++) if (hit(sx0 + i * (S + GAP), sy, S, S, input.x, input.y)) hover = i;
      if (hover >= 0) input.cursor = 1;
      if (input.pressed && hover >= 0) {
        picked = hover;
        self.value = step.options[picked];
        self.cx = sx0 + picked * (S + GAP) + (S >> 1);
        self.cy = sy + (S >> 1);
      }
    },
    draw(ctx) {
      const tk = Math.floor(t * 10);
      panel(ctx, x, y, w, h);
      for (let i = 0; i < n; i++) drawRange(ctx, step.prompt, pairs[i * 2], pairs[i * 2 + 1], x + 6, y + 6 + i * LINE_H, C.G1);
      for (let i = 0; i < m; i++) {
        const bx = sx0 + i * (S + GAP), on = i === picked || (picked < 0 && i === hover);
        // recuadro estilo casilla de inventario: hundido, se ilumina al pasar el mouse
        rect(ctx, bx, sy, S, S, i === picked ? C.MCY : on ? C.CREAM : C.OUT);
        rect(ctx, bx + 1, sy + 1, S - 2, S - 2, C.G1);
        rect(ctx, bx + 2, sy + 2, S - 3, S - 3, C.G4);
        rect(ctx, bx + 2, sy + 2, S - 4, S - 4, on ? C.G3 : C.G2);
        const img = imgs[i], bob = on && (tk & 2) ? 1 : 0;
        ctx.drawImage(img, bx + ((S - img.width) >> 1), sy + ((S - img.height) >> 1) - bob);
        const name = step.options[i];
        drawText(ctx, name, bx + ((S - measure(name)) >> 1), sy + S + 4, on ? C.OUT : C.G1);
      }
    },
  };
  return self;
}
