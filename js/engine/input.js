import { display } from './display.js';

// Estado del puntero en coordenadas lógicas. pressed/released/key duran un solo update.
export const input = {
  x: -100, y: -100,
  down: false, pressed: false, released: false,
  key: false, keyHeld: false,
  keepFocus: false, // mientras se escribe, clicar el canvas no le quita el foco al campo
  cursor: 0,        // 0 normal, 1 mano
};

let _p = false, _r = false, _k = false;
const isKey = c => c === 'Enter' || c === 'NumpadEnter' || c === 'Space';

export function initInput(canvas) {
  const move = e => {
    input.x = Math.floor((e.clientX * display.dpr - display.offX) / display.scale);
    input.y = Math.floor((e.clientY * display.dpr - display.offY) / display.scale);
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerdown', e => {
    move(e);
    if (e.button === 0) { input.down = true; _p = true; }
  });
  window.addEventListener('pointerup', () => {
    if (input.down) { input.down = false; _r = true; }
  });
  canvas.addEventListener('mousedown', e => { if (input.keepFocus) e.preventDefault(); });
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'TEXTAREA') return;
    if (isKey(e.code)) {
      e.preventDefault();
      if (!e.repeat) _k = true;
      input.keyHeld = true;
    }
  });
  window.addEventListener('keyup', e => { if (isKey(e.code)) input.keyHeld = false; });
  window.addEventListener('blur', () => { input.down = false; input.keyHeld = false; });
}

export function pollInput() {
  input.pressed = _p; input.released = _r; input.key = _k;
  _p = _r = _k = false;
  input.cursor = 0;
}
