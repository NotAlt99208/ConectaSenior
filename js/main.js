/* =========================================================
   ConectaSenior · Landing Page · Interacciones + Mejoras HAI (S14)
   Los 4 trámites son funcionales para la demostración en vivo.
   ========================================================= */
'use strict';

/* ---------- Utilidades ---------- */
const Q = (s, e = document) => e.querySelector(s);
const QA = (s, e = document) => [...e.querySelectorAll(s)];
const I = n => `<span class="material-symbols-rounded" aria-hidden="true">${n}</span>`;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const HOY = new Date();
const fmtFecha = x => `${x.getDate()} de ${MESES[x.getMonth()]}`;
const fechaRel = d => { const x = new Date(HOY); x.setDate(x.getDate() + d); return fmtFecha(x); };
const fmtISO = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; };
const isoHoy = () => new Date(HOY.getTime() - HOY.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Estado compartido ---------- */
const DEF = () => ({ flow: 'cita', step: 0, data: {}, uses: {}, done: [], notes: [], perms: { n: 1, i: 1, f: 1 }, access: 1, codes: {}, user: null, logged: 0 });
let S;
try { S = JSON.parse(localStorage.getItem('cs2')); } catch (e) { S = null; }
S = Object.assign(DEF(), S || {});
const save = () => { try { localStorage.setItem('cs2', JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } };

const say = m => { const l = Q('#live'); if (!l) return; l.textContent = ''; setTimeout(() => { l.textContent = m; }, 60); };

/* ---------- Menú responsive ---------- */
const menuBtn = Q('#menuBtn');
if (menuBtn) menuBtn.addEventListener('click', () => {
  const abierto = Q('#links').classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', abierto);
});
QA('#links a').forEach(a => a.addEventListener('click', () => { Q('#links').classList.remove('open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); }));

/* ---------- Pestañas accesibles ---------- */
document.addEventListener('keydown', e => {
  const t = e.target.closest('[role=tab]');
  if (!t) return;
  const tabs = QA('[role=tab]', t.closest('[role=tablist]'));
  const i = tabs.indexOf(t);
  const map = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 };
  if (!(e.key in map)) return;
  e.preventDefault();
  const n = tabs[(map[e.key] + tabs.length) % tabs.length];
  n.focus();
  n.click();
});

/* =========================================================
   FLUJOS DE TRÁMITES (CITA Y RECIBO) + ASISTENTE HAI
   ========================================================= */
const FLOWS = {
  cita: {
    titulo: 'Solicitar una cita',
    steps: [
      { t: 'Elige el centro de salud', k: 'centro', o: ['Centro Norte', 'Centro Sur', 'Centro Lima'],
        aiQue: 'Toca el botón con el nombre del centro médico más cercano a tu casa.',
        aiEj: 'Ejemplo: Si vives en Lima Norte, elige "Centro Norte".' },
      { t: 'Elige la fecha de tu cita', k: 'fecha', ex: 'Toca el campo y elige un día en el calendario.',
        aiQue: 'Toca el recuadro de fecha y selecciona un día disponible a partir de hoy.',
        aiEj: 'Ejemplo: Elige mañana o cualquier día de la próxima semana.' },
      { t: 'Escribe tu número de documento', k: 'doc', ex: 'Ejemplo: 12345678 (8 números, sin espacios)',
        aiQue: 'Ingresa los 8 números de tu DNI o usa la cámara para leerlo automáticamente.',
        aiEj: 'Ejemplo: 10458921 (sin letras ni espacios).' }
    ]
  },
  recibo: {
    titulo: 'Pagar un recibo',
    steps: [
      { t: 'Elige el servicio a pagar', k: 'servicio', o: ['Recibo de Luz (Enel)', 'Recibo de Agua (Sedapal)', 'Teléfono / Internet'],
        aiQue: 'Selecciona cuál de tus servicios mensuales deseas pagar hoy.',
        aiEj: 'Ejemplo: Toca "Recibo de Luz (Enel)".' },
      { t: 'Ingresa tu código de suministro', k: 'doc', ex: 'Son 8 números que aparecen arriba en tu recibo.',
        aiQue: 'Puedes tomar foto a tu recibo con el botón azul o escribir los 8 números.',
        aiEj: 'Ejemplo: 10458921 (sin guiones ni espacios).' },
      { t: 'Verifica el monto a pagar (S/)', k: 'monto', ex: 'Monto detectado del mes: S/ 85.50. Puedes editarlo si deseas.',
        aiQue: 'Revisa que el monto coincida con tu recibo físico. Si lo cambias, puedes usar Deshacer.',
        aiEj: 'Ejemplo: 85.50 (puedes tocar Deshacer si te equivocas al borrar).' }
    ]
  }
};

const ACC = [
  ['calendar_month', 'Solicitar una cita', 'Más usado por ti'],
  ['receipt_long', 'Pagar un recibo', 'Luz o agua sin colas'],
  ['local_hospital', 'Consultar mi cita', 'Revisa tus reservas'],
  ['payments', 'Consultar mi pensión', 'Cronograma vigente']
];
const FRASES = [
  'Pídale que elija una opción de la lista.',
  'Pídale que ingrese o escanee el dato solicitado.',
  'Dígale que verifique el número con ayuda de la cámara.',
  'Pídale que revise sus datos y toque el botón verde.'
];
const ESTADO = { 'Completado': ['check_circle', 'p-ok'], 'Pendiente': ['schedule', 'p-pe'], 'Falló': ['error', 'p-er'] };
const BASE = () => [
  ['Solicitar una cita', 'Completado', fechaRel(-5)],
  ['Pago de recibo de luz', 'Falló', fechaRel(-1)],
  ['Consulta de pensión', 'Pendiente', fechaRel(-3)]
];
const VENC = [['Pago de recibo de agua', 2], ['Renovación de DNI', 6], ['Cita de control en Centro Norte', 9]];
const PERMS = { i: ['Itinerario y vencimientos', 'Fechas y estados de sus trámites'], n: ['Avisos de trámites', 'Completados y pendientes'], f: ['Intentos fallidos', 'Para ofrecer ayuda a tiempo'] };

const pill = e => `<span class="pill ${ESTADO[e][1]}">${I(ESTADO[e][0])} ${e}</span>`;

function listaAvisos() {
  if (!S.access) return [];
  const A = [];
  if (S.perms.n) S.notes.slice().reverse().forEach(t => A.push(['ok', 'check_circle', t]));
  if (S.perms.n) A.push(['pe', 'schedule', '“Consulta de pensión” lleva 3 días pendiente. Puedes ofrecerle ayuda.']);
  if (S.perms.f) A.push(['er', 'error', '“Pago de recibo de luz” tuvo 3 intentos fallidos. Quizá necesite apoyo.']);
  return A;
}
const htmlAvisos = (max = 99) => {
  const A = listaAvisos().slice(0, max);
  return A.length ? A.map(a => `<div class="aviso ${a[0]}">${I(a[1])}<span>${esc(a[2])}</span></div>`).join('') : '<p class="note2">No tienes avisos con los permisos actuales.</p>';
};
function htmlItinerario() {
  if (!S.perms.i) return `<p class="warn">${I('visibility_off')} Carmen no comparte su itinerario contigo.</p>`;
  const L = BASE().concat(S.done.map(d => [d.n, 'Completado', d.d]));
  return L.map(x => `<div class="row"><b>${esc(x[0])}</b> ${pill(x[1])}<br><small>${esc(x[2])} · ${I('lock')} Documento: oculto por privacidad</small></div>`).join('')
    + `<p><small>${I('visibility')} Solo lectura: no puedes cambiar estos trámites.</small></p>`;
}
function htmlVencimientos() {
  if (!S.perms.i) return `<p class="warn">${I('visibility_off')} Carmen no comparte sus vencimientos contigo.</p>`;
  return VENC.map(v => `<div class="row"><b>${v[0]}</b> <span class="pill p-pe">${I('event')} Vence en ${v[1]} días</span><br><small>${fechaRel(v[1])}</small></div>`).join('')
    + '<p><small>Recuérdaselos con tiempo. Tú no puedes realizar estos trámites por ella.</small></p>';
}
function htmlPermisos() {
  return Object.keys(PERMS).map(k => {
    const si = S.access && S.perms[k];
    return `<div class="aviso ${si ? 'ok' : ''}">${I(si ? 'visibility' : 'visibility_off')}<span><b>${PERMS[k][0]}: ${si ? 'Puedes ver' : 'No puedes ver'}</b><br><small>${PERMS[k][1]}</small></span></div>`;
  }).join('') + `<p class="note2">${I('lock')} Claves y números de documento siempre están ocultos. Solo Carmen decide qué compartes.</p>`;
}
const sinAcceso = () => `<div class="c"><span class="ico-xl material-symbols-rounded" aria-hidden="true">lock</span><h3>Ya no tienes acceso</h3><p>Carmen quitó el permiso para consultar su información.</p><p class="warn">Sin permiso no recibes avisos. Pídele un nuevo código de vinculación.</p></div>`;

/* =========================================================
   DEMO EN VIDEO (HU44)
   ========================================================= */
const CAP = [
  [0, 'waving_hand', 'Hola, te acompañamos paso a paso.'],
  [10, 'home', 'En la pantalla de inicio, elige cualquiera de los 4 trámites.'],
  [25, 'local_hospital', 'Elige tu centro o servicio con botones grandes.'],
  [40, 'calendar_month', 'Selecciona la fecha o escanea tu recibo con la cámara.'],
  [55, 'badge', 'El asistente contextual te explica cada paso en lenguaje claro.'],
  [70, 'volume_up', 'Toca “Escuchar” o usa tu voz para avanzar.'],
  [85, 'check_circle', 'Revisa el resumen hablado y confirma. La decisión es siempre tuya.'],
  [100, 'group', 'Tu familia puede acompañarte con QR, solo si tú lo permites.']
];
const DUR = 108;
let t = 0, iv = null, sub = true;
const fmtT = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
function drawDemo() {
  Q('#pg').value = t;
  Q('#tm').textContent = fmtT(t) + ' / 1:48';
  const c = CAP.filter(x => x[0] <= t).pop();
  Q('#scr-ico').textContent = c[1];
  Q('#cap').textContent = c[2];
  Q('#cap').hidden = !sub;
}
function tick() {
  t++;
  if (t >= DUR) { clearInterval(iv); iv = null; t = DUR; Q('#pp').innerHTML = I('replay') + ' Ver de nuevo'; Q('#end').hidden = false; }
  drawDemo();
}
if (Q('#pp')) {
  Q('#pp').addEventListener('click', () => {
    if (iv) { clearInterval(iv); iv = null; Q('#pp').innerHTML = I('play_arrow') + ' Reproducir'; say('Demo en pausa.'); return; }
    if (t >= DUR) { t = 0; Q('#end').hidden = true; }
    iv = setInterval(tick, 1000);
    Q('#pp').innerHTML = I('pause') + ' Pausar';
    drawDemo();
  });
  Q('#cc').addEventListener('click', e => {
    sub = !sub;
    e.currentTarget.setAttribute('aria-pressed', sub);
    e.currentTarget.innerHTML = I(sub ? 'closed_caption' : 'closed_caption_disabled') + (sub ? ' Subtítulos activados' : ' Subtítulos desactivados');
    drawDemo();
  });
}

/* =========================================================
   PRUEBA LA APP · TODAS LAS OPCIONES FUNCIONALES
   ========================================================= */
let mode = 'adulto', view = 'home', quit = false, said = '', enfocar = false;

const banner = () => mode === 'personal' ? `<div class="ban">${I('visibility')} MODO ASISTIDO</div>` : '';

function vHome() {
  const orden = ACC.slice().sort((a, b) => (S.uses[b[1]] || 0) - (S.uses[a[1]] || 0));
  said = '¿Qué necesitas hacer? Elige un trámite.';
  const pendTitulo = FLOWS[S.flow]?.titulo || 'Solicitar una cita';
  return `<p class="hi">Buenos días, Carmen</p><h3 tabindex="-1">¿Qué necesitas hacer?</h3>`
    + `<p><small>${I('auto_awesome')} Ordenado según tus trámites frecuentes (tú tienes el control).</small></p>`
    + (S.step > 0 ? `<div class="pend"><b>${I('schedule')} ${pendTitulo}</b><p>Quedaste en el paso ${S.step} de 4</p><button class="btn" data-a="resume">${I('arrow_forward')} Continuar donde lo dejé</button></div>` : '')
    + `<div class="acc">` + orden.map(a => {
      const usos = S.uses[a[1]] || 0;
      const motivo = usos > 0 ? `Usado ${usos} ${usos === 1 ? 'vez' : 'veces'}` : a[2];
      return `<button class="ac" data-a="acc" data-n="${a[1]}">${I(a[0])}<span>${a[1]}</span><span class="hai-why">★ ${motivo}</span></button>`;
    }).join('') + '</div>';
}

function vPaso(n) {
  const fl = FLOWS[S.flow] || FLOWS.cita;
  const s = fl.steps[n - 1], d = S.data;
  said = s.t + '. ' + (s.ex || '');
  let f = '';
  if (s.o) {
    const valActual = d[s.k];
    f = `<div class="opts" role="group" aria-label="${s.t}">` + s.o.map(o => `<button class="opt" data-a="opt" data-k="${s.k}" data-v="${o}" aria-pressed="${valActual === o}">${I(S.flow === 'recibo' ? 'receipt_long' : 'local_hospital')} ${o}</button>`).join('') + '</div>';
  } else if (s.k === 'fecha') {
    f = `<label for="f">Fecha de la cita</label><input id="f" type="date" min="${isoHoy()}" value="${d.fecha || ''}" aria-describedby="fh err"><small id="fh" class="hint">${s.ex}</small>`;
  } else if (s.k === 'monto') {
    if (!d.monto) d.monto = '85.50';
    f = `<label for="f">Monto a pagar (S/)</label>
         <input id="f" type="number" step="0.10" value="${d.monto}" aria-describedby="fh err">
         <small id="fh" class="hint">${s.ex}</small>
         <button class="btn2" data-a="clr">${I('backspace')} Borrar monto</button>`;
  } else {
    const eti = S.flow === 'recibo' ? 'Escanear recibo con cámara (IA)' : 'Escanear DNI con cámara (IA)';
    f = `<div class="ocr-box">
          <button type="button" class="btn2" data-a="ocr" style="width:100%;margin:0">${I('photo_camera')} ${eti}</button>
          <div id="ocr-res" hidden></div>
         </div>
         <label for="f">Número de 8 dígitos (o corrígelo aquí)</label>
         <input id="f" inputmode="numeric" maxlength="8" autocomplete="off" value="${d.doc || ''}" aria-describedby="fh err">
         <small id="fh" class="hint">${s.ex}</small>
         <small class="hint">Llevas <b id="cnt">${(d.doc || '').length} de 8</b> números</small>
         <button class="btn2" data-a="clr">${I('backspace')} Borrar dato</button>`;
  }

  return `<p class="st">Paso ${n} de 4 · ${fl.titulo}</p><div class="bar" role="progressbar" aria-label="Avance del trámite" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${n}"><i style="width:${n * 25}%"></i></div>`
    + `<h3 id="titulo-paso" tabindex="-1">${s.t}</h3>`
    + `<div class="vz">
        <button class="btn2" data-a="say">${I('volume_up')}Escuchar</button>
        <button class="btn2" data-a="mic">${I('mic')}Hablar</button>
        <button class="btn2" data-a="stop">${I('stop')}Detener</button>
       </div>`
    + `<div id="voz-onda" class="voz-ondas" hidden><span class="ondas-bars"><i></i><i></i><i></i></span><span id="voz-txt">Leyendo instrucción en voz alta...</span></div>`
    + f
    + `<p id="err" class="err" role="alert" hidden></p><div id="undo"></div>`
    + `<div class="hai-bot" role="region" aria-label="Ayudante ConectaSenior">
        <div class="hai-bot-head">${I('smart_toy')} Ayudante ConectaSenior <small>(Guía automática)</small></div>
        <div class="hai-chips">
          <button type="button" class="hai-chip" data-a="bot" data-q="que">¿Qué pongo aquí?</button>
          <button type="button" class="hai-chip" data-a="bot" data-q="ej">Dame un ejemplo</button>
          <button type="button" class="hai-chip" data-a="bot" data-q="voz">🔊 Leer ayuda</button>
        </div>
        <div id="bot-out" class="hai-bot-msg">Toca un botón si tienes dudas sobre este paso.</div>
       </div>`
    + `<div class="nav2"><button class="btn2" data-a="back">${I('arrow_back')} Volver</button><button class="btn" data-a="next">Siguiente ${I('arrow_forward')}</button></div>`;
}

function vResumen() {
  const d = S.data, esRecibo = S.flow === 'recibo';
  const r = esRecibo
    ? [['Servicio', d.servicio], ['Suministro', d.doc], ['Monto a pagar', 'S/ ' + (d.monto || '85.50')]]
    : [['Centro', d.centro], ['Fecha', fmtISO(d.fecha)], ['Documento', d.doc]];
  const detalleVoz = esRecibo
    ? `Vas a pagar ${d.servicio}, suministro ${d.doc}, por un monto de ${d.monto} soles.`
    : `Vas a confirmar tu cita en ${d.centro} para el ${fmtISO(d.fecha)}.`;
  said = 'Revisa la información y confirma.';
  return `<p class="st">Paso 4 de 4</p><div class="bar" role="progressbar" aria-label="Avance del trámite" aria-valuemin="0" aria-valuemax="4" aria-valuenow="4"><i style="width:100%"></i></div><h3 tabindex="-1">Revisa la información</h3>`
    + r.map((x, i) => `<div class="row"><b>${x[0]}:</b> ${esc(x[1] || '—')}<br><button class="btn2" data-a="fix" data-n="${i + 1}">${I('edit')} Corregir</button></div>`).join('')
    + `<div class="nav2"><button class="btn2" data-a="back">${I('arrow_back')} Volver</button><button class="btn" data-a="send">${I('send')} ${esRecibo ? 'Pagar ahora' : 'Enviar'}</button></div>`
    + (view === 'confirm' ? `<div class="ov" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><h3 id="dlg-t" tabindex="-1">¿Confirmas esta operación?</h3><p>${detalleVoz}</p><p><small>${I('volume_up')} Leyendo resumen en voz alta. Nada se procesa hasta que confirmes.</small></p><button class="btn" data-a="yes">${I('check_circle')} Sí, confirmar</button><button class="btn2" data-a="no">${I('arrow_back')} No, volver</button></div>` : '');
}

function vListo() {
  const x = S.last;
  said = 'Trámite completado. Tu número de constancia es ' + x.c;
  return `<div class="c"><span class="ico-xl material-symbols-rounded" aria-hidden="true" style="color:var(--verde)">check_circle</span><h3 tabindex="-1">${x.titulo || 'Trámite completado'}</h3><p>${x.detalle || 'Tu solicitud se procesó correctamente.'}</p></div>`
    + (x.as ? `<p class="c"><span class="pill">${I('visibility')} Completado con acompañamiento</span></p>` : '')
    + `<div class="cons">Número de constancia<br><b>${x.c}</b></div>`
    + `<button class="btn2" data-a="keep" style="width:100%">${I('download')} Guardar constancia</button><button class="btn" data-a="home">${I('home')} Volver al inicio</button>`;
}

/* Vista 3: Consultar mi cita (Funcional) */
function vMisCitas() {
  const citas = [
    { centro: 'Centro Norte', fecha: fechaRel(4), hora: '09:30 AM', cod: 'CS-4812-9011' },
    ...S.done.filter(x => x.n === 'Solicitar una cita').map((c, idx) => ({ centro: c.centro || 'Centro Lima', fecha: c.d, hora: '10:15 AM', cod: 'CS-7721-330' + idx }))
  ];
  said = `Tienes ${citas.length} citas médicas programadas.`;
  return `<p class="hi">Tus reservas activas</p><h3 id="titulo-paso" tabindex="-1">Consultar mi cita</h3>`
    + `<div class="vz"><button class="btn2" data-a="say">${I('volume_up')}Escuchar</button><button class="btn2" data-a="mic">${I('mic')}Hablar</button><button class="btn2" data-a="stop">${I('stop')}Detener</button></div>`
    + `<div id="voz-onda" class="voz-ondas" hidden><span class="ondas-bars"><i></i><i></i><i></i></span><span id="voz-txt">Leyendo tus citas...</span></div>`
    + citas.map(c => `<div class="row">
        <span class="pill p-ok">${I('check_circle')} Confirmada</span>
        <p style="margin:6px 0 2px"><b>${esc(c.centro)}</b></p>
        <small>${I('event')} ${esc(c.fecha)} · ${c.hora}<br>Constancia: <b>${c.cod}</b></small>
      </div>`).join('')
    + `<div class="hai-bot"><div class="hai-bot-head">${I('smart_toy')} Ayudante ConectaSenior</div><div class="hai-bot-msg">Recuerda llevar tu DNI físico 15 minutos antes de tu cita.</div></div>`
    + `<button class="btn" data-a="home" style="margin-top:16px">${I('home')} Volver al inicio</button>`;
}

/* Vista 4: Consultar mi pensión (Funcional) */
function vPension() {
  said = 'Tu pensión de 650 soles está disponible para cobro desde hoy en el Banco de la Nación.';
  return `<p class="hi">Cronograma ONP / Pensión 65</p><h3 id="titulo-paso" tabindex="-1">Consultar mi pensión</h3>`
    + `<div class="vz"><button class="btn2" data-a="say">${I('volume_up')}Escuchar</button><button class="btn2" data-a="mic">${I('mic')}Hablar</button><button class="btn2" data-a="stop">${I('stop')}Detener</button></div>`
    + `<div id="voz-onda" class="voz-ondas" hidden><span class="ondas-bars"><i></i><i></i><i></i></span><span id="voz-txt">Leyendo información de pensión...</span></div>`
    + `<div class="row" style="border-left:5px solid var(--verde)">
        <span class="pill p-ok">${I('payments')} Abono disponible</span>
        <p style="font-size:26px;font-weight:700;color:var(--verde);margin:8px 0">S/ 650.00</p>
        <small><b>Fecha de abono:</b> ${fechaRel(-1)}<br><b>Entidad:</b> Banco de la Nación (Cuenta N° ****4821)</small>
      </div>`
    + `<div class="hai-bot"><div class="hai-bot-head">${I('smart_toy')} Ayudante ConectaSenior</div><div class="hai-bot-msg">Tu dinero ya está en tu cuenta. No necesitas retirarlo todo el mismo día y nunca compartas tu clave secreta.</div></div>`
    + `<button class="btn" data-a="home" style="margin-top:16px">${I('home')} Volver al inicio</button>`;
}

function vFamiliar() {
  if (!S.access) return sinAcceso();
  return `<p class="hi">Itinerario compartido</p><h3 tabindex="-1">Trámites de Carmen</h3>` + htmlItinerario()
    + (S.perms.n && S.notes.length ? '<h3>Avisos</h3>' + S.notes.slice(-2).reverse().map(n => `<div class="aviso ok">${I('notifications')}<span>${esc(n)}</span></div>`).join('') : '')
    + (quit ? `<div class="ov" role="dialog" aria-modal="true" aria-labelledby="q-t"><h3 id="q-t" tabindex="-1">¿Quitar el acceso a este familiar?</h3><p>Dejará de ver el itinerario y de recibir avisos de inmediato.</p><button class="btn peligro" data-a="qyes">${I('person_remove')} Sí, quitar acceso</button><button class="btn2" data-a="qno">${I('arrow_back')} No, volver</button></div>` : '');
}

function vFlujo() {
  if (view === 'home') return vHome();
  if (view === 'done') return vListo();
  if (view === 'miscitas') return vMisCitas();
  if (view === 'pension') return vPension();
  return S.step === 4 ? vResumen() : vPaso(S.step);
}

function info() {
  let h;
  if (mode === 'adulto') h = `<h3>Qué puedes probar (4 Trámites Activos)</h3><ul class="ck"><li>${I('calendar_month')} Solicitar una cita médica</li><li>${I('receipt_long')} Pagar un recibo (Luz/Agua)</li><li>${I('local_hospital')} Consultar tus citas activas</li><li>${I('payments')} Consultar tu pensión y abonos</li><li>${I('smart_toy')} Voz, OCR y Ayudante IA en todo</li></ul><p><small>Tu avance se guarda solo en este navegador.</small></p>`;
  else if (mode === 'familiar') h = '<h3>Lo que puedes ver</h3>' + htmlPermisos() + `<a class="btn2" href="portal.html">${I('login')} Ir al portal del familiar</a>`;
  else h = `<h3>Asistencia respetuosa</h3><ul class="ck"><li>${I('check_circle')} Usa frases claras y breves</li><li>${I('check_circle')} Señala el siguiente paso</li><li>${I('check_circle')} Deja que él toque la pantalla</li><li>${I('check_circle')} La confirmación final es suya</li></ul>`;
  Q('#info').innerHTML = h;
}

function panel() {
  const p = Q('#panel');
  Q('#demo-grid').classList.toggle('dos', mode === 'adulto');
  p.hidden = mode === 'adulto';
  if (mode === 'adulto') { p.innerHTML = ''; return; }
  if (mode === 'familiar') {
    p.innerHTML = `<h3>Decisiones de Carmen</h3><p><small>Simula lo que el adulto mayor permite.</small></p>`
      + Object.keys(PERMS).map(k => `<label class="sw"><span>${PERMS[k][0]}<br><span class="estado">${S.perms[k] ? 'Activado' : 'Desactivado'}</span></span><input type="checkbox" role="switch" data-p="${k}" ${S.perms[k] ? 'checked' : ''} ${S.access ? '' : 'disabled'}></label>`).join('')
      + `<button class="btn2 peligro" data-a="quit" ${S.access ? '' : 'disabled'}>${I('person_remove')} Quitar acceso</button>`
      + `<h3 style="margin-top:24px">Vincular cuentas (Multimodal QR)</h3><p><small>Paso 1: Genera QR o código. Paso 2: Ingresa el código abajo para autorizar.</small></p>`
      + `<button class="btn2" data-a="gen">${I('qr_code_2')} Generar QR y código</button>`
      + (S.code ? `<div class="qr-link-box"><img src="images/qr.svg" alt="QR de vinculación" width="96" height="96"><br><small>Código de 6 dígitos:</small><br><b id="code" style="font-size:26px;letter-spacing:3px;color:var(--verde)">${S.code}</b></div>` : `<b id="code" style="font-size:24px;letter-spacing:2px"></b>`)
      + `<label for="cin">Paso 2: Escribe aquí los 6 números</label><input id="cin" inputmode="numeric" maxlength="6" placeholder="Ej: ${S.code || '482915'}" autocomplete="off" aria-describedby="cmsg"><button class="btn" data-a="link">${I('link')} Aprobar vinculación</button><p id="cmsg" role="status"></p>`;
  } else {
    const frase = view === 'done' ? 'Felicítelo: el trámite fue suyo.' : view === 'home' ? 'Pídale que toque el trámite que necesita.' : FRASES[Math.min(S.step || 1, 4) - 1];
    p.innerHTML = `<h3>Frase guía sugerida</h3><p class="note2"><b>“${frase}”</b></p>`
      + `<button class="btn2" data-a="snext">${I('arrow_forward')} Avanzar como personal</button><button class="btn2" data-a="sconf">${I('check_circle')} Confirmar como personal</button>`
      + `<p id="smsg" class="warn" role="status" hidden></p><p class="note2">${I('info')} Solo el adulto mayor puede avanzar y confirmar.</p>`
      + `<button class="btn2" data-a="exit">${I('logout')} Salir del modo asistido</button>`;
  }
}

function render() {
  if (!Q('#phone')) return;
  Q('#phone').innerHTML = banner() + (mode === 'familiar' ? vFamiliar() : vFlujo());
  info();
  panel();
  if (enfocar) { const h = Q('#phone [role=dialog] h3') || Q('#phone h3'); if (h) h.focus({ preventScroll: true }); enfocar = false; }
}
function go(n) { S.step = n; save(); enfocar = true; render(); }

function revisar(n) {
  const fl = FLOWS[S.flow] || FLOWS.cita;
  const s = fl.steps[n - 1], d = S.data;
  if (s.k === 'centro') return d.centro ? '' : 'Elige un centro de salud para continuar.';
  if (s.k === 'servicio') return d.servicio ? '' : 'Elige el servicio que deseas pagar.';
  if (s.k === 'fecha') { if (!d.fecha) return 'Falta la fecha. Toca el campo y elige un día.'; if (d.fecha < isoHoy()) return 'Esa fecha ya pasó. Elige un día desde hoy.'; return ''; }
  if (s.k === 'monto') return Number(d.monto) > 0 ? '' : 'Ingresa un monto válido mayor a cero.';
  return /^\d{8}$/.test(d.doc || '') ? '' : `El número debe tener 8 dígitos. Escribiste ${(d.doc || '').length}. Ejemplo: 12345678.`;
}

function hablar(texto, parar) {
  const onda = Q('#voz-onda'), tit = Q('#titulo-paso');
  if (!('speechSynthesis' in window)) { say('Tu navegador no tiene voz disponible.'); return; }
  speechSynthesis.cancel();
  if (onda) onda.hidden = true;
  if (tit) tit.classList.remove('leyendo-activo');
  if (parar) return;
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'es-PE';
  u.rate = 0.9;
  u.onstart = () => { if (onda) onda.hidden = false; if (tit) tit.classList.add('leyendo-activo'); };
  u.onend = () => { if (onda) onda.hidden = true; if (tit) tit.classList.remove('leyendo-activo'); };
  speechSynthesis.speak(u);
}

function escucharComando() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const onda = Q('#voz-onda'), vtxt = Q('#voz-txt');
  if (!SpeechRec) {
    say('Comandos de voz disponibles: Siguiente, Repetir o Volver.');
    if (onda && vtxt) { onda.hidden = false; vtxt.textContent = 'Di: "Siguiente", "Repetir" o "Volver"'; }
    return;
  }
  const rec = new SpeechRec();
  rec.lang = 'es-PE';
  if (onda && vtxt) { onda.hidden = false; vtxt.textContent = 'Escuchando tu voz... Di "Siguiente", "Repetir" o "Volver"'; }
  rec.onresult = e => {
    const cmd = e.results[0][0].transcript.toLowerCase();
    if (onda) onda.hidden = true;
    if (cmd.includes('repetir')) hablar(said);
    else if (cmd.includes('siguiente')) Q('[data-a="next"]')?.click();
    else if (cmd.includes('volver')) Q('[data-a="back"]')?.click() || Q('[data-a="home"]')?.click();
    else { say('No entendí el comando. Intenta decir Siguiente, Repetir o Volver.'); alert(`Escuché "${cmd}". Di: Siguiente, Repetir o Volver.`); }
  };
  rec.onerror = () => { if (onda) onda.hidden = true; };
  rec.start();
}

function guardarConstancia() {
  const x = S.last;
  const txt = `ConectaSenior · Constancia de trámite\n\nTrámite: ${x.titulo}\nDetalle: ${x.detalle}\nNúmero de constancia: ${x.c}\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
  a.download = `constancia-${x.c}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  say('Constancia guardada en tu dispositivo.');
}

/* =========================================================
   PORTAL DE ACOMPAÑAMIENTO
   ========================================================= */
let authView = 'login', pview = 'avisos';

function vAuth() {
  const login = authView === 'login';
  return `<div class="tabs" role="tablist" aria-label="Acceso al portal">`
    + `<button role="tab" class="tab" id="t-login" data-a="auth" data-v="login" aria-selected="${login}" aria-controls="p-auth" tabindex="${login ? 0 : -1}">${I('login')} Iniciar sesión</button>`
    + `<button role="tab" class="tab" id="t-signup" data-a="auth" data-v="signup" aria-selected="${!login}" aria-controls="p-auth" tabindex="${login ? -1 : 0}">${I('person_add')} Crear cuenta</button></div>`
    + `<div id="p-auth" role="tabpanel" aria-labelledby="${login ? 't-login' : 't-signup'}">`
    + (login
      ? `<form id="f-login" class="card form-card" novalidate><h2>Inicia sesión</h2><p>Entra para ver cómo van los trámites de tu familiar.</p>
         <label for="l-m">Correo</label><input id="l-m" type="email" autocomplete="email" aria-describedby="e-l-m"><p class="err" id="e-l-m" hidden></p>
         <label for="l-p">Contraseña</label><div class="pass"><input id="l-p" type="password" autocomplete="current-password" aria-describedby="e-l-p"><button type="button" class="btn2" data-a="ver" data-for="l-p" aria-pressed="false">${I('visibility')} Mostrar</button></div><p class="err" id="e-l-p" hidden></p>
         <button class="btn" type="submit">${I('login')} Iniciar sesión</button>
         <p><small>¿No tienes cuenta? <a href="#" data-a="auth" data-v="signup">Crea una aquí</a>.</small></p></form>`
      : `<form id="f-signup" class="card form-card" novalidate><h2>Crea tu cuenta de familiar</h2><p>Después podrás vincularte con tu familiar usando un código, sin compartir contraseñas.</p>
         <label for="s-n">Nombre completo</label><input id="s-n" autocomplete="name" aria-describedby="e-s-n"><p class="err" id="e-s-n" hidden></p>
         <label for="s-m">Correo</label><input id="s-m" type="email" autocomplete="email" aria-describedby="h-s-m e-s-m"><small id="h-s-m" class="hint">Ejemplo: nombre@correo.com</small><p class="err" id="e-s-m" hidden></p>
         <label for="s-r">¿Qué relación tienes con el adulto mayor?</label><select id="s-r" aria-describedby="e-s-r"><option value="">Elige una opción</option><option>Hijo o hija</option><option>Nieto o nieta</option><option>Cuidador o cuidadora</option><option>Otro familiar</option></select><p class="err" id="e-s-r" hidden></p>
         <label for="s-p">Contraseña</label><div class="pass"><input id="s-p" type="password" autocomplete="new-password" aria-describedby="h-s-p e-s-p"><button type="button" class="btn2" data-a="ver" data-for="s-p" aria-pressed="false">${I('visibility')} Mostrar</button></div><small id="h-s-p" class="hint">Mínimo 8 caracteres.</small><p class="err" id="e-s-p" hidden></p>
         <button class="btn" type="submit">${I('person_add')} Crear cuenta</button>
         <p><small>Demo: la contraseña no se guarda. Tus datos quedan solo en este navegador.</small></p></form>`)
    + '</div>';
}

function vPanelFam() {
  const nAv = listaAvisos().length;
  const secs = [['avisos', 'notifications', 'Avisos'], ['itinerario', 'receipt_long', 'Itinerario'], ['venc', 'event', 'Próximos vencimientos'], ['permisos', 'visibility', 'Lo que puedes ver'], ['perfil', 'person', 'Mi perfil']];
  const nombre = esc(S.user.name.split(' ')[0]);
  let cont;
  if (pview === 'perfil') cont = `<h2 tabindex="-1">Mi perfil</h2><dl class="perfil"><dt>Nombre</dt><dd>${esc(S.user.name)}</dd><dt>Correo</dt><dd>${esc(S.user.email)}</dd><dt>Relación</dt><dd>${esc(S.user.rel)}</dd><dt>Acompañas a</dt><dd>${S.access ? 'Carmen (vinculado)' : 'Nadie por ahora'}</dd></dl><button class="btn2" data-a="logout">${I('logout')} Cerrar sesión</button>`;
  else if (!S.access) cont = sinAcceso() + `<a class="btn auto" href="index.html#prueba">${I('qr_code_2')} Vincular con un código nuevo</a>`;
  else if (pview === 'avisos') cont = `<h2 tabindex="-1">Avisos</h2>` + htmlAvisos();
  else if (pview === 'itinerario') cont = `<h2 tabindex="-1">Itinerario de Carmen</h2>` + htmlItinerario();
  else if (pview === 'venc') cont = `<h2 tabindex="-1">Próximos vencimientos</h2>` + htmlVencimientos();
  else cont = `<h2 tabindex="-1">Lo que puedes ver</h2>` + htmlPermisos() + `<p><small>¿Quieres probar cómo cambian los permisos? <a href="index.html#prueba">Abre la demo con el rol Familiar</a>.</small></p>`;
  return `<p class="hi">Hola, ${nombre}</p><h1>Panel del familiar</h1><p class="lead">Acompañas a Carmen. Aquí solo ves lo que ella decidió compartir.</p>`
    + `<div class="portal-grid"><div class="side card" role="tablist" aria-orientation="vertical" aria-label="Secciones del panel">`
    + secs.map(s => `<button role="tab" class="tab" id="pt-${s[0]}" data-a="pview" data-v="${s[0]}" aria-selected="${pview === s[0]}" aria-controls="p-cont" tabindex="${pview === s[0] ? 0 : -1}">${I(s[1])} ${s[2]}${s[0] === 'avisos' && nAv ? `<span class="badge" aria-label="${nAv} avisos">${nAv}</span>` : ''}</button>`).join('')
    + `</div><div id="p-cont" class="card" role="tabpanel" aria-labelledby="pt-${pview}">${cont}</div></div>`;
}

function renderPortal(foco) {
  const root = Q('#portal');
  if (!root) return;
  const dentro = S.logged && S.user;
  Q('#portal-intro').hidden = !!dentro;
  root.innerHTML = dentro ? vPanelFam() : vAuth();
  if (foco) { const h = Q(foco, root); if (h) h.focus(); }
}

function validar(campos) {
  let primero = null;
  campos.forEach(([id, msg, ok]) => {
    const f = Q('#' + id), e = Q('#e-' + id), bien = ok(f.value.trim());
    e.hidden = bien; e.textContent = bien ? '' : msg;
    f.setAttribute('aria-invalid', !bien);
    if (!bien && !primero) primero = f;
  });
  if (primero) primero.focus();
  return !primero;
}
const esCorreo = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* =========================================================
   EVENTOS
   ========================================================= */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  const a = b.dataset.a;
  if (b.tagName === 'A' && b.getAttribute('href') === '#') e.preventDefault();

  switch (a) {
    case 'pickrole': {
      mode = b.dataset.m; view = 'home'; quit = false;
      QA('#prueba [role=tab]').forEach(x => { const s = x.dataset.m === mode; x.setAttribute('aria-selected', s); x.tabIndex = s ? 0 : -1; });
      render();
      Q('#prueba')?.scrollIntoView({ behavior: 'smooth' });
      say('Rol seleccionado: ' + mode);
      break;
    }

    case 'tab':
      mode = b.dataset.m; view = 'home'; quit = false;
      QA('#prueba [role=tab]').forEach(x => { const s = x === b; x.setAttribute('aria-selected', s); x.tabIndex = s ? 0 : -1; });
      Q('#demo-grid').setAttribute('aria-labelledby', b.id);
      render(); say('Rol: ' + b.textContent.trim()); break;

    case 'acc': {
      const nom = b.dataset.n;
      S.uses[nom] = (S.uses[nom] || 0) + 1;
      if (nom === 'Solicitar una cita') {
        if (S.flow !== 'cita') { S.flow = 'cita'; S.step = 1; S.data = {}; }
        save(); view = 'step'; go(S.step || 1);
      } else if (nom === 'Pagar un recibo') {
        if (S.flow !== 'recibo') { S.flow = 'recibo'; S.step = 1; S.data = {}; }
        save(); view = 'step'; go(S.step || 1);
      } else if (nom === 'Consultar mi cita') {
        save(); view = 'miscitas'; enfocar = true; render();
      } else if (nom === 'Consultar mi pensión') {
        save(); view = 'pension'; enfocar = true; render();
      }
      break;
    }
    case 'resume': view = 'step'; go(S.step); break;
    case 'opt': S.data[b.dataset.k] = b.dataset.v; save(); render(); Q(`[data-v="${b.dataset.v}"]`)?.focus(); break;
    case 'say': hablar(said); break;
    case 'mic': escucharComando(); break;
    case 'stop': hablar('', true); break;

    case 'bot': {
      const fl = FLOWS[S.flow] || FLOWS.cita;
      const s = fl.steps[S.step - 1], out = Q('#bot-out');
      if (!s || !out) break;
      const msg = b.dataset.q === 'ej' ? s.aiEj : s.aiQue;
      out.textContent = msg;
      if (b.dataset.q === 'voz') hablar(msg);
      say(msg);
      break;
    }

    case 'ocr': {
      S.prev = S.data.doc || '';
      S.data.doc = '10458921'; save();
      const inp = Q('#f'), cnt = Q('#cnt'), res = Q('#ocr-res');
      if (inp) inp.value = '10458921';
      if (cnt) cnt.textContent = '8 de 8';
      if (res) {
        res.hidden = false;
        res.className = 'ocr-ok';
        res.innerHTML = '✅ Leído con 97 % de precisión: <b>10458921</b>. Revísalo abajo.';
      }
      Q('#undo').innerHTML = `<div class="undo"><span>Número autocompletado por cámara</span><button class="btn2" data-a="undo">${I('undo')} Deshacer</button></div>`;
      say('Número 10458921 completado automáticamente.');
      break;
    }

    case 'clr': {
      const fl = FLOWS[S.flow] || FLOWS.cita;
      const k = fl.steps[S.step - 1].k;
      S.prev = S.data[k]; S.data[k] = ''; save();
      if (Q('#f')) Q('#f').value = '';
      if (Q('#cnt')) Q('#cnt').textContent = '0 de 8';
      Q('#undo').innerHTML = `<div class="undo"><span>Dato borrado</span><button class="btn2" data-a="undo">${I('undo')} Deshacer</button></div>`;
      say('Dato borrado. Puedes deshacer.'); break;
    }
    case 'undo': {
      const fl = FLOWS[S.flow] || FLOWS.cita;
      const k = fl.steps[S.step - 1].k;
      S.data[k] = S.prev || ''; save();
      if (Q('#f')) Q('#f').value = S.data[k];
      if (Q('#cnt')) Q('#cnt').textContent = String(S.data[k]).length + ' de 8';
      Q('#undo').innerHTML = ''; Q('#f')?.focus(); say('Dato restaurado.'); break;
    }
    case 'back':
      if (view === 'step' && S.step > 1) go(S.step - 1); else { view = 'home'; enfocar = true; render(); }
      break;
    case 'next': {
      const m = revisar(S.step);
      if (!m) { go(S.step + 1); break; }
      const r = Q('#err'); r.hidden = false; r.textContent = m;
      const f = Q('#f') || Q('.opt');
      if (Q('#f')) Q('#f').setAttribute('aria-invalid', 'true');
      f.scrollIntoView({ block: 'center', behavior: 'smooth' }); f.focus({ preventScroll: true });
      break;
    }
    case 'fix': view = 'step'; go(+b.dataset.n); break;
    case 'send': {
      view = 'confirm'; enfocar = true; render();
      const d = S.data;
      const voz = S.flow === 'recibo'
        ? `Vas a pagar ${d.servicio} por ${d.monto} soles. Presiona Sí, confirmar para terminar.`
        : `Vas a confirmar tu cita en ${d.centro} para el ${fmtISO(d.fecha)}. Presiona Sí, confirmar para terminar.`;
      hablar(voz);
      break;
    }
    case 'no': hablar('', true); view = 'step'; enfocar = true; render(); break;
    case 'yes': {
      hablar('', true);
      const d = S.data, esRecibo = S.flow === 'recibo';
      const c = 'CS-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000), h = new Date().toTimeString().slice(0, 5);
      if (esRecibo) {
        S.last = { c, as: mode === 'personal', titulo: 'Pago realizado', detalle: `${d.servicio} · S/ ${d.monto}` };
        S.done.push({ n: `Pago: ${d.servicio}`, d: `Hoy (S/ ${d.monto})` });
        if (S.perms.n && S.access) S.notes.push(`Carmen pagó “${d.servicio}” (S/ ${d.monto}) hoy a las ${h}.`);
      } else {
        S.last = { c, as: mode === 'personal', titulo: 'Cita solicitada', detalle: `${d.centro} · ${fmtISO(d.fecha)}` };
        S.done.push({ n: 'Solicitar una cita', centro: d.centro, d: fmtISO(d.fecha) });
        if (S.perms.n && S.access) S.notes.push(`Carmen completó “Solicitar una cita” hoy a las ${h}.`);
      }
      S.step = 0; S.data = {}; save(); view = 'done'; enfocar = true; render();
      say('Trámite completado.' + (S.perms.n && S.access ? ' Se envió un aviso a su familiar.' : ''));
      break;
    }
    case 'keep': guardarConstancia(); break;
    case 'home': view = 'home'; enfocar = true; render(); break;
    case 'quit': quit = true; enfocar = true; render(); break;
    case 'qno': quit = false; render(); break;
    case 'qyes': S.access = 0; quit = false; save(); render(); say('Acceso quitado. El familiar ya no ve tu información.'); break;
    case 'gen': {
      const c = String(Math.floor(100000 + Math.random() * 900000));
      S.codes[c] = 0; S.code = c; save(); panel(); say('Código y QR generados: ' + c.split('').join(' '));
      break;
    }
    case 'link': {
      const v = Q('#cin').value.trim(), m = Q('#cmsg');
      if (!/^\d{6}$/.test(v)) { m.className = 'err'; m.textContent = 'Escribe los 6 números del código.'; Q('#cin').focus(); break; }
      if (!(v in S.codes) || S.codes[v]) { m.className = 'err'; m.textContent = 'Este código ya se usó o no existe. Genera uno nuevo.'; Q('#cin').focus(); break; }
      S.codes[v] = 1; S.access = 1; S.code = ''; save(); render();
      Q('#cmsg').className = 'okmsg'; Q('#cmsg').textContent = 'Cuentas vinculadas. El código ya no se puede volver a usar.';
      break;
    }
    case 'snext': { const m = Q('#smsg'); m.hidden = false; m.textContent = 'Solo el adulto mayor puede avanzar. Explícale el paso y deja que él toque el botón.'; break; }
    case 'sconf': { const m = Q('#smsg'); m.hidden = false; m.textContent = 'Esta decisión la confirma el adulto mayor. Tú solo lo acompañas.'; break; }
    case 'exit': {
      mode = 'adulto'; view = 'home';
      QA('#prueba [role=tab]').forEach(x => { const s = x.dataset.m === 'adulto'; x.setAttribute('aria-selected', s); x.tabIndex = s ? 0 : -1; });
      render(); say('Saliste del modo asistido.'); break;
    }

    case 'scan': {
      const u = navigator.userAgent, o = Q('#os');
      const tienda = /android/i.test(u) ? 'play' : /iphone|ipad|ipod/i.test(u) ? 'apple' : '';
      QA('[data-a=store]').forEach(x => x.classList.toggle('sugerida', x.dataset.s === tienda));
      o.className = 'okmsg';
      o.textContent = tienda === 'play' ? 'Detectamos Android. Te llevamos a Play Store.' : tienda === 'apple' ? 'Detectamos iPhone. Te llevamos a App Store.' : 'No detectamos un celular. Elige tu tienda aquí abajo.';
      say(o.textContent); break;
    }
    case 'store': {
      const o = Q('#os');
      o.className = 'note2';
      o.textContent = `Abriendo ${b.textContent.trim()}… En esta demo académica la app aún no está publicada, así que no saldrás de la página.`;
      say(o.textContent); break;
    }

    case 'auth': authView = b.dataset.v; renderPortal(b.getAttribute('role') === 'tab' ? '#t-' + authView : (authView === 'login' ? '#l-m' : '#s-n')); break;
    case 'ver': {
      const f = Q('#' + b.dataset.for), ver = f.type === 'password';
      f.type = ver ? 'text' : 'password';
      b.setAttribute('aria-pressed', ver);
      b.innerHTML = I(ver ? 'visibility_off' : 'visibility') + (ver ? ' Ocultar' : ' Mostrar');
      break;
    }
    case 'pview': pview = b.dataset.v; renderPortal('#pt-' + pview); break;
    case 'logout': S.logged = 0; save(); authView = 'login'; renderPortal('#l-m'); say('Cerraste sesión.'); break;
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'f' && Q('#phone')) {
    const fl = FLOWS[S.flow] || FLOWS.cita;
    const s = fl.steps[S.step - 1];
    if (s.k === 'doc') { e.target.value = e.target.value.replace(/\D/g, ''); if (Q('#cnt')) Q('#cnt').textContent = e.target.value.length + ' de 8'; }
    S.data[s.k] = e.target.value; save();
    e.target.removeAttribute('aria-invalid'); Q('#err').hidden = true;
  }
  if (e.target.id === 'cin') e.target.value = e.target.value.replace(/\D/g, '');
});

document.addEventListener('change', e => {
  const k = e.target.dataset.p;
  if (!k) return;
  S.perms[k] = e.target.checked ? 1 : 0; save(); render();
  Q(`[data-p="${k}"]`).focus();
  say(`${PERMS[k][0]}: ${S.perms[k] ? 'activado' : 'desactivado'}.`);
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const id = e.target.id;
  if (id === 'frm') {
    const ok = validar([
      ['n', 'Escribe tu nombre.', v => v.length > 1],
      ['c', 'Escribe el nombre de tu centro.', v => v.length > 1],
      ['m', 'Escribe un correo válido, por ejemplo nombre@centro.pe.', esCorreo],
      ['t', 'Elige si necesitas información o capacitación.', v => !!v]
    ]);
    const o = Q('#ok');
    o.hidden = !ok;
    if (ok) { o.textContent = 'Recibimos tu solicitud. Te escribiremos en un máximo de 2 días hábiles.'; say(o.textContent); e.target.reset(); o.focus(); }
  }
  if (id === 'f-signup') {
    const ok = validar([
      ['s-n', 'Escribe tu nombre completo.', v => v.length > 2],
      ['s-m', 'Escribe un correo válido, por ejemplo nombre@correo.com.', esCorreo],
      ['s-r', 'Elige tu relación con el adulto mayor.', v => !!v],
      ['s-p', 'La contraseña debe tener al menos 8 caracteres.', v => v.length >= 8]
    ]);
    if (ok) {
      S.user = { name: Q('#s-n').value.trim(), email: Q('#s-m').value.trim().toLowerCase(), rel: Q('#s-r').value };
      S.logged = 1; pview = 'avisos'; save(); renderPortal('#p-cont h2'); say('Cuenta creada. Bienvenido al panel.');
    }
  }
  if (id === 'f-login') {
    const ok = validar([
      ['l-m', 'Escribe tu correo, por ejemplo nombre@correo.com.', esCorreo],
      ['l-p', 'Escribe tu contraseña (mínimo 8 caracteres).', v => v.length >= 8]
    ]);
    if (!ok) return;
    const m = Q('#l-m').value.trim().toLowerCase();
    if (!S.user || S.user.email !== m) {
      const er = Q('#e-l-m'); er.hidden = false; er.textContent = 'No encontramos una cuenta con ese correo. Revisa cómo lo escribiste o crea una cuenta.';
      Q('#l-m').setAttribute('aria-invalid', 'true'); Q('#l-m').focus(); return;
    }
    S.logged = 1; pview = 'avisos'; save(); renderPortal('#p-cont h2'); say('Sesión iniciada.');
  }
});

if (Q('#phone')) render();
if (Q('#portal')) renderPortal();
if (Q('#os') && /qr=1/.test(location.search)) Q('[data-a=scan]').click();
