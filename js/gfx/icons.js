// Íconos minimalistas dibujados como texto (un carácter por píxel), a escala 1x.
// Se convierten una sola vez a canvas con colores de la paleta.
import { C, putPx, layer } from '../engine/palette.js';

const ART = {
  ladybug: {
    ink: { o: C.OUT, K: C.OUT, w: C.WHITE, R: C.R1, h: C.R2 },
    rows: [
      '.....ooooo.....',
      '....oKKKKKo....',
      '...oKwKKKwKo...',
      '..ooooooooooo..',
      '.ohhRRRoRRRRRo.',
      'oRRKKRRoRRKKRRo',
      'oRRKKRRoRRKKRRo',
      'oRRRRRRoRRRRRRo',
      'oRKKRRRoRRRKKRo',
      'oRKKRRRoRRRKKRo',
      '.oRRRRRoRRRRRo.',
      '..oRRKRoRKRRo..',
      '...ooooooooo...',
    ],
  },
  bird: {
    ink: { o: C.OUT, K: C.OUT, B: C.B2, d: C.B1, y: C.Y1 },
    rows: [
      '.........ooo....',
      '........oBBBo...',
      '.......oBBBKBo..',
      '.......oBBBBBoyy',
      '.......oBBBBBoy.',
      'oo....ooBBBBBo..',
      'oBo..oBBBBBBBo..',
      '.oBooBdddBBBBo..',
      '..oBBddddBBBBo..',
      '...oBBdddBBBo...',
      '....oBBBBBBo....',
      '.....oooooo.....',
      '......y..y......',
      '.....yy.yy......',
    ],
  },
  dolphin: {
    ink: { o: C.OUT, K: C.OUT, B: C.B1, c: C.CREAM },
    rows: [
      '............o..........',
      '...........oo..........',
      '..........oBo..........',
      'oo.....ooooBBoooo......',
      'oBo..ooBBBBBBBBBBoo....',
      '.oBooBBBBBBBBBBBKBBo...',
      '..oBBBBBBBBBBBBBBBBBooo',
      '.oBooccccccccccccccco..',
      'oo...oocccccccccccoo...',
      '.......ooooooooooo.....',
    ],
  },
  elephant: {
    ink: { o: C.OUT, K: C.OUT, G: C.FAR1, E: C.FAR0 },
    rows: [
      '............oooo......',
      '...ooooooo.oGGGGo.....',
      '..oGGGGGGGooGGGGGo....',
      '.oGGGGGGGGGoEEGGKGo...',
      'oGGGGGGGGGGoEEEGGGGo..',
      'oGGGGGGGGGGoEEEGGGGGo.',
      'oGGGGGGGGGGGoEEoGGGGo.',
      'oGGGGGGGGGGGGooGoGGGo.',
      'oGGGGGGGGGGGGGGo.oGGo.',
      '.oGGGGGGGGGGGGGo..oGo.',
      '.oGGo.oGo.oGGo....oGo.',
      '.oGGo.oGo.oGGo.....oo.',
      '.oooo.ooo.oooo........',
    ],
  },
};

const cache = {};

export function icon(name) {
  if (cache[name]) return cache[name];
  const a = ART[name], h = a.rows.length, w = a.rows[0].length;
  cache[name] = layer(w, h, img => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ci = a.ink[a.rows[y][x]];
      if (ci !== undefined) putPx(img, x, y, ci);
    }
  });
  return cache[name];
}
