const Q=(s,e=document)=>e.querySelector(s);
let S;try{S=JSON.parse(localStorage.getItem('cs'))}catch(e){}
S=S||{step:0,data:{},uses:{},done:[],notes:[],perms:{n:1,i:1,f:1},access:1,codes:{}};
let mode=document.body.dataset.mode||'adulto',view='home',quit=false,said='';
const save=()=>{try{localStorage.setItem('cs',JSON.stringify(S))}catch(e){}};
const say=m=>{const l=Q('#live');l.textContent='';setTimeout(()=>l.textContent=m,50)};
const STEPS=[{t:'Elige el centro de salud',k:'centro',o:['Centro Norte','Centro Sur','Centro Lima']},{t:'Elige la fecha de tu cita',k:'fecha',ex:'Toca el campo y elige un día en el calendario.'},{t:'Escribe tu número de documento',k:'doc',ex:'Ejemplo: 12345678 (8 números)'}];
const MSG=['Elige un centro de salud para continuar.','Falta la fecha. Toca el campo y elige un día.','Tu documento debe tener 8 números, por ejemplo 12345678.'];
const PH=['Pídale que elija el centro de salud.','Pídale que toque la fecha en el calendario.','Dígale que escriba su documento sin espacios.','Pídale que revise y toque el botón verde.'];
const ACC=[['📅','Solicitar una cita'],['🗓️','Consultar mi cita'],['🧾','Pagar un recibo'],['🏛️','Consultar mi pensión']];
const BASE=[['Solicitar una cita','Completado','12 de junio'],['Pago de recibo de luz','En curso','15 de junio'],['Consulta de pensión','Pendiente','20 de junio']];
const ICO={'Completado':['✓','p-ok'],'En curso':['▶',''],'Pendiente':['⏳','p-pe']};
function speak(t,stop){if(!('speechSynthesis' in window)){say('Tu navegador no tiene voz disponible.');return}speechSynthesis.cancel();if(stop)return;const u=new SpeechSynthesisUtterance(t);u.lang='es-PE';speechSynthesis.speak(u)}
const ban=()=>mode==='personal'?'<div class="ban">👁 MODO ASISTIDO</div>':'';
function home(){const o=ACC.slice().sort((a,b)=>(S.uses[b[1]]||0)-(S.uses[a[1]]||0));
return `<p class="hi">Buenos días, Carmen</p><h3>¿Qué necesitas hacer?</h3>`+(S.step>0?`<div class="pend"><b>⏳ Solicitar una cita</b><p>Quedaste en el paso ${S.step} de 4</p><button class="btn" data-a="resume">Continuar donde lo dejé</button></div>`:'')+`<div class="acc">`+o.map(a=>`<button class="ac" data-a="acc" data-n="${a[1]}"><span aria-hidden="true">${a[0]}</span>${a[1]}</button>`).join('')+'</div>'}
function step(n){const s=STEPS[n-1],d=S.data;said=s.t+'. '+(s.ex||'');let f='';
if(s.o)f=s.o.map(o=>`<button class="opt" data-a="opt" data-v="${o}" aria-pressed="${d.centro===o}">${o}</button>`).join('');
else if(s.k==='fecha')f=`<label for="f">Fecha de la cita</label><input id="f" type="date" value="${d.fecha||''}"><small>${s.ex}</small>`;
else f=`<label for="f">Documento</label><input id="f" inputmode="numeric" maxlength="8" autocomplete="off" value="${d.doc||''}"><small>${s.ex}</small><br><button class="btn2" data-a="clr">Borrar dato</button>`;
return `<p class="st">Paso ${n} de 4</p><div class="bar"><i style="width:${n*25}%"></i></div><h3>${s.t}</h3><div class="vz"><button class="btn2" data-a="say">🔊 Escuchar</button><button class="btn2" data-a="say">🔁 Repetir</button><button class="btn2" data-a="stop">⏹ Detener</button></div>${f}<p id="err" class="err" role="alert" hidden></p><div id="undo"></div><div class="nav2"><button class="btn2" data-a="back">← Volver</button><button class="btn" data-a="next">Siguiente →</button></div>`}
function resumen(){const d=S.data;const r=[['Centro',d.centro],['Fecha',d.fecha],['Documento',d.doc]];said='Revisa la información y confirma.';
return `<p class="st">Paso 4 de 4</p><div class="bar"><i style="width:100%"></i></div><h3>Revisa la información</h3>`+r.map((x,i)=>`<div class="row"><b>${x[0]}:</b> ${x[1]||'—'} <button class="btn2" data-a="fix" data-n="${i+1}">Corregir</button></div>`).join('')+`<div class="nav2"><button class="btn2" data-a="back">← Volver</button><button class="btn" data-a="send">Enviar</button></div>`+(view==='confirm'?`<div class="ov" role="dialog" aria-modal="true" aria-label="Confirmar envío"><h3>¿Enviar tu solicitud?</h3><p>${d.centro}, ${d.fecha}</p><button class="btn" data-a="yes">Sí, confirmar</button><button class="btn2" data-a="no">No, volver</button></div>`:'')}
function done(){const x=S.last;return `<p class="ok" aria-hidden="true" style="font-size:48px;margin:0">✓</p><h3>Trámite completado</h3><p>La cita se solicitó correctamente.</p>`+(x.as?'<span class="pill">👁 Completado con acompañamiento</span>':'')+`<div class="cons">Número de constancia<br><b>${x.c}</b></div><button class="btn2" data-a="keep">Guardar constancia</button><button class="btn" data-a="home">Volver al inicio</button>`}
function flow(){if(view==='home')return home();if(view==='done')return done();return S.step===4?resumen():step(S.step)}
function fam(){if(!S.access)return '<p class="ok" style="font-size:40px;margin:0">🔒</p><h3>Ya no tienes acceso</h3><p>El adulto mayor quitó el permiso para consultar su información.</p><p class="warn">Sin permiso: no recibes avisos.</p>';
const L=BASE.concat(S.done.map(d=>[d.n,'Completado',d.d]));
return `<p class="hi">Itinerario compartido</p><h3>Trámites de Carmen</h3>`+(S.perms.i?L.map(x=>`<div class="row"><b>${x[0]}</b> <span class="pill ${ICO[x[1]][1]}">${ICO[x[1]][0]} ${x[1]}</span><br><small>${x[2]} · 🔒 Documento: oculto por privacidad</small></div>`).join('')+'<p><small>👁 Solo lectura: no puedes cambiar estos trámites.</small></p>':'<p class="warn">No tienes permiso para ver el itinerario.</p>')+(S.perms.n?S.notes.slice(-3).map(n=>`<div class="note2">🔔 ${n}</div>`).join(''):'')+(quit?`<div class="ov" role="dialog" aria-modal="true" aria-label="Quitar acceso"><h3>¿Quitar el acceso a este familiar?</h3><p>Dejará de ver el itinerario y de recibir avisos.</p><button class="btn" style="background:var(--rj);border-color:var(--rj)" data-a="qyes">Sí, quitar acceso</button><button class="btn2" data-a="qno">No, volver</button></div>`:'')}
function info(){const P=[['i','Itinerario','Fechas y estados'],['n','Notificaciones','Trámites completados'],['f','Intentos fallidos','Avisos para ofrecer ayuda']].filter(p=>S.access&&S.perms[p[0]]);
Q('#info').innerHTML=mode==='adulto'?'<h3>Qué puedes probar</h3><ul class="ck"><li>✓ Hacer un trámite paso a paso</li><li>✓ Escuchar las instrucciones</li><li>✓ Corregir un error</li><li>✓ Deshacer una acción</li><li>✓ Retomar un trámite</li></ul><p><small>Tu avance se guarda solo en este navegador.</small></p>':mode==='familiar'?'<h3>Lo que puedes ver</h3>'+(P.length?P.map(p=>`<p><b>✓ ${p[1]}</b><br><small>${p[2]}</small></p>`).join(''):'<p><b>No hay permisos vigentes.</b></p>')+'<p class="note2">🔒 Los datos sensibles permanecen ocultos.</p>':'<h3>Asistencia respetuosa</h3><ul class="ck"><li>✓ Usa frases claras y breves</li><li>✓ Señala el siguiente paso</li><li>✓ Confirma siempre su decisión</li></ul>'}
function panel(){const p=Q('#panel');p.hidden=mode==='adulto';if(mode==='adulto'){p.innerHTML='';return}
if(mode==='familiar'){const n={i:'Itinerario',n:'Notificaciones',f:'Intentos fallidos'};
p.innerHTML='<h3>Control de la demo</h3><p><small>Simula la decisión del adulto mayor.</small></p>'+Object.keys(n).map(k=>`<label class="sw"><input type="checkbox" role="switch" data-p="${k}" ${S.perms[k]?'checked':''}> ${n[k]}</label>`).join('')+`<button class="btn2" style="color:var(--rj);border-color:var(--rj)" data-a="quit">Quitar acceso</button><h3>Código de vinculación</h3><button class="btn2" data-a="gen">Generar código</button> <b>${S.code||''}</b><label for="cin">Código recibido (6 dígitos, un solo uso)</label><input id="cin" inputmode="numeric" maxlength="6"><button class="btn" data-a="link">Aprobar vinculación</button><p id="cmsg" role="status"></p>`}
else p.innerHTML=`<h3>Frase guía sugerida</h3><p class="note2"><b>“${view==='done'?'Felicítelo: el trámite fue suyo.':PH[Math.min(S.step||1,4)-1]}”</b></p><button class="btn" data-a="snext">Avanzar como personal</button><button class="btn2" data-a="sconf">Confirmar como personal</button><p id="smsg" class="warn" role="status" hidden></p><p class="note2">Confirmación final: la confirma el adulto mayor.</p><button class="btn2" data-a="exit">Salir del modo asistido</button>`}
function render(){Q('#phone').innerHTML=ban()+(mode==='familiar'?fam():flow());info();panel()}
function go(n){S.step=n;save();render()}
function check(n){const d=S.data,s=STEPS[n-1];return n===3?(/^\d{8}$/.test(d.doc||'')?'':MSG[2]):(d[s.k]?'':MSG[n-1])}
const msgs=()=>{const m=Q('#smsg');m.hidden=false;return m};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
if(a==='tab'){mode=b.dataset.m;view='home';quit=false;document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',t===b));render()}
else if(a==='acc'){S.uses[b.dataset.n]=(S.uses[b.dataset.n]||0)+1;if(b.dataset.n==='Solicitar una cita'){view='step';S.step=S.step||1;go(S.step)}else{save();say('Este trámite no está en la demo.')}}
else if(a==='resume'){view='step';render()}
else if(a==='opt'){S.data.centro=b.dataset.v;save();render()}
else if(a==='say')speak(said);else if(a==='stop')speak('',1);
else if(a==='clr'){S.prev=S.data.doc;S.data.doc='';save();Q('#f').value='';Q('#undo').innerHTML='<div class="undo">Dato borrado <button class="btn2" data-a="undo">Deshacer</button></div>'}
else if(a==='undo'){S.data.doc=S.prev||'';save();Q('#f').value=S.data.doc;Q('#undo').innerHTML='';say('Dato restaurado.')}
else if(a==='back'){if(S.step>1)go(S.step-1);else{view='home';render()}}
else if(a==='next'){const m=check(S.step);if(m){const r=Q('#err');r.hidden=false;r.textContent='⚠ '+m;const f=Q('#f');if(f){f.setAttribute('aria-invalid','true');f.scrollIntoView({block:'center'});f.focus()}}else go(S.step+1)}
else if(a==='fix')go(+b.dataset.n);
else if(a==='send'){view='confirm';render()}else if(a==='no'){view='step';render()}
else if(a==='yes'){const d=S.data,c='CS-'+Math.floor(1000+Math.random()*9000)+'-'+Math.floor(1000+Math.random()*9000),h=new Date().toTimeString().slice(0,5);
S.last={c,as:mode==='personal'};S.done.push({n:'Solicitar una cita',d:d.fecha});
if(S.perms.n&&S.access){const t='Tu familiar completó “Solicitar una cita” a las '+h;S.notes.push(t);say('Aviso para el familiar: '+t)}
S.step=0;S.data={};save();view='done';render()}
else if(a==='keep')say('Constancia guardada.');else if(a==='home'){view='home';render()}
else if(a==='quit'){quit=true;render()}else if(a==='qno'){quit=false;render()}else if(a==='qyes'){S.access=0;quit=false;save();render();say('Acceso quitado.')}
else if(a==='gen'){const c=String(Math.floor(100000+Math.random()*900000));S.codes[c]=0;S.code=c;save();panel()}
else if(a==='link'){const v=Q('#cin').value,m=Q('#cmsg');if(!(v in S.codes)||S.codes[v]){m.className='err';m.textContent='⚠ Este código ya se usó o no existe. Genera uno nuevo.'}else{S.codes[v]=1;S.access=1;save();render();Q('#cmsg').className='okmsg';Q('#cmsg').textContent='✓ Cuentas vinculadas.'}}
else if(a==='snext')msgs().textContent='Solo el adulto mayor puede avanzar. Explícale el paso y deja que pulse el botón.';
else if(a==='sconf')msgs().textContent='Esta decisión la confirma el adulto mayor. Tú solo lo acompañas.';
else if(a==='exit'){mode='adulto';view='home';document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.m==='adulto'));render()}
else if(a==='scan'){const u=navigator.userAgent,o=Q('#os');o.textContent=/android/i.test(u)?'Detectamos Android: abriendo Play Store.':/iphone|ipad/i.test(u)?'Detectamos iPhone: abriendo App Store.':'No detectamos un celular. Elige tu tienda abajo.';say(o.textContent)}});
document.addEventListener('input',e=>{if(e.target.id==='f'){const s=STEPS[S.step-1];S.data[s.k]=e.target.value;save()}});
document.addEventListener('change',e=>{const k=e.target.dataset.p;if(k){S.perms[k]=e.target.checked?1:0;save();render();say('Permiso actualizado.')}});
Q('#menuBtn').addEventListener('click',e=>{const o=Q('#links').classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',o)});
const CAP=[[0,'Hola, te acompañamos paso a paso.'],[10,'En la pantalla de inicio, toca Solicitar una cita.'],[25,'Elige el centro de salud que te queda más cerca.'],[40,'Elige la fecha en el calendario.'],[55,'Escribe tu documento. Si te equivocas, te explicamos cómo corregirlo.'],[70,'Toca Escuchar para oír cada instrucción.'],[85,'Revisa el resumen y confirma. La decisión es siempre tuya.'],[100,'Tu familia puede acompañarte, solo si tú lo permites.']];
let t=0,iv=null,sub=true;const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
function tick(){t++;if(t>=108){clearInterval(iv);iv=null;Q('#pp').textContent='▶ Ver de nuevo';t=108;Q('#end').hidden=false}draw()}
function draw(){Q('#pg').value=t;Q('#tm').textContent=fmt(t)+' / 1:48';const c=CAP.filter(x=>x[0]<=t).pop();Q('#cap').textContent=sub?c[1]:'';Q('#cap').style.display=sub?'':'none'}
Q('#pp')&&Q('#pp').addEventListener('click',()=>{if(iv){clearInterval(iv);iv=null;Q('#pp').textContent='▶ Reproducir'}else{if(t>=108){t=0;Q('#end').hidden=true}iv=setInterval(tick,1000);Q('#pp').textContent='⏸ Pausar';draw()}});
Q('#cc')&&Q('#cc').addEventListener('click',e=>{sub=!sub;e.currentTarget.setAttribute('aria-pressed',sub);e.currentTarget.textContent=sub?'Subtítulos activados':'Subtítulos desactivados';draw()});
Q('#frm')&&Q('#frm').addEventListener('submit',e=>{e.preventDefault();let bad=0;
[['n','Escribe tu nombre.'],['c','Escribe el nombre de tu centro.'],['m','Escribe un correo válido, por ejemplo nombre@centro.pe.'],['t','Elige qué necesitas.']].forEach(([id,m])=>{const f=Q('#'+id),r=Q('#e-'+id),v=f.value.trim(),ko=!v||(id==='m'&&!/^\S+@\S+\.\S+$/.test(v));r.hidden=!ko;r.textContent=ko?'⚠ '+m:'';f.setAttribute('aria-invalid',ko);if(ko&&!bad){f.focus();bad=1}else if(ko)bad=1});
const o=Q('#ok');o.hidden=!!bad;if(!bad){o.textContent='✓ Recibimos tu solicitud. Te escribiremos pronto.';say(o.textContent);e.target.reset()}});
if(Q('#phone')){document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.m===mode));render()}
if(Q('#os')&&/qr=1/.test(location.search))Q('[data-a=scan]').click();
