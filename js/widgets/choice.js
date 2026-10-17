// Selección única o múltiple. Se puede cambiar la elección hasta presionar "Listo".
// Las opciones largas se parten en varias líneas y el botón crece en alto.
import { input } from '../engine/input.js';
import { C, rect } from '../engine/palette.js';
import { wrap, drawRange, LINE_H } from '../engine/font.js';
import { panel, button, BTN_NORMAL, BTN_HOVER, BTN_OFF, BTN_SEL, BTN_SEL_HOVER } from '../gfx/ui.js';
import { hit } from '../util.js';

const OH = 14, GAP = 3, CBW = 50;

export function createChoice(step) {
  const w = step.w || 200;
  const pairs = [];
  const n = wrap(step.prompt, w - 12, pairs);
  const opts = step.options, m = opts.length, multi = !!step.multi;
  const bw = w - 12, textW = bw - 12 - (multi ? 12 : 0);
  const lines = [], oh = new Uint8Array(m), off = new Uint16Array(m);
  let total = 0;
  for (let i = 0; i < m; i++) {
    const lp = [], k = wrap(opts[i], textW, lp);
    lines.push(lp);
    oh[i] = Math.max(OH, (k - 1) * LINE_H + 7 + 7);
    off[i] = total;
    total += oh[i] + GAP;
  }
  const h = 6 + n * LINE_H + 4 + total + 18;
  const x = step.x ?? 16, y = step.y ?? Math.max(4, (140 - h) >> 1);
  const oy0 = y + 6 + n * LINE_H + 4, bx = x + 6;
  const cbx = x + w - 6 - CBW, cby = y + h - 6 - 14;
  const sel = new Uint8Array(m);
  let t = 0, hover = -1, confHover = false, any = false;

  // cada opción flota un poco, desfasada de las otras
  const bob = (tk, i) => ((tk + i * 3) % 10 < 5 ? 0 : 1);

  const self = {
    done: false, value: null, cx: x + (w >> 1), cy: y + (h >> 1),
    update(dt) {
      t += dt;
      const tk = Math.floor(t * 10);
      hover = -1;
      for (let i = 0; i < m; i++) if (hit(bx, oy0 + off[i] + bob(tk, i), bw, oh[i], input.x, input.y)) hover = i;
      confHover = any && hit(cbx, cby, CBW, 14, input.x, input.y);
      if (hover >= 0 || confHover) input.cursor = 1;
      if (!input.pressed) return;
      if (hover >= 0) {
        if (multi) sel[hover] ^= 1;
        else { sel.fill(0); sel[hover] = 1; }
        any = sel.includes(1);
      } else if (confHover) {
        self.done = true;
        self.value = multi ? opts.filter((_, i) => sel[i]) : opts[sel.indexOf(1)];
      }
    },
    draw(ctx) {
      const tk = Math.floor(t * 10);
      panel(ctx, x, y, w, h);
      for (let i = 0; i < n; i++) drawRange(ctx, step.prompt, pairs[i * 2], pairs[i * 2 + 1], x + 6, y + 6 + i * LINE_H, C.G1);
      for (let i = 0; i < m; i++) {
        const oy = oy0 + off[i] + bob(tk, i), bh = oh[i];
        const st = sel[i] ? (hover === i ? BTN_SEL_HOVER : BTN_SEL) : hover === i ? BTN_HOVER : BTN_NORMAL;
        button(ctx, bx, oy, bw, bh, opts[i], st, true, lines[i]);
        if (multi) {
          const cy = oy + ((bh - 8) >> 1);
          rect(ctx, bx + bw - 12, cy, 8, 8, C.OUT);
          rect(ctx, bx + bw - 11, cy + 1, 6, 6, sel[i] ? C.XP2 : C.G1);
        }
      }
      button(ctx, cbx, cby, CBW, 14, 'Listo', !any ? BTN_OFF : confHover ? BTN_HOVER : BTN_NORMAL);
    },
  };
  return self;
}
