'use strict';

// Ejemplo: producto.html?id=arduino. La URL solo identifica el kit;
// los datos siempre se obtienen del arreglo de productos.js.
function obtenerIdProducto(busqueda = window.location.search) {
    return new URLSearchParams(busqueda).get('id')?.trim() || null;
}

function buscarProductoPorId(id, lista = productos) {
    return lista.find(producto => producto.id === id) || null;
}

function formatearPrecioProducto(precio) {
    return precio === null || precio === undefined
        ? 'Consultar precio'
        : '$ ' + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(precio);
}

// Construye los elementos y asigna el texto sin interpretar HTML de los datos.
function crearElementoProducto(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

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

function mostrarDetalleProducto(producto, contenedor) {
    const ficha = crearElementoProducto('section', 'row g-4 align-items-center');
    ficha.setAttribute('aria-labelledby', 'nombreProducto');
    const columnaImagen = crearElementoProducto('div', 'col-md-6');
    const imagen = crearElementoProducto('img', 'img-fluid rounded');
    imagen.src = producto.imagen;
    imagen.alt = producto.nombre;
    columnaImagen.append(imagen);

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

    // Se muestran características cuando se agreguen a productos.js.
    if (Array.isArray(producto.caracteristicas) && producto.caracteristicas.length) {
        const lista = crearElementoProducto('ul');
        producto.caracteristicas.forEach(texto => lista.append(crearElementoProducto('li', '', texto)));
        informacion.append(crearElementoProducto('h2', 'h5 mt-4', 'Características'), lista);
    }
    const agregar = crearElementoProducto('button', 'btn btn-robotech mt-3', 'Agregar al carrito');
    agregar.type = 'button';
    agregar.id = 'agregarAlCarrito';
    const estado = crearElementoProducto('p', 'mt-3');
    estado.setAttribute('role', 'status');
    estado.setAttribute('aria-live', 'polite');
    agregar.addEventListener('click', () => {
        const resultado = Carrito.agregar(producto.id);
        estado.textContent = resultado.ok ? producto.nombre + ' agregado al carrito.' : resultado.mensaje;
    });
    informacion.append(agregar, estado);
    ficha.append(columnaImagen, informacion);
    contenedor.replaceChildren(ficha);
    document.title = 'Robotech | ' + producto.nombre;
}

function inicializarProducto() {
    const contenedor = document.querySelector('#detalleProducto');
    if (!contenedor) return;
    const id = obtenerIdProducto();
    const producto = buscarProductoPorId(id);
    if (!producto) {
        mostrarErrorProducto(contenedor, !id);
        return;
    }
    mostrarDetalleProducto(producto, contenedor);
}

document.addEventListener('DOMContentLoaded', inicializarProducto);
