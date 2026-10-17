// Audio mínimo: efectos sueltos y una canción opcional que se repite (con una pausa entre vueltas).
// Nada suena hasta el primer clic (regla de los navegadores).
// Todo pasa por un volumen general (0 = silencio) que maneja el control de la esquina.
const sfx = Object.create(null), sfxVol = Object.create(null);
let music = null, musicVol = 0, unlocked = false, master = 1;

export function loadSfx(name, url, vol = 1) {
  const a = new Audio(url);
  a.preload = 'auto';
  a.volume = vol * master;
  sfx[name] = a;
  sfxVol[name] = vol;
}

export function play(name) {
  const a = sfx[name];
  if (!a || !unlocked || master <= 0) return;
  a.volume = sfxVol[name] * master;
  try { a.currentTime = 0; } catch (e) { /* aún cargando */ }
  const p = a.play();
  if (p) p.catch(() => {});
}

// gap: segundos de silencio entre que termina la canción y vuelve a empezar
export function setMusic(url, vol = 0.35, gap = 0) {
  if (!url) return;
  music = new Audio(url);
  music.preload = 'auto';
  musicVol = vol;
  music.volume = vol * master;
  music.loop = gap <= 0;
  if (gap > 0) {
    music.addEventListener('ended', () => {
      setTimeout(() => { music.currentTime = 0; music.play().catch(() => {}); }, gap * 1000);
    });
  }
}

// v de 0 a 1. En silencio la canción sigue corriendo callada, así al subir el volumen continúa.
export function setMaster(v) {
  master = Math.max(0, Math.min(1, v));
  if (music) music.volume = musicVol * master;
}

export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  if (music) music.play().catch(() => {});
}
export const musicEl = () => music; // para pruebas desde la consola
