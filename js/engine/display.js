import { PAL, C } from './palette.js';

// Resolución lógica fija; se escala por el entero más grande que quepa.
export const W = 320, H = 180;

export const display = {
  canvas: null, vctx: null, buf: null, ctx: null,
  dpr: 1, scale: 1, offX: 0, offY: 0,
  shakeAmp: 0, shakeFrames: 0, sx: 0, sy: 0, frame: 0,
  resizeHooks: [],
};

export function initDisplay(canvas) {
  const d = display;
  d.canvas = canvas;
  d.vctx = canvas.getContext('2d', { alpha: false });
  d.buf = document.createElement('canvas');
  d.buf.width = W; d.buf.height = H;
  d.ctx = d.buf.getContext('2d');
  d.ctx.imageSmoothingEnabled = false;
  window.addEventListener('resize', resize);
  resize();
}

function resize() {
  const d = display;
  const dpr = window.devicePixelRatio || 1;
  const pw = Math.round(window.innerWidth * dpr), ph = Math.round(window.innerHeight * dpr);
  d.canvas.width = pw; d.canvas.height = ph;
  d.canvas.style.width = pw / dpr + 'px';
  d.canvas.style.height = ph / dpr + 'px';
  d.dpr = dpr;
  d.scale = Math.max(1, Math.floor(Math.min(pw / W, ph / H)));
  d.offX = (pw - W * d.scale) >> 1;
  d.offY = (ph - H * d.scale) >> 1;
  d.vctx.imageSmoothingEnabled = false;
  for (let i = 0; i < d.resizeHooks.length; i++) d.resizeHooks[i]();
}

// Sacudida de pantalla: desplazamiento entero de 1-2 píxeles lógicos
export function shake(amp, frames) {
  if (amp >= display.shakeAmp || display.shakeFrames <= 0) {
    display.shakeAmp = amp;
    display.shakeFrames = frames;
  }
}

export function updateDisplay() {
  const d = display;
  d.frame++;
  if (d.shakeFrames > 0) {
    d.shakeFrames--;
    if (d.shakeFrames < 3 && d.shakeAmp > 1) d.shakeAmp = 1;
    d.sx = d.frame & 1 ? d.shakeAmp : -d.shakeAmp;
    d.sy = d.frame & 2 ? d.shakeAmp : -d.shakeAmp;
  } else {
    d.sx = 0; d.sy = 0; d.shakeAmp = 0;
  }
}

export function present() {
  const d = display, v = d.vctx;
  v.fillStyle = PAL[C.OUT];
  v.fillRect(0, 0, d.canvas.width, d.canvas.height);
  v.drawImage(d.buf, d.offX + d.sx * d.scale, d.offY + d.sy * d.scale, W * d.scale, H * d.scale);
}
