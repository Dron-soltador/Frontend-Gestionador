const API_DRONES_URL = 'http://localhost:5001/drones';
const API_DESPACHADOR_BASE = 'http://localhost:5002';
const DESCARGA_BATERIA_POR_ENTREGA = 5; // % de batería que gasta el dron al completar el viaje
const SEGUNDOS_PARA_OCULTAR = 5; // segundos que un pedido ENTREGADO sigue visible antes de borrarse
const entregadosRecientes = new Map(); // id -> { pedido, timeoutId }

// Persistencia local en navegador (localStorage)
let localAddedDrones = JSON.parse(localStorage.getItem('localAddedDrones') || '[]');
let localModifiedDrones = JSON.parse(localStorage.getItem('localModifiedDrones') || '{}');
let localModifiedPedidos = JSON.parse(localStorage.getItem('localModifiedPedidos') || '{}');

function guardarPersistencia() {
    localStorage.setItem('localAddedDrones', JSON.stringify(localAddedDrones));
    localStorage.setItem('localModifiedDrones', JSON.stringify(localModifiedDrones));
    localStorage.setItem('localModifiedPedidos', JSON.stringify(localModifiedPedidos));
}

let mockDrones = [
    { id: 1, modelo: "DJI Matrice 300 RTK", capacidad_maxima_kg: 2.7, bateria: 85, estado: "DISPONIBLE" },
    { id: 2, modelo: "Flycart 30 Heavy", capacidad_maxima_kg: 30.0, bateria: 100, estado: "DISPONIBLE" },
    { id: 3, modelo: "Mavic 3 Enterprise", capacidad_maxima_kg: 0.9, bateria: 62, estado: "DISPONIBLE" }
];

let todosLosDrones = [...mockDrones];
let todosLosPedidos = [];
let filtroActual = 'TODOS';

window.cargarTodo = async function() {
    await Promise.all([window.cargarDrones(), window.cargarPedidos()]);
};

// Cargar y fusionar drones con prioridad local
window.cargarDrones = async function() {
    try {
        const res = await fetch(API_DRONES_URL);
        if (res.ok) {
            const data = await res.json();
            let apiDrones = Array.isArray(data) ? data : (data.data || []);
            if (apiDrones.length > 0) {
                let listaMezclada = apiDrones.map(drone => {
                    const id = Number(drone.id);
                    const bat = drone.bateria ?? drone.nivel_bateria ?? drone.battery ?? 85;
                    const cap = drone.capacidad_maxima_kg ?? drone.capacidad_maxima ?? drone.capacidad ?? 2.5;
                    let item = { ...drone, id, bateria: Number(bat), capacidad_maxima_kg: Number(cap) };
                    
                    if (localModifiedDrones[id]) {
                        item = { ...item, ...localModifiedDrones[id] };
                    }
                    return item;
                });

                localAddedDrones.forEach(ld => {
                    if (!listaMezclada.some(d => Number(d.id) === Number(ld.id))) {
                        let item = { ...ld };
                        if (localModifiedDrones[ld.id]) {
                            item = { ...item, ...localModifiedDrones[ld.id] };
                        }
                        listaMezclada.push(item);
                    }
                });
                todosLosDrones = listaMezclada;
            } else {
                aplicarCambiosLocalesDrones();
            }
            actualizarIndicadorConexion(true);
        } else {
            actualizarIndicadorConexion(false);
            aplicarCambiosLocalesDrones();
        }
    } catch (error) {
        actualizarIndicadorConexion(false);
        aplicarCambiosLocalesDrones();
    }
    actualizarEstadisticas();
    renderizarGrillaDrones();
};

