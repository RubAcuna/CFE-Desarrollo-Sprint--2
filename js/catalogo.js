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

document.addEventListener('DOMContentLoaded', () => {
    const contenedor = document.querySelector('#listaProductos');
    const formulario = document.querySelector('#formBusqueda');
    const campo = document.querySelector('#buscarProducto');
    const botonBuscar = document.querySelector('#btnBuscar');
    const botonLimpiar = document.querySelector('#btnLimpiar');
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
            const enlace = tarjeta.querySelector('[data-detalle]');
            enlace.href = 'producto.html?' + new URLSearchParams({ id: producto.id });
            enlace.setAttribute('aria-label', 'Ver detalle de ' + producto.nombre);
            fragmento.append(tarjeta);
        });
        contenedor.replaceChildren(fragmento);
        contador.textContent = `${lista.length} de ${productos.length} kits`;
        sinResultados.hidden = lista.length !== 0;
    }

    function buscarProductos() {
        mostrarProductos(filtrarProductos(productos, campo.value));
    }

    // Búsqueda mientras se escribe y al hacer clic en Buscar.
    campo.addEventListener('input', buscarProductos);
    botonBuscar.addEventListener('click', buscarProductos);
    // Enter también busca sin recargar la página.
    formulario.addEventListener('submit', evento => {
        evento.preventDefault();
        buscarProductos();
    });
    botonLimpiar.addEventListener('click', () => {
        campo.value = '';
        buscarProductos();
        campo.focus();
    });

    mostrarProductos(productos);
});
