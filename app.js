window.App = window.App || {};

(function (App) {
    'use strict';

    const { mostrarAlerta, ocultarAlerta } = App.vistas.alertas;
    const { actualizarIndicadorConexion } = App.vistas.conexion;
    const { actualizarEstadisticas } = App.vistas.estadisticas;
    const { filtrarDrones, renderizarGrillaDrones } = App.vistas.grillaDrones;
    const { renderizarTablaPedidos } = App.vistas.tablaPedidos;
    const { abrirModalRegistrar, cerrarModalRegistrar, guardarNuevoDron } = App.vistas.modalRegistrar;
    const { abrirModalTelemetria, cerrarModalTelemetria, quickRecargarBateria, guardarTelemetria } = App.vistas.modalTelemetria;
    const { abrirModalAsignar, cerrarModalAsignar, confirmarAsignacion } = App.vistas.modalAsignar;
    const { confirmarEntrega } = App.vistas.entrega;

    const { cargarDronesDesdeApi } = App.servicios.drones;
    const { cargarPedidosRemotos, cargarPedidosActivos } = App.servicios.pedidos;

    async function cargarDrones() {
        const exitoso = await cargarDronesDesdeApi();
        actualizarIndicadorConexion(exitoso);
        actualizarEstadisticas();
        renderizarGrillaDrones();
    }

    async function cargarPedidosRemotosYRenderizar() {
        const actualizado = await cargarPedidosRemotos();
        if (actualizado) {
            renderizarTablaPedidos();
        }
    }

    async function cargarPedidos() {
        await cargarPedidosActivos();
        renderizarTablaPedidos();
    }

    async function cargarTodo() {
        await Promise.all([
            cargarDrones(),
            cargarPedidosRemotosYRenderizar(),
            cargarPedidos()
        ]);
    }

    window.cargarTodo = cargarTodo;
    window.cargarDrones = cargarDrones;
    window.cargarPedidos = cargarPedidos;
    window.filtrarDrones = filtrarDrones;
    window.mostrarAlerta = mostrarAlerta;
    window.ocultarAlerta = ocultarAlerta;

    window.abrirModalRegistrar = abrirModalRegistrar;
    window.cerrarModalRegistrar = cerrarModalRegistrar;
    window.guardarNuevoDron = evento => guardarNuevoDron(evento, cargarDrones);

    window.abrirModalTelemetria = abrirModalTelemetria;
    window.cerrarModalTelemetria = cerrarModalTelemetria;
    window.guardarTelemetria = evento => guardarTelemetria(evento, cargarDrones);
    window.quickRecargarBateria = evento => quickRecargarBateria(evento, cargarDrones);

    window.abrirModalAsignar = abrirModalAsignar;
    window.cerrarModalAsignar = cerrarModalAsignar;
    window.confirmarAsignacion = confirmarAsignacion;
    window.confirmarEntrega = confirmarEntrega;

    cargarTodo();
    setInterval(cargarTodo, App.config.INTERVALO_RECARGA_MS);
})(window.App);