// Cargar pedidos activos desde el despachador (GET /pedidos-activos)
window.cargarPedidos = async function() {
    try {
        const res = await fetch(`${API_DESPACHADOR_BASE}/pedidos-activos`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const lista = Array.isArray(data) ? data : (data.data || data.pedidos || []);

        todosLosPedidos = lista.map(p => {
            const id = Number(p.id);
            return {
                ...p,
                id,
                cliente: p.cliente || 'Cliente General',
                peso_kg: parseFloat(p.peso_kg ?? 0),
                estado: (p.estado || 'PENDIENTE').toUpperCase(),
                // el despachador no devuelve dron_id: se recupera del localStorage
                dron_id: p.dron_id ?? localModifiedPedidos[id]?.dron_id ?? null
            };
        });
    } catch (error) {
        console.warn('Despachador offline, se conserva la ultima lista', error);
    }
    renderizarTablaPedidos();
};

// Llamada generica al despachador; lanza error si la respuesta no es 2xx
async function llamarDespachador(ruta, metodo = 'PUT', body = null) {
    const opciones = { method: metodo, headers: { 'Content-Type': 'application/json' } };
    if (body) opciones.body = JSON.stringify(body);
    const res = await fetch(`${API_DESPACHADOR_BASE}${ruta}`, opciones);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json().catch(() => ({}));
}

// Deja visible el pedido ENTREGADO unos segundos y luego lo borra de la tabla
function programarOcultarPedido(pedido) {
    const id = Number(pedido.id);
    const previo = entregadosRecientes.get(id);
    if (previo) clearTimeout(previo.timeoutId);

    const timeoutId = setTimeout(() => {
        entregadosRecientes.delete(id);
        todosLosPedidos = todosLosPedidos.filter(p => Number(p.id) !== id);
        delete localModifiedPedidos[id];
        guardarPersistencia();
        renderizarTablaPedidos();
    }, SEGUNDOS_PARA_OCULTAR * 1000);

    entregadosRecientes.set(id, { pedido: { ...pedido, estado: 'ENTREGADO' }, timeoutId });
}

function aplicarCambiosLocalesDrones() {
    let lista = mockDrones.map(drone => {
        const id = Number(drone.id);
        let item = { ...drone, id, bateria: Number(drone.bateria), capacidad_maxima_kg: Number(drone.capacidad_maxima_kg) };
        if (localModifiedDrones[id]) item = { ...item, ...localModifiedDrones[id] };
        return item;
    });

    localAddedDrones.forEach(ld => {
        let item = { ...ld };
        if (localModifiedDrones[ld.id]) item = { ...item, ...localModifiedDrones[ld.id] };
        if (!lista.some(d => Number(d.id) === Number(item.id))) lista.push(item);
    });

    todosLosDrones = lista;
}

function actualizarIndicadorConexion(exitoso) {
    const statusElem = document.getElementById('connection-status');
    if (!statusElem) return;
    if (exitoso) {
        statusElem.className = "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        statusElem.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping"></span> Conectado a APIs (5000/5001)`;
    } else {
        statusElem.className = "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20";
        statusElem.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 mr-2"></span> Modo Simulación / API Offline`;
    }
}

function actualizarEstadisticas() {
    const total = todosLosDrones.length;
    const disponibles = todosLosDrones.filter(d => (d.estado || '').toUpperCase() === 'DISPONIBLE').length;
    const enMision = todosLosDrones.filter(d => ['EN_MISION', 'CARGANDO'].includes((d.estado || '').toUpperCase())).length;
    const criticos = todosLosDrones.filter(d => ((d.bateria ?? 0) < 20) || ['MANTENIMIENTO', 'SIN_BATERIA'].includes((d.estado || '').toUpperCase())).length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-disponibles').innerText = disponibles;
    document.getElementById('stat-mision').innerText = enMision;
    document.getElementById('stat-alerta').innerText = criticos;
}

function renderizarTablaPedidos() {
    const tbody = document.getElementById('tabla-pedidos-body');
    const badgeCount = document.getElementById('stat-pedidos-pendientes');
    if (!tbody) return;

    tbody.innerHTML = '';

    // pedidos del servidor + los recien entregados (visibles hasta que venza el timeout)
    const idsRecientes = new Set(entregadosRecientes.keys());
    const listaPedidos = [
        ...todosLosPedidos.filter(p => !idsRecientes.has(Number(p.id))),
        ...[...entregadosRecientes.values()].map(e => e.pedido)
    ].sort((a, b) => Number(a.id) - Number(b.id));

    const activos = listaPedidos.filter(p => ['PENDIENTE', 'EN_CAMINO'].includes((p.estado || '').toUpperCase()));
    if (badgeCount) badgeCount.innerText = `${activos.length} Activos`;

    if (listaPedidos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500">No hay pedidos para despachar.</td></tr>`;
        return;
    }

    listaPedidos.forEach(pedido => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/50 transition-colors";

        const estadoRaw = (pedido.estado || '').toUpperCase();
        let estadoBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        if (estadoRaw === 'EN_CAMINO') estadoBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        if (estadoRaw === 'ENTREGADO') estadoBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

        const dronTexto = pedido.dron_id ? `Dron #${pedido.dron_id}` : '-';

        let accionHTML = '';
        if (estadoRaw === 'PENDIENTE') {
            accionHTML = `
                <button onclick="window.asignarDron(${pedido.id})" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 ml-auto cursor-pointer">
                    <i class="fa-solid fa-paper-plane"></i> Asignar Dron
                </button>
            `;
        } else if (estadoRaw === 'EN_CAMINO') {
            accionHTML = `
                <button onclick="window.confirmarEntrega(${pedido.id})" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 ml-auto cursor-pointer animate-pulse">
                    <i class="fa-solid fa-circle-check"></i> Confirmar Entrega
                </button>
            `;
        } else {
            accionHTML = `<span class="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1"><i class="fa-solid fa-check"></i> Entregado</span>`;
        }

        tr.innerHTML = `
            <td class="py-3 px-4 font-mono font-bold text-slate-300">#PED-${pedido.id}</td>
            <td class="py-3 px-4 font-semibold text-white">${pedido.cliente || 'Cliente General'}</td>
            <td class="py-3 px-4 font-bold text-blue-400">${pedido.peso_kg} kg</td>
            <td class="py-3 px-4 font-bold text-slate-300">${dronTexto}</td>
            <td class="py-3 px-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${estadoBadge}">
                    ${estadoRaw}
                </span>
            </td>
            <td class="py-3 px-4 text-right">
                ${accionHTML}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================
// ASIGNACIÓN MANUAL DE DRON A PEDIDO
// ============================================================

// 1) Abre el modal con la lista de drones para elegir uno a mano
window.abrirModalAsignar = function(pedidoId) {
    const pedido = todosLosPedidos.find(p => Number(p.id) === Number(pedidoId));
    if (!pedido) return;

    window.ocultarAlerta();

    document.getElementById('asig-pedido-id').value = pedidoId;
    document.getElementById('asig-pedido-info').innerText =
        `#PED-${pedidoId} · ${pedido.cliente || 'Cliente General'} · ${pedido.peso_kg} kg`;

    const cont = document.getElementById('asig-lista-drones');
    cont.innerHTML = '';

    if (todosLosDrones.length === 0) {
        cont.innerHTML = `<p class="text-center text-slate-500 py-6">No hay drones registrados.</p>`;
    } else {
        todosLosDrones.forEach(drone => {
            const estado = (drone.estado || '').toUpperCase();
            const bateria = Number(drone.bateria ?? 0);
            const capacidad = Number(drone.capacidad_maxima_kg ?? 0);
            const pesoPedido = Number(pedido.peso_kg ?? 0);

            const motivoRechazo = [];
            if (estado !== 'DISPONIBLE') motivoRechazo.push(`estado ${estado}`);
            if (bateria < 20)          motivoRechazo.push(`batería ${bateria}% < 20%`);
            if (capacidad < pesoPedido) motivoRechazo.push(`capacidad ${capacidad} kg < ${pesoPedido} kg`);

            const apto = motivoRechazo.length === 0;

            const card = document.createElement('button');
            card.type = 'button';
            card.disabled = !apto;
            card.className = apto
                ? 'w-full text-left p-4 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all flex justify-between items-center cursor-pointer'
                : 'w-full text-left p-4 rounded-xl border-2 border-slate-700 bg-slate-800/40 opacity-60 cursor-not-allowed flex justify-between items-center';

            card.innerHTML = `
                <div>
                    <div class="font-bold text-white">#${drone.id} · ${drone.modelo || 'Dron'}</div>
                    <div class="text-xs text-slate-400 mt-0.5">
                        Cap: <b>${capacidad} kg</b> · Batería: <b>${bateria}%</b> · Estado: <b>${estado}</b>
                    </div>
                    ${apto
                        ? `<div class="text-xs text-emerald-400 mt-1"><i class="fa-solid fa-check"></i> Apto para ${pesoPedido} kg</div>`
                        : `<div class="text-xs text-rose-400 mt-1"><i class="fa-solid fa-xmark"></i> ${motivoRechazo.join(' · ')}</div>`}
                </div>
                ${apto
                    ? `<i class="fa-solid fa-circle-check text-emerald-400 text-xl"></i>`
                    : `<i class="fa-solid fa-ban text-rose-400 text-xl"></i>`}
            `;

            if (apto) {
                card.onclick = () => window.confirmarAsignacion(drone.id, pedidoId);
            }
            cont.appendChild(card);
        });
    }

    document.getElementById('modal-asignar').classList.remove('hidden');
};

window.cerrarModalAsignar = function() {
    const el = document.getElementById('modal-asignar');
    if (el) el.classList.add('hidden');
};

// 2) El operador ya eligió un dron → se despacha y se actualizan estados
window.confirmarAsignacion = async function(dronId, pedidoId) {
    const pedido = todosLosPedidos.find(p => Number(p.id) === Number(pedidoId));
    const dron   = todosLosDrones.find(d => Number(d.id) === Number(dronId));
    if (!pedido || !dron) return;

    // Validación final por si el estado cambió entre abrir y confirmar
    if ((dron.estado || '').toUpperCase() !== 'DISPONIBLE') {
        window.mostrarAlerta('error', `El dron #${dron.id} ya no está disponible.`);
        return;
    }
    if (Number(dron.capacidad_maxima_kg ?? 0) < Number(pedido.peso_kg ?? 0)) {
        window.mostrarAlerta('error', `El dron #${dron.id} no soporta ${pedido.peso_kg} kg.`);
        return;
    }
    if (Number(dron.bateria ?? 0) < 20) {
        window.mostrarAlerta('error', `El dron #${dron.id} tiene batería insuficiente (<20%).`);
        return;
    }

    try {
        await llamarDespachador('/despachar', 'POST', { pedido_id: pedidoId, dron_id: dronId });
        await llamarDespachador(`/pedidos/${pedidoId}/en-camino`);
    } catch (error) {
        window.mostrarAlerta('error', `[ERROR] No se pudo despachar el pedido #PED-${pedidoId}: ${error.message}`);
        return;
    }

    // Estado del dron → EN_MISION
    dron.estado = 'EN_MISION';
    localModifiedDrones[dron.id] = { estado: 'EN_MISION' };

    // Estado del pedido → EN_CAMINO con dron asignado
    pedido.estado = 'EN_CAMINO';
    pedido.dron_id = dron.id;
    localModifiedPedidos[pedidoId] = { dron_id: dron.id };

    guardarPersistencia();
    window.cerrarModalAsignar();

    actualizarEstadisticas();
    renderizarGrillaDrones();
    renderizarTablaPedidos();

    window.mostrarAlerta('éxito', `Dron #${dron.id} (${dron.modelo}) asignado manualmente al pedido #PED-${pedidoId}.`);

    // Persistir el estado EN_MISION en el servicio de drones (best-effort)
    fetch(`${API_DRONES_URL}/${dron.id}/telemetria`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'EN_MISION', bateria: Number(dron.bateria ?? 100) })
    }).catch(err => console.warn('Servicio de drones offline (EN_MISION)', err));
};

