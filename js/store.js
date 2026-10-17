// Copia local del progreso y del estado "terminado". La fuente de verdad es el backend;
// esto solo permite retomar donde iba y mostrar la pantalla final al tiro.
const KP = 'mc_progress', KD = 'mc_done', KM = 'mc_mock';

function get(k) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function set(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ }
}
function del(k) {
  try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ }
}

export const getProgress = () => get(KP);
export const saveProgress = p => set(KP, p);
export const clearProgress = () => del(KP);
export const getDone = () => get(KD);
export const markDone = at => set(KD, { at });
export const getMock = () => get(KM);
export const setMock = v => set(KM, v);
export function clearAll() { del(KP); del(KD); del(KM); del('mc_events'); }
