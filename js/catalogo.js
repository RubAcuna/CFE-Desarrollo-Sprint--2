'use strict';

// Permite buscar sin distinguir mayúsculas, tildes ni signos (micro:bit / microbit).
function normalizarTexto(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function filtrarProductos(lista, consulta) {
    const palabras = normalizarTexto(consulta).split(/\s+/).filter(Boolean);
    return lista.filter(producto => {
        const texto = normalizarTexto(`${producto.nombre} ${producto.categoria} ${producto.descripcion}`);
        return palabras.every(palabra => texto.includes(palabra));
    });
}

// Ordena una copia para conservar el catálogo original.
function ordenarProductos(lista, criterio = 'nombre-asc') {
    const compararNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base', numeric: true });
    return [...lista].sort((a, b) => {
        if (criterio === 'precio-asc' || criterio === 'precio-desc') {
            // Los precios por confirmar quedan al final en ambos sentidos.
            const precioA = Number.isFinite(a.precio);
            const precioB = Number.isFinite(b.precio);
            if (precioA !== precioB) return precioA ? -1 : 1;
            if (precioA && a.precio !== b.precio) {
                return criterio === 'precio-asc' ? a.precio - b.precio : b.precio - a.precio;
            }
            return compararNombre(a, b);
        }
        return criterio === 'nombre-desc' ? compararNombre(b, a) : compararNombre(a, b);
    });
}

function describirResultados(cantidad, total) {
    return cantidad === 1
        ? '1 producto encontrado de ' + total + '.'
        : cantidad + ' productos encontrados de ' + total + '.';
}

document.addEventListener('DOMContentLoaded', () => {
    const contenedor = document.querySelector('#listaProductos');
    const formulario = document.querySelector('#formBusqueda');
    const campo = document.querySelector('#buscarProducto');
    const botonBuscar = document.querySelector('#btnBuscar');
    const botonLimpiar = document.querySelector('#btnLimpiar');
    const categoria = document.querySelector('#categoriaProductos');
    const soloDisponibles = document.querySelector('#soloDisponibles');
    const reintentar = document.querySelector('#reintentarProductos');
    const orden = document.querySelector('#ordenProductos');
    const contador = document.querySelector('#cantidadResultados');
    const sinResultados = document.querySelector('#sinResultados');
    const plantilla = document.querySelector('#plantillaProducto');
    const formatoPrecio = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 });

    function mostrarProductos(lista) {
        const fragmento = document.createDocumentFragment();
        lista.forEach(producto => {
            const tarjeta = plantilla.content.cloneNode(true);
            const imagen = tarjeta.querySelector('img');
            imagen.src = producto.imagen;
            imagen.alt = producto.nombre;
            tarjeta.querySelector('[data-nombre]').textContent = producto.nombre;
            tarjeta.querySelector('[data-categoria]').textContent = producto.categoria;
            tarjeta.querySelector('[data-descripcion]').textContent = producto.descripcion;
            tarjeta.querySelector('[data-precio]').textContent = producto.precio === null
                ? 'Consultar precio' : `$ ${formatoPrecio.format(producto.precio)}`;
            const disponibilidad = document.createElement('p');
            disponibilidad.className = 'small fw-semibold mt-2';
            disponibilidad.textContent = describirDisponibilidad(producto, Carrito.stockDisponible(producto.id));
            tarjeta.querySelector('[data-precio]').after(disponibilidad);
            const enlace = tarjeta.querySelector('[data-detalle]');
            enlace.href = 'producto.html?' + new URLSearchParams({ id: producto.id });
            enlace.setAttribute('aria-label', 'Ver detalle de ' + producto.nombre);
            fragmento.append(tarjeta);
        });
        contenedor.replaceChildren(fragmento);
        contador.textContent = describirResultados(lista.length, productos.length);
        sinResultados.hidden = lista.length !== 0;
        sinResultados.textContent = productos.length ? 'No encontramos productos con esos filtros. Prueba otra búsqueda.' : 'No hay productos publicados por el momento.';
    }

    function buscarProductos() {
        if (Productos.estado !== 'listo') {
            contenedor.replaceChildren();
            contador.textContent = Productos.estado === 'error'
                ? 'No se pudieron cargar los productos. Revisa tu conexión e intenta nuevamente.'
                : 'Cargando productos…';
            sinResultados.hidden = true;
            reintentar.hidden = Productos.estado !== 'error';
            return;
        }
        reintentar.hidden = true;
        const lista = filtrarProductos(productos, campo.value).filter(producto =>
            (!categoria.value || producto.categoria === categoria.value) &&
            (!soloDisponibles.checked || Carrito.stockDisponible(producto.id) > 0));
        mostrarProductos(ordenarProductos(lista, orden.value));
    }

    // Búsqueda mientras se escribe y al hacer clic en Buscar.
    campo.addEventListener('input', buscarProductos);
    orden.addEventListener('change', buscarProductos);
    categoria.addEventListener('change', buscarProductos);
    soloDisponibles.addEventListener('change', buscarProductos);
    botonBuscar.addEventListener('click', buscarProductos);
    // Enter también busca sin recargar la página.
    formulario.addEventListener('submit', evento => {
        evento.preventDefault();
        buscarProductos();
    });
    botonLimpiar.addEventListener('click', () => {
        campo.value = '';
        categoria.value = '';
        soloDisponibles.checked = false;
        buscarProductos();
        campo.focus();
    });

    function actualizarCategorias() {
        const anterior = categoria.value;
        categoria.replaceChildren(new Option('Todas las categorías', ''));
        [...new Set(productos.map(p => p.categoria))].sort((a, b) => a.localeCompare(b, 'es'))
            .forEach(nombre => categoria.append(new Option(nombre, nombre)));
        if ([...categoria.options].some(opcion => opcion.value === anterior)) categoria.value = anterior;
        buscarProductos();
    }
    reintentar.addEventListener('click', () => Productos.cargar({ forzar: true }).catch(() => {}));
    document.addEventListener('productos:actualizados', actualizarCategorias);
    document.addEventListener('carrito:actualizado', buscarProductos);
    Productos.cargar().catch(() => {});
    buscarProductos();
});
