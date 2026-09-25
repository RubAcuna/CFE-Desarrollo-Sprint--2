// Ficha individual: usa el id de la URL para consultar y mostrar un producto de Firestore.
'use strict';

// Ejemplo: producto.html?id=arduino. La URL solo identifica el kit;
// los datos se consultan en Firestore.
// Extrae y limpia el parámetro id de la URL; devuelve null cuando no se indicó un producto.
function obtenerIdProducto(busqueda = window.location.search) {
    return new URLSearchParams(busqueda).get('id')?.trim() || null;
}

// Busca una referencia en el arreglo en memoria; esta función no consulta Firestore.
function buscarProductoPorId(id, lista = productos) {
    return lista.find(producto => producto.id === id) || null;
}

// Presenta el precio con formato uruguayo o indica que debe consultarse si falta el valor.
function formatearPrecioProducto(precio) {
    return precio === null || precio === undefined
        ? 'Consultar precio'
        : '$ ' + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(precio);
}

// Construye los elementos y asigna el texto sin interpretar HTML de los datos.
// Crea un nodo con clase y texto. textContent evita interpretar como HTML la información recibida.
function crearElementoProducto(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

// Distingue entre URL sin id y producto inexistente, y orienta al usuario hacia el catálogo.
function mostrarErrorProducto(contenedor, faltaId) {
    const mensaje = crearElementoProducto('section', 'alert alert-info');
    mensaje.append(
        crearElementoProducto('h1', 'h3', faltaId ? 'Selecciona un kit' : 'Producto no encontrado'),
        crearElementoProducto('p', 'mb-0', faltaId
            ? 'Visita el catálogo y elige un kit para conocer sus detalles.'
            : 'El enlace no corresponde a un kit del catálogo. Vuelve al catálogo para elegir otro.')
    );
    contenedor.replaceChildren(mensaje);
    document.title = 'Robotech | ' + (faltaId ? 'Selecciona un kit' : 'Producto no encontrado');
}

// Construye la ficha con imágenes, descripción, precio y características; conecta los controles de stock y carrito.
function mostrarDetalleProducto(producto, contenedor) {
    const ficha = crearElementoProducto('section', 'row g-4 align-items-center');
    ficha.setAttribute('aria-labelledby', 'nombreProducto');
    const columnaImagen = crearElementoProducto('div', 'col-md-6');
    const imagen = crearElementoProducto('img', 'img-fluid rounded');
    imagen.src = producto.imagen;
    imagen.alt = producto.nombre;
    columnaImagen.append(imagen);
    producto.imagenes.slice(1).forEach((url, indice) => {
        const adicional = crearElementoProducto('img', 'img-fluid rounded mt-3');
        adicional.src = url;
        adicional.alt = producto.nombre + ' — imagen ' + (indice + 2);
        adicional.loading = 'lazy';
        columnaImagen.append(adicional);
    });

    const informacion = crearElementoProducto('div', 'col-md-6');
    const nombre = crearElementoProducto('h1', 'mb-3', producto.nombre);
    nombre.id = 'nombreProducto';
    informacion.append(
        crearElementoProducto('p', 'eyebrow', producto.categoria),
        nombre,
        crearElementoProducto('p', 'lead', producto.descripcion),
        crearElementoProducto('p', 'small text-secondary', 'Referencia: ' + producto.id),
        crearElementoProducto('h2', 'h5 mt-4', 'Precio'),
        crearElementoProducto('p', 'fs-3 fw-bold', formatearPrecioProducto(producto.precio))
    );

    // Características almacenadas en el documento de Firestore.
    if (Array.isArray(producto.caracteristicas) && producto.caracteristicas.length) {
        const lista = crearElementoProducto('ul');
        producto.caracteristicas.forEach(texto => lista.append(crearElementoProducto('li', '', texto)));
        informacion.append(crearElementoProducto('h2', 'h5 mt-4', 'Características'), lista);
    }
    const agregar = crearElementoProducto('button', 'btn btn-robotech mt-3', 'Agregar al carrito');
    agregar.type = 'button';
    agregar.id = 'agregarAlCarrito';
    const reintentarStock = crearElementoProducto('button', 'btn btn-robotech mt-3', 'Reintentar disponibilidad');
    reintentarStock.type = 'button';
    reintentarStock.hidden = true;
    const disponibilidad = crearElementoProducto('p', 'fw-semibold mt-3');
    disponibilidad.setAttribute('aria-live', 'polite');
    // Recalcula las unidades restantes y deshabilita la compra si faltan datos verificados o stock; muestra el reintento cuando falla la carga.
    function actualizarDisponibilidad() {
        const stock = Carrito.stockDisponible(producto.id);
        const vigente = buscarProductoPorId(producto.id);
        disponibilidad.textContent = Productos.estado !== 'listo'
            ? 'Disponibilidad pendiente de verificar.' : describirDisponibilidad(vigente, stock);
        agregar.disabled = Productos.estado !== 'listo' || stock === 0;
        reintentarStock.hidden = Productos.estado !== 'error';
    }
    actualizarDisponibilidad();
    document.addEventListener('carrito:actualizado', actualizarDisponibilidad);
    informacion.append(disponibilidad);
    const estado = crearElementoProducto('p', 'mt-3');
    estado.setAttribute('role', 'status');
    estado.setAttribute('aria-live', 'polite');
    // Espera la validación remota de Carrito.agregar antes de anunciar éxito.
    agregar.addEventListener('click', async () => {
        agregar.disabled = true;
        estado.textContent = 'Verificando stock…';
        const resultado = await Carrito.agregar(producto.id);
        actualizarDisponibilidad();
        estado.textContent = resultado.ok ? producto.nombre + ' agregado al carrito.' : resultado.mensaje;
    });
    reintentarStock.addEventListener('click', async () => {
        estado.textContent = 'Verificando disponibilidad…';
        try {
            await Productos.cargar({ forzar: true });
            estado.textContent = 'Disponibilidad actualizada.';
        } catch {
            estado.textContent = 'No se pudo verificar el stock. Intenta nuevamente.';
        }
        actualizarDisponibilidad();
    });
    informacion.append(agregar, reintentarStock, estado);
    ficha.append(columnaImagen, informacion);
    contenedor.replaceChildren(ficha);
    document.title = 'Robotech | ' + producto.nombre;
}

// Coordina la consulta por id y los estados de carga, producto no encontrado y error con botón de reintento.
async function inicializarProducto() {
    const contenedor = document.querySelector('#detalleProducto');
    if (!contenedor) return;
    const id = obtenerIdProducto();
    if (!id) { mostrarErrorProducto(contenedor, true); return; }
    contenedor.replaceChildren(crearElementoProducto('p', '', 'Cargando producto…'));
    try {
        const producto = await Productos.obtener(id);
        if (!producto) { mostrarErrorProducto(contenedor, false); return; }
        mostrarDetalleProducto(producto, contenedor);
    } catch {
        const aviso = crearElementoProducto('p', 'alert alert-warning', 'No se pudo consultar el producto. Revisa tu conexión e intenta nuevamente.');
        aviso.setAttribute('role', 'alert');
        const reintentar = crearElementoProducto('button', 'btn btn-robotech', 'Reintentar');
        reintentar.type = 'button';
        reintentar.addEventListener('click', inicializarProducto);
        contenedor.replaceChildren(aviso, reintentar);
    }
}

// Espera a que el HTML esté disponible antes de localizar controles y conectar sus eventos.
document.addEventListener('DOMContentLoaded', inicializarProducto);
