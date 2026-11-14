window.App = window.App || {};

(function (App) {
    'use strict';

    const { estado } = App.estado.tienda;
    const { obtenerPedidosRemotos, obtenerPedidosActivos } = App.servicios.apiDespachador;

    function esPedidoVisible(id, idsOcultos) {
        return !idsOcultos.has(id) && !estado.entregados.has(id);
    }

    function normalizarPedido(pedido, previo) {
        const id = Number(pedido.id);
        return {
            ...previo,
            ...pedido,
            id,
            cliente: pedido.cliente || previo.cliente || 'Cliente General',
            peso_kg: parseFloat(pedido.peso_kg ?? previo.peso_kg ?? 0),
            estado: (pedido.estado || previo.estado || 'PENDIENTE').toUpperCase(),
            dron_id: pedido.dron_id ?? previo.dron_id ?? estado.pedidosModificados[id]?.dron_id ?? null
        };
    }

    function fusionarPedidos(lista) {
        const idsOcultos = new Set(estado.entregadosRecientes.keys());
        const porId = new Map(estado.pedidos.map(pedido => [Number(pedido.id), pedido]));

        lista.forEach(pedido => {
            const id = Number(pedido.id);
            if (!esPedidoVisible(id, idsOcultos)) return;
            porId.set(id, normalizarPedido(pedido, porId.get(id) || {}));
        });

        estado.pedidos = [...porId.values()];
    }

    async function cargarPedidosRemotos() {
        try {
            const { ok, datos } = await obtenerPedidosRemotos();
            if (!ok) return false;
            fusionarPedidos(datos);
            return true;
        } catch (error) {
            console.warn('API remota de pedidos offline, se conserva la última lista', error);
            return false;
        }
    }

    async function cargarPedidosActivos() {
        try {
            const { datos } = await obtenerPedidosActivos();
            fusionarPedidos(datos);
            return true;
        } catch (error) {
            console.warn('Despachador offline, se conserva la última lista', error);
            return false;
        }
    }

    App.servicios.pedidos = {
        cargarPedidosRemotos,
        cargarPedidosActivos
    };
})(window.App);