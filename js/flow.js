// Recorre el guion de config.js paso a paso. Cortes secos entre pasos.
import { SCRIPT, CONFIG } from './config.js';
import { input } from './engine/input.js';
import { W } from './engine/display.js';
import { C } from './engine/palette.js';
import { drawText, measure } from './engine/font.js';
import { play, unlockAudio } from './engine/audio.js';
import { npc, npcEnter, npcWalkTo, npcPlace, npcBusy, npcPose } from './gfx/npc.js';
import { say, bubbleDone, bubbleSkip, bubbleHide, panel } from './gfx/ui.js';
import { awardXP, xp, showToast } from './gfx/hud.js';
import { dogCheer, dogsEnter, dogsArrived, dogsFree } from './gfx/dog.js';
import { planeFly } from './gfx/plane.js';
import { createChoice } from './widgets/choice.js';
import { createText } from './widgets/text.js';
import { createCannon } from './widgets/cannon.js';
import { createPick } from './widgets/pick.js';
import { createPuzzle } from './widgets/puzzle.js';
import { createSend } from './widgets/send.js';
import * as api from './api.js';
import * as store from './store.js';

const WIDGETS = { choice: createChoice, text: createText, cannon: createCannon, pick: createPick, puzzle: createPuzzle };
const GESTURE = 1.1;     // segundos que dura subirse los lentes
const COMMENT_HOLD = 2.6; // segundos que queda el comentario después de escribirse

// Una línea del guion es un texto o [pose, texto]
function sayLine(line) {
  const pose = typeof line === 'string' ? null : line[0];
  say(typeof line === 'string' ? line : line[1]);
  npcPose(pose, pose === 'glasses' ? GESTURE : Infinity);
}

// Comentario de MiniCrispi mientras la pregunta está abierta: se escribe, espera y se va solo
// (el globo se queda a la derecha del panel para no tapar el botón "Listo")
function sayComment(line, s) {
  const pose = typeof line === 'string' ? null : line[0], str = typeof line === 'string' ? line : line[1];
  say(str, COMMENT_HOLD, (s.x ?? 14) + (s.w ?? 240) + 2);
  npcPose(pose, pose === 'glasses' ? GESTURE : str.length / 45 + COMMENT_HOLD);
}

const flow = {
  mode: 'loading', // loading → start → run → final
  i: -1, step: null, t: 0, line: 0, widget: null,
  resumeAt: 0, resuming: false, answers: [], qStart: 0,
  sendPhase: 0, result: null, sentAt: 0, commentIn: -1,
};

// para pruebas desde la consola
export const currentWidget = () => flow.widget;
export const currentStep = () => (flow.mode === 'run' ? flow.step : null);
export const flowMode = () => flow.mode;

export function statusReady(status) {
  const local = store.getDone();
  if ((status && status.done) || local) {
    xp.level = SCRIPT.filter(st => st.type === 'ask').length; // al reabrir, la barra muestra el nivel que alcanzó
    goFinal((status && status.at) || (local && local.at) || Date.now(), false);
    return;
  }
  const p = store.getProgress();
  if (p && p.i > 0 && p.i < SCRIPT.length) {
    flow.resumeAt = p.i;
    flow.answers = p.answers || [];
    xp.level = flow.answers.length;
    for (let k = 0; k < p.i; k++) if (SCRIPT[k].type === 'dogs') dogsFree();
  }
  flow.mode = 'start';
}

function begin(k) {
  flow.i = k; flow.t = 0; flow.line = 0; flow.widget = null;
  const s = flow.step = SCRIPT[k];
  if (!s) return;
  switch (s.type) {
    case 'enter': npcEnter(s.from || 'bottom', s.x ?? CONFIG.npcHomeX); break;
    case 'move': npcWalkTo(s.x); break;
    case 'say': sayLine(s.lines[0]); break;
    case 'dogs': if (s.do === 'enter') dogsEnter(s.x); else dogsFree(); break;
    case 'ask':
      flow.widget = WIDGETS[s.widget](s);
      flow.qStart = performance.now();
      if (s.plane) planeFly(s.plane, s.planeDelay ?? 3);
      flow.commentIn = s.comment ? (s.commentDelay ?? 1.2) : -1;
      break;
    case 'send':
      flow.sendPhase = 0;
      flow.widget = createSend(CONFIG.sendEscapes, i => {
        const line = CONFIG.sendTaunts[i];
        if (line) say(line, 1.4);
      });
      break;
  }
}

// note: dato extra que dejó el widget (p. ej. si pidió ayuda en el puzzle)
function record(s, value, note) {
  const a = {
    id: s.id,
    pregunta: s.prompt,
    respuesta: value,
    segundos: Math.round((performance.now() - flow.qStart) / 1000),
  };
  if (note) a.nota = note;
  flow.answers.push(a);
  store.saveProgress({ i: flow.i + 1, answers: flow.answers });
}

