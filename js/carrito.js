// Carrito local: guarda referencias y cantidades, y obtiene precios y stock desde Firestore.
// Flujo de compra: agregar ->consultar inventario -> validar -> guardar -> actualizar pantalla.
// El carrito de este navegador no representa una reserva global de inventario.
'use strict';

// Solo se guardan identificadores y cantidades; los precios y existencias se consultan en Firestore.
const Carrito = (() => {
    const clave = 'robotech.carrito';
    const limite = 99;
    // Limita cada kit al menor valor entre su stock disponible y el tope de 99 unidades.
    function maximoProducto(producto) { return Math.min(limite, obtenerStockDisponible(producto)); }
    // Recupera el carrito de localStorage, une referencias repetidas y filtra o limita cantidades según el inventario en memoria. No escribe en el almacenamiento.
    function leer() {
        try {
            const datos = JSON.parse(localStorage.getItem(clave) || '[]');
            if (!Array.isArray(datos)) return [];
            const items = new Map();
            datos.forEach(item => {
                const producto = productos.find(p => p.id === item?.id);
                const maximo = maximoProducto(producto);
                if (!maximo || !Number.isSafeInteger(item.cantidad) || item.cantidad < 1) return;
                items.set(item.id, Math.min(maximo, (items.get(item.id) || 0) + Math.min(maximo, item.cantidad)));
            });
            return Array.from(items, ([id, cantidad]) => ({ id, cantidad }));
        } catch { return []; }
    }
    // Disponibilidad : stock en Firestore .
    // Esto no  modifica el stock en Firestore. soolo lo haré cuando la compra finalice 
   
    // Resta del stock base las unidades de este producto presentes en el carrito del navegador.
    function stockDisponible(id) {
        const producto = productos.find(p => p.id === id);
        const reservadas = leer().find(item => item.id === id)?.cantidad || 0;
        return Math.max(0, obtenerStockDisponible(producto) - reservadas);
    }
    // Persiste identificadores y cantidades y refresca la interfaz. Devuelve { ok, mensaje } si el navegador impide guardar.
    function guardar(items) {
        try { localStorage.setItem(clave, JSON.stringify(items)); }
        catch { return { ok: false, mensaje: 'No se pudo guardar el carrito. Intenta nuevamente.' }; }
        actualizar();
        return { ok: true };
    }
    // Con el inventario ya actualizado, valida el producto y el límite acumulado, suma una unidad y muestra el modal si pudo guardarla.
    function agregarValidado(id) {
        const producto = productos.find(p => p.id === id);
        if (!producto) return { ok: false, mensaje: 'Producto no encontrado.' };
        const maximo = maximoProducto(producto);
        if (!maximo) return { ok: false, mensaje: describirDisponibilidad(producto) + '.' };
        const items = leer();
        const item = items.find(p => p.id === id);
        if (item && item.cantidad >= maximo) return { ok: false, mensaje: 'Solo puedes agregar hasta ' + maximo + ' unidades de este kit.' };
        if (item) item.cantidad += 1;
        else items.push({ id, cantidad: 1 });
        const resultado = guardar(items);
        if (resultado.ok) mostrarModal();
        return resultado;
    }
    // Valida una cantidad entera, el stock y la presencia del producto en el carrito antes de guardar el nuevo valor.
    function cambiarCantidadValidada(id, cantidad) {
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > limite) return { ok: false, mensaje: 'Ingresa una cantidad entera entre 1 y 99.' };
        const producto = productos.find(p => p.id === id);
        if (!producto) return { ok: false, mensaje: 'Producto no encontrado.' };
        const maximo = maximoProducto(producto);
        if (!maximo) return { ok: false, mensaje: describirDisponibilidad(producto) + '.' };
        if (cantidad > maximo) return { ok: false, mensaje: 'Solo puedes agregar hasta ' + maximo + ' unidades de este kit.' };
        const items = leer();
        if (!items.some(item => item.id === id)) return { ok: false, mensaje: 'El producto no está en el carrito.' };
        return guardar(items.map(item => item.id === id ? { id, cantidad } : item));
    }
    let cola = Promise.resolve();
    // Ejecuta las modificaciones una detrás de otra para evitar conflictos por clics rápidos. Convierte errores en un resultado que la interfaz puede mostrar.
    function encolar(operacion) {
        const resultado = cola.then(operacion).catch(() => ({ ok: false,
            mensaje: 'No se pudo verificar el inventario. Revisa tu conexión e intenta nuevamente.' }));
        cola = resultado;
        return resultado;
    }
    // Operación pública asíncrona: consulta inventario fresco antes de validar y agregar una unidad.
    function agregar(id) {
        return encolar(async () => {
            await Productos.cargar({ forzar: true });
            return agregarValidado(id);
        });
    }
    // Operación pública asíncrona: consulta el stock vigente antes de aceptar la cantidad solicitada.
    function cambiarCantidad(id, cantidad) {
        return encolar(async () => {
            await Productos.cargar({ forzar: true });
            return cambiarCantidadValidada(id, cantidad);
        });
    }
    // Espera un catálogo válido y elimina la referencia del carrito, liberando su disponibilidad local.
    function eliminar(id) {
        return encolar(async () => {
            await Productos.cargar();
            return guardar(leer().filter(item => item.id !== id));
        });
    }
    // Encola el guardado de un carrito vacío; no modifica los documentos de productos en Firestore.
    function vaciar() { return encolar(() => guardar([])); }
    // Crea nodos para la interfaz del carrito e inserta los datos como texto, sin interpretar HTML.
    function elemento(tag, clase, texto) {
        const nodo = document.createElement(tag);
        nodo.className = clase;
        if (texto !== undefined) nodo.textContent = texto;
        return nodo;
    }
    // Formatea importes con separadores de la configuración regional de Uruguay.
    function precio(valor) {
        return '$ ' + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(valor);
    }
    // Muestra el mensaje de éxito o error de una operación en el estado accesible de la página del carrito.
    function avisar(resultado, mensaje) {
        const estado = document.querySelector('#estadoCarrito');
        if (estado) estado.textContent = resultado.ok ? mensaje : resultado.mensaje;
    }
    // Calcula el total usando precios del catálogo y detecta productos cuyo precio falta confirmar.
    function resumen(items) {
        return {
            total: items.reduce((suma, item) => suma + (productos.find(p => p.id === item.id).precio || 0) * item.cantidad, 0),
            pendientes: items.some(item => !Number.isFinite(productos.find(p => p.id === item.id).precio))
        };
    }
    // Crea una sola ventana de carrito por página y conecta los enlaces de la cabecera para abrirla.
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
                        <button id="reintentarInventarioModal" class="btn btn-robotech mb-3" type="button" hidden>Reintentar inventario</button>
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
        document.querySelector('#reintentarInventarioModal').addEventListener('click', () => Productos.cargar({ forzar: true }).catch(() => {}));
        modal.addEventListener('show.bs.modal', actualizar);
    }
    // Abre la ventana con Bootstrap y prepara el retorno del foco al control que la abrió.
    function mostrarModal() {
        const modal = document.querySelector('#modalCarrito');
        if (!modal || !window.bootstrap?.Modal) return;
        const origen = document.activeElement;
        modal.addEventListener('hidden.bs.modal', () => {
            if (origen?.isConnected) origen.focus();
        }, { once: true });
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
    // Reconstruye el resumen compacto de productos, cantidades y total dentro del modal.
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
    // Actualiza el total y habilita la confirmación solo si hay productos con precios conocidos; el checkout es una demostración.
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
    // Construye las filas de carrito.html y conecta los controles de cantidad y eliminación con las operaciones asíncronas.
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
            cantidad.type = 'number'; cantidad.min = '1'; cantidad.max = String(maximoProducto(producto)); cantidad.step = '1';
            cantidad.value = item.cantidad;
            cantidad.id = 'cantidad-' + item.id; label.htmlFor = cantidad.id;
            cantidad.setAttribute('aria-label', 'Cantidad de ' + producto.nombre);
            cantidad.addEventListener('change', async () => {
                cantidad.disabled = true;
                const resultado = await cambiarCantidad(item.id, Number(cantidad.value));
                if (!resultado.ok) cantidad.value = item.cantidad;
                avisar(resultado, 'Cantidad actualizada.');
                if (resultado.ok) document.getElementById('cantidad-' + item.id)?.focus();
            });
            const quitar = elemento('button', 'btn btn-robotech', 'Eliminar');
            quitar.type = 'button';
            quitar.setAttribute('aria-label', 'Eliminar ' + producto.nombre);
            quitar.addEventListener('click', async () => {
                quitar.disabled = true;
                const resultado = await eliminar(item.id);
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
    // Sincroniza contador, filas, modal y checkout. Durante carga o error oculta importes sin verificar, conserva el almacenamiento y emite carrito:actualizado.
    function actualizar() {
        const reintentarModal = document.querySelector('#reintentarInventarioModal');
        if (reintentarModal) reintentarModal.hidden = Productos.estado !== 'error';
        if (Productos.estado !== 'listo') {
            const mensaje = Productos.estado === 'error'
                ? 'No se pudo consultar el inventario. El carrito guardado se conserva. Reintenta la carga.'
                : 'Cargando inventario…';
            ['#estadoCarrito', '#modalCarritoVacio'].forEach(selector => {
                const nodo = document.querySelector(selector);
                if (nodo) { nodo.textContent = mensaje; nodo.hidden = false; }
            });
            ['#itemsCarrito', '#modalCarritoItems'].forEach(selector => document.querySelector(selector)?.replaceChildren());
            ['#carritoVacio', '#resumenCarrito', '#finalizarCompra', '#modalCarritoTotal', '#modalCarritoPendientes'].forEach(selector => {
                const nodo = document.querySelector(selector);
                if (nodo) nodo.hidden = true;
            });
            const reintentar = document.querySelector('#reintentarInventario');
            if (reintentar) reintentar.hidden = Productos.estado !== 'error';
            document.dispatchEvent(new Event('carrito:actualizado'));
            return;
        }
        const reintentar = document.querySelector('#reintentarInventario');
        if (reintentar) reintentar.hidden = true;
        const estado = document.querySelector('#estadoCarrito');
        if (estado) estado.textContent = '';
        const vacio = document.querySelector('#modalCarritoVacio');
        if (vacio) vacio.textContent = 'Tu carrito está vacío. Explora el catálogo y elige tu próximo kit.';
        const items = leer();
        const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);
        document.querySelectorAll('.carrito-contador').forEach(nodo => nodo.textContent = unidades);
        document.querySelectorAll('.cart-link').forEach(nodo => nodo.setAttribute('aria-label', `Ver carrito de compras (${unidades} unidades)`));
        renderizar(items);
        renderizarModal(items);
        actualizarCheckout(items);
        document.dispatchEvent(new Event('carrito:actualizado'));
    }
    // Espera a que el HTML esté disponible antes de localizar controles y conectar sus eventos.
    document.addEventListener('DOMContentLoaded', () => {
        crearModal();
        const reintentar = elemento('button', 'btn btn-robotech mb-3', 'Reintentar carga del inventario');
        reintentar.id = 'reintentarInventario';
        reintentar.type = 'button';
        reintentar.hidden = true;
        document.querySelector('#estadoCarrito')?.after(reintentar);
        reintentar.addEventListener('click', () => Productos.cargar({ forzar: true }).catch(() => {}));
        document.addEventListener('productos:actualizados', actualizar);
        Productos.cargar().catch(() => {});
        actualizar();
        // Vuelve a consultar el inventario antes de confirmar el resumen de demostración; no cobra ni crea un pedido.
        document.querySelector('#formFinalizarCompra')?.addEventListener('submit', async evento => {
            evento.preventDefault();
            try { await Productos.cargar({ forzar: true }); } catch { return; }
            const items = leer();
            const { total, pendientes } = resumen(items);
            actualizar();
            if (!items.length || pendientes) return;
            document.querySelector('#estadoCompra').textContent = 'Resumen confirmado: ' + precio(total) + ' UYU con eBROU. Esta es una demostración; no se realizó ningún pago ni se envió un pedido. Tus productos permanecen en el carrito.';
        });
        document.querySelector('#vaciarCarrito')?.addEventListener('click', async () => {
            const resultado = await vaciar();
            avisar(resultado, 'Carrito vaciado.');
            if (resultado.ok) document.querySelector('#seguirComprando').focus();
        });
    });
    // Sincroniza otras pestañas del mismo origen cuando cambia el carrito almacenado.
    window.addEventListener('storage', evento => { if (evento.key === clave || evento.key === null) actualizar(); });
    window.addEventListener('pageshow', actualizar);
    return { leer, stockDisponible, agregar, cambiarCantidad, eliminar, vaciar, actualizar };
})();
