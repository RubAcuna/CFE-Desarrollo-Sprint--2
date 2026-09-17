'use strict';
document.addEventListener('DOMContentLoaded', () => {
    const pagina = document.body.dataset.page;
    document.querySelectorAll('.nav-link[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === pagina));
    document.querySelector('#btnProjectInfo')?.addEventListener('click', () => bootstrap.Modal.getOrCreateInstance(document.querySelector('#projectInfoModal')).show());
});
