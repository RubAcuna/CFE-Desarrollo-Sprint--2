'use strict';
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
    window.addEventListener('robotech:perfil-actualizado', () => { if (sesion) cargarPerfil(sesion); });
    await conectar();
});
