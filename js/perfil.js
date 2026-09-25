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
    let servicio, sesion, version = 0;
    document.querySelector('#perfilIngresar').addEventListener('click', () => document.querySelector('#btnLoginPlaceholder').click());
    // Consulta el perfil de la sesión recibida y completa el formulario. Descarta respuestas de peticiones anteriores mediante version.
    async function cargarPerfil(user) {
        sesion = user;
        const actual = ++version;
        formulario.hidden = true;
        formulario.reset();
        sinSesion.hidden = !!user;
        recargar.hidden = true;
        if (!user) { estado.textContent = ''; return; }
        estado.textContent = 'Cargando perfil…';
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
