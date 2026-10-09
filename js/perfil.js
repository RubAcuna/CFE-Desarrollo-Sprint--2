// Pantalla del usuario autenticado: consulta su perfil y permite cambiar el nombre.
// El contador version evita que una respuesta antigua actualice la pantalla de otra sesión.
'use strict';
// Espera a que el HTML esté disponible antes de localizar controles y conectar sus eventos.
document.addEventListener('DOMContentLoaded', async () => {
    const formulario = document.querySelector('#perfilFormulario');
    if (!formulario) return;
    const estado = document.querySelector('#perfilEstado');
    const sinSesion = document.querySelector('#perfilSinSesion');
    const recargar = document.querySelector('#perfilRecargar');
    const guardar = document.querySelector('#perfilGuardar');
    const usuario = document.querySelector('#perfilUsuario');
    const email = document.querySelector('#perfilEmail');
    const rol = document.querySelector('#perfilRol');
    const misProductos = document.querySelector('#misProductos');
    const productosEstado = document.querySelector('#misProductosEstado');
    const productosLista = document.querySelector('#misProductosLista');
    const recargarProductos = document.querySelector('#recargarMisProductos');
    let servicio, sesion, version = 0;
    document.querySelector('#perfilIngresar').addEventListener('click', () => document.querySelector('#btnLoginPlaceholder').click());

    // Agrupa el mismo producto cuando fue adquirido en más de una compra y conserva
    // la cantidad total, el número de pedidos y la fecha más reciente.
    function agruparProductosComprados(compras) {
        const agrupados = new Map();
        compras.forEach(compra => {
            const fecha = compra.fecha?.toDate?.() || null;
            Object.values(compra.productos || {}).forEach(item => {
                if (!item?.id) return;
                const actual = agrupados.get(item.id) || { id: item.id, nombre: item.nombre || item.id, cantidad: 0, pedidos: 0, ultimaFecha: null };
                actual.cantidad += Number.isSafeInteger(item.cantidad) ? item.cantidad : 0;
                actual.pedidos += 1;
                if (fecha && (!actual.ultimaFecha || fecha > actual.ultimaFecha)) actual.ultimaFecha = fecha;
                agrupados.set(item.id, actual);
            });
        });
        return [...agrupados.values()].sort((a, b) => (b.ultimaFecha?.getTime() || 0) - (a.ultimaFecha?.getTime() || 0));
    }

    // Dibuja los productos del historial usando textContent y enlaces construidos con URLSearchParams.
    function mostrarProductosComprados(compras) {
        const items = agruparProductosComprados(compras);
        productosLista.replaceChildren();
        if (!items.length) {
            productosEstado.textContent = 'Todavía no tienes compras confirmadas.';
            return;
        }
        productosEstado.textContent = `${items.length} ${items.length === 1 ? 'producto comprado' : 'productos comprados'}.`;
        items.forEach(item => {
            const tarjeta = document.createElement('article'); tarjeta.className = 'producto-comprado';
            const datos = document.createElement('div'); datos.className = 'producto-comprado-datos';
            const titulo = document.createElement('h3'); titulo.className = 'h5'; titulo.textContent = item.nombre;
            const resumen = document.createElement('p'); resumen.className = 'mb-1';
            resumen.textContent = `Unidades compradas: ${item.cantidad} · ${item.pedidos} ${item.pedidos === 1 ? 'pedido' : 'pedidos'}`;
            const fecha = document.createElement('p'); fecha.className = 'small mb-0';
            fecha.textContent = item.ultimaFecha ? `Última compra: ${new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium', timeStyle: 'short' }).format(item.ultimaFecha)}` : 'Fecha pendiente';
            const enlace = document.createElement('a'); enlace.className = 'btn btn-robotech'; enlace.textContent = 'Ver producto';
            enlace.href = 'producto.html?' + new URLSearchParams({ id: item.id });
            datos.append(titulo, resumen, fecha); tarjeta.append(datos, enlace); productosLista.append(tarjeta);
        });
    }

    // Consulta compras filtradas por el UID de la sesión; las reglas repiten esta comprobación en el servidor.
    async function cargarMisProductos(user = sesion) {
        if (!user || !servicio) return;
        const actual = version;
        recargarProductos.disabled = true;
        productosEstado.textContent = 'Cargando tus productos…';
        productosLista.replaceChildren();
        try {
            const compras = await servicio.consultarComprasUsuario();
            if (actual === version && sesion?.uid === user.uid) mostrarProductosComprados(compras);
        } catch {
            if (actual === version) productosEstado.textContent = 'No se pudieron cargar tus productos. Intenta nuevamente.';
        } finally {
            if (actual === version) recargarProductos.disabled = false;
        }
    }
    // Consulta el perfil de la sesión recibida y completa el formulario. Descarta respuestas de peticiones anteriores mediante version.
    async function cargarPerfil(user) {
        sesion = user;
        const actual = ++version;
        formulario.hidden = true;
        formulario.reset();
        sinSesion.hidden = !!user;
        misProductos.hidden = !user;
        recargar.hidden = true;
        if (!user) {
            estado.textContent = ''; productosEstado.textContent = ''; productosLista.replaceChildren();
            return;
        }
        estado.textContent = 'Cargando perfil…';
        cargarMisProductos(user);
        try {
            const perfil = await servicio.obtenerPerfil();
            if (actual !== version) return;
            if (!perfil) {
                estado.textContent = 'Tu cuenta está activa, pero falta el perfil. Abre Mi cuenta y pulsa Reintentar guardar perfil.';
                recargar.hidden = false;
                return;
            }
            usuario.value = perfil.usuario || perfil.Usuario || '';
            email.value = user.email || perfil.email || '';
            rol.value = perfil.rol || 'Invitado';
            formulario.hidden = false;
            estado.textContent = '';
        } catch {
            if (actual !== version) return;
            estado.textContent = 'No se pudo leer tu perfil. Revisa tu conexión y vuelve a intentar.';
            recargar.hidden = false;
        }
    }
    // Importa el servicio y observa la sesión; en reintentos reutiliza el servicio para consultar nuevamente el perfil.
    async function conectar() {
        try {
            if (!servicio) {
                servicio = await import('./firebase.js');
                if (!servicio.app) throw new Error('Firebase no disponible');
                servicio.observarSesion(cargarPerfil);
            } else await cargarPerfil(sesion);
        } catch {
            servicio = null;
            estado.textContent = 'No se pudo conectar con Firebase. Revisa tu conexión.';
            recargar.hidden = false;
        }
    }
    recargar.addEventListener('click', conectar);
    recargarProductos.addEventListener('click', () => cargarMisProductos());
    // Valida el nombre y espera su guardado sin recargar la página; evita mensajes de una sesión anterior.
    formulario.addEventListener('submit', async evento => {
        evento.preventDefault();
        if (!sesion || guardar.disabled) return;
        usuario.setCustomValidity(usuario.value.trim() ? '' : 'Ingresa un nombre de usuario.');
        if (!formulario.reportValidity()) return;
        const actual = version;
        guardar.disabled = true;
        estado.textContent = 'Guardando cambios…';
        try {
            await servicio.actualizarNombreUsuario(usuario.value);
            if (actual === version) estado.textContent = 'Perfil actualizado.';
        } catch {
            if (actual === version) estado.textContent = 'No se pudo guardar el perfil. Intenta nuevamente.';
        } finally { guardar.disabled = false; }
    });
    usuario.addEventListener('input', () => usuario.setCustomValidity(''));
    // Refresca esta pantalla si el modal de acceso terminó de crear o recuperar el perfil.
    window.addEventListener('robotech:perfil-actualizado', () => { if (sesion) cargarPerfil(sesion); });
    await conectar();
});