window.confirmarEntrega = async function(pedidoId) {
    const pedido = todosLosPedidos.find(p => Number(p.id) === Number(pedidoId));
    if (!pedido) return;

    window.ocultarAlerta();

    try {
        await llamarDespachador(`/pedidos/${pedidoId}/entregar`);
    } catch (error) {
        window.mostrarAlerta('error', `[ERROR] No se pudo marcar #PED-${pedidoId} como ENTREGADO: ${error.message}`);
        return;
    }

    pedido.estado = 'ENTREGADO';

    // Localizar el dron asignado (o el primero EN_MISION como fallback)
    let dronLiberado = todosLosDrones.find(d => Number(d.id) === Number(pedido.dron_id));
    if (!dronLiberado) {
        dronLiberado = todosLosDrones.find(d => (d.estado || '').toUpperCase() === 'EN_MISION');
    }

    let mensajeBateria = '';
    if (dronLiberado) {
        const bateriaAntes = Number(dronLiberado.bateria ?? 100);
        const bateriaDespues = Math.max(0, bateriaAntes - DESCARGA_BATERIA_POR_ENTREGA);

        dronLiberado.estado = 'DISPONIBLE';
        dronLiberado.bateria = bateriaDespues;

        localModifiedDrones[dronLiberado.id] = {
            estado: 'DISPONIBLE',
            bateria: bateriaDespues
        };

        mensajeBateria = ` Dron #${dronLiberado.id} liberado (batería ${bateriaAntes}% → ${bateriaDespues}%).`;
    }

    programarOcultarPedido(pedido);
    guardarPersistencia();

    actualizarEstadisticas();
    renderizarGrillaDrones();
    renderizarTablaPedidos();

    window.mostrarAlerta('éxito', `[ENTREGA CONFIRMADA] Pedido #PED-${pedidoId}.${mensajeBateria}`);

    // Sincronizar dron con el microservicio de drones
    if (dronLiberado) {
        try {
            await fetch(`${API_DRONES_URL}/${dronLiberado.id}/telemetria`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'DISPONIBLE',
                    bateria: dronLiberado.bateria
                })
            });
        } catch (err) {
            console.warn('Servicio de drones offline (liberación)', err);
        }
    }
};

