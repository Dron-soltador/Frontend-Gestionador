const API_URL = 'http://localhost:5001/drones';
let todosLosDrones = [];
let filtroActual = 'TODOS';

const mockDrones = [
    { id: 1, modelo: "DJI Matrice 300 RTK", capacidad_maxima_kg: 2.7, bateria: 85, estado: "DISPONIBLE" },
    { id: 2, modelo: "Flycart 30 Heavy", capacidad_maxima_kg: 30.0, bateria: 14, estado: "MANTENIMIENTO" },
    { id: 3, modelo: "Mavic 3 Enterprise", capacidad_maxima_kg: 0.9, bateria: 62, estado: "EN_MISION" },
    { id: 4, modelo: "WingtraOne GEN II", capacidad_maxima_kg: 1.5, bateria: 95, estado: "DISPONIBLE" },
    { id: 5, modelo: "Freefly Alta X", capacidad_maxima_kg: 15.8, bateria: 18, estado: "SIN_BATERIA" },
    { id: 6, modelo: "DJI Inspire 3", capacidad_maxima_kg: 4.0, bateria: 40, estado: "EN_MISION" }
];

async function cargarDrones() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Respuesta no válida');
        const data = await res.json();
        todosLosDrones = Array.isArray(data) ? data : (data.data || []);
        actualizarIndicadorConexion(true);
    } catch (error) {
        todosLosDrones = mockDrones;
        actualizarIndicadorConexion(false);
    }
    actualizarEstadisticas();
    renderizarGrilla();
}

function actualizarIndicadorConexion(exitoso) {
    const statusElem = document.getElementById('connection-status');
    if (exitoso) {
        statusElem.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        statusElem.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping"></span> Conectado a service-drones (5001)`;
    } else {
        statusElem.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20";
        statusElem.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 mr-2"></span> Modo Simulación (Demo Offline)`;
    }
}

function actualizarEstadisticas() {
    const total = todosLosDrones.length;
    const disponibles = todosLosDrones.filter(d => (d.estado || '').toUpperCase() === 'DISPONIBLE').length;
    const enMision = todosLosDrones.filter(d => (d.estado || '').toUpperCase() === 'EN_MISION').length;
    const criticos = todosLosDrones.filter(d => (d.bateria < 20) || ['MANTENIMIENTO', 'SIN_BATERIA'].includes((d.estado || '').toUpperCase())).length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-disponibles').innerText = disponibles;
    document.getElementById('stat-mision').innerText = enMision;
    document.getElementById('stat-alerta').innerText = criticos;
}

function filtrarDrones(tipo) {
    filtroActual = tipo;
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-slate-800', 'text-slate-300');
    });
    event.currentTarget.classList.remove('bg-slate-800', 'text-slate-300');
    event.currentTarget.classList.add('bg-blue-600', 'text-white');
    renderizarGrilla();
}

function renderizarGrilla() {
    const container = document.getElementById('drones-grid');
    container.innerHTML = '';

    let dronesFiltrados = todosLosDrones.filter(drone => {
        const estado = (drone.estado || '').toUpperCase();
        if (filtroActual === 'DISPONIBLE') return estado === 'DISPONIBLE';
        if (filtroActual === 'EN_MISION') return estado === 'EN_MISION';
        if (filtroActual === 'CRITICO') return drone.bateria < 20 || ['MANTENIMIENTO', 'SIN_BATERIA'].includes(estado);
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
        const bateria = drone.bateria ?? drone.nivel_bateria ?? 0;
        const capacidad = drone.capacidad_maxima_kg ?? drone.capacidad_maxima ?? drone.capacidad ?? 0;
        const estadoRaw = (drone.estado || 'DESCONOCIDO').toUpperCase();
        const esBateriaBaja = bateria < 20;

        let estadoBadge = {
            bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600', label: estadoRaw, dot: 'bg-slate-400'
        };

        if (estadoRaw === 'DISPONIBLE') {
            estadoBadge = { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'VERDE: Disponible', dot: 'bg-emerald-400' };
        } else if (estadoRaw === 'EN_MISION') {
            estadoBadge = { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'AMARILLO: En Misión', dot: 'bg-amber-400' };
        } else if (['MANTENIMIENTO', 'SIN_BATERIA', 'DESCONECTADO'].includes(estadoRaw) || esBateriaBaja) {
            estadoBadge = { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', label: esBateriaBaja ? 'ROJO: Batería Crítica' : 'ROJO: Mantenimiento', dot: 'bg-rose-500' };
        }

        let bateriaColor = 'bg-emerald-500';
        if (bateria < 50) bateriaColor = 'bg-amber-500';
        if (esBateriaBaja) bateriaColor = 'bg-rose-500 animate-pulse';

        const cardClasses = esBateriaBaja 
            ? 'battery-danger border-2 border-rose-500/80 bg-slate-800/90' 
            : `border ${estadoBadge.border} bg-slate-800/60 hover:bg-slate-800`;

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

                <div class="w-full bg-slate-900 rounded-full h-3 p-0.5 border border-slate-700">
                    <div class="${bateriaColor} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(0, bateria))}%"></div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

cargarDrones();
setInterval(cargarDrones, 5000);
