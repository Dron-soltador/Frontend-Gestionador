window.App = window.App || {};

(function (App) {
    'use strict';

    function actualizarIndicadorConexion(exitoso) {
        const statusElem = document.getElementById('connection-status');
        if (!statusElem) return;

        if (exitoso) {
            statusElem.className = 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            statusElem.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping"></span> Conectado a APIs (5000/5001)';
        } else {
            statusElem.className = 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20';
            statusElem.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 mr-2"></span> Modo Simulación / API Offline';
        }
    }

    App.vistas = App.vistas || {};
    App.vistas.conexion = { actualizarIndicadorConexion };
})(window.App);