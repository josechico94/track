/* ======= Estado & Utilidades ======= */
const STORAGE_KEY = 'simple-tracker-v2';
const STATUS = {
  tramite: { label: 'En trámite', badge: 'tramite' },
  entregado: { label: 'Entregado', badge: 'entregado' }
};
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function normalize(id){ return (id||'').trim().toUpperCase(); }
function nowISO(){ return new Date().toISOString(); }
function fmt(ts){ try { return new Date(ts).toLocaleString(); } catch { return ts; } }

function load(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch { return {}; }
}
function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function toast(text, kind='info', timeout=2800){
  const box = document.createElement('div');
  box.className = `toast ${kind}`;
  box.innerHTML = `<div class="title">${kind==='ok'?'Listo':'Aviso'}</div><div style="flex:1">${text}</div><div class="x">✕</div>`;
  $('#toasts').appendChild(box);
  const close = ()=> box.remove();
  box.querySelector('.x').onclick = close;
  if(timeout) setTimeout(close, timeout);
}

function confirmModal(msg){
  return new Promise(resolve=>{
    $('#modalMsg').textContent = msg;
    $('#modal').classList.add('open');
    const ok = ()=>{ cleanup(); resolve(true); };
    const cancel = ()=>{ cleanup(); resolve(false); };
    function cleanup(){
      $('#btnOkModal').removeEventListener('click', ok);
      $('#btnCancelModal').removeEventListener('click', cancel);
      $('#modal').classList.remove('open');
    }
    $('#btnOkModal').addEventListener('click', ok, {once:true});
    $('#btnCancelModal').addEventListener('click', cancel, {once:true});
  });
}

function badge(status){
  const def = STATUS[status] || STATUS.tramite;
  return `<span class="badge ${def.badge}">${def.label}</span>`;
}

/* ======= Render ======= */
function currentRows(filterText='', order='updatedDesc'){
  const data = load();
  const arr = Object.entries(data).map(([id,o])=>({id,...o}));
  const q = filterText.trim().toUpperCase();
  const filtered = q ? arr.filter(r => r.id.includes(q)) : arr;

  const sorters = {
    updatedDesc: (a,b)=> b.updatedAt.localeCompare(a.updatedAt),
    updatedAsc:  (a,b)=> a.updatedAt.localeCompare(b.updatedAt),
    createdDesc: (a,b)=> b.createdAt.localeCompare(a.createdAt),
    createdAsc:  (a,b)=> a.createdAt.localeCompare(b.createdAt),
  };
  filtered.sort(sorters[order] || sorters.updatedDesc);
  return filtered;
}

function renderTables(){
  const q = $('#q').value || '';
  const order = $('#orden').value;
  const rows = currentRows(q, order);
  const tram = rows.filter(r=>r.status==='tramite');
  const ent = rows.filter(r=>r.status==='entregado');

  $('#countPill').textContent = `${rows.length} envío${rows.length===1?'':'s'}`;

  const mkRow = r => `
    <tr data-id="${r.id}">
      <td><a href="#" class="lnk">${r.id}</a></td>
      <td>${fmt(r.createdAt)}</td>
      <td>${fmt(r.updatedAt)}</td>
      <td class="right">
        <div class="row-actions">
          ${r.status==='tramite'
            ? `<button class="btn-ok btn-sm act-entregar" title="Marcar entregado">✔</button>`
            : `<button class="btn-warn btn-sm act-volver" title="Volver a trámite">↩</button>`
          }
          <button class="btn-ghost btn-sm act-copiar" title="Copiar ID">📋</button>
          <button class="btn-danger btn-sm act-borrar" title="Eliminar">🗑️</button>
        </div>
      </td>
    </tr>`;

  const htmlTr = tram.map(mkRow).join('') || `<tr><td colspan="4"><div class="empty">Sin pendientes.</div></td></tr>`;
  const htmlEn = ent.map(mkRow).join('') || `<tr><td colspan="4"><div class="empty">Sin entregados.</div></td></tr>`;

  $('#tblTramite').innerHTML = htmlTr;
  $('#tblEntregado').innerHTML = htmlEn;

  // Bind por tabla
  ['#tblTramite','#tblEntregado'].forEach(sel=>{
    $(sel).querySelectorAll('.lnk').forEach(a=>{
      a.addEventListener('click', e=>{
        e.preventDefault();
        const id = a.closest('tr').dataset.id;
        mostrarDetalle(id);
        $('#track').value = id;
        $('#track').focus();
      });
    });
    $(sel).querySelectorAll('.act-entregar').forEach(btn=>{
      btn.addEventListener('click', ()=> cambiarEstado(btn.closest('tr').dataset.id, 'entregado'));
    });
    $(sel).querySelectorAll('.act-volver').forEach(btn=>{
      btn.addEventListener('click', ()=> cambiarEstado(btn.closest('tr').dataset.id, 'tramite'));
    });
    $(sel).querySelectorAll('.act-copiar').forEach(btn=>{
      btn.addEventListener('click', ()=> copiarId(btn.closest('tr').dataset.id));
    });
    $(sel).querySelectorAll('.act-borrar').forEach(btn=>{
      btn.addEventListener('click', ()=> borrarUno(btn.closest('tr').dataset.id));
    });
  });

  // actualizar stats de almacenamiento cada vez que renderizamos
  updateStorageStats();
}

