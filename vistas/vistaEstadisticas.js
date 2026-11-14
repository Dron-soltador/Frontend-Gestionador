window.App = window.App || {};

(function (App) {
    'use strict';

    const { estado } = App.estado.tienda;
    const { BATERIA_MINIMA_DESPACHO } = App.config;

    function actualizarEstadisticas() {
        const total = estado.drones.length;
        const disponibles = estado.drones.filter(d => (d.estado || '').toUpperCase() === 'DISPONIBLE').length;
        const enMision = estado.drones.filter(d => ['EN_MISION', 'CARGANDO'].includes((d.estado || '').toUpperCase())).length;
        const criticos = estado.drones.filter(d => {
            const estadoDron = (d.estado || '').toUpperCase();
            return (d.bateria ?? 0) < BATERIA_MINIMA_DESPACHO
                || ['MANTENIMIENTO', 'SIN_BATERIA'].includes(estadoDron);
        }).length;

        document.getElementById('stat-total').innerText = total;
        document.getElementById('stat-disponibles').innerText = disponibles;
        document.getElementById('stat-mision').innerText = enMision;
        document.getElementById('stat-alerta').innerText = criticos;
    }

    App.vistas = App.vistas || {};
    App.vistas.estadisticas = { actualizarEstadisticas };
})(window.App);