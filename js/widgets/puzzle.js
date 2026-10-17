// Puzzle deslizante 3x3: la pregunta está escrita sobre un arcoíris con dithering y partida en
// piezas desordenadas, con un hueco. Clic en una pieza junto al hueco la desliza. Al armarlo se
// completa la pieza que faltaba y aparece a la derecha un campo para responder.
// Ayuda: a los 45 s MiniCrispi ofrece armarlo (botones en su globo; si acepta, te llega un aviso).
// Atajo oculto: clic en el sol lo arma solo. Las dos cosas quedan anotadas en la respuesta (nota).
// step: { prompt, answerX, answerW, lines, max }
import { input } from '../engine/input.js';
import { C, putPx, layer, dither, rect, RAMP_SPARK } from '../engine/palette.js';
import { burst } from '../engine/particles.js';
import { wrap, drawRange, drawText, measure, measureRange, LINE_H } from '../engine/font.js';
import { panel, say, bubble, bubbleHide } from '../gfx/ui.js';
import { SUN } from '../gfx/scene.js';
import { notifyEvent } from '../api.js';
import { createText } from './text.js';
import { hit, clamp } from '../util.js';

const N = 3, T = 44, P = N * T, EMPTY = N * N - 1;
const SLIDE = 0.12, REVEAL = 0.9;           // segundos: deslizar una pieza, pausa al armarlo
const BANDS = [C.R2, C.Y2, C.GR3, C.B2, C.SKY1];
const HINT = 'Ordena las piezas';
const HELP_AFTER = 45, AUTO_SLIDE = 0.16;
const HELP_TEXT = 'Si está muy difícil, lo puedo armar por ti.';
const HELP_YES = 'Porfa, soy muy tonta', HELP_NO = 'No, yo puedo';

// Arcoíris en diagonal: cada banda es sólida y solo la transición a la siguiente lleva dithering
function buildImage(question) {
  const img = layer(P, P, d => {
    const K = BANDS.length - 1;
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      const f = ((x + y) / (2 * P - 2)) * K, i = Math.min(K - 1, f | 0), fr = f - i;
      const lv = clamp(Math.round((fr - 0.55) / 0.45 * 16), 0, 16);
      putPx(d, x, y, dither(x, y, lv) ? BANDS[i + 1] : BANDS[i]);
    }
  });
  // texto: la pregunta grande (2x) y el paréntesis final normal (1x), centrados
  const g = img.getContext('2d');
  const cut = question.lastIndexOf('(');
  const big = cut > 0 ? question.slice(0, cut).trim() : question, small = cut > 0 ? question.slice(cut) : '';
  const pairs = [], nb = wrap(big, (P - 8) >> 1, pairs);
  const total = nb * LINE_H * 2 + (small ? LINE_H + 2 : 0) - 4;
  let ty = (P - total) >> 1;
  for (let i = 0; i < nb; i++) {
    const a = pairs[i * 2], b = pairs[i * 2 + 1], lw = measureRange(big, a, b) * 2;
    drawRange(g, big, a, b, (P - lw) >> 1, ty, C.WHITE, C.OUT, 2);
    ty += LINE_H * 2;
  }
  if (small) drawText(g, small, (P - measure(small)) >> 1, ty + 2, C.WHITE, C.OUT);
  return img;
}

// Desordena con movimientos válidos desde el puzzle armado: siempre tiene solución
function shuffle(board) {
  let hole = EMPTY, prev = -1;
  const nb = [];
  for (let k = 0; k < 90 || solved(board); k++) {
    nb.length = 0;
    const hx = hole % N, hy = (hole / N) | 0;
    if (hx > 0) nb.push(hole - 1);
    if (hx < N - 1) nb.push(hole + 1);
    if (hy > 0) nb.push(hole - N);
    if (hy < N - 1) nb.push(hole + N);
    let p;
    do p = nb[(Math.random() * nb.length) | 0]; while (p === prev && nb.length > 1);
    board[hole] = board[p]; board[p] = EMPTY; prev = hole; hole = p;
  }
}
function solved(board) {
  for (let i = 0; i < board.length; i++) if (board[i] !== i) return false;
  return true;
}

// Camino más corto (búsqueda en anchura): casillas a mover, en orden, hasta armarlo
function solution(board) {
  const goal = '012345678', start = board.join('');
  const prev = new Map([[start, null]]), q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const s = q[qi];
    if (s === goal) break;
    const h = s.indexOf('8'), hx = h % N, hy = (h / N) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = hx + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = hy + (d === 2 ? 1 : d === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const p = ny * N + nx, a = s.split('');
      a[h] = a[p]; a[p] = '8';
      const k = a.join('');
      if (!prev.has(k)) { prev.set(k, [s, p]); q.push(k); }
    }
  }
  const out = [];
  for (let k = goal; prev.get(k); k = prev.get(k)[0]) out.unshift(prev.get(k)[1]);
  return out;
}

export function createPuzzle(step) {
  const img = buildImage(step.prompt);
  const pw = P + 12, ph = 6 + 9 + 4 + P + 6;
  const x = step.x ?? 8, y = step.y ?? Math.max(4, (150 - ph) >> 1);
  const bx = x + 6, by = y + 6 + 9 + 4;
  const board = new Uint8Array(N * N);
  for (let i = 0; i < board.length; i++) board[i] = i;
  shuffle(board);

  const PLAY = 0, DONE = 1, ANSWER = 2, AUTO = 3;
  let state = PLAY, t = 0, st = 0, hover = -1, text = null;
  let helpT = 0, offered = false, auto = null, ai = 0;

  function slide(p) {
    const hole = board.indexOf(EMPTY);
    mTile = board[p]; mFrom = p; mTo = hole; mt = 0;
    board[hole] = mTile; board[p] = EMPTY;
  }
  function startAuto(note) {
    if (state !== PLAY) return;
    self.note = note;
    if (offered && bubble.choices) bubbleHide();
    auto = solution(board); ai = 0; state = AUTO; hover = -1;
  }
  // pieza deslizándose: de qué casilla a qué casilla
  let mTile = -1, mFrom = 0, mTo = 0, mt = 0;

  const self = {
    done: false, value: null, note: '', cx: bx + (P >> 1), cy: by + (P >> 1), board, bx, by,
    update(dt) {
      t += dt;
      if (state === ANSWER) {
        text.update(dt);
        if (text.done) { self.done = true; self.value = text.value; self.cx = text.cx; self.cy = text.cy; }
        return;
      }
      if (state === DONE) {
        st += dt;
        if (st >= REVEAL) {
          state = ANSWER;
          const ax = step.answerX ?? x + pw + 6;
          text = createText({
            prompt: step.answerPrompt || '', x: ax, y, w: step.answerW ?? 296 - ax,
            lines: step.lines ?? 10, max: step.max ?? 2000,
          });
        }
        return;
      }
      // ayuda: el sol (atajo oculto) o la oferta de MiniCrispi a los 45 s
      if (state === PLAY) {
        const sdx = input.x - SUN.x, sdy = input.y - SUN.y, onSun = sdx * sdx + sdy * sdy <= SUN.r * SUN.r;
        if (onSun && input.pressed) { startAuto('Lo armó solo con el atajo del sol'); return; }
        helpT += dt;
        if (!offered && helpT >= HELP_AFTER) {
          offered = true;
          say(HELP_TEXT, 0, x + pw + 2, [HELP_YES, HELP_NO]);
        }
        if (offered && bubble.choices && bubble.picked >= 0) {
          const yes = bubble.picked === 0;
          bubbleHide();
          if (yes) {
            notifyEvent('ayuda_puzzle', 'Apretó "' + HELP_YES + '" a los ' + Math.round(helpT) + ' s');
            startAuto('Pidió ayuda: apretó "' + HELP_YES + '"');
            return;
          }
          self.note = 'Le ofreciste ayuda y dijo "' + HELP_NO + '"';
        }
      }
      if (mTile >= 0) {
        mt += dt;
        if (mt >= (state === AUTO ? AUTO_SLIDE : SLIDE)) {
          mTile = -1;
          if (solved(board)) {
            state = DONE; st = 0;
            if (bubble.choices) bubbleHide();
            burst(bx + P - (T >> 1), by + P - (T >> 1), 18, 50, 0.7, RAMP_SPARK);
          }
        }
        return;
      }
      if (state === AUTO) {
        if (ai < auto.length) slide(auto[ai++]);
        return;
      }
      hover = -1;
      if (hit(bx, by, P, P, input.x, input.y)) {
        const c = ((input.x - bx) / T) | 0, r = ((input.y - by) / T) | 0, p = r * N + c;
        const hole = board.indexOf(EMPTY), hx = hole % N, hy = (hole / N) | 0;
        if (Math.abs(hx - c) + Math.abs(hy - r) === 1) hover = p;
      }
      if (hover >= 0) {
        input.cursor = 1;
        if (input.pressed) { slide(hover); hover = -1; }
      }
    },
    draw(ctx) {
      panel(ctx, x, y, pw, ph);
      drawText(ctx, HINT, x + ((pw - measure(HINT)) >> 1), y + 6, C.G1);
      rect(ctx, bx - 1, by - 1, P + 2, P + 2, C.OUT);
      if (state === DONE || state === ANSWER) {
        ctx.drawImage(img, bx, by); // armado: la imagen completa, sin cortes
      } else {
        rect(ctx, bx, by, P, P, C.G1);
        for (let p = 0; p < N * N; p++) {
          const tile = board[p];
          if (tile === EMPTY) continue;
          let dx = bx + (p % N) * T, dy = by + ((p / N) | 0) * T;
          if (tile === mTile) {
            const k = Math.min(1, mt / (state === AUTO ? AUTO_SLIDE : SLIDE));
            dx = Math.round(bx + ((mFrom % N) + ((mTo % N) - (mFrom % N)) * k) * T);
            dy = Math.round(by + (((mFrom / N) | 0) + (((mTo / N) | 0) - ((mFrom / N) | 0)) * k) * T);
          }
          ctx.drawImage(img, (tile % N) * T, ((tile / N) | 0) * T, T, T, dx, dy, T, T);
          rect(ctx, dx + T - 1, dy, 1, T, C.OUT);
          rect(ctx, dx, dy + T - 1, T, 1, C.OUT);
          if (p === hover) {
            rect(ctx, dx, dy, T - 1, 1, C.CREAM); rect(ctx, dx, dy, 1, T - 1, C.CREAM);
            rect(ctx, dx + T - 2, dy, 1, T - 1, C.CREAM); rect(ctx, dx, dy + T - 2, T - 1, 1, C.CREAM);
          }
        }
      }
      if (text) text.draw(ctx);
    },
  };
  return self;
}