function mostrarDetalle(id){
  const data = load(); const o = data[id];
  if(!o){ $('#detalle').innerHTML = `<div class="empty">No encontrado.</div>`; return; }
  $('#detalle').innerHTML = `
    <div class="kv"><div>Seguimiento</div><div class="mono">${id} <button class="btn-ghost btn-icon" id="copyOne" title="Copiar">📋</button></div></div>
    <div class="kv"><div>Estado</div><div>${badge(o.status)}</div></div>
    <div class="kv"><div>Creado</div><div>${fmt(o.createdAt)}</div></div>
    <div class="kv"><div>Actualizado</div><div>${fmt(o.updatedAt)}</div></div>
    <div class="row" style="margin-top:8px">
      ${o.status==='tramite'
        ? `<button class="btn-ok" id="detailEntregar">Marcar Entregado</button>`
        : `<button class="btn-warn" id="detailVolver">Volver a trámite</button>`
      }
      <button class="btn-danger" id="detailBorrar">Eliminar</button>
    </div>
  `;
  $('#copyOne')?.addEventListener('click', ()=> copiarId(id));
  $('#detailEntregar')?.addEventListener('click', ()=> cambiarEstado(id,'entregado'));
  $('#detailVolver')?.addEventListener('click', ()=> cambiarEstado(id,'tramite'));
  $('#detailBorrar')?.addEventListener('click', ()=> borrarUno(id));
}

/* ======= Acciones ======= */
function registrar(){
  const id = normalize($('#track').value);
  if(!id){ toast('Ingresá un número válido.', 'err'); return; }

  const data = load();
  if(!data[id]){
    const ts = nowISO();
    data[id] = { status:'tramite', createdAt: ts, updatedAt: ts };
    save(data);
    toast(`"${id}" registrado en "En trámite".`, 'ok');
    mostrarDetalle(id);
    renderTables();
  } else {
    toast(`"${id}" ya existe (${STATUS[data[id].status]?.label||'estado desconocido'}).`, 'info');
    mostrarDetalle(id);
  }
}

function entregarDesdeInput(){
  const id = normalize($('#track').value);
  if(!id){ toast('Ingresá un número válido.', 'err'); return; }
  const data = load();
  if(!data[id]){ toast(`"${id}" no existe. Primero registralo.`, 'err'); return; }
  cambiarEstado(id, 'entregado');
}

function buscar(){
  const id = normalize($('#track').value);
  if(!id){ toast('Ingresá un número para buscar.', 'err'); return; }
  const data = load();
  if(!data[id]){
    toast(`No hay datos para "${id}".`, 'err');
    $('#detalle').innerHTML = `<div class="empty small">No hay datos para ${id}.</div>`;
  } else {
    toast(`Resultado para "${id}".`, 'info', 1800);
    mostrarDetalle(id);
  }
}

function cambiarEstado(id, nuevo){
  const data = load();
  if(!data[id]){ toast(`"${id}" no existe.`, 'err'); return; }
  const actual = data[id].status;
  if(actual===nuevo){
    toast(`"${id}" ya estaba "${STATUS[nuevo].label}".`, 'info'); return;
  }
  data[id].status = nuevo;
  data[id].updatedAt = nowISO();
  save(data);
  toast(`"${id}" actualizado a "${STATUS[nuevo].label}".`, 'ok');
  mostrarDetalle(id);
  renderTables();
}

async function borrarUno(id){
  const ok = await confirmModal(`¿Eliminar el envío "${id}"? Esta acción no se puede deshacer.`);
  if(!ok) return;
  const data = load();
  if(data[id]){ delete data[id]; save(data); toast(`"${id}" eliminado.`, 'ok'); }
  $('#detalle').innerHTML = `<div class="empty">Sin selección.</div>`;
  renderTables();
}

async function limpiarTodo(){
  const ok = await confirmModal('¿Borrar TODOS los envíos guardados en este navegador?');
  if(!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  toast('Datos borrados.', 'ok');
  $('#detalle').innerHTML = `<div class="empty">Sin selección.</div>`;
  renderTables();
}

async function copiarId(id){
  try{ await navigator.clipboard.writeText(id); toast(`Copiado: ${id}`, 'ok', 1600); }
  catch{ toast('No se pudo copiar.', 'err'); }
}

async function copiarLista(){
  const q = $('#q').value || '';
  const order = $('#orden').value;
  const rows = currentRows(q, order);
  const ids = rows.map(r=>r.id).join('\n');
  try{
    if(!ids){ toast('No hay IDs visibles para copiar.', 'info'); return; }
    await navigator.clipboard.writeText(ids);
    toast(`Se copiaron ${rows.length} IDs.`, 'ok');
  }catch{ toast('No se pudo copiar la lista.', 'err'); }
}

/* ======= Exportar CSV ======= */
function exportarCSV(){
  const data = load();
  const rows = Object.entries(data).map(([id,o])=>({id,...o}))
               .sort((a,b)=> b.updatedAt.localeCompare(a.updatedAt));
  if(!rows.length){ toast('Nada para exportar.', 'info'); return; }
  const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
  const lines = ['ID,Estado,Creado,Actualizado'];
  rows.forEach(r=>{
    lines.push([r.id, STATUS[r.status]?.label||r.status, fmt(r.createdAt), fmt(r.updatedAt)].map(esc).join(','));
  });
  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  a.download = `seguimiento-${ts}.csv`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 500);
  toast('CSV exportado.', 'ok');
}

/* ======= Stats de almacenamiento ======= */
async function updateStorageStats(){
  // bytes de nuestro dataset
  const data = load();
  const json = JSON.stringify(data);
  const dataBytes = new Blob([json]).size; // cuenta bytes reales
  const count = Object.keys(data).length;

  // cuota/origen
  let quota = 5 * 1024 * 1024; // fallback 5MB
  let usage = null; // usage global del origen (si está disponible)

  try{
    if(navigator.storage && navigator.storage.estimate){
      const est = await navigator.storage.estimate();
      if(est.quota) quota = est.quota; // puede ser >5MB según navegador
      if(est.usage) usage = est.usage; // uso total del origen (no solo localStorage)
    }
  }catch(e){ /* ignorar */ }

  // usamos dataBytes para el % específico del dataset (más representativo)
  const pct = Math.min(100, (dataBytes / quota) * 100);
  const avg = count ? (dataBytes / count) : 250; // si no hay datos, asumimos 250B/registro
  const remainingBytes = Math.max(0, quota - dataBytes);
  const remainingItems = Math.floor(remainingBytes / Math.max(1, Math.round(avg)));

  const fmtBytes = (n)=> n>=1024*1024 ? (n/1024/1024).toFixed(2)+' MB'
                  : n>=1024 ? (n/1024).toFixed(1)+' KB'
                  : n+' B';

  const pill = $('#storagePill');
  pill.textContent = `Almacenamiento: ${fmtBytes(dataBytes)} de ${fmtBytes(quota)} (${pct.toFixed(1)}%) · Restantes ~ ${remainingItems.toLocaleString()}`;
  pill.title = usage ? `Uso total del origen: ${fmtBytes(usage)} / ${fmtBytes(quota)}`
                     : `Cuota asumida: ${fmtBytes(quota)} (sin API estimate)`;
}

/* ======= Eventos ======= */
$('#btnRegistrar').addEventListener('click', registrar);
$('#btnEntregar').addEventListener('click', entregarDesdeInput);
$('#btnBuscar').addEventListener('click', buscar);
$('#btnLimpiarTodo').addEventListener('click', limpiarTodo);
$('#btnExport').addEventListener('click', exportarCSV);
$('#btnCopiarLista').addEventListener('click', copiarLista);
$('#btnRecalc').addEventListener('click', updateStorageStats);

$('#track').addEventListener('keydown', e=>{ if(e.key==='Enter') buscar(); });

let qTimer=null;
$('#q').addEventListener('input', ()=>{
  clearTimeout(qTimer);
  qTimer=setTimeout(renderTables, 120);
});
$('#orden').addEventListener('change', renderTables);

/* ======= Init ======= */
renderTables();

// En tu aplicación 'Luigi'...
const { io } = require('socket.io-client');
const socket = io('http://localhost:4000'); // Conéctate a la central

// Escuchar los mensajes urgentes y los nuevos pedidos
socket.on('pedido-urgente', (nuevoPedido) => {
  console.log('¡Alerta! Nuevo pedido urgente recibido:', nuevoPedido);
});

// Puedes pedir el historial a través de un evento de Socket.io
// y el servidor te lo enviará en una respuesta en tiempo real
socket.emit('solicitar-historial');

// Escuchar la respuesta del servidor con el historial
socket.on('historial-de-pedidos', (historial) => {
  console.log('Historial de pedidos:', historial);
});