// ★ Todo el contenido del formulario vive aquí. Los textos son DE RELLENO: los reemplazas tú.
//
// Pasos disponibles:
//   { type: 'enter', from: 'bottom' | 'left' | 'right', x }   MiniCrispi entra a escena
//   { type: 'move', x }                                       MiniCrispi camina hasta x
//   { type: 'say', lines: ['...', '...'] }                    globo de texto (clic para avanzar)
//       una línea puede llevar pose: ['laugh', '...'] se ríe mientras dura el globo,
//                                    ['glasses', '...'] se sube los lentes al empezar
//   { type: 'dogs', do: 'enter', x }                          entran las perritas y se sientan (espera a que lleguen)
//   { type: 'dogs', do: 'free' }                              desde aquí van y vienen solas
//   { type: 'wait', s }                                       pausa en segundos
//   { type: 'ask', id, widget, prompt, ... }                  pregunta (suma un nivel de XP)
//       widget 'choice': options: [...], multi: true|false
//       widget 'text':   placeholder, max, lines, y: 'bottom' (panel abajo, deja ver el cielo)
//       cualquier pregunta: comment: 'texto' o ['laugh', 'texto'] → MiniCrispi lo dice con la pregunta abierta
//                           (commentDelay: segundos, 1.2 por defecto; el globo se va solo)
//       cualquier pregunta: plane: 'texto' → pasa una avioneta con esa pancarta (planeDelay: segundos, 3 por defecto)
//       widget 'cannon': hint, labels: ['0%', '100%'] (textos bajo los extremos)
//       widget 'pick':   options: [...], icons: [...] (recuadros con ícono; un clic elige)
//       widget 'puzzle': puzzle 3x3 con el prompt escrito; al armarlo aparece el campo de respuesta
//   { type: 'send' }                                          botón de enviar que se arranca
// Las coordenadas x van de 0 a 320 (el suelo está en y = 150).

export const CONFIG = {
  npcHomeX: 252,
  sendEscapes: 12,
  music: 'assets/music/fondo.mp3', // "From The Start but it's a Shop Theme" (Tarro57)
  musicVolume: 0.3,
  musicGap: 3, // segundos de silencio antes de volver a empezar
  toast: { title: '¡WENA CONITA!', name: 'Formulario enviado' },
  final: {
    title: 'COMPLETADO',
    lines: ['Tus respuestas ya le llegaron al crispo.', 'Este formulario está terminado.'],
  },
  // índice 0: primer clic (empieza a moverse). 1..12: cada dash.
  sendTaunts: [
    'Ups.',
    'que tonta.',
    'estamos yendo muy rapido...',
    'Ni cerca.',
    '¿Eso es todo?',
    'Sigue intentando po',
    'Me estoy aburriendo zzzZZzz',
    'Uf, qué lenta.',
    'Ya casi... no.',
    'Vamos, tú puedes. Creo...',
    'dale pooo.',
    'Última vez, lo prometo.',
    'Ya, ya. Me rindo.',
  ],
};

