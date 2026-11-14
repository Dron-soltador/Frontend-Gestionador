window.App = window.App || {};

window.App.config = Object.freeze({
    API_DRONES_URL: 'http://localhost:5001/drones',
    API_DESPACHADOR_BASE: 'http://localhost:5002',
    API_PEDIDOS_REMOTA: 'http://192.168.220.109:3001/api/v1/pedidos',
    SEGUNDOS_PARA_OCULTAR: 5,
    DESCARGA_BATERIA_POR_ENTREGA: 5,
    BATERIA_MINIMA_DESPACHO: 20,
    INTERVALO_RECARGA_MS: 5000
});