window.mostrarAlerta = function(tipo, mensaje) {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const esError = tipo === 'error';
    const bg = esError ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
    const icon = esError ? 'fa-triangle-exclamation text-rose-400' : 'fa-circle-check text-emerald-400';

    container.className = `p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 flex items-start justify-between ${bg}`;
    container.innerHTML = `
        <div class="flex items-start gap-3">
            <i class="fa-solid ${icon} text-xl mt-0.5"></i>
            <div>
                <h4 class="font-bold text-sm tracking-wide mb-0.5">${esError ? 'Solicitud Rechazada' : 'Operación Exitosa'}</h4>
                <p class="text-xs font-mono leading-relaxed">${mensaje}</p>
            </div>
        </div>
        <button onclick="window.ocultarAlerta()" class="text-slate-400 hover:text-white ml-4">
            <i class="fa-solid fa-xmark text-lg"></i>
        </button>
    `;
    container.classList.remove('hidden');
};

window.ocultarAlerta = function() {
    const container = document.getElementById('alert-container');
    if (container) container.classList.add('hidden');
};

window.filtrarDrones = function(tipo, el) {
    filtroActual = tipo;
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-slate-800', 'text-slate-300');
    });
    if (el) {
        el.classList.remove('bg-slate-800', 'text-slate-300');
        el.classList.add('bg-blue-600', 'text-white');
    }
    renderizarGrillaDrones();
};

