window.App = window.App || {};

(function (App) {
    'use strict';

    const { estado } = App.estado.tienda;
    const { guardarPersistencia } = App.servicios.almacenamiento;
    const { registrarDron } = App.servicios.apiDrones;

    function abrirModalRegistrar() {
        const el = document.getElementById('modal-registrar');
        if (el) el.classList.remove('hidden');
    }

    function cerrarModalRegistrar() {
        const el = document.getElementById('modal-registrar');
        if (el) el.classList.add('hidden');
    }

    async function guardarNuevoDron(evento, recargarDrones) {
        if (evento) {
            evento.preventDefault();
            evento.stopPropagation();
        }

        const modelo = document.getElementById('reg-modelo').value;
        const capacidadMaxima = parseFloat(document.getElementById('reg-capacidad').value);
        const bateria = parseInt(document.getElementById('reg-bateria').value);
        const estadoDron = document.getElementById('reg-estado').value;

        const payload = {
            modelo,
            capacidad_maxima_kg: capacidadMaxima,
            capacidad_maxima: capacidadMaxima,
            bateria,
            nivel_bateria: bateria,
            estado: estadoDron
        };
        const nuevoId = estado.drones.length > 0
            ? Math.max(...estado.drones.map(d => Number(d.id) || 0)) + 1
            : 1;
        const nuevoDron = { id: nuevoId, ...payload };

        estado.dronesAgregados.push(nuevoDron);
        guardarPersistencia(estado);

        cerrarModalRegistrar();
        document.getElementById('form-registrar').reset();
        await recargarDrones();

        try {
            await registrarDron(payload);
        } catch (error) {
            console.warn('POST /drones offline', error);
        }
    }

    App.vistas = App.vistas || {};
    App.vistas.modalRegistrar = {
        abrirModalRegistrar,
        cerrarModalRegistrar,
        guardarNuevoDron
    };
})(window.App);