function goFinal(at, animate) {
  flow.mode = 'final';
  flow.widget = null;
  bubbleHide();
  npcPose(null);
  dogsFree();
  if (!npc.vis) npcPlace(CONFIG.npcHomeX);
  else if (animate) npcWalkTo(CONFIG.npcHomeX);
}

export function updateFlow(dt) {
  flow.t += dt;
  if (flow.mode === 'start') {
    if (input.pressed || input.key) {
      unlockAudio();
      api.notifyOpen();
      flow.mode = 'run';
      if (flow.resumeAt > 0) { flow.resuming = true; npcEnter('bottom', CONFIG.npcHomeX); }
      else begin(0);
    }
    return;
  }
  if (flow.mode !== 'run') return;
  if (flow.resuming) {
    if (!npcBusy()) { flow.resuming = false; begin(flow.resumeAt); }
    return;
  }
  const s = flow.step;
  if (!s) return;
  switch (s.type) {
    case 'enter':
    case 'move':
      if (!npcBusy()) begin(flow.i + 1);
      break;
    case 'wait':
      if (flow.t >= s.s) begin(flow.i + 1);
      break;
    case 'dogs':
      if (s.do !== 'enter' || dogsArrived()) begin(flow.i + 1);
      break;
    case 'say':
      if (input.pressed || input.key) {
        if (!bubbleDone()) bubbleSkip();
        else if (++flow.line < s.lines.length) sayLine(s.lines[flow.line]);
        else { bubbleHide(); npcPose(null); begin(flow.i + 1); }
      }
      break;
    case 'ask': {
      const w = flow.widget;
      w.update(dt);
      if (flow.commentIn >= 0 && (flow.commentIn -= dt) < 0) sayComment(s.comment, s);
      if (w.done) {
        record(s, w.value, w.note);
        awardXP(w.cx, w.cy);
        begin(flow.i + 1);
      }
      break;
    }
    case 'send':
      updateSend(dt);
      break;
  }
}

function updateSend(dt) {
  const w = flow.widget;
  if (flow.sendPhase === 0) {
    w.update(dt);
    if (w.done) startSubmit();
  } else if (flow.sendPhase === 1) {
    if (flow.result) {
      if (flow.result.ok) {
        flow.sentAt = flow.result.at || Date.now();
        store.markDone(flow.sentAt);
        store.clearProgress();
        bubbleHide();
        showToast(CONFIG.toast.title, CONFIG.toast.name);
        play('achievement');
        dogCheer(3);
        flow.sendPhase = 2; flow.t = 0;
      } else {
        w.label = 'REINTENTANDO';
        flow.sendPhase = 3; flow.t = 0;
      }
    }
  } else if (flow.sendPhase === 2) {
    if (flow.t > 1.6) goFinal(flow.sentAt, true);
  } else if (flow.sendPhase === 3) {
    if (flow.t > 2) startSubmit();
  }
}

function startSubmit() {
  flow.sendPhase = 1;
  flow.result = null;
  flow.widget.label = 'ENVIANDO...';
  api.submit(flow.answers).then(r => { flow.result = r || { ok: false }; });
}

// Lo que va detrás de MiniCrispi (cañón, marcas en el suelo)
export function drawFlowWorld(ctx) {
  if (flow.widget && flow.widget.drawWorld) flow.widget.drawWorld(ctx);
}

const DOTS = ['.', '..', '...'];

// Paneles, botones y textos de pantalla
export function drawFlowUI(ctx) {
  if (flow.widget && flow.mode === 'run') flow.widget.draw(ctx);
  const tk = Math.floor(flow.t * 10);
  if (flow.mode === 'loading') {
    const s = DOTS[(tk >> 2) % 3];
    drawText(ctx, s, (W - measure('...')) >> 1, 84, C.WHITE, C.G1);
  } else if (flow.mode === 'start') {
    if (tk % 10 < 6) {
      const s = 'clic';
      drawText(ctx, s, (W - measure(s)) >> 1, 84, C.WHITE, C.G1);
    }
  } else if (flow.mode === 'final') {
    const f = CONFIG.final, pw = 230, ph = 30 + f.lines.length * 11 + 6, px = (W - pw) >> 1, py = 30;
    panel(ctx, px, py, pw, ph);
    drawText(ctx, f.title, (W - measure(f.title) * 2) >> 1, py + 9, C.G1, -1, 2);
    for (let i = 0; i < f.lines.length; i++) {
      drawText(ctx, f.lines[i], (W - measure(f.lines[i])) >> 1, py + 30 + i * 11, C.G1);
    }
  }
}
