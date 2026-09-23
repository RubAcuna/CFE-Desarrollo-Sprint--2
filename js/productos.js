'use strict';

// Caché en memoria de Firestore; nunca se usa el archivo de carga inicial como respaldo.
const productos = [];
const Productos = (() => {
    let estado = 'inicial';
    let pendiente = null;
    function notificar() { document.dispatchEvent(new Event('productos:actualizados')); }
    function normalizar(datos) {
        if (!datos || typeof datos.id !== 'string' || !datos.id || datos.id.includes('/') ||
            typeof datos.nombre !== 'string' || !datos.nombre.trim() ||
            typeof datos.descripcion !== 'string' || typeof datos.categoria !== 'string') {
            throw new Error('Hay productos con datos incompletos en Firestore.');
        }
        const imagenes = (Array.isArray(datos.imagenes) ? datos.imagenes : [])
            .filter(url => typeof url === 'string' && (url.startsWith('https://') || url.startsWith('img/')));
        return {
            id: datos.id, nombre: datos.nombre.trim(), descripcion: datos.descripcion,
            categoria: datos.categoria.trim(),
            precio: Number.isFinite(datos.precio) && datos.precio >= 0 ? datos.precio : null,
            stock: Number.isSafeInteger(datos.stock) && datos.stock >= 0 ? datos.stock : 0,
            disponible: datos.disponible === true,
            imagenes, imagen: imagenes[0] || 'img/robo.png',
            caracteristicas: Array.isArray(datos.caracteristicas)
                ? datos.caracteristicas.filter(texto => typeof texto === 'string') : []
        };
    }
    async function cargar({ forzar = false } = {}) {
        if (pendiente) return pendiente;
        if (!forzar && estado === 'listo') return productos;
        estado = 'cargando';
        notificar();
        pendiente = (async () => {
            try {
                const servicio = await import('./firebase.js');
                const lista = (await servicio.consultarProductos()).map(normalizar);
                productos.splice(0, productos.length, ...lista);
                estado = 'listo';
                return productos;
            } catch (error) {
                estado = 'error';
                throw error;
            } finally {
                pendiente = null;
                notificar();
            }
        })();
        return pendiente;
    }
    async function obtener(id) {
        if (!id || id.includes('/')) return null;
        await cargar();
        const servicio = await import('./firebase.js');
        const datos = await servicio.consultarProducto(id);
        const producto = datos ? normalizar(datos) : null;
        const indice = productos.findIndex(item => item.id === id);
        if (indice >= 0) productos.splice(indice, 1, ...(producto ? [producto] : []));
        else if (producto) productos.push(producto);
        notificar();
        return producto;
    }
    return { cargar, obtener, normalizar, get estado() { return estado; } };
})();

function obtenerStockDisponible(producto) {
    return producto?.disponible === true && Number.isSafeInteger(producto.stock) && producto.stock > 0
        ? producto.stock : 0;
}

function describirDisponibilidad(producto, stock = obtenerStockDisponible(producto)) {
    if (producto?.disponible !== true) return 'No disponible';
    return stock > 0 ? 'Disponible: ' + stock + ' unidades' : 'Sin stock';
}
