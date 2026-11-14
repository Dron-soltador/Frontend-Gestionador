window.App = window.App || {};

(function (App) {
    'use strict';

    const CLAVES = {
        dronesAgregados: 'localAddedDrones',
        dronesModificados: 'localModifiedDrones',
        pedidosModificados: 'localModifiedPedidos',
        entregados: 'localEntregados'
    };

    function leerJSON(clave, valorPorDefecto) {
        try {
            const valor = localStorage.getItem(clave);
            return valor ? JSON.parse(valor) : valorPorDefecto;
        } catch (error) {
            return valorPorDefecto;
        }
    }

    function cargarPersistencia() {
        return {
            dronesAgregados: leerJSON(CLAVES.dronesAgregados, []),
            dronesModificados: leerJSON(CLAVES.dronesModificados, {}),
            pedidosModificados: leerJSON(CLAVES.pedidosModificados, {}),
            entregados: new Set(leerJSON(CLAVES.entregados, []))
        };
    }

    function guardarPersistencia(estado) {
        localStorage.setItem(CLAVES.dronesAgregados, JSON.stringify(estado.dronesAgregados));
        localStorage.setItem(CLAVES.dronesModificados, JSON.stringify(estado.dronesModificados));
        localStorage.setItem(CLAVES.pedidosModificados, JSON.stringify(estado.pedidosModificados));
    }

    function guardarEntregados(entregados) {
        localStorage.setItem(CLAVES.entregados, JSON.stringify([...entregados]));
    }

    App.servicios = App.servicios || {};
    App.servicios.almacenamiento = {
        cargarPersistencia,
        guardarPersistencia,
        guardarEntregados
    };
})(window.App);