export const SCRIPT = [
  // ── Introducción (texto final) ──
  { type: 'enter', from: 'bottom', x: 252 },
  { type: 'say', lines: [
    'Eu Cony, cómo estás?',
    ['glasses', 'Sé que esto puede ser medio raro, pero...'],
    'El otro día, cuando nos vimos en la U, después pensé: solo hablé yo...',
    'Y me sentí mal y dije...',
    '¿Por qué no hacerle un formulario?',
    'Y asi saber que onda, como has estado',
    'solo una regla',
    ['glasses', 'Responder con honestidad'],
  ] },
  { type: 'dogs', do: 'enter', x: 120 },
  { type: 'say', lines: [
    'Sí, igual hice a tus perritas.',
    ['laugh', 'Lo sé, no soy bueno haciendo pixel art.'],
    ['laugh', 'Lo bueno que son iguales.'],
  ] },
  { type: 'dogs', do: 'free' },
  { type: 'say', lines: [
    'Otra regla: no se puede volver atrás. Lo que respondes, queda.',
    'comencemos',
  ] },

  // ── Preguntas (texto final) ──
  { type: 'ask', id: 'que_tan_raro', widget: 'choice', w: 228, x: 8,
    prompt: '¿Qué tan raro es este formulario?',
    options: [
      'RARÍSIMO, CRISTÓBAL, ¿POR QUÉ HICISTE ESTO? TE ODIO',
      'Un poco raro, la verdad no me lo esperaba',
      'No me es raro, me gusta la idea',
      'ESTÁ INCREÍBLE, TE AMO',
    ] },

  { type: 'ask', id: 'examen_oral', widget: 'text', x: 8, w: 228, lines: 4, max: 2000,
    prompt: 'Me dijiste que hiciste un examen oral, que no era examen como cuando estás a punto de echártelo, sino otro tipo de examen, y que te había ido bien. ¿Qué tal eso? (con detalle)' },

  // Podcast: el contexto lo dice MiniCrispi y después van 4 preguntas de texto, una por una
  { type: 'say', lines: [
    'También me dijiste que ibas a hacer un podcast, al final del pabellón D, segundo piso...',
    'Y que ese día solo fuiste a ver las instalaciones, que estaban buenas.',
    'Cuéntame sobre eso.',
  ] },
  { type: 'ask', id: 'podcast_capitulos', widget: 'text', x: 8, w: 228, lines: 4, max: 1000,
    prompt: '¿Va a ser un podcast de varios capítulos?' },
  { type: 'ask', id: 'podcast_tema', widget: 'text', x: 8, w: 228, lines: 4, max: 1000,
    prompt: '¿De qué va a tratar?, sobre ets, no?' },
  { type: 'ask', id: 'podcast_chicas', widget: 'text', x: 8, w: 228, lines: 4, max: 1000,
    prompt: '¿Conoces a las chicas con las que lo vas a hacer? (no creo po)',
    comment: ['laugh', 'Ya que están cerca en la lista.'], commentDelay: 3 },
  { type: 'ask', id: 'podcast_emocion', widget: 'text', x: 8, w: 228, lines: 4, max: 1000,
    prompt: '¿Qué es lo que más te emociona del podcast?' },

  // Cañón
  { type: 'move', x: 36 },
  { type: 'ask', id: 'dolor_wata', widget: 'cannon', labels: ['Nada', 'Demasiado'],
    prompt: 'En este momento, ¿qué tanto te duele la wata?' },
  { type: 'move', x: 252 },

  // Animales: elige uno y después explica por qué
  { type: 'ask', id: 'animal', widget: 'pick',
    prompt: 'Si tuvieras que escoger entre estos 4 animales, ¿cuál sería?',
    options: ['Mariquita', 'Pájaro', 'Delfín', 'Elefante'],
    icons: ['ladybug', 'bird', 'dolphin', 'elephant'] },
  { type: 'ask', id: 'animal_porque', widget: 'text', x: 8, w: 228, lines: 4, max: 1000,
    prompt: '¿Por qué?' },

  // Puzzle: la pregunta aparece al armarlo; el campo de respuesta sale a la derecha
  { type: 'move', x: 306 }, // al borde, para dejar espacio al campo de respuesta
  { type: 'ask', id: 'como_has_estado', widget: 'puzzle',
    prompt: '¿Cómo has estado últimamente? (con detalle)' },
  { type: 'move', x: 252 },

  // Penúltima: panel abajo para que se vea el cielo; a los 7 s pasa la avioneta
  { type: 'ask', id: 'somos_amigos', widget: 'text', x: 8, w: 228, y: 'bottom', lines: 4, max: 2000,
    prompt: '¿Somos amigos o no somos amigos?',
    comment: 'Con honestidad, y dime qué opinas.', commentDelay: 2,
    plane: 'igual me sacaste de mejores amigos sí :/', planeDelay: 7 },

  // Última
  { type: 'ask', id: 'pregunta_para_mi', widget: 'text', x: 8, w: 228, lines: 4, max: 2000,
    prompt: 'Ahora para terminar, hazme una pregunta a mí, pero que sea buena, sipo.' },

  // ── De aquí en adelante: RELLENO ──
  { type: 'say', lines: ['Eso es todo. Solo falta enviar.'] },
  { type: 'send' },
];
