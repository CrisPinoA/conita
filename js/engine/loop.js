// Actualización a 60 Hz fijos (acumulador) desacoplada del render.
export const DT = 1 / 60;

export function startLoop(update, render) {
  let acc = 0, last = performance.now();
  function frame(now) {
    let el = (now - last) / 1000;
    last = now;
    if (el > 0.25) el = 0.25; // evita la espiral tras una pestaña inactiva
    acc += el;
    while (acc >= DT) { update(DT); acc -= DT; }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
