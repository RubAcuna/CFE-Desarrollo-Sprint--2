// Comentarios de producto: lectura pública y una reseña editable por usuario autenticado.
'use strict';
document.addEventListener('DOMContentLoaded', async () => {
    const seccion = document.querySelector('#comentariosProducto');
    if (!seccion) return;
    const $ = selector => seccion.querySelector(selector);
    const productoId = new URLSearchParams(window.location.search).get('id')?.trim();
    const estado = $('#comentariosEstado'), lista = $('#comentariosLista');
    const acceso = $('#comentarioAcceso'), formulario = $('#comentarioFormulario');
    const formularioEstado = $('#comentarioFormularioEstado');
    const texto = $('#comentarioTexto'), calificacion = $('#comentarioCalificacion');
    const guardar = $('#guardarComentario'), eliminar = $('#eliminarComentario');
    let servicio, sesion = null, comentarios = [], cargando = 0, ocupado = false;

    if (!productoId) { seccion.hidden = true; return; }

    const fechaTexto = valor => {
        const fecha = valor?.toDate?.();
        return fecha ? new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium', timeStyle: 'short' }).format(fecha) : 'Fecha pendiente';
    };

    // Construye cada reseña con texto plano para que el contenido escrito por usuarios no se interprete como HTML.
    function mostrarComentarios() {
        lista.replaceChildren();
        if (!comentarios.length) {
            estado.textContent = 'Este producto todavía no tiene reseñas. Puedes publicar la primera.';
            return;
        }
        estado.textContent = `${comentarios.length} ${comentarios.length === 1 ? 'reseña publicada' : 'reseñas publicadas'}.`;
        comentarios.forEach(comentario => {
            const tarjeta = document.createElement('article'); tarjeta.className = 'comentario-tarjeta';
            const cabecera = document.createElement('div'); cabecera.className = 'comentario-cabecera';
            const autor = document.createElement('h3'); autor.className = 'h5 mb-0'; autor.textContent = comentario.usuarioNombre || 'Usuario';
            const estrellas = document.createElement('span'); estrellas.className = 'comentario-estrellas';
            estrellas.textContent = '★'.repeat(comentario.calificacion) + '☆'.repeat(5 - comentario.calificacion);
            estrellas.setAttribute('aria-label', `${comentario.calificacion} de 5 estrellas`);
            const contenido = document.createElement('p'); contenido.className = 'comentario-texto mt-3 mb-2'; contenido.textContent = comentario.texto;
            const fecha = document.createElement('p'); fecha.className = 'small mb-0'; fecha.textContent = `Actualizada: ${fechaTexto(comentario.actualizadoEn)}`;
            cabecera.append(autor, estrellas); tarjeta.append(cabecera, contenido, fecha); lista.append(tarjeta);
        });
    }

    // La reseña propia se reconoce siempre por el UID de Authentication, no por el nombre visible.
    function actualizarFormulario() {
        acceso.hidden = !!sesion;
        formulario.hidden = !sesion;
        const propia = sesion ? comentarios.find(comentario => comentario.usuarioId === sesion.uid) : null;
        texto.value = propia?.texto || '';
        calificacion.value = String(propia?.calificacion || 5);
        guardar.textContent = propia ? 'Actualizar reseña' : 'Publicar reseña';
        eliminar.hidden = !propia;
        formularioEstado.textContent = '';
    }

    async function cargarComentarios() {
        const peticion = ++cargando;
        estado.textContent = 'Cargando reseñas…'; lista.replaceChildren();
        $('#recargarComentarios').disabled = true;
        try {
            const datos = await servicio.consultarComentariosProducto(productoId);
            if (peticion !== cargando) return;
            comentarios = datos; mostrarComentarios(); actualizarFormulario();
        } catch {
            if (peticion === cargando) estado.textContent = 'No se pudieron cargar las reseñas. Intenta nuevamente.';
        } finally {
            if (peticion === cargando) $('#recargarComentarios').disabled = false;
        }
    }

    function bloquear(valor) {
        ocupado = valor; guardar.disabled = valor; eliminar.disabled = valor;
        texto.disabled = valor; calificacion.disabled = valor;
    }

    $('#comentarioIngresar').addEventListener('click', () => document.querySelector('#btnLoginPlaceholder').click());
    $('#recargarComentarios').addEventListener('click', cargarComentarios);
    formulario.addEventListener('submit', async evento => {
        evento.preventDefault();
        if (ocupado || !sesion || !formulario.reportValidity()) return;
        bloquear(true); formularioEstado.textContent = 'Guardando reseña…';
        try {
            await servicio.guardarComentarioProducto(productoId, texto.value, Number(calificacion.value));
            await cargarComentarios();
            formularioEstado.textContent = 'Reseña guardada.';
        } catch (error) {
            formularioEstado.textContent = error.code === 'permission-denied'
                ? 'Firestore rechazó la reseña. Comprueba tu sesión y vuelve a intentar.'
                : error.message || 'No se pudo guardar la reseña.';
        } finally { bloquear(false); }
    });
    eliminar.addEventListener('click', async () => {
        if (ocupado || !sesion || !confirm('¿Eliminar tu reseña de este producto?')) return;
        bloquear(true); formularioEstado.textContent = 'Eliminando reseña…';
        try {
            await servicio.eliminarComentarioProducto(productoId);
            await cargarComentarios();
            formularioEstado.textContent = 'Reseña eliminada.';
        } catch (error) {
            formularioEstado.textContent = error.message || 'No se pudo eliminar la reseña.';
        } finally { bloquear(false); }
    });

    try {
        servicio = await import('./firebase.js');
        if (!servicio.app) throw new Error('Firebase no disponible');
        servicio.observarSesion(user => { sesion = user; actualizarFormulario(); cargarComentarios(); });
    } catch {
        estado.textContent = 'No se pudo conectar con Firebase para cargar las reseñas.';
        acceso.hidden = true; formulario.hidden = true;
    }
});
