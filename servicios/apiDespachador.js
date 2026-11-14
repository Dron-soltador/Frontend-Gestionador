window.App = window.App || {};

(function (App) {
    'use strict';

    const { API_DESPACHADOR_BASE, API_PEDIDOS_REMOTA } = App.config;

    async function obtenerPedidosRemotos() {
        const res = await fetch(`${API_PEDIDOS_REMOTA}/para-despachador`);
        if (!res.ok) {
            return { ok: false, datos: [] };
        }
        const data = await res.json();
        return { ok: true, datos: Array.isArray(data) ? data : (data.data || []) };
    }

    async function obtenerPedidosActivos() {
        const res = await fetch(`${API_DESPACHADOR_BASE}/pedidos-activos`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        return {
            ok: true,
            datos: Array.isArray(data) ? data : (data.data || data.pedidos || [])
        };
    }

    async function llamarDespachador(ruta, metodo = 'PUT', body = null) {
        const opciones = {
            method: metodo,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
            opciones.body = JSON.stringify(body);
        }
        const res = await fetch(`${API_DESPACHADOR_BASE}${ruta}`, opciones);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json().catch(() => ({}));
    }

    App.servicios.apiDespachador = {
        obtenerPedidosRemotos,
        obtenerPedidosActivos,
        llamarDespachador
    };
})(window.App);