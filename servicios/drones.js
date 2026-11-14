window.App = window.App || {};

(function (App) {
    'use strict';

    const { estado, mockDrones } = App.estado.tienda;
    const { obtenerDrones } = App.servicios.apiDrones;

    function primerDefinido(valores, defecto) {
        const valor = valores.find(v => v !== undefined && v !== null);
        return valor === undefined ? defecto : valor;
    }

    function conModificacionesLocales(item) {
        const modificaciones = estado.dronesModificados[Number(item.id)];
        return modificaciones ? { ...item, ...modificaciones } : item;
    }

    function mapearDronLocal(drone) {
        return conModificacionesLocales({
            ...drone,
            id: Number(drone.id),
            bateria: Number(drone.bateria),
            capacidad_maxima_kg: Number(drone.capacidad_maxima_kg)
        });
    }

    function agregarDronLocal(lista, dronAgregado) {
        if (!lista.some(d => Number(d.id) === Number(dronAgregado.id))) {
            lista.push(conModificacionesLocales({ ...dronAgregado }));
        }
    }

    function aplicarCambiosLocalesDrones() {
        const lista = mockDrones.map(mapearDronLocal);
        estado.dronesAgregados.forEach(dron => agregarDronLocal(lista, dron));
        estado.drones = lista;
    }

    function normalizarDron(drone) {
        return conModificacionesLocales({
            ...drone,
            id: Number(drone.id),
            bateria: Number(primerDefinido([drone.bateria, drone.nivel_bateria, drone.battery], 85)),
            capacidad_maxima_kg: Number(primerDefinido(
                [drone.capacidad_maxima_kg, drone.capacidad_maxima, drone.capacidad],
                2.5
            ))
        });
    }

    function agregarDronesLocales(lista) {
        estado.dronesAgregados.forEach(dron => agregarDronLocal(lista, dron));
    }

    async function cargarDronesDesdeApi() {
        try {
            const { ok, datos } = await obtenerDrones();
            if (!ok) {
                aplicarCambiosLocalesDrones();
                return false;
            }
            if (datos.length > 0) {
                const listaMezclada = datos.map(normalizarDron);
                agregarDronesLocales(listaMezclada);
                estado.drones = listaMezclada;
            } else {
                aplicarCambiosLocalesDrones();
            }
            return true;
        } catch (error) {
            aplicarCambiosLocalesDrones();
            return false;
        }
    }

    App.servicios.drones = {
        cargarDronesDesdeApi,
        aplicarCambiosLocalesDrones
    };
})(window.App);