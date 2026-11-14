window.App = window.App || {};

(function (App) {
    'use strict';

    function mostrarAlerta(tipo, mensaje) {
        const container = document.getElementById('alert-container');
        if (!container) return;

        const esError = tipo === 'error';
        const bg = esError
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
        const icono = esError
            ? 'fa-triangle-exclamation text-rose-400'
            : 'fa-circle-check text-emerald-400';

        container.className = `p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 flex items-start justify-between ${bg}`;
        container.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="fa-solid ${icono} text-xl mt-0.5"></i>
                <div>
                    <h4 class="font-bold text-sm tracking-wide mb-0.5">${esError ? 'Solicitud Rechazada' : 'Operación Exitosa'}</h4>
                    <p class="text-xs font-mono leading-relaxed">${mensaje}</p>
                </div>
            </div>
            <button onclick="window.ocultarAlerta()" class="text-slate-400 hover:text-white ml-4">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        `;
        container.classList.remove('hidden');
    }

    function ocultarAlerta() {
        const container = document.getElementById('alert-container');
        if (container) container.classList.add('hidden');
    }

    App.vistas = App.vistas || {};
    App.vistas.alertas = { mostrarAlerta, ocultarAlerta };
})(window.App);