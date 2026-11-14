window.App = window.App || {};

(function (App) {
    'use strict';

    const { estado } = App.estado.tienda;
    const { BATERIA_MINIMA_DESPACHO } = App.config;

    function filtrarDrones(tipo, el) {
        estado.filtro = tipo;
        document.querySelectorAll('.filtro-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-slate-800', 'text-slate-300');
        });
        if (el) {
            el.classList.remove('bg-slate-800', 'text-slate-300');
            el.classList.add('bg-blue-600', 'text-white');
        }
        renderizarGrillaDrones();
    }

    function coincideConFiltro(drone) {
        const estadoDron = (drone.estado || '').toUpperCase();
        const bateria = drone.bateria ?? 0;
        if (estado.filtro === 'DISPONIBLE') return estadoDron === 'DISPONIBLE';
        if (estado.filtro === 'EN_MISION') return estadoDron === 'EN_MISION';
        if (estado.filtro === 'CARGANDO') return estadoDron === 'CARGANDO';
        if (estado.filtro === 'CRITICO') {
            return bateria < BATERIA_MINIMA_DESPACHO
                || ['MANTENIMIENTO', 'SIN_BATERIA'].includes(estadoDron);
        }
        return true;
    }

    function calcularEstadoBadge(estadoDron, esBateriaBaja) {
        if (estadoDron === 'DISPONIBLE') {
            return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Disponible', dot: 'bg-emerald-400' };
        }
        if (estadoDron === 'EN_MISION') {
            return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'En Misión', dot: 'bg-amber-400' };
        }
        if (estadoDron === 'CARGANDO') {
            return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Cargando', dot: 'bg-blue-400' };
        }
        if (['MANTENIMIENTO', 'SIN_BATERIA', 'DESCONECTADO'].includes(estadoDron) || esBateriaBaja) {
            return {
                bg: 'bg-rose-500/10',
                text: 'text-rose-400',
                border: 'border-rose-500/30',
                label: esBateriaBaja ? 'Batería Crítica' : 'Mantenimiento',
                dot: 'bg-rose-500'
            };
        }
        return { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600', label: estadoDron, dot: 'bg-slate-400' };
    }

    function calcularColorBateria(bateria, esBateriaBaja) {
        let color = 'bg-emerald-500';
        if (bateria < 50) color = 'bg-amber-500';
        if (esBateriaBaja) color = 'bg-rose-500 animate-pulse';
        return color;
    }

    function crearTarjetaDron(drone) {
        const bateria = Number(drone.bateria ?? 0);
        const capacidad = Number(drone.capacidad_maxima_kg ?? 0);
        const estadoDron = (drone.estado || 'DESCONOCIDO').toUpperCase();
        const esBateriaBaja = bateria < BATERIA_MINIMA_DESPACHO;

        const estadoBadge = calcularEstadoBadge(estadoDron, esBateriaBaja);
        const bateriaColor = calcularColorBateria(bateria, esBateriaBaja);
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

                <div class="w-full bg-slate-900 rounded-full h-3 p-0.5 border border-slate-700 mb-4">
                    <div class="${bateriaColor} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(0, bateria))}%"></div>
                </div>

                <button type="button" onclick="window.abrirModalTelemetria(${drone.id})" class="w-full bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs py-2 rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <i class="fa-solid fa-sliders text-amber-400"></i> Ajustar Telemetría / Recarga
                </button>
            </div>
        `;
        return card;
    }

    function renderizarGrillaDrones() {
        const container = document.getElementById('drones-grid');
        if (!container) return;
        container.innerHTML = '';

        const dronesFiltrados = estado.drones.filter(coincideConFiltro);

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
            container.appendChild(crearTarjetaDron(drone));
        });
    }

    App.vistas = App.vistas || {};
    App.vistas.grillaDrones = { filtrarDrones, renderizarGrillaDrones };
})(window.App);