// Sprites del usuario (PNG a escala 1x), con sus colores originales.
// La animación se arma a partir de un solo cuadro: se generan variantes editando
// píxeles puntuales (ojos, boca, cola) y el resto se hace al dibujar, por cortes.

export const CR_W = 16, CR_H = 27;   // MiniCrispi
export const DOG_W = 14, DOG_H = 18; // perritas (Molly nariz negra, Kitty nariz café)

// Poses extra. ax = columna donde empieza el cuadro base dentro de la pose, para que los pies calcen.
export const POSE = {
  laugh:   { w: 18, ax: 2 }, // MiniCrispi riendo, ojos cerrados y mano detrás de la cabeza
  glasses: { w: 16, ax: 0 }, // MiniCrispi subiéndose los lentes
  stand:   { w: 15, ax: 1 }, // perrita parada
};

// crispi[i], crispiGlasses[i]:   i = boca abierta*2 + parpadeo
// molly/kitty[i], *Stand[i]:     i = cola arriba*2 + parpadeo
// crispiLaugh:                   un solo cuadro
export const sprites = {
  crispi: null, crispiFlip: null, crispiGlasses: null, crispiGlassesFlip: null,
  crispiLaugh: null, crispiLaughFlip: null,
  molly: null, mollyFlip: null, kitty: null, kittyFlip: null,
  mollyStand: null, mollyStandFlip: null, kittyStand: null, kittyStandFlip: null,
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasOf(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

function flip(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

// Copia src y aplica las ediciones de píxeles
function variant(src, ...edits) {
  const c = canvasOf(src), g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height);
  for (const e of edits) e(d);
  g.putImageData(d, 0, 0);
  return c;
}

function setHex(d, x, y, hex) {
  const o = (y * d.width + x) * 4;
  d.data[o] = parseInt(hex.slice(1, 3), 16);
  d.data[o + 1] = parseInt(hex.slice(3, 5), 16);
  d.data[o + 2] = parseInt(hex.slice(5, 7), 16);
  d.data[o + 3] = 255;
}
function copyPx(d, x, y, sx, sy) {
  const o = (y * d.width + x) * 4, s = (sy * d.width + sx) * 4;
  for (let k = 0; k < 4; k++) d.data[o + k] = d.data[s + k];
}

// MiniCrispi: ojos detrás de los lentes en la fila 6, boca en la fila 10
const crBlink = d => { for (const x of [5, 6, 10, 11]) setHex(d, x, 6, '#664e3c'); };
const crTalk = d => { setHex(d, 7, 10, '#3c2227'); setHex(d, 8, 10, '#3c2227'); };

function clearPx(d, x, y) { d.data[(y * d.width + x) * 4 + 3] = 0; }

// Perritas: ojos en las filas 5-6, nariz en la fila 8. La parada está corrida 1 columna (ax = 1).
// Sentada: la cola son las columnas 0-3 (se sube 1 fila). Parada: la punta de la cola (fila 10) se levanta.
const NOSE_KITTY = '#c4906a';
const dogBlink = ax => d => { setHex(d, 8 + ax, 5, '#ffeaea'); setHex(d, 10 + ax, 5, '#ffeaea'); };
const brownNose = ax => d => { setHex(d, 11 + ax, 8, NOSE_KITTY); setHex(d, 12 + ax, 8, NOSE_KITTY); };
const sitTail = d => {
  for (let y = 9; y <= 15; y++) for (let x = 0; x <= 3; x++) copyPx(d, x, y, x, y + 1);
};
const standTail = d => {
  copyPx(d, 0, 9, 0, 10); copyPx(d, 1, 9, 1, 10); clearPx(d, 0, 10);
};

function dogFrames(src, ax, tail, kitty) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const edits = kitty ? [brownNose(ax)] : [];
    if (i & 1) edits.push(dogBlink(ax));
    if (i & 2) edits.push(tail);
    out.push(variant(src, ...edits));
  }
  return out;
}

function crispiFrames(src) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const edits = [];
    if (i & 1) edits.push(crBlink);
    if (i & 2) edits.push(crTalk);
    out.push(variant(src, ...edits));
  }
  return out;
}

export async function loadSprites() {
  const [cr, crL, crG, dg, dgS] = await Promise.all([
    loadImage('assets/sprites/minicrispi.png'),
    loadImage('assets/sprites/minicrispi_risa.png'),
    loadImage('assets/sprites/minicrispi_lentes.png'),
    loadImage('assets/sprites/perro.png'),
    loadImage('assets/sprites/perro_parado.png'),
  ]);
  const both = (name, frames) => { sprites[name] = frames; sprites[name + 'Flip'] = frames.map(flip); };
  both('crispi', crispiFrames(cr));
  both('crispiGlasses', crispiFrames(crG)); // ojos y boca en el mismo lugar que el base
  sprites.crispiLaugh = canvasOf(crL);
  sprites.crispiLaughFlip = flip(crL);
  both('molly', dogFrames(dg, 0, sitTail, false));
  both('kitty', dogFrames(dg, 0, sitTail, true));
  both('mollyStand', dogFrames(dgS, 1, standTail, false));
  both('kittyStand', dogFrames(dgS, 1, standTail, true));
}
