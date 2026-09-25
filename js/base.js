// Comportamiento compartido: marca la página actual en el menú y abre el modal de información.
'use strict';
// Espera a que el HTML esté disponible antes de localizar controles y conectar sus eventos.
document.addEventListener('DOMContentLoaded', () => {
    // Lee data-page del body para resaltar únicamente el enlace de esta página.
    const pagina = document.body.dataset.page;
    document.querySelectorAll('.nav-link[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === pagina));
    // El encadenamiento opcional permite reutilizar este archivo en páginas sin el botón de alcance.
    document.querySelector('#btnProjectInfo')?.addEventListener('click', () => bootstrap.Modal.getOrCreateInstance(document.querySelector('#projectInfoModal')).show());
});
