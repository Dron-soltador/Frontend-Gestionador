window.App = window.App || {};

(function (App) {
    'use strict';

    const { estado } = App.estado.tienda;
    const { DESCARGA_BATERIA_POR_ENTREGA, SEGUNDOS_PARA_OCULTAR } = App.config;
    const { guardarPersistencia, guardarEntregados } = App.servicios.almacenamiento;
    const { llamarDespachador } = App.servicios.apiDespachador;
    const { actualizarTelemetriaDron } = App.servicios.apiDrones;
    const { mostrarAlerta, ocultarAlerta } = App.vistas.alertas;
    const { actualizarEstadisticas } = App.vistas.estadisticas;
    const { renderizarGrillaDrones } = App.vistas.grillaDrones;
    const { renderizarTablaPedidos } = App.vistas.tablaPedidos;

    function programarOcultarPedido(pedido) {
        const id = Number(pedido.id);
        const previo = estado.entregadosRecientes.get(id);
        if (previo) clearTimeout(previo.timeoutId);

        const timeoutId = setTimeout(() => {
            estado.entregadosRecientes.delete(id);
            estado.pedidos = estado.pedidos.filter(p => Number(p.id) !== id);
            delete estado.pedidosModificados[id];
            guardarPersistencia(estado);
            renderizarTablaPedidos();
        }, SEGUNDOS_PARA_OCULTAR * 1000);

        estado.entregadosRecientes.set(id, {
            pedido: { ...pedido, estado: 'ENTREGADO' },
            timeoutId
        });
    }

    function liberarDron(pedido) {
        let dronLiberado = estado.drones.find(d => Number(d.id) === Number(pedido.dron_id));
        if (!dronLiberado) {
            dronLiberado = estado.drones.find(d => (d.estado || '').toUpperCase() === 'EN_MISION');
        }
        if (!dronLiberado) return { dronLiberado: null, mensajeBateria: '' };

        const bateriaAntes = Number(dronLiberado.bateria ?? 100);
        const bateriaDespues = Math.max(0, bateriaAntes - DESCARGA_BATERIA_POR_ENTREGA);

        dronLiberado.estado = 'DISPONIBLE';
        dronLiberado.bateria = bateriaDespues;

        estado.dronesModificados[dronLiberado.id] = {
            estado: 'DISPONIBLE',
            bateria: bateriaDespues
        };

        return {
            dronLiberado,
            mensajeBateria: ` Dron #${dronLiberado.id} liberado (batería ${bateriaAntes}% → ${bateriaDespues}%).`
        };
    }

    async function confirmarEntrega(pedidoId) {
        const pedido = estado.pedidos.find(p => Number(p.id) === Number(pedidoId));
        if (!pedido) return;

        ocultarAlerta();

        try {
            await llamarDespachador(`/pedidos/${pedidoId}/entregar`);
        } catch (error) {
            mostrarAlerta('error', `[ERROR] No se pudo marcar el pedido #PED-${pedidoId} como ENTREGADO: ${error.message}`);
            return;
        }

        pedido.estado = 'ENTREGADO';

        estado.entregados.add(Number(pedidoId));
        guardarEntregados(estado.entregados);

        const { dronLiberado, mensajeBateria } = liberarDron(pedido);

        programarOcultarPedido(pedido);
        guardarPersistencia(estado);

        actualizarEstadisticas();
        renderizarGrillaDrones();
        renderizarTablaPedidos();

        mostrarAlerta('éxito', `[ENTREGA CONFIRMADA] Pedido #PED-${pedidoId}.${mensajeBateria}`);

        if (dronLiberado) {
            try {
                await actualizarTelemetriaDron(dronLiberado.id, {
                    estado: 'DISPONIBLE',
                    bateria: dronLiberado.bateria
                });
            } catch (error) {
                console.warn('Servicio de drones offline (liberación)', error);
            }
        }
    }

    App.vistas = App.vistas || {};
    App.vistas.entrega = { confirmarEntrega };
})(window.App);