/* ===== Config & helpers ===== */
const STORAGE_KEY = 'simple-tracker-v2';
const STATUS = {
  tramite:   { label: 'En trámite', badge:'tramite'   },
  entregado: { label: 'Entregado',  badge:'entregado' }
};
const STATUS_LABEL_TO_KEY = {
  'EN TRÁMITE':'tramite', 'EN TRAMITE':'tramite', 'TRÁMITE':'tramite', 'TRAMITE':'tramite',
  'ENTREGADO':'entregado'
};
const $ = s => document.querySelector(s);

function normalize(id){ return (id||'').trim().toUpperCase(); }
function fmt(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? String(ts) : d.toLocaleString();
}
function toast(text, kind='info', timeout=2600){
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = text;
  $('#toasts').appendChild(t);
  if(timeout) setTimeout(()=> t.remove(), timeout);
}

/* ===== Carga del dataset (JSON -> CSV -> localStorage) ===== */
let DATASET = null; // { [id]: {status, createdAt?, updatedAt?, createdAtRaw?, updatedAtRaw?} }
let DATA_ORIGIN = '—';

async function fetchJSON(){
  const res = await fetch('seguimiento.json', {cache:'no-store'});
  if(!res.ok) throw new Error('no json');
  const json = await res.json();
  if(typeof json !== 'object' || Array.isArray(json)) throw new Error('json inválido');
  const out = {};
  for(const [id, val] of Object.entries(json)){
    const nid = normalize(id);
    if(!nid) continue;
    const st = val.status || val.estado || '';
    out[nid] = {
      status: st,
      createdAt: val.createdAt || val.creado || null,
      updatedAt: val.updatedAt || val.actualizado || null
    };
  }
  DATA_ORIGIN = 'seguimiento.json';
  return out;
}

