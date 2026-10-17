export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = t => 1 - (1 - t) * (1 - t) * (1 - t);
export const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) * (-2 * t + 2) / 2);
export function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1, u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}
export const rand = (a, b) => a + Math.random() * (b - a);
export const hit = (x, y, w, h, px, py) => px >= x && py >= y && px < x + w && py < y + h;

// Las poses avanzan a pasos de 10 fps aunque el bucle corra a 60
export const ANIM_FPS = 10;
export const tick = t => Math.floor(t * ANIM_FPS);
