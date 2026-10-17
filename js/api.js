// Comunicación con el backend (Google Apps Script).
// Mientras BACKEND_URL esté vacío, todo se simula en localStorage para probar.
import { getMock, setMock } from './store.js';

export const BACKEND_URL = '';
const token = new URLSearchParams(location.search).get('k') || '';

async function call(action, payload = {}) {
  // text/plain evita el preflight CORS que Apps Script no responde
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, k: token, ...payload }),
  });
  return res.json();
}

// { done: bool, at?: timestamp } o null si no hubo respuesta
export async function getStatus() {
  if (!BACKEND_URL) {
    const m = getMock();
    return { done: !!m, at: m ? m.at : 0 };
  }
  for (let i = 0; i < 3; i++) {
    try { return await call('status'); } catch (e) { await new Promise(r => setTimeout(r, 1500)); }
  }
  return null;
}

export function notifyOpen() {
  if (!BACKEND_URL) { console.info('[simulado] abrió el link'); return; }
  call('open', { ua: navigator.userAgent }).catch(() => {});
}

// Aviso inmediato de algo que pasó (p. ej. pidió ayuda en el puzzle). Llega aunque no termine el formulario.
export function notifyEvent(name, detail = '') {
  if (!BACKEND_URL) {
    console.info('[simulado] aviso:', name, detail);
    try {
      const ev = JSON.parse(localStorage.getItem('mc_events') || '[]');
      ev.push({ name, detail, at: Date.now() });
      localStorage.setItem('mc_events', JSON.stringify(ev));
    } catch (e) { /* sin almacenamiento: solo queda en la consola */ }
    return;
  }
  call('event', { name, detail, ua: navigator.userAgent }).catch(() => {});
}

// { ok: bool, at?: timestamp }
export async function submit(answers) {
  if (!BACKEND_URL) {
    await new Promise(r => setTimeout(r, 900));
    const at = Date.now();
    setMock({ at });
    console.info('[simulado] respuestas enviadas', answers);
    return { ok: true, at };
  }
  try { return await call('submit', { answers, ua: navigator.userAgent }); } catch (e) { return { ok: false }; }
}
