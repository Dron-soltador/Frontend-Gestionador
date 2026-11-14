window.App = window.App || {};

(function (App) {
    'use strict';

    const { estado } = App.estado.tienda;
    const { BATERIA_MINIMA_DESPACHO } = App.config;
    const { guardarPersistencia } = App.servicios.almacenamiento;
    const { llamarDespachador } = App.servicios.apiDespachador;
    const { actualizarTelemetriaDron } = App.servicios.apiDrones;
    const { mostrarAlerta, ocultarAlerta } = App.vistas.alertas;
    const { actualizarEstadisticas } = App.vistas.estadisticas;
    const { renderizarGrillaDrones } = App.vistas.grillaDrones;
    const { renderizarTablaPedidos } = App.vistas.tablaPedidos;

    function motivosRechazo(drone, pesoPedido) {
        const estadoDron = (drone.estado || '').toUpperCase();
        const bateria = Number(drone.bateria ?? 0);
        const capacidad = Number(drone.capacidad_maxima_kg ?? 0);
        const motivos = [];

        if (estadoDron !== 'DISPONIBLE') motivos.push(`estado ${estadoDron}`);
        if (bateria < BATERIA_MINIMA_DESPACHO) {
            motivos.push(`batería ${bateria}% < ${BATERIA_MINIMA_DESPACHO}%`);
        }
        if (capacidad < pesoPedido) {
            motivos.push(`capacidad ${capacidad} kg < ${pesoPedido} kg`);
        }
        return motivos;
    }

    function crearTarjetaDronAsignable(drone, pedido) {
        const bateria = Number(drone.bateria ?? 0);
        const capacidad = Number(drone.capacidad_maxima_kg ?? 0);
        const estadoDron = (drone.estado || '').toUpperCase();
        const pesoPedido = Number(pedido.peso_kg ?? 0);
        const motivos = motivosRechazo(drone, pesoPedido);
        const apto = motivos.length === 0;

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
                    Cap: <b>${capacidad} kg</b> · Batería: <b>${bateria}%</b> · Estado: <b>${estadoDron}</b>
                </div>
                ${apto
                    ? `<div class="text-xs text-emerald-400 mt-1"><i class="fa-solid fa-check"></i> Apto para ${pesoPedido} kg</div>`
                    : `<div class="text-xs text-rose-400 mt-1"><i class="fa-solid fa-xmark"></i> ${motivos.join(' · ')}</div>`}
            </div>
            ${apto
                ? '<i class="fa-solid fa-circle-check text-emerald-400 text-xl"></i>'
                : '<i class="fa-solid fa-ban text-rose-400 text-xl"></i>'}
        `;

        if (apto) {
            card.onclick = () => confirmarAsignacion(drone.id, pedido.id);
        }
        return card;
    }

    function abrirModalAsignar(pedidoId) {
        const pedido = estado.pedidos.find(p => Number(p.id) === Number(pedidoId));
        if (!pedido) return;

        ocultarAlerta();

        document.getElementById('asig-pedido-id').value = pedidoId;
        document.getElementById('asig-pedido-info').innerText =
            `#PED-${pedidoId} · ${pedido.cliente || 'Cliente General'} · ${pedido.peso_kg} kg`;

        const contenedor = document.getElementById('asig-lista-drones');
        contenedor.innerHTML = '';

        if (estado.drones.length === 0) {
            contenedor.innerHTML = '<p class="text-center text-slate-500 py-6">No hay drones registrados.</p>';
        } else {
            estado.drones.forEach(drone => {
                contenedor.appendChild(crearTarjetaDronAsignable(drone, pedido));
            });
        }

        document.getElementById('modal-asignar').classList.remove('hidden');
    }

    function cerrarModalAsignar() {
        const el = document.getElementById('modal-asignar');
        if (el) el.classList.add('hidden');
    }

    function validarAsignacion(dron, pedido) {
        if ((dron.estado || '').toUpperCase() !== 'DISPONIBLE') {
            return `El dron #${dron.id} ya no está disponible.`;
        }
        if (Number(dron.capacidad_maxima_kg ?? 0) < Number(pedido.peso_kg ?? 0)) {
            return `El dron #${dron.id} no soporta ${pedido.peso_kg} kg.`;
        }
        if (Number(dron.bateria ?? 0) < BATERIA_MINIMA_DESPACHO) {
            return `El dron #${dron.id} tiene batería insuficiente (<${BATERIA_MINIMA_DESPACHO}%).`;
        }
        return null;
    }

    async function confirmarAsignacion(dronId, pedidoId) {
        const pedido = estado.pedidos.find(p => Number(p.id) === Number(pedidoId));
        const dron = estado.drones.find(d => Number(d.id) === Number(dronId));
        if (!pedido || !dron) return;

        const errorValidacion = validarAsignacion(dron, pedido);
        if (errorValidacion) {
            mostrarAlerta('error', errorValidacion);
            return;
        }

        try {
            await llamarDespachador('/despachar', 'POST', { pedido_id: pedidoId, dron_id: dronId });
            await llamarDespachador(`/pedidos/${pedidoId}/en-camino`);
        } catch (error) {
            mostrarAlerta('error', `[ERROR] No se pudo despachar el pedido #PED-${pedidoId}: ${error.message}`);
            return;
        }

        dron.estado = 'EN_MISION';
        estado.dronesModificados[dron.id] = { estado: 'EN_MISION' };

        pedido.estado = 'EN_CAMINO';
        pedido.dron_id = dron.id;
        estado.pedidosModificados[pedidoId] = { dron_id: dron.id };

        guardarPersistencia(estado);
        cerrarModalAsignar();

        actualizarEstadisticas();
        renderizarGrillaDrones();
        renderizarTablaPedidos();

        mostrarAlerta('éxito', `Dron #${dron.id} (${dron.modelo}) asignado manualmente al pedido #PED-${pedidoId}.`);

        actualizarTelemetriaDron(dron.id, {
            estado: 'EN_MISION',
            bateria: Number(dron.bateria ?? 100)
        }).catch(err => console.warn('Servicio de drones offline (EN_MISION)', err));
    }

    App.vistas = App.vistas || {};
    App.vistas.modalAsignar = {
        abrirModalAsignar,
        cerrarModalAsignar,
        confirmarAsignacion
    };
})(window.App);