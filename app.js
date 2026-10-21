const API_DRONES_URL = 'http://localhost:5001/drones';
const API_DESPACHADOR_URL = 'http://localhost:5002/despachar';
const API_PEDIDOS_URL = 'http://localhost:5000/pedidos';

let mockDrones = [
    { id: 1, modelo: "DJI Matrice 300 RTK", capacidad_maxima_kg: 2.7, bateria: 85, estado: "DISPONIBLE" },
    { id: 2, modelo: "Flycart 30 Heavy", capacidad_maxima_kg: 30.0, bateria: 100, estado: "DISPONIBLE" },
    { id: 3, modelo: "Mavic 3 Enterprise", capacidad_maxima_kg: 0.9, bateria: 62, estado: "DISPONIBLE" }
];

let mockPedidos = [
    { id: 101, cliente: "Hospital Central", peso_kg: 1.2, estado: "PENDIENTE" },
    { id: 102, cliente: "Farmacia San Martín", peso_kg: 18.5, estado: "PENDIENTE" },
    { id: 103, cliente: "Supermercado Express", peso_kg: 45.0, estado: "PENDIENTE" }
];

let todosLosDrones = [...mockDrones];
let todosLosPedidos = [...mockPedidos];
let localAddedDrones = [];
let localModifiedDrones = {};
let filtroActual = 'TODOS';

window.cargarTodo = async function() {
    await Promise.all([window.cargarDrones(), window.cargarPedidos()]);
};

window.cargarDrones = async function() {
    try {
        const res = await fetch(API_DRONES_URL);
        if (res.ok) {
            const data = await res.json();
            let apiDrones = Array.isArray(data) ? data : (data.data || []);
            if (apiDrones.length > 0) {
                apiDrones = apiDrones.map(drone => {
                    const id = Number(drone.id);
                    const bat = drone.bateria ?? drone.nivel_bateria ?? drone.battery ?? 85;
                    const cap = drone.capacidad_maxima_kg ?? drone.capacidad_maxima ?? drone.capacidad ?? 2.5;
                    
                    let normalizado = { ...drone, id, bateria: Number(bat), capacidad_maxima_kg: Number(cap) };

                    if (localModifiedDrones[id]) {
                        normalizado = { ...normalizado, ...localModifiedDrones[id] };
                    }
                    return normalizado;
                });

                localAddedDrones.forEach(ld => {
                    if (!apiDrones.some(d => Number(d.id) === Number(ld.id))) apiDrones.push(ld);
                });
                todosLosDrones = apiDrones;
            } else {
                aplicarCambiosLocales();
            }
            actualizarIndicadorConexion(true);
        } else {
            actualizarIndicadorConexion(false);
            aplicarCambiosLocales();
        }
    } catch (error) {
        actualizarIndicadorConexion(false);
        aplicarCambiosLocales();
    }
    actualizarEstadisticas();
    renderizarGrillaDrones();
};

window.cargarPedidos = async function() {
    try {
        const res = await fetch(API_PEDIDOS_URL);
        if (res.ok) {
            const data = await res.json();
            const apiPedidos = Array.isArray(data) ? data : (data.data || []);
            if (apiPedidos.length > 0) todosLosPedidos = apiPedidos;
        }
    } catch (error) {
        console.warn('Backend service-pedidos offline', error);
    }
    renderizarTablaPedidos();
};

function aplicarCambiosLocales() {
    todosLosDrones = todosLosDrones.map(drone => {
        const id = Number(drone.id);
        const bat = drone.bateria ?? drone.nivel_bateria ?? 85;
        const cap = drone.capacidad_maxima_kg ?? drone.capacidad_maxima ?? 2.5;
        let item = { ...drone, id, bateria: Number(bat), capacidad_maxima_kg: Number(cap) };
        if (localModifiedDrones[id]) {
            item = { ...item, ...localModifiedDrones[id] };
        }
        return item;
    });

    localAddedDrones.forEach(ld => {
        if (!todosLosDrones.some(d => Number(d.id) === Number(ld.id))) todosLosDrones.push(ld);
    });
}

function actualizarIndicadorConexion(exitoso) {
    const statusElem = document.getElementById('connection-status');
    if (!statusElem) return;
    if (exitoso) {
        statusElem.className = "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        statusElem.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping"></span> Conectado a service-drones (5001)`;
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
    const pendientes = todosLosPedidos.filter(p => (p.estado || '').toUpperCase() === 'PENDIENTE');
    if (badgeCount) badgeCount.innerText = `${pendientes.length} Envíos Pendientes`;

    if (todosLosPedidos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">No hay solicitudes de envíos registradas.</td></tr>`;
        return;
    }

    todosLosPedidos.forEach(pedido => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/50 transition-colors";

        const esPendiente = (pedido.estado || '').toUpperCase() === 'PENDIENTE';
        const estadoColor = esPendiente ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

        tr.innerHTML = `
            <td class="py-3 px-4 font-mono font-bold text-slate-300">#PED-${pedido.id}</td>
            <td class="py-3 px-4 font-semibold text-white">${pedido.cliente || 'Cliente General'}</td>
            <td class="py-3 px-4 font-bold text-blue-400">${pedido.peso_kg} kg</td>
            <td class="py-3 px-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${estadoColor}">
                    ${pedido.estado}
                </span>
            </td>
            <td class="py-3 px-4 text-right">
                ${esPendiente ? `
                    <button onclick="window.asignarDron(${pedido.id})" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 ml-auto cursor-pointer">
                        <i class="fa-solid fa-paper-plane"></i> Asignar Dron
                    </button>
                ` : `
                    <span class="text-xs text-slate-500 italic">Despachado</span>
                `}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.asignarDron = async function(pedidoId) {
    const pedido = todosLosPedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    window.ocultarAlerta();

    try {
        const res = await fetch(API_DESPACHADOR_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pedido_id: pedidoId })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            pedido.estado = 'EN_CAMINO';
            window.mostrarAlerta('éxito', `[ÉXITO] Asignación completada para el pedido #PED-${pedidoId}. Dron despachado en misión.`);
            await window.cargarDrones();
            renderizarTablaPedidos();
        } else {
            const errorMsg = data.error || data.mensaje || 'Rechazado por reglas de seguridad de vuelo.';
            window.mostrarAlerta('error', `[RECHAZO DE ASIGNACIÓN] Pedido #PED-${pedidoId} (${pedido.peso_kg} kg): ${errorMsg}`);
        }
    } catch (error) {
        const dronesDisponibles = todosLosDrones.filter(d => (d.estado || '').toUpperCase() === 'DISPONIBLE' && (d.bateria ?? 0) >= 20);
        const dronApto = dronesDisponibles.find(d => (d.capacidad_maxima_kg ?? 0) >= pedido.peso_kg);

        if (!dronApto) {
            const maxCap = Math.max(...todosLosDrones.map(d => d.capacidad_maxima_kg ?? 0), 0);
            if (pedido.peso_kg > maxCap) {
                window.mostrarAlerta('error', `[ALERTA DE RECHAZO POR SOBREPESO] El paquete de ${pedido.peso_kg} kg excede la capacidad máxima útil de la flota (${maxCap} kg). Ningún dron puede transportar esta carga.`);
            } else {
                window.mostrarAlerta('error', `[ALERTA DE RECHAZO POR BATERÍA/DISPONIBILIDAD] No existen drones disponibles con batería suficiente (>=20%) para asumir el envío #PED-${pedidoId}.`);
            }
        } else {
            dronApto.estado = 'EN_MISION';
            localModifiedDrones[dronApto.id] = { estado: 'EN_MISION' };
            pedido.estado = 'EN_CAMINO';
            window.mostrarAlerta('éxito', `[ÉXITO] Dron #${dronApto.id} (${dronApto.modelo}) asignado exitosamente al pedido #PED-${pedidoId}.`);
            actualizarEstadisticas();
            renderizarGrillaDrones();
            renderizarTablaPedidos();
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
                <h4 class="font-bold text-sm tracking-wide mb-0.5">${esError ? 'Solicitud Rechazada' : 'Asignación Exitosa'}</h4>
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

// MODAL 1: REGISTRAR DRON
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
    todosLosDrones.push(nuevoDron);

    window.cerrarModalRegistrar();
    document.getElementById('form-registrar').reset();
    actualizarEstadisticas();
    renderizarGrillaDrones();

    try {
        await fetch(API_DRONES_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.warn('POST /drones backend offline', error);
    }
};

// MODAL 2: TELEMETRÍA Y RECARGA
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

    todosLosDrones = todosLosDrones.map(d => Number(d.id) === Number(id) ? { ...d, ...payload } : d);

    window.cerrarModalTelemetria();
    actualizarEstadisticas();
    renderizarGrillaDrones();

    try {
        await fetch(`${API_DRONES_URL}/${id}/telemetria`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.warn('PUT /drones backend offline', error);
    }
};

window.cargarTodo();
setInterval(window.cargarDrones, 5000);