function renderizarGrillaDrones() {
    const container = document.getElementById('drones-grid');
    if (!container) return;
    container.innerHTML = '';

    let dronesFiltrados = todosLosDrones.filter(drone => {
        const estado = (drone.estado || '').toUpperCase();
        const bateria = drone.bateria ?? 0;
        if (filtroActual === 'DISPONIBLE') return estado === 'DISPONIBLE';
        if (filtroActual === 'EN_MISION') return estado === 'EN_MISION';
        if (filtroActual === 'CARGANDO') return estado === 'CARGANDO';
        if (filtroActual === 'CRITICO') return bateria < 20 || ['MANTENIMIENTO', 'SIN_BATERIA'].includes(estado);
        return true;
    });

    if (dronesFiltrados.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-12 text-center text-slate-500">
                <i class="fa-solid fa-drone text-4xl mb-3"></i>
                <p>No hay unidades de dron que coincidan con el filtro seleccionado.</p>
            </div>
        `;
        return;
    }

    dronesFiltrados.forEach(drone => {
        const bateria = Number(drone.bateria ?? 0);
        const capacidad = Number(drone.capacidad_maxima_kg ?? 0);
        const estadoRaw = (drone.estado || 'DESCONOCIDO').toUpperCase();
        const esBateriaBaja = bateria < 20;

        let estadoBadge = { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600', label: estadoRaw, dot: 'bg-slate-400' };

        if (estadoRaw === 'DISPONIBLE') {
            estadoBadge = { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Disponible', dot: 'bg-emerald-400' };
        } else if (estadoRaw === 'EN_MISION') {
            estadoBadge = { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'En Misión', dot: 'bg-amber-400' };
        } else if (estadoRaw === 'CARGANDO') {
            estadoBadge = { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Cargando', dot: 'bg-blue-400' };
        } else if (['MANTENIMIENTO', 'SIN_BATERIA', 'DESCONECTADO'].includes(estadoRaw) || esBateriaBaja) {
            estadoBadge = { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', label: esBateriaBaja ? 'Batería Crítica' : 'Mantenimiento', dot: 'bg-rose-500' };
        }

        let bateriaColor = 'bg-emerald-500';
        if (bateria < 50) bateriaColor = 'bg-amber-500';
        if (esBateriaBaja) bateriaColor = 'bg-rose-500 animate-pulse';

        const cardClasses = esBateriaBaja ? 'battery-danger border-2 border-rose-500/80 bg-slate-800/90' : `border ${estadoBadge.border} bg-slate-800/60 hover:bg-slate-800`;

        const card = document.createElement('div');
        card.className = `${cardClasses} p-6 rounded-2xl shadow-lg transition-all duration-300 flex flex-col justify-between`;

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">ID #${drone.id}</span>
                        <h3 class="text-lg font-bold text-white mt-0.5">${drone.modelo || 'Dron Estándar'}</h3>
                    </div>
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${estadoBadge.bg} ${estadoBadge.text} border ${estadoBadge.border}">
                        <span class="w-1.5 h-1.5 rounded-full ${estadoBadge.dot} mr-1.5"></span>
                        ${estadoBadge.label}
                    </span>
                </div>

                <div class="bg-slate-900/60 p-3 rounded-xl mb-4 border border-slate-700/50 flex items-center justify-between">
                    <span class="text-xs text-slate-400 flex items-center gap-2">
                        <i class="fa-solid fa-weight-hanging text-slate-400"></i> Capacidad Útil Máxima
                    </span>
                    <span class="text-sm font-bold text-slate-200">${capacidad} kg</span>
                </div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-1.5">
                    <span class="text-xs font-semibold ${esBateriaBaja ? 'text-rose-400 font-bold flex items-center gap-1' : 'text-slate-400'}">
                        ${esBateriaBaja ? '<i class="fa-solid fa-triangle-exclamation"></i> ALERTA BATERÍA' : 'Nivel de Batería'}
                    </span>
                    <span class="text-xs font-extrabold ${esBateriaBaja ? 'text-rose-400' : 'text-slate-200'}">${bateria}%</span>
                </div>

                <div class="w-full bg-slate-900 rounded-full h-3 p-0.5 border border-slate-700 mb-4">
                    <div class="${bateriaColor} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(0, bateria))}%"></div>
                </div>

                <button type="button" onclick="window.abrirModalTelemetria(${drone.id})" class="w-full bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs py-2 rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <i class="fa-solid fa-sliders text-amber-400"></i> Ajustar Telemetría / Recarga
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// MODAL REGISTRAR DRON
window.abrirModalRegistrar = function() {
    const el = document.getElementById('modal-registrar');
    if (el) el.classList.remove('hidden');
};

window.cerrarModalRegistrar = function() {
    const el = document.getElementById('modal-registrar');
    if (el) el.classList.add('hidden');
};

window.guardarNuevoDron = async function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }

    const modelo = document.getElementById('reg-modelo').value;
    const capacidad_maxima_kg = parseFloat(document.getElementById('reg-capacidad').value);
    const bateria = parseInt(document.getElementById('reg-bateria').value);
    const estado = document.getElementById('reg-estado').value;

    const payload = { modelo, capacidad_maxima_kg, capacidad_maxima: capacidad_maxima_kg, bateria, nivel_bateria: bateria, estado };
    const nuevoId = todosLosDrones.length > 0 ? Math.max(...todosLosDrones.map(d => Number(d.id) || 0)) + 1 : 1;
    const nuevoDron = { id: nuevoId, ...payload };

    localAddedDrones.push(nuevoDron);
    guardarPersistencia();

    window.cerrarModalRegistrar();
    document.getElementById('form-registrar').reset();
    await window.cargarDrones();

    try {
        await fetch(API_DRONES_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.warn('POST /drones offline', error);
    }
};

// MODAL TELEMETRÍA
window.abrirModalTelemetria = function(id) {
    const drone = todosLosDrones.find(d => Number(d.id) === Number(id));
    if (!drone) return;

    document.getElementById('tele-id').value = drone.id;
    document.getElementById('tele-modelo-nombre').innerText = `ID #${drone.id} - ${drone.modelo || 'Dron'}`;
    const batVal = drone.bateria ?? 100;
    document.getElementById('tele-bateria').value = batVal;
    document.getElementById('tele-bateria-val').innerText = batVal + '%';
    document.getElementById('tele-estado').value = drone.estado || 'DISPONIBLE';

    document.getElementById('modal-telemetria').classList.remove('hidden');
};

window.cerrarModalTelemetria = function() {
    const el = document.getElementById('modal-telemetria');
    if (el) el.classList.add('hidden');
};

window.quickRecargarBateria = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.getElementById('tele-bateria').value = 100;
    document.getElementById('tele-bateria-val').innerText = '100%';
    document.getElementById('tele-estado').value = 'CARGANDO';
    window.guardarTelemetria(null);
};

window.guardarTelemetria = async function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }

    const id = parseInt(document.getElementById('tele-id').value);
    const bateria = parseInt(document.getElementById('tele-bateria').value);
    const estado = document.getElementById('tele-estado').value;

    const payload = { bateria, nivel_bateria: bateria, estado };
    localModifiedDrones[id] = payload;
    guardarPersistencia();

    window.cerrarModalTelemetria();
    await window.cargarDrones();

    try {
        await fetch(`${API_DRONES_URL}/${id}/telemetria`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.warn('PUT /drones offline', error);
    }
};

window.cargarTodo();
setInterval(window.cargarTodo, 5000);