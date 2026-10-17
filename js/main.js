import { display, initDisplay, updateDisplay, present } from './engine/display.js';
import { input, initInput, pollInput } from './engine/input.js';
import { startLoop } from './engine/loop.js';
import { loadFont } from './engine/font.js';
import { loadSfx, setMusic, unlockAudio } from './engine/audio.js';
import { updateParticles, drawParticles } from './engine/particles.js';
import { loadSprites } from './gfx/sprites.js';
import { updateDogs, drawDogs } from './gfx/dog.js';
import { initScene, updateScene, drawSceneBack, drawSceneMid, drawSceneFront } from './gfx/scene.js';
import { updateNpc, drawNpc } from './gfx/npc.js';
import { updatePlane, drawPlane } from './gfx/plane.js';
import { updateBubble, drawBubble } from './gfx/ui.js';
import { updateHUD, drawHUD } from './gfx/hud.js';
import { initSound, updateSound, drawSound } from './gfx/sound.js';
import { statusReady, updateFlow, drawFlowWorld, drawFlowUI } from './flow.js';
import { CONFIG } from './config.js';
import { getStatus } from './api.js';
import { clearAll } from './store.js';

// ?reset borra el progreso local (solo para probar)
if (new URLSearchParams(location.search).has('reset')) clearAll();

const canvas = document.getElementById('screen');
initDisplay(canvas);
initInput(canvas);

await loadFont('assets/font/minecraft-seven.ttf');
loadSfx('levelup', 'assets/sfx/levelup.mp3', 0.8);
loadSfx('achievement', 'assets/sfx/achievement.mp3', 0.9);
setMusic(CONFIG.music, CONFIG.musicVolume, CONFIG.musicGap);
initSound();
// el navegador solo deja sonar audio tras un gesto: el primer clic o tecla en cualquier pantalla
// (también en la final, al reabrir el link)
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });
await loadSprites();
initScene();

getStatus().then(statusReady);

let lastCursor = -1;

function update(dt) {
  pollInput();
  updateDisplay();
  updateSound(); // antes que el resto: si el clic fue en el control, se consume aquí
  updateScene(dt);
  updatePlane(dt);
  updateNpc(dt);
  updateDogs(dt);
  updateFlow(dt);
  updateBubble(dt);
  updateParticles(dt);
  updateHUD(dt);
}

function render() {
  const ctx = display.ctx;
  drawSceneBack(ctx);
  drawPlane(ctx);
  drawSceneMid(ctx);
  drawNpc(ctx);
  drawDogs(ctx);
  drawSceneFront(ctx);
  drawFlowWorld(ctx);
  drawParticles(ctx);
  drawFlowUI(ctx);
  drawBubble(ctx);
  drawHUD(ctx);
  drawSound(ctx);
  present();
  if (input.cursor !== lastCursor) {
    lastCursor = input.cursor;
    canvas.style.cursor = lastCursor ? 'pointer' : 'default';
  }
}

startLoop(update, render);
