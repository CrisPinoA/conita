// Paleta indexada: pastel cálida de ocaso, con un tinte rojizo suave.
// Cada familia es una rampa de oscuro a claro. Grises, experiencia y textos de
// Minecraft se mantienen exactos porque la interfaz es un clon.
export const PAL = [
  /* 0  */ '#2b1d2e', // contorno (ciruela oscuro)
  /* 1  */ '#4a3046', // sombra profunda
  // cielo: lavanda empolvado → malva → rosa → durazno
  /* 2  */ '#8f7aa3', /* 3 */ '#b98fae', /* 4 */ '#e2a9ad', /* 5 */ '#f5c8b4',
  // nubes (sombra) y blanco
  /* 6  */ '#efcfcf', /* 7 */ '#ffffff',
  // pasto: verde pastel, con más contraste entre tonos
  /* 8  */ '#3f5a45', /* 9 */ '#5f8a58', /* 10 */ '#8cb86c', /* 11 */ '#c8e08e',
  // tierra y madera
  /* 12 */ '#5a3a3d', /* 13 */ '#8a5d56', /* 14 */ '#b78373', /* 15 */ '#ddb39c',
  // grises (interfaz Minecraft)
  /* 16 */ '#1e1e1e', /* 17 */ '#3f3f3f', /* 18 */ '#555555', /* 19 */ '#6f6f6f',
  /* 20 */ '#8b8b8b', /* 21 */ '#a0a0a0', /* 22 */ '#c6c6c6',
  // piel
  /* 23 */ '#8a5048', /* 24 */ '#d08e7c', /* 25 */ '#f2bca4', /* 26 */ '#ffdccb',
  // amarillos (durazno y crema)
  /* 27 */ '#b0745a', /* 28 */ '#e0a070', /* 29 */ '#f4c88e', /* 30 */ '#fde8c0',
  // rojos
  /* 31 */ '#7a3a4a', /* 32 */ '#c8646e', /* 33 */ '#ec9a98',
  // azules lavanda
  /* 34 */ '#4e4a7a', /* 35 */ '#7a78b0', /* 36 */ '#a6a4d6',
  // experiencia
  /* 37 */ '#2a5a08', /* 38 */ '#4f9f10', /* 39 */ '#80ff20', /* 40 */ '#c8ff90',
  // texto Minecraft: amarillo, morado y sus sombras
  /* 41 */ '#ffff55', /* 42 */ '#3f3f15', /* 43 */ '#ff55ff', /* 44 */ '#3f153f',
  // escenario: crema de nubes, montañas lejanas (ciruela empolvado)
  /* 45 */ '#fff1e8', /* 46 */ '#a07d9b', /* 47 */ '#c19aaa',
];

export const C = {
  OUT: 0, DEEP: 1,
  SKY0: 2, SKY1: 3, SKY2: 4, SKY3: 5, CLOUD: 6, WHITE: 7,
  GR0: 8, GR1: 9, GR2: 10, GR3: 11,
  WD0: 12, WD1: 13, WD2: 14, WD3: 15,
  G0: 16, G1: 17, G2: 18, G3: 19, G4: 20, G5: 21, G6: 22,
  SK0: 23, SK1: 24, SK2: 25, SK3: 26,
  Y0: 27, Y1: 28, Y2: 29, Y3: 30,
  R0: 31, R1: 32, R2: 33,
  B0: 34, B1: 35, B2: 36,
  XP0: 37, XP1: 38, XP2: 39, XP3: 40,
  MCY: 41, MCYS: 42, MCP: 43, MCPS: 44,
  CREAM: 45, FAR0: 46, FAR1: 47,
};

export const RGB = new Uint8Array(PAL.length * 3);
for (let i = 0; i < PAL.length; i++) {
  RGB[i * 3] = parseInt(PAL[i].slice(1, 3), 16);
  RGB[i * 3 + 1] = parseInt(PAL[i].slice(3, 5), 16);
  RGB[i * 3 + 2] = parseInt(PAL[i].slice(5, 7), 16);
}

// Rampas para partículas: brillo → color → oscuro
export const RAMP_SPARK = 0, RAMP_DUST = 1, RAMP_XP = 2, RAMP_SMOKE = 3, RAMP_FIRE = 4, RAMP_LEAF = 5;
export const RAMPS = [
  Uint8Array.of(C.WHITE, C.Y3, C.Y2, C.Y1),
  Uint8Array.of(C.WD3, C.WD2, C.WD1, C.WD0),
  Uint8Array.of(C.XP3, C.XP2, C.XP1, C.XP0),
  Uint8Array.of(C.WHITE, C.G6, C.G4, C.G2),
  Uint8Array.of(C.WHITE, C.Y3, C.Y2, C.Y1, C.R1, C.R0),
  Uint8Array.of(C.GR3, C.GR2, C.GR1, C.GR0),
];

// Dithering ordenado Bayer 4x4: level 0..16
export const BAYER4 = Uint8Array.of(0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
export function dither(x, y, level) {
  return BAYER4[(y & 3) * 4 + (x & 3)] < level;
}

// Única forma de rellenar en el juego: siempre un índice de la paleta.
// El fillStyle se cachea por contexto para no reasignar el mismo string.
export function rect(ctx, x, y, w, h, ci) {
  if (ctx._ci !== ci) { ctx.fillStyle = PAL[ci]; ctx._ci = ci; }
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

// Para generar capas estáticas con ImageData
export function putPx(img, x, y, ci) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const o = (y * img.width + x) * 4;
  img.data[o] = RGB[ci * 3];
  img.data[o + 1] = RGB[ci * 3 + 1];
  img.data[o + 2] = RGB[ci * 3 + 2];
  img.data[o + 3] = 255;
}

export function layer(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  paint(img);
  g.putImageData(img, 0, 0);
  return c;
}
