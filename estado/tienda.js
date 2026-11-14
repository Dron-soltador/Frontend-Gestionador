window.App = window.App || {};

(function (App) {
    'use strict';

    const persistencia = App.servicios.almacenamiento.cargarPersistencia();

    const mockDrones = [
        { id: 1, modelo: 'DJI Matrice 300 RTK', capacidad_maxima_kg: 2.7, bateria: 85, estado: 'DISPONIBLE' },
        { id: 2, modelo: 'Flycart 30 Heavy', capacidad_maxima_kg: 30.0, bateria: 100, estado: 'DISPONIBLE' },
        { id: 3, modelo: 'Mavic 3 Enterprise', capacidad_maxima_kg: 0.9, bateria: 62, estado: 'DISPONIBLE' }
    ];

    const estado = {
        drones: [...mockDrones],
        pedidos: [],
        filtro: 'TODOS',
        entregadosRecientes: new Map(),
        dronesAgregados: persistencia.dronesAgregados,
        dronesModificados: persistencia.dronesModificados,
        pedidosModificados: persistencia.pedidosModificados,
        entregados: persistencia.entregados
    };

    App.estado = App.estado || {};
    App.estado.tienda = { estado, mockDrones };
})(window.App);