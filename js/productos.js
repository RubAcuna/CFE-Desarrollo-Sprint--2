// Servicio compartido del catálogo: carga, normaliza y conserva productos en memoria.
// Flujo: pantalla -> Productos.cargar() -> consultarProductos() en firebase.js -> Firestore.
// Los eventos productos:actualizados permiten refrescar la interfaz al cambiar los datos o el estado.
'use strict';

// Caché en memoria de Firestore; nunca se usa el archivo de carga inicial como respaldo.
const productos = [];
// La función autoejecutada mantiene estado y pendiente privados y expone solo la API del catálogo.
const Productos = (() => {
    let estado = 'inicial';
    let pendiente = null;
    // Anuncia un cambio del catálogo o de su estado; los componentes suscritos deciden cómo representarlo.
    function notificar() { document.dispatchEvent(new Event('productos:actualizados')); }
    // Comprueba los campos esenciales y adapta un documento al formato de la tienda. Un stock inválido pasa a cero y un precio inválido queda por confirmar.
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
    // Devuelve una promesa con el catálogo. Comparte la petición en curso y reutiliza la caché si está lista; forzar solicita datos nuevos cuando no hay una consulta pendiente.
    async function cargar({ forzar = false } = {}) {
        if (pendiente) return pendiente;
        if (!forzar && estado === 'listo') return productos;
        estado = 'cargando';
        notificar();
        pendiente = (async () => {
            try {
                const servicio = await import('./firebase.js');
                const lista = (await servicio.consultarProductos()).map(normalizar);
                // Actualiza el arreglo existente para conservar la referencia compartida con catálogo y carrito.
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
    // Carga el catálogo si hace falta, vuelve a consultar el id solicitado y sincroniza su entrada en memoria. Devuelve null si el producto ya no existe.
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

// Devuelve el stock base solo cuando el producto está habilitado y tiene un entero positivo; en otro caso devuelve cero.
function obtenerStockDisponible(producto) {
    return producto?.disponible === true && Number.isSafeInteger(producto.stock) && producto.stock > 0
        ? producto.stock : 0;
}

// Convierte la disponibilidad en texto. El parámetro stock permite mostrar las unidades restantes después de descontar el carrito local.
function describirDisponibilidad(producto, stock = obtenerStockDisponible(producto)) {
    if (producto?.disponible !== true) return 'No disponible';
    return stock > 0 ? 'Disponible: ' + stock + ' unidades' : 'Sin stock';
}
