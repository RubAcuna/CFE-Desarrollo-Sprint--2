'use strict';
document.addEventListener('DOMContentLoaded', () => {
    const lista = document.querySelector('#productosDestacados');
    const estado = document.querySelector('#estadoDestacados');
    const reintentar = document.querySelector('#reintentarDestacados');
    function elemento(tag, clase, texto) {
        const nodo = document.createElement(tag);
        nodo.className = clase;
        if (texto !== undefined) nodo.textContent = texto;
        return nodo;
    }
    function mostrar() {
        lista.replaceChildren();
        reintentar.hidden = Productos.estado !== 'error';
        if (Productos.estado !== 'listo') {
            estado.textContent = Productos.estado === 'error' ? 'No se pudieron cargar los productos. Intenta nuevamente.' : 'Cargando productos…';
            return;
        }
        estado.textContent = productos.length ? '' : 'No hay productos publicados por el momento.';
        const preferidos = ['robopro', 'sensores', 'ev3', 'microbit'];
        const destacados = [...productos].sort((a, b) => {
            const posicion = p => preferidos.includes(p.id) ? preferidos.indexOf(p.id) : preferidos.length;
            return posicion(a) - posicion(b) || a.nombre.localeCompare(b.nombre, 'es');
        }).slice(0, 4);
        destacados.forEach(producto => {
            const columna = elemento('div', 'col-md-6 col-xl-3');
            const tarjeta = elemento('article', 'placeholder-product');
            const marco = elemento('div', 'placeholder-image');
            const imagen = elemento('img', 'img-fluid');
            imagen.src = producto.imagen; imagen.alt = producto.nombre; imagen.height = 200;
            marco.append(imagen);
            const info = elemento('div', 'p-3');
            const enlace = elemento('a', 'btn btn-primary btn-sm', 'Ver kit');
            enlace.href = 'producto.html?' + new URLSearchParams({ id: producto.id });
            info.append(elemento('h3', 'h5 mt-2', producto.nombre),
                elemento('p', 'small', producto.descripcion),
                elemento('p', 'small', describirDisponibilidad(producto, Carrito.stockDisponible(producto.id))),
                elemento('p', 'fw-bold', producto.precio === null ? 'Consultar precio' : '$ ' + new Intl.NumberFormat('es-UY').format(producto.precio)), enlace);
            tarjeta.append(marco, info); columna.append(tarjeta); lista.append(columna);
        });
    }
    reintentar.addEventListener('click', () => Productos.cargar({ forzar: true }).catch(() => {}));
    document.addEventListener('carrito:actualizado', mostrar);
    Productos.cargar().catch(() => {});
    mostrar();
});
