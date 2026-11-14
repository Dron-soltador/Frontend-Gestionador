window.App = window.App || {};

(function (App) {
    'use strict';

    const { estado } = App.estado.tienda;
    const { guardarPersistencia } = App.servicios.almacenamiento;
    const { actualizarTelemetriaDron } = App.servicios.apiDrones;

    function abrirModalTelemetria(id) {
        const drone = estado.drones.find(d => Number(d.id) === Number(id));
        if (!drone) return;

        document.getElementById('tele-id').value = drone.id;
        document.getElementById('tele-modelo-nombre').innerText = `ID #${drone.id} - ${drone.modelo || 'Dron'}`;
        const bateria = drone.bateria ?? 100;
        document.getElementById('tele-bateria').value = bateria;
        document.getElementById('tele-bateria-val').innerText = bateria + '%';
        document.getElementById('tele-estado').value = drone.estado || 'DISPONIBLE';

        document.getElementById('modal-telemetria').classList.remove('hidden');
    }

    function cerrarModalTelemetria() {
        const el = document.getElementById('modal-telemetria');
        if (el) el.classList.add('hidden');
    }

    function quickRecargarBateria(evento, recargarDrones) {
        if (evento) {
            evento.preventDefault();
            evento.stopPropagation();
        }
        document.getElementById('tele-bateria').value = 100;
        document.getElementById('tele-bateria-val').innerText = '100%';
        document.getElementById('tele-estado').value = 'CARGANDO';
        return guardarTelemetria(null, recargarDrones);
    }

    async function guardarTelemetria(evento, recargarDrones) {
        if (evento) {
            evento.preventDefault();
            evento.stopPropagation();
        }

        const id = parseInt(document.getElementById('tele-id').value);
        const bateria = parseInt(document.getElementById('tele-bateria').value);
        const estadoDron = document.getElementById('tele-estado').value;

        const payload = { bateria, nivel_bateria: bateria, estado: estadoDron };
        estado.dronesModificados[id] = payload;
        guardarPersistencia(estado);

        cerrarModalTelemetria();
        await recargarDrones();

        try {
            await actualizarTelemetriaDron(id, payload);
        } catch (error) {
            console.warn('PUT /drones offline', error);
        }
    }

    App.vistas = App.vistas || {};
    App.vistas.modalTelemetria = {
        abrirModalTelemetria,
        cerrarModalTelemetria,
        quickRecargarBateria,
        guardarTelemetria
    };
})(window.App);