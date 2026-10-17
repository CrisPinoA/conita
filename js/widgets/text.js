// Texto libre. Se escribe en un <textarea> invisible y el texto se dibuja en el canvas
// con la fuente pixel, así se ve igual que todo lo demás (y funcionan tildes, pegar, flechas).
import { input } from '../engine/input.js';
import { display } from '../engine/display.js';
import { C, rect } from '../engine/palette.js';
import { wrap, drawRange, drawText, drawInt, measureRange, LINE_H } from '../engine/font.js';
import { panel, button, field, BTN_NORMAL, BTN_HOVER, BTN_OFF } from '../gfx/ui.js';
import { hit } from '../util.js';

const CBW = 50, BOTTOM = 163;

export function createText(step) {
  const ta = document.getElementById('typer');
  const w = step.w || 240, FL = step.lines || 5, max = step.max || 500;
  const pairs = [];
  const n = step.prompt ? wrap(step.prompt, w - 12, pairs) : 0; // sin enunciado: solo el campo
  const fh = FL * LINE_H + 5;
  const h = 6 + n * LINE_H + 4 + fh + 6 + 14 + 6;
  // y: 'bottom' pega el panel abajo (sobre la barra de experiencia) y deja libre el cielo
  const x = step.x ?? 14, y = step.y === 'bottom' ? BOTTOM - h : step.y ?? Math.max(4, (140 - h) >> 1);
  const fx = x + 6, fy = y + 6 + n * LINE_H + 4, fw = w - 12;
  const cbx = x + w - 6 - CBW, cby = y + h - 6 - 14;
  const hint = step.placeholder || 'Escribe aquí...';

  let str = '', has = false, top = 0, t = 0, confHover = false;
  const lines = [];
  let nl = wrap(str, fw - 6, lines);

  const onInput = () => {
    str = ta.value;
    nl = wrap(str, fw - 6, lines);
    has = str.trim().length > 0;
  };
  // el textarea va sobre el campo para que el IME/los acentos aparezcan en el lugar correcto
  const place = () => {
    const d = display;
    ta.style.left = (d.offX + fx * d.scale) / d.dpr + 'px';
    ta.style.top = (d.offY + fy * d.scale) / d.dpr + 'px';
    ta.style.width = (fw * d.scale) / d.dpr + 'px';
    ta.style.height = (fh * d.scale) / d.dpr + 'px';
  };

  ta.value = '';
  ta.maxLength = max;
  ta.addEventListener('input', onInput);
  display.resizeHooks.push(place);
  place();
  ta.focus();
  input.keepFocus = true;

  function close() {
    ta.removeEventListener('input', onInput);
    const i = display.resizeHooks.indexOf(place);
    if (i >= 0) display.resizeHooks.splice(i, 1);
    ta.blur();
    ta.style.left = '-2000px';
    input.keepFocus = false;
  }

  const self = {
    done: false, value: null, cx: x + (w >> 1), cy: y + (h >> 1),
    update(dt) {
      t += dt;
      confHover = has && hit(cbx, cby, CBW, 14, input.x, input.y);
      if (confHover) input.cursor = 1;
      if (input.pressed) {
        if (confHover) { self.done = true; self.value = str.trim(); close(); return; }
        if (document.activeElement !== ta) ta.focus();
      }
    },
    draw(ctx) {
      panel(ctx, x, y, w, h);
      for (let i = 0; i < n; i++) drawRange(ctx, step.prompt, pairs[i * 2], pairs[i * 2 + 1], x + 6, y + 6 + i * LINE_H, C.G1);
      field(ctx, fx, fy, fw, fh, true);

      // línea donde está el cursor, y desplazamiento para que siempre se vea
      const caret = Math.min(ta.selectionEnd, str.length);
      let cl = nl - 1;
      for (let i = 0; i < nl; i++) if (caret <= lines[i * 2 + 1]) { cl = i; break; }
      if (cl < top) top = cl;
      if (cl >= top + FL) top = cl - FL + 1;

      if (str.length === 0) drawText(ctx, hint, fx + 3, fy + 4, C.G2);
      for (let i = top; i < nl && i < top + FL; i++) {
        drawRange(ctx, str, lines[i * 2], lines[i * 2 + 1], fx + 3, fy + 4 + (i - top) * LINE_H, C.WHITE, C.G1);
      }
      if ((Math.floor(t * 3) & 1) === 0) {
        const a = lines[cl * 2];
        const cx = fx + 3 + measureRange(str, a, caret) + (caret > a ? 2 : 0);
        const cy = fy + 4 + (cl - top) * LINE_H;
        if (caret === str.length) rect(ctx, cx, cy + 8, 5, 1, C.WHITE);
        else rect(ctx, cx - 1, cy - 1, 1, 10, C.WHITE);
      }
      // contador
      const ex = drawInt(ctx, str.length, x + 6, cby + 4, C.G2);
      drawText(ctx, '/', ex, cby + 4, C.G2);
      drawInt(ctx, max, ex + 5, cby + 4, C.G2);
      button(ctx, cbx, cby, CBW, 14, 'Listo', !has ? BTN_OFF : confHover ? BTN_HOVER : BTN_NORMAL);
    },
  };
  return self;
}
