'use strict';

// Solo se guardan identificadores y cantidades; los precios vienen de productos.js.
const Carrito = (() => {
    const clave = 'robotech.carrito';
    const limite = 99;
    function leer() {
        try {
            const datos = JSON.parse(localStorage.getItem(clave) || '[]');
            if (!Array.isArray(datos)) return [];
            const items = new Map();
            datos.forEach(item => {
                if (!item || !productos.some(p => p.id === item.id) || !Number.isInteger(item.cantidad) || item.cantidad < 1) return;
                items.set(item.id, Math.min(limite, (items.get(item.id) || 0) + item.cantidad));
            });
            return Array.from(items, ([id, cantidad]) => ({ id, cantidad }));
        } catch { return []; }
    }
    function guardar(items) {
        try { localStorage.setItem(clave, JSON.stringify(items)); }
        catch { return { ok: false, mensaje: 'No se pudo guardar el carrito. Habilita el almacenamiento del navegador e intenta nuevamente.' }; }
        actualizar();
        return { ok: true };
    }
    function agregar(id) {
        if (!productos.some(p => p.id === id)) return { ok: false, mensaje: 'Producto no encontrado.' };
        const items = leer();
        const item = items.find(p => p.id === id);
        if (item && item.cantidad >= limite) return { ok: false, mensaje: 'El máximo por kit es de 99 unidades.' };
        if (item) item.cantidad += 1;
        else items.push({ id, cantidad: 1 });
        const resultado = guardar(items);
        if (resultado.ok) mostrarModal();
        return resultado;
    }
    function cambiarCantidad(id, cantidad) {
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > limite) return { ok: false, mensaje: 'Ingresa una cantidad entera entre 1 y 99.' };
        return guardar(leer().map(item => item.id === id ? { id, cantidad } : item));
    }
    function eliminar(id) { return guardar(leer().filter(item => item.id !== id)); }
    function vaciar() { return guardar([]); }
    function elemento(tag, clase, texto) {
        const nodo = document.createElement(tag);
        nodo.className = clase;
        if (texto !== undefined) nodo.textContent = texto;
        return nodo;
    }
    function precio(valor) {
        return '$ ' + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(valor);
    }
    function avisar(resultado, mensaje) {
        const estado = document.querySelector('#estadoCarrito');
        if (estado) estado.textContent = resultado.ok ? mensaje : resultado.mensaje;
    }
    function resumen(items) {
        return {
            total: items.reduce((suma, item) => suma + (productos.find(p => p.id === item.id).precio || 0) * item.cantidad, 0),
            pendientes: items.some(item => !Number.isFinite(productos.find(p => p.id === item.id).precio))
        };
    }
    function crearModal() {
        const modal = elemento('div', 'modal fade robotech-modal');
        modal.id = 'modalCarrito';
        modal.tabIndex = -1;
        modal.setAttribute('aria-labelledby', 'tituloModalCarrito');
        modal.setAttribute('aria-hidden', 'true');
        // Marcado fijo; los datos del carrito se insertan con textContent.
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="tituloModalCarrito" class="modal-title h4">Tu carrito</h2>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar carrito"></button>
                    </div>
                    <div class="modal-body">
                        <p id="modalCarritoVacio">Tu carrito está vacío. Explora el catálogo y elige tu próximo kit.</p>
                        <ul id="modalCarritoItems" class="list-unstyled d-grid gap-3 mb-0"></ul>
                        <p id="modalCarritoTotal" class="fs-5 fw-bold mt-4 mb-0"></p>
                        <p id="modalCarritoPendientes" class="small mt-2" hidden>Hay kits con precio por confirmar. El importe mostrado no es el total final.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Seguir explorando</button>
                        <a href="carrito.html" class="btn btn-robotech">Ver carrito y finalizar compra</a>
                    </div>
                </div>
            </div>`;
        document.body.append(modal);
        document.querySelectorAll('.cart-link').forEach(enlace => {
            enlace.setAttribute('data-bs-toggle', 'modal');
            enlace.setAttribute('data-bs-target', '#modalCarrito');
            enlace.setAttribute('aria-haspopup', 'dialog');
        });
        modal.addEventListener('show.bs.modal', actualizar);
    }
    function mostrarModal() {
        const modal = document.querySelector('#modalCarrito');
        if (!modal || !window.bootstrap?.Modal) return;
        const origen = document.activeElement;
        modal.addEventListener('hidden.bs.modal', () => {
            if (origen?.isConnected) origen.focus();
        }, { once: true });
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
    function renderizarModal(items) {
        const lista = document.querySelector('#modalCarritoItems');
        if (!lista) return;
        lista.replaceChildren();
        items.forEach(item => {
            const producto = productos.find(p => p.id === item.id);
            const fila = elemento('li', 'carrito-modal-item');
            const imagen = elemento('img', 'carrito-modal-imagen');
            imagen.src = producto.imagen;
            imagen.alt = '';
            const info = elemento('div', 'carrito-modal-info');
            info.append(elemento('h3', 'h6 mb-1', producto.nombre),
                elemento('p', 'small mb-0', 'Cantidad: ' + item.cantidad + ' · ' + (Number.isFinite(producto.precio) ? precio(producto.precio) + ' c/u' : 'Precio por confirmar')));
            fila.append(imagen, info, elemento('strong', '', Number.isFinite(producto.precio) ? precio(producto.precio * item.cantidad) : 'A confirmar'));
            lista.append(fila);
        });
        const { total, pendientes } = resumen(items);
        document.querySelector('#modalCarritoVacio').hidden = !!items.length;
        document.querySelector('#modalCarritoTotal').hidden = !items.length;
        document.querySelector('#modalCarritoTotal').textContent = (pendientes ? 'Subtotal confirmado: ' : 'Total: ') + precio(total) + ' UYU';
        document.querySelector('#modalCarritoPendientes').hidden = !pendientes;
    }
    function actualizarCheckout(items) {
        const seccion = document.querySelector('#finalizarCompra');
        if (!seccion) return;
        const { total, pendientes } = resumen(items);
        seccion.hidden = !items.length;
        document.querySelector('#totalCheckout').textContent = (pendientes ? 'Subtotal confirmado: ' : 'Total a pagar: ') + precio(total) + ' UYU';
        document.querySelector('#btnFinalizarCompra').disabled = !items.length || pendientes;
        document.querySelector('#ayudaCheckout').textContent = pendientes
            ? 'Para finalizar la compra, primero deben confirmarse los precios de todos los kits.'
            : 'Compra de demostración: no se procesarán pagos ni se enviará un pedido.';
        document.querySelector('#estadoCompra').textContent = '';
    }
    function renderizar(items) {
        const lista = document.querySelector('#itemsCarrito');
        if (!lista) return;
        lista.replaceChildren();
        let total = 0;
        let pendientes = false;
        items.forEach(item => {
            const producto = productos.find(p => p.id === item.id);
            const fila = elemento('section', 'carrito-item');
            const imagen = elemento('img', 'carrito-imagen');
            imagen.src = producto.imagen;
            imagen.alt = producto.nombre;
            const info = elemento('div', 'carrito-info');
            const titulo = elemento('h2', 'h5');
            const enlace = elemento('a', '', producto.nombre);
            enlace.href = 'producto.html?' + new URLSearchParams({ id: item.id });
            titulo.append(enlace);
            const conocido = Number.isFinite(producto.precio);
            if (conocido) total += producto.precio * item.cantidad;
            else pendientes = true;
            info.append(titulo, elemento('p', 'mb-2', conocido ? 'Precio unitario: ' + precio(producto.precio) : 'Precio por confirmar'));
            const controles = elemento('div', 'd-flex flex-wrap align-items-center gap-2');
            const label = elemento('label', '', 'Cantidad');
            const cantidad = elemento('input', 'form-control carrito-cantidad');
            cantidad.type = 'number'; cantidad.min = '1'; cantidad.max = String(limite); cantidad.step = '1';
            cantidad.value = item.cantidad;
            cantidad.id = 'cantidad-' + item.id; label.htmlFor = cantidad.id;
            cantidad.setAttribute('aria-label', 'Cantidad de ' + producto.nombre);
            cantidad.addEventListener('change', () => {
                const resultado = cambiarCantidad(item.id, Number(cantidad.value));
                if (!resultado.ok) cantidad.value = item.cantidad;
                avisar(resultado, 'Cantidad actualizada.');
                if (resultado.ok) document.getElementById('cantidad-' + item.id)?.focus();
            });
            const quitar = elemento('button', 'btn btn-robotech', 'Eliminar');
            quitar.type = 'button';
            quitar.setAttribute('aria-label', 'Eliminar ' + producto.nombre);
            quitar.addEventListener('click', () => {
                const resultado = eliminar(item.id);
                avisar(resultado, producto.nombre + ' eliminado.');
                if (resultado.ok) (lista.querySelector('button') || document.querySelector('#seguirComprando')).focus();
            });
            controles.append(label, cantidad, quitar);
            info.append(controles);
            fila.append(imagen, info, elemento('strong', '', conocido ? 'Subtotal: ' + precio(producto.precio * item.cantidad) : 'Consultar precio'));
            lista.append(fila);
        });
        document.querySelector('#carritoVacio').hidden = items.length > 0;
        document.querySelector('#resumenCarrito').hidden = !items.length;
        document.querySelector('#totalCarrito').textContent = (pendientes ? 'Subtotal con precio confirmado: ' : 'Total: ') + precio(total);
        document.querySelector('#preciosPendientes').hidden = !pendientes;
    }
    function actualizar() {
        const items = leer();
        const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);
        document.querySelectorAll('.carrito-contador').forEach(nodo => nodo.textContent = unidades);
        document.querySelectorAll('.cart-link').forEach(nodo => nodo.setAttribute('aria-label', `Ver carrito de compras (${unidades} unidades)`));
        renderizar(items);
        renderizarModal(items);
        actualizarCheckout(items);
    }
    document.addEventListener('DOMContentLoaded', () => {
        crearModal();
        actualizar();
        document.querySelector('#formFinalizarCompra')?.addEventListener('submit', evento => {
            evento.preventDefault();
            const items = leer();
            const { total, pendientes } = resumen(items);
            actualizar();
            if (!items.length || pendientes) return;
            document.querySelector('#estadoCompra').textContent = 'Resumen confirmado: ' + precio(total) + ' UYU con eBROU. Esta es una demostración; no se realizó ningún pago ni se envió un pedido. Tus productos permanecen en el carrito.';
        });
        document.querySelector('#vaciarCarrito')?.addEventListener('click', () => {
            const resultado = vaciar();
            avisar(resultado, 'Carrito vaciado.');
            if (resultado.ok) document.querySelector('#seguirComprando').focus();
        });
    });
    window.addEventListener('storage', evento => { if (evento.key === clave || evento.key === null) actualizar(); });
    window.addEventListener('pageshow', actualizar);
    return { leer, agregar, cambiarCantidad, eliminar, vaciar, actualizar };
})();
