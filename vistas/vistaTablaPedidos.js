window.App = window.App || {};

(function (App) {
    'use strict';

    const { estado } = App.estado.tienda;

    function crearAccion(estadoPedido, pedidoId) {
        if (estadoPedido === 'PENDIENTE') {
            return `
                <button onclick="window.abrirModalAsignar(${pedidoId})" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 ml-auto cursor-pointer">
                    <i class="fa-solid fa-paper-plane"></i> Elegir Dron
                </button>
            `;
        }
        if (estadoPedido === 'EN_CAMINO') {
            return `
                <button onclick="window.confirmarEntrega(${pedidoId})" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1.5 ml-auto cursor-pointer animate-pulse">
                    <i class="fa-solid fa-circle-check"></i> Confirmar Entrega
                </button>
            `;
        }
        return '<span class="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1"><i class="fa-solid fa-check"></i> Entregado</span>';
    }

    function calcularBadgeEstado(estadoPedido) {
        if (estadoPedido === 'EN_CAMINO') {
            return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        }
        if (estadoPedido === 'ENTREGADO') {
            return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        }
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }

    function renderizarTablaPedidos() {
        const tbody = document.getElementById('tabla-pedidos-body');
        const badgeCount = document.getElementById('stat-pedidos-pendientes');
        if (!tbody) return;

        tbody.innerHTML = '';

        const idsRecientes = new Set(estado.entregadosRecientes.keys());
        const listaPedidos = [
            ...estado.pedidos.filter(p => !idsRecientes.has(Number(p.id))),
            ...[...estado.entregadosRecientes.values()].map(entregado => entregado.pedido)
        ].sort((a, b) => Number(a.id) - Number(b.id));

        const activos = listaPedidos.filter(p => ['PENDIENTE', 'EN_CAMINO'].includes((p.estado || '').toUpperCase()));
        if (badgeCount) badgeCount.innerText = `${activos.length} Activos`;

        if (listaPedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-500">No hay pedidos para despachar.</td></tr>';
            return;
        }

        listaPedidos.forEach(pedido => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-800/50 transition-colors';

            const estadoPedido = (pedido.estado || '').toUpperCase();
            const estadoBadge = calcularBadgeEstado(estadoPedido);
            const dronTexto = pedido.dron_id ? `Dron #${pedido.dron_id}` : '-';
            const accionHTML = crearAccion(estadoPedido, pedido.id);

            tr.innerHTML = `
                <td class="py-3 px-4 font-mono font-bold text-slate-300">#PED-${pedido.id}</td>
                <td class="py-3 px-4 font-semibold text-white">${pedido.cliente || 'Cliente General'}</td>
                <td class="py-3 px-4 font-bold text-blue-400">${pedido.peso_kg} kg</td>
                <td class="py-3 px-4 font-bold text-slate-300">${dronTexto}</td>
                <td class="py-3 px-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${estadoBadge}">
                        ${estadoPedido}
                    </span>
                </td>
                <td class="py-3 px-4 text-right">
                    ${accionHTML}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    App.vistas = App.vistas || {};
    App.vistas.tablaPedidos = { renderizarTablaPedidos };
})(window.App);