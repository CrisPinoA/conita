// Fuente de Minecraft convertida a mapa de bits 1-bit al cargar.
// El TTF está construido sobre una grilla de 256 unidades por píxel (8 px por em):
// se dibuja a 8x y se muestrea el centro de cada celda, así no queda nada suavizado.
import { RGB } from './palette.js';

const S = 8;            // escala de muestreo
const GW = 16, GH = 12; // celda de cada glifo en el atlas
const ORG = 2;          // columna del origen dentro de la celda
const ASC = 10;         // filas sobre la línea base
export const CAP = 3;   // filas vacías sobre las mayúsculas (y del texto = borde superior de las mayúsculas)
export const LINE_H = 11;
const COLS = 32;

let CHARS = '';
for (let c = 32; c < 127; c++) CHARS += String.fromCharCode(c);
CHARS += 'ÁÉÍÓÚÜÑáéíóúüñ¿¡°ºª«»“”‘’…·•—€™';

const count = CHARS.length;
const lookup = new Int16Array(65536).fill(-1);
const adv = new Uint8Array(count);
const bits = new Uint8Array(count * GW * GH);
const atlases = [];
let Q = 0; // glifo de reemplazo: '?'

export async function loadFont(url) {
  const face = new FontFace('MCSeven', `url(${url})`);
  await face.load();
  document.fonts.add(face);
  const c = document.createElement('canvas');
  c.width = GW * S; c.height = GH * S;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = `${8 * S}px MCSeven`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#fff';
  for (let i = 0; i < count; i++) {
    const ch = CHARS[i];
    lookup[ch.charCodeAt(0)] = i;
    g.clearRect(0, 0, c.width, c.height);
    g.fillText(ch, ORG * S, ASC * S);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        if (d[((y * S + (S >> 1)) * c.width + x * S + (S >> 1)) * 4 + 3] > 127) bits[(i * GH + y) * GW + x] = 1;
      }
    }
    adv[i] = Math.round(g.measureText(ch).width / S);
  }
  adv[lookup[32]] = 4;
  Q = lookup[63];
  // Este TTF trae las tildes y la ñ vacías: se arman desde la letra base
  for (const ch in ACCENTS) synth(ch, ACCENTS[ch][0], ACCENTS[ch][1]);
  // cualquier otro glifo vacío se muestra como '?'
  for (let i = 0; i < count; i++) {
    const code = CHARS.charCodeAt(i);
    if (code === 32 || ACCENTS[CHARS[i]]) continue;
    let ink = false;
    for (let k = i * GW * GH; k < (i + 1) * GW * GH && !ink; k++) ink = bits[k] === 1;
    if (!ink) lookup[code] = Q;
  }
}

const ACCENTS = {
  'á': ['a', 'acute'], 'é': ['e', 'acute'], 'í': ['i', 'acute'], 'ó': ['o', 'acute'], 'ú': ['u', 'acute'],
  'ü': ['u', 'diaer'], 'ñ': ['n', 'tilde'],
  'Á': ['A', 'acute'], 'É': ['E', 'acute'], 'Í': ['I', 'acute'], 'Ó': ['O', 'acute'], 'Ú': ['U', 'acute'],
  'Ü': ['U', 'diaer'], 'Ñ': ['N', 'tilde'],
};

function synth(ch, baseCh, kind) {
  const i = lookup[ch.charCodeAt(0)], b = lookup[baseCh.charCodeAt(0)];
  const upper = baseCh !== baseCh.toLowerCase();
  let minX = GW, maxX = -1;
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      let v = bits[(b * GH + y) * GW + x];
      if (baseCh === 'i' && y < ASC - 5) v = 0; // sin el punto
      bits[(i * GH + y) * GW + x] = v;
      if (v) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    }
  }
  const top = upper ? 0 : 2; // fila más alta del acento (hay una fila libre bajo él)
  const cx = (minX + maxX) >> 1;
  const set = (x, y) => { bits[(i * GH + y) * GW + x] = 1; };
  if (kind === 'acute') { set(cx, top + 1); set(cx + 1, top); }
  else if (kind === 'diaer') { set(minX + 1, top + 1); set(maxX - 1, top + 1); }
  else { set(minX, top + 1); set(minX + 1, top); set(minX + 2, top); set(minX + 3, top + 1); set(minX + 4, top); }
  adv[i] = adv[b];
}

// Un atlas por color de la paleta, generado la primera vez que se usa
function atlas(ci) {
  let a = atlases[ci];
  if (a) return a;
  a = document.createElement('canvas');
  a.width = COLS * GW;
  a.height = Math.ceil(count / COLS) * GH;
  const g = a.getContext('2d');
  const img = g.createImageData(a.width, a.height);
  const r = RGB[ci * 3], gg = RGB[ci * 3 + 1], b = RGB[ci * 3 + 2];
  for (let i = 0; i < count; i++) {
    const ox = (i % COLS) * GW, oy = ((i / COLS) | 0) * GH;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        if (!bits[(i * GH + y) * GW + x]) continue;
        const o = ((oy + y) * a.width + ox + x) * 4;
        img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  atlases[ci] = a;
  return a;
}

function glyph(ctx, at, g, x, y, s) {
  ctx.drawImage(at, (g % COLS) * GW, ((g / COLS) | 0) * GH, GW, GH, x - ORG * s, y - CAP * s, GW * s, GH * s);
}

function pass(ctx, str, a, b, x, y, ci, s) {
  const at = atlas(ci);
  for (let i = a; i < b; i++) {
    const code = str.charCodeAt(i);
    let g = lookup[code];
    if (g < 0) g = Q;
    if (code !== 32) glyph(ctx, at, g, x, y, s);
    x += adv[g] * s;
  }
}

// y = borde superior de las mayúsculas. sh = color de sombra (-1 sin sombra). s = escala entera.
export function drawRange(ctx, str, a, b, x, y, ci, sh = -1, s = 1) {
  x |= 0; y |= 0;
  if (sh >= 0) pass(ctx, str, a, b, x + s, y + s, sh, s);
  pass(ctx, str, a, b, x, y, ci, s);
}

export function drawText(ctx, str, x, y, ci, sh = -1, s = 1) {
  drawRange(ctx, str, 0, str.length, x, y, ci, sh, s);
}

export function measureRange(str, a, b) {
  let w = 0;
  for (let i = a; i < b; i++) {
    let g = lookup[str.charCodeAt(i)];
    if (g < 0) g = Q;
    w += adv[g];
  }
  return w > 0 ? w - 1 : 0;
}

export function measure(str) {
  return measureRange(str, 0, str.length);
}

// Corta el texto en líneas que caben en maxW. Llena out con pares [inicio, fin].
// Se llama solo cuando el texto cambia, nunca por fotograma.
export function wrap(str, maxW, out) {
  out.length = 0;
  const n = str.length;
  let start = 0, brk = -1, i = 0;
  while (i <= n) {
    const ch = i < n ? str.charCodeAt(i) : 10;
    if (ch === 10) { out.push(start, i); start = i + 1; brk = -1; i++; continue; }
    if (ch === 32) brk = i;
    if (i > start && measureRange(str, start, i + 1) > maxW) {
      if (brk > start) { out.push(start, brk); start = brk + 1; i = start; }
      else { out.push(start, i); start = i; }
      brk = -1;
      continue;
    }
    i++;
  }
  return out.length >> 1;
}

// Números sin crear strings
const digs = new Uint8Array(12);
function splitInt(n) {
  n = Math.max(0, n | 0);
  let k = 0;
  do { digs[k++] = n % 10; n = (n / 10) | 0; } while (n > 0);
  return k;
}
function passInt(ctx, k, x, y, ci) {
  const at = atlas(ci);
  for (let i = k - 1; i >= 0; i--) {
    const g = lookup[48 + digs[i]];
    glyph(ctx, at, g, x, y, 1);
    x += adv[g];
  }
  return x;
}
export function intWidth(n) {
  const k = splitInt(n);
  let w = 0;
  for (let i = 0; i < k; i++) w += adv[lookup[48 + digs[i]]];
  return w - 1;
}
export function drawInt(ctx, n, x, y, ci, sh = -1) {
  const k = splitInt(n);
  if (sh >= 0) passInt(ctx, k, x + 1, y + 1, sh);
  return passInt(ctx, k, x, y, ci);
}
// Contorno de 4 direcciones, como el número de nivel de Minecraft
export function drawIntOutlined(ctx, n, x, y, ci, oc) {
  const k = splitInt(n);
  passInt(ctx, k, x - 1, y, oc); passInt(ctx, k, x + 1, y, oc);
  passInt(ctx, k, x, y - 1, oc); passInt(ctx, k, x, y + 1, oc);
  passInt(ctx, k, x, y, ci);
}
