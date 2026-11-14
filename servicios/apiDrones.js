window.App = window.App || {};

(function (App) {
    'use strict';

    const { API_DRONES_URL } = App.config;

    async function obtenerDrones() {
        const res = await fetch(API_DRONES_URL);
        if (!res.ok) {
            return { ok: false, datos: [] };
        }
        const data = await res.json();
        return { ok: true, datos: Array.isArray(data) ? data : (data.data || []) };
    }

    function registrarDron(payload) {
        return fetch(API_DRONES_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    function actualizarTelemetriaDron(id, payload) {
        return fetch(`${API_DRONES_URL}/${id}/telemetria`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    App.servicios.apiDrones = {
        obtenerDrones,
        registrarDron,
        actualizarTelemetriaDron
    };
})(window.App);