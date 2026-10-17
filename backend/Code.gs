// Backend del formulario (Google Apps Script). Va pegado en el editor de Apps Script de una
// planilla de Google (Extensiones → Apps Script) y se publica como aplicación web.
//
// Acciones que recibe por POST (JSON en texto plano):
//   status → { done, at }                 ¿ya lo envió? (para mostrar la pantalla final)
//   open   → correo "abrió el link"
//   event  → correo inmediato (p. ej. pidió ayuda en el puzzle)
//   submit → guarda las respuestas, te las manda por correo y cierra el formulario
// Todas exigen el código del link (?k=...). Un segundo envío no se guarda.

// ★ Pega aquí el código del link (lo tienes en backend/LINK.txt, que no se sube al repo)
const TOKEN = 'PEGA_AQUI_EL_CODIGO';
// ★ A dónde llegan los avisos (vacío = la cuenta de Google dueña del script)
const EMAIL = '';
const NOMBRE = 'Cony';

const props = PropertiesService.getScriptProperties();

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'json' }); }
  if (!TOKEN || body.k !== TOKEN) return out({ ok: false, error: 'token' });

  switch (body.action) {
    case 'status': {
      const at = Number(props.getProperty('DONE_AT') || 0);
      return out({ ok: true, done: at > 0, at });
    }
    case 'open': {
      const n = Number(props.getProperty('OPENS') || 0) + 1;
      props.setProperty('OPENS', String(n));
      logEvent('abrió el link', 'vez ' + n, body.ua);
      mail(NOMBRE + ' abrió el formulario' + (n > 1 ? ' (vez ' + n + ')' : ''),
        NOMBRE + ' acaba de abrir el formulario (' + fecha(new Date()) + ').');
      return out({ ok: true });
    }
    case 'event': {
      const name = String(body.name || ''), detail = String(body.detail || '');
      logEvent(name, detail, body.ua);
      const subject = name === 'ayuda_puzzle' ? NOMBRE + ' pidió ayuda en el puzzle' : NOMBRE + ': ' + name;
      mail(subject, detail + '\n\n(' + fecha(new Date()) + ')');
      return out({ ok: true });
    }
    case 'submit':
      return out(submit(body));
  }
  return out({ ok: false, error: 'action' });
}

// Para abrir la URL en el navegador y comprobar que está publicada
function doGet() {
  return ContentService.createTextOutput('ok');
}

function submit(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const prev = Number(props.getProperty('DONE_AT') || 0);
    if (prev) return { ok: true, at: prev, already: true }; // ya estaba enviado: no se guarda de nuevo

    const answers = Array.isArray(body.answers) ? body.answers : [];
    const now = new Date();
    const sh = sheet('Respuestas', ['Fecha', '#', 'Id', 'Pregunta', 'Respuesta', 'Segundos', 'Nota']);
    const rows = answers.map((a, i) => [now, i + 1, a.id || '', a.pregunta || '', texto(a.respuesta), a.segundos || 0, a.nota || '']);
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

    const lines = answers.map((a, i) =>
      (i + 1) + '. ' + (a.pregunta || a.id) + '\n' +
      '   → ' + texto(a.respuesta) + '\n' +
      '   (' + (a.segundos || 0) + ' s' + (a.nota ? ' · ' + a.nota : '') + ')');
    mail('Respuestas de ' + NOMBRE, NOMBRE + ' terminó el formulario (' + fecha(now) + ').\n\n' + lines.join('\n\n'));

    props.setProperty('DONE_AT', String(now.getTime()));
    return { ok: true, at: now.getTime() };
  } finally {
    lock.releaseLock();
  }
}

// ── utilidades ──

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function mail(subject, text) {
  const to = EMAIL || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(to, subject, text);
}

function sheet(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
  }
  return sh;
}

function logEvent(name, detail, ua) {
  sheet('Eventos', ['Fecha', 'Evento', 'Detalle', 'Navegador']).appendRow([new Date(), name, detail, ua || '']);
}

function texto(v) {
  if (Array.isArray(v)) return v.join(', ');
  return v === null || v === undefined ? '' : String(v);
}

function fecha(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm');
}

// ── para probar ──

// Ejecútala una vez desde el editor (botón ▶) para dar los permisos de correo y planilla.
function probarCorreo() {
  mail('Prueba del formulario', 'Si te llegó este correo, el backend puede avisarte.');
}

// Deja el formulario como nuevo (después de probarlo tú). Ejecútala desde el editor.
function reiniciar() {
  props.deleteProperty('DONE_AT');
  props.deleteProperty('OPENS');
}