function parseCSVLine(line){
  // parser simple con comillas
  const out = [];
  let cur = '', inQ = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(inQ){
      if(ch === '"'){
        if(line[i+1] === '"'){ cur += '"'; i++; }
        else { inQ = false; }
      } else cur += ch;
    } else {
      if(ch === '"'){ inQ = true; }
      else if(ch === ','){ out.push(cur); cur=''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function fetchCSV(){
  const res = await fetch('seguimiento.csv', {cache:'no-store'});
  if(!res.ok) throw new Error('no csv');
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  if(lines.length < 2) throw new Error('csv vacío');

  const header = parseCSVLine(lines[0]).map(h=>h.trim().toUpperCase());
  const idx = {
    id: header.indexOf('ID'),
    estado: header.indexOf('ESTADO'),
    creado: header.indexOf('CREADO'),
    actualizado: header.indexOf('ACTUALIZADO')
  };
  if(idx.id===-1) throw new Error('csv sin columna ID');

  const out = {};
  for(let i=1;i<lines.length;i++){
    if(!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    const id = normalize(cols[idx.id]||'');
    if(!id) continue;
    const estadoRaw = (cols[idx.estado]||'').toString().trim().toUpperCase();
    const key = STATUS_LABEL_TO_KEY[estadoRaw] || (estadoRaw.includes('ENTREG') ? 'entregado' : 'tramite');
    out[id] = {
      status: key,
      createdAt: null,
      updatedAt: null,
      createdAtRaw: cols[idx.creado]||'',
      updatedAtRaw: cols[idx.actualizado]||'',
    };
  }
  DATA_ORIGIN = 'seguimiento.csv';
  return out;
}

function fetchLocal(){
  let data = {};
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? JSON.parse(raw) : {};
  }catch{ data = {}; }
  const out = {};
  for(const [id, val] of Object.entries(data)){
    const nid = normalize(id);
    out[nid] = { status: val.status, createdAt: val.createdAt||null, updatedAt: val.updatedAt||null };
  }
  DATA_ORIGIN = 'localStorage';
  return out;
}

async function loadDataset(){
  try { DATASET = await fetchJSON(); return; } catch {}
  try { DATASET = await fetchCSV();  return; } catch {}
  DATASET = fetchLocal();
}

/* ===== UI: búsqueda y render ===== */
function badge(status){
  const def = STATUS[status] || STATUS.tramite;
  return `<span class="badge ${def.badge}">${def.label}</span>`;
}

function renderNotFound(id){
  $('#resultado').innerHTML = `
    <div class="empty">
      No encontramos datos para <span class="mono">${id}</span>.<br>
      Verificá el número o consultá con soporte.
    </div>`;
}

function renderResult(id, rec){
  const created = rec.createdAt ? fmt(rec.createdAt) : (rec.createdAtRaw || '—');
  const updated = rec.updatedAt ? fmt(rec.updatedAt) : (rec.updatedAtRaw || '—');
  const isDelivered = rec.status === 'entregado';

  $('#resultado').innerHTML = `
    <div style="display:grid; gap:10px">
      <div class="row" style="justify-content:space-between; align-items:center">
        <div>
          <div class="muted" style="font-size:12px">Seguimiento</div>
          <div class="mono" style="font-size:18px">${id}</div>
        </div>
        <div>${badge(rec.status)}</div>
      </div>

      <div class="kv">
        <div>Creado</div><div>${created}</div>
        <div>Actualizado</div><div>${updated}</div>
      </div>

      <div class="timeline">
        <div class="step done">
          <div class="dot"></div>
          <div>
            <div class="title">Pedido registrado</div>
            <div class="desc">Hemos recibido tu envío. ${created!=='—'?`(${created})`:''}</div>
          </div>
        </div>
        <div class="step ${isDelivered?'done':'current'}">
          <div class="dot"></div>
          <div>
            <div class="title">${isDelivered?'Entregado ✅':'En tránsito'}</div>
            <div class="desc">${isDelivered
              ? `Tu paquete fue entregado. ${updated!=='—'?`(${updated})`:''}`
              : `Tu paquete está en proceso. ${updated!=='—'?`Última actualización: ${updated}.`:''}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function lookup(){
  const id = normalize($('#track').value);
  if(!id){ toast('Ingresá un número de seguimiento.', 'err'); return; }
  const rec = DATASET[id];
  $('#origen').textContent = DATA_ORIGIN;
  if(!rec){ renderNotFound(id); toast('No encontrado', 'err'); return; }
  renderResult(id, rec);
  toast('Estado actualizado', 'ok', 1800);
}

/* ===== Eventos ===== */
$('#btnVer').addEventListener('click', lookup);
$('#btnCopiar').addEventListener('click', async ()=>{
  const id = normalize($('#track').value);
  if(!id){ toast('Nada para copiar.', 'info'); return; }
  try{ await navigator.clipboard.writeText(id); toast('Copiado ✔', 'ok', 1200); }
  catch{ toast('No se pudo copiar.', 'err'); }
});
$('#track').addEventListener('keydown', e=>{ if(e.key==='Enter') lookup(); });

/* ===== Init ===== */
(async function init(){
  await loadDataset();
  $('#origen').textContent = DATA_ORIGIN;

  // Si viene con ?id=XYZ, autollenar y buscar
  const qp = new URLSearchParams(location.search);
  const pid = qp.get('id');
  if(pid){
    $('#track').value = pid;
    lookup();
  }
})();

// 1. Importa la función 'io' de la biblioteca
const { io } = require('socket.io-client');

// 2. Conéctate a la URL de tu servidor
const socket = io('http://localhost:4000');

// 3. Escucha eventos del servidor (ej. un mensaje de bienvenida)
socket.on('connect', () => {
  console.log('¡Conectado al servidor! ID:', socket.id);
});

// 4. Emite un evento al servidor (ej. un nuevo pedido)
const datosDelPedido = { pizza: 'pepperoni', cantidad: 2 };
socket.emit('nuevo-pedido', datosDelPedido);

// 5. Escucha eventos específicos del servidor (ej. confirmación de pedido)
socket.on('pedido-recibido', (mensaje) => {
  console.log('El servidor dice:', mensaje);
});

// 6. Maneja errores de conexión
socket.on('disconnect', () => {
  console.log('Desconectado del servidor.');
});
socket.on('connect_error', (err) => {
  console.log('Error de conexión:', err.message);
});