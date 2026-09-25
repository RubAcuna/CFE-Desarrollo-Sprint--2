// Modal compartido para registro, inicio de sesión y cierre de sesión.
// La interfaz llama a firebase.js; Authentication valida las credenciales y Firestore guarda el perfil.
'use strict';
// Espera a que el HTML esté disponible antes de localizar controles y conectar sus eventos.
document.addEventListener('DOMContentLoaded', () => {
    const ingresar = document.querySelector('#btnLoginPlaceholder');
    if (!ingresar) return;
    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.className = 'modal fade robotech-modal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'loginTitulo');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title h4" id="loginTitulo">Iniciar sesión</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar acceso"></button>
        </div>
        <div class="modal-body p-4">
          <div id="accesoPanel">
            <div class="d-flex gap-2 mb-4" aria-label="Opciones de acceso">
              <button class="btn btn-robotech flex-fill" id="vistaLogin" type="button" aria-pressed="true">Iniciar sesión</button>
              <button class="btn btn-outline-light flex-fill" id="vistaRegistro" type="button" aria-pressed="false">Registrarse</button>
            </div>
            <p id="accesoDescripcion">Ingresa con el correo de tu cuenta registrada.</p>
            <form id="loginFormulario">
              <div class="mb-3" id="registroUsuarioGrupo" hidden>
                <label class="form-label" for="loginUsuario">Usuario</label>
                <input class="form-control" id="loginUsuario" name="usuario" type="text" autocomplete="nickname" maxlength="80" placeholder="Tu nombre de usuario">
              </div>
              <div class="mb-3">
                <label class="form-label" for="loginCorreo">Correo electrónico</label>
                <input class="form-control" id="loginCorreo" name="email" type="email" autocomplete="username" required placeholder="nombre@ejemplo.com">
              </div>
              <div class="mb-3">
                <label class="form-label" for="loginClave">Contraseña</label>
                <input class="form-control" id="loginClave" name="passwd" type="password" autocomplete="current-password" required>
              </div>
              <div id="registroOpciones" hidden>
                <div class="mb-3">
                  <label class="form-label" for="registroConfirmar">Confirmar contraseña</label>
                  <input class="form-control" id="registroConfirmar" type="password" autocomplete="new-password">
                </div>
                <div class="mb-3">
                  <label class="form-label" for="registroRol">Rol</label>
                  <select class="form-select" id="registroRol" name="rol">
                    <option value="Invitado">Invitado</option><option value="Estudiante">Estudiante</option><option value="Docente">Docente</option>
                    <option value="Administrador" disabled>Administrador (asignación interna)</option>
                  </select>
                  <p class="small mt-2">El rol Administrador lo asigna el responsable del proyecto.</p>
                </div>
                <p class="small">Usa una contraseña de al menos 6 caracteres.</p>
              </div>
              <button class="btn btn-robotech w-100" id="loginIniciar" type="submit">Iniciar</button>
            </form>
            <div class="d-flex align-items-center gap-3 my-3" aria-hidden="true"><hr class="flex-grow-1"><span>o</span><hr class="flex-grow-1"></div>
            <button class="btn btn-light w-100 d-flex align-items-center justify-content-center gap-2" id="loginGoogle" type="button"><svg width="20" height="20" viewBox="0 0 24 24" class="flex-shrink-0" aria-hidden="true" focusable="false">
                  <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.36Z"/>
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.12H3.04v2.59A10 10 0 0 0 12 22Z"/>
                  <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.49H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.51l3.35-2.59Z"/>
                  <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.35 2.59A5.99 5.99 0 0 1 12 5.96Z"/>
                </svg><span>Iniciar sesión con Google</span></button>
            <p class="small mt-2">Las cuentas nuevas de Google se registran como Invitado.</p>
          </div>
          <div id="sesionPanel" hidden>
            <p class="mb-1">Sesión iniciada como</p><p class="fw-bold" id="sesionEmail"></p>
            <p id="sesionRol"></p>
            <button class="btn btn-robotech w-100" id="cerrarSesion" type="button">Cerrar sesión</button>
            <button class="btn btn-outline-light w-100 mt-3" id="reintentarPerfil" type="button" hidden>Reintentar guardar perfil</button>
          </div>
          <p class="small mt-3 mb-0" id="loginEstado" role="status" aria-live="polite"></p>
        </div>
      </div></div>`;
    document.body.append(modal);
    ingresar.setAttribute('aria-haspopup', 'dialog');
    ingresar.setAttribute('aria-controls', modal.id);
    const $ = id => modal.querySelector('#' + id);
    let registro = false, ocupado = false, servicio = null, cargando = null, sesion = null, pendiente = null;
    const botones = ['loginIniciar', 'loginGoogle', 'cerrarSesion', 'reintentarPerfil', 'vistaLogin', 'vistaRegistro'];
    // Evita operaciones simultáneas al deshabilitar botones mientras se completa una petición.
    function bloquear(valor) {
        ocupado = valor;
        botones.forEach(id => $(id).disabled = valor || !servicio);
        $('loginFormulario').setAttribute('aria-busy', String(valor));
    }
    // Alterna entre registro e inicio de sesión: cambia campos visibles, validaciones y etiquetas, y limpia las contraseñas.
    function vista(valor) {
        registro = valor;
        $('loginTitulo').textContent = registro ? 'Crear cuenta' : 'Iniciar sesión';
        $('loginIniciar').textContent = registro ? 'Registrarse' : 'Iniciar';
        $('accesoDescripcion').textContent = registro ? 'Completa tus datos para registrarte en Robotech.' : 'Ingresa con el correo de tu cuenta registrada.';
        $('registroUsuarioGrupo').hidden = !registro;
        $('registroOpciones').hidden = !registro;
        $('loginUsuario').required = registro;
        $('registroConfirmar').required = registro;
        $('registroConfirmar').disabled = !registro;
        $('loginClave').minLength = registro ? 6 : 1;
        $('loginClave').autocomplete = registro ? 'new-password' : 'current-password';
        $('loginClave').value = '';
        $('registroConfirmar').value = '';
        $('registroConfirmar').setCustomValidity('');
        $('loginEstado').textContent = '';
        ['vistaLogin', 'vistaRegistro'].forEach((id, i) => {
            const activo = Boolean(i) === registro;
            $(id).setAttribute('aria-pressed', String(activo));
            $(id).className = 'btn flex-fill ' + (activo ? 'btn-robotech' : 'btn-outline-light');
        });
    }
    // Actualiza el modal y el botón de cabecera según exista una sesión autenticada.
    function mostrarSesion(user) {
        sesion = user;
        $('accesoPanel').hidden = !!user;
        $('sesionPanel').hidden = !user;
        ingresar.textContent = user ? 'Mi cuenta' : 'Ingresar';
        $('loginTitulo').textContent = user ? 'Mi cuenta' : (registro ? 'Crear cuenta' : 'Iniciar sesión');
        $('sesionEmail').textContent = user?.email || '';
        $('sesionRol').textContent = '';
        if (!user) { pendiente = null; $('reintentarPerfil').hidden = true; }
    }
    // Importa firebase.js una sola vez y suscribe la interfaz a los cambios de sesión. Comparte la promesa si la carga ya comenzó.
    async function cargar() {
        if (servicio) return;
        if (cargando) return cargando;
        bloquear(true);
        cargando = (async () => {
            try {
                const modulo = await import('./firebase.js');
                if (!modulo.app) throw new Error('Firebase no disponible');
                servicio = modulo;
                servicio.observarSesion(async user => {
                    mostrarSesion(user);
                    if (user) {
                        try {
                            const perfil = await servicio.obtenerPerfil();
                            if (sesion?.uid === user.uid && perfil) $('sesionRol').textContent = 'Rol: ' + perfil.rol;
                            if (sesion?.uid === user.uid && !perfil) $('reintentarPerfil').hidden = false;
                        } catch {
                            if (sesion?.uid === user.uid) $('reintentarPerfil').hidden = false;
                        }
                    }
                });
                $('loginEstado').textContent = '';
            } catch {
                servicio = null;
                $('loginEstado').textContent = 'No se pudo cargar el acceso. Revisa tu conexión y vuelve a abrir el formulario.';
            } finally { bloquear(false); cargando = null; }
        })();
        return cargando;
    }
    // Traduce códigos técnicos de Authentication a mensajes comprensibles para el usuario.
    const errores = {
        'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
        'auth/wrong-password': 'El correo o la contraseña no son correctos.',
        'auth/user-not-found': 'El correo o la contraseña no son correctos.',
        'auth/email-already-in-use': 'Este correo ya tiene cuenta. Usa Iniciar sesión.',
        'auth/weak-password': 'La contraseña no cumple los requisitos de seguridad. Usa al menos 6 caracteres.',
        'auth/password-does-not-meet-requirements': 'La contraseña no cumple la política de seguridad del proyecto.',
        'auth/invalid-email': 'Ingresa un correo válido.',
        'auth/user-disabled': 'Esta cuenta está deshabilitada.',
        'auth/too-many-requests': 'Demasiados intentos. Espera y vuelve a intentar.',
        'auth/network-request-failed': 'Revisa tu conexión a Internet.',
        'auth/popup-closed-by-user': 'Se cerró Google. Puedes volver a intentar.',
        'auth/popup-blocked': 'Permite las ventanas emergentes para acceder con Google.',
        'auth/unauthorized-domain': 'Este dominio no está habilitado para iniciar sesión.',
        'auth/operation-not-allowed': 'Este método de acceso aún no está habilitado.',
        'auth/account-exists-with-different-credential': 'Utiliza el método de acceso original de esta cuenta.'
    };
    // Elige Google, registro o acceso con correo; gestiona bloqueos, errores y el posible reintento del perfil sin perder la autenticación.
    async function acceder(google) {
        if (ocupado || !servicio) return;
        bloquear(true);
        $('loginEstado').textContent = google ? 'Continúa en Google…' : registro ? 'Creando cuenta…' : 'Iniciando sesión…';
        try {
            const resultado = await (google ? servicio.iniciarConGoogle() : registro
                ? servicio.registrarUsuario($('loginUsuario').value, $('loginCorreo').value, $('loginClave').value, $('registroRol').value)
                : servicio.iniciarConCorreo($('loginCorreo').value, $('loginClave').value));
            mostrarSesion(resultado.user);
            $('loginClave').value = ''; $('registroConfirmar').value = '';
            pendiente = resultado.perfilPendiente ? resultado : null;
            if (!pendiente) window.dispatchEvent(new Event('robotech:perfil-actualizado'));
            $('reintentarPerfil').hidden = !pendiente;
            $('sesionRol').textContent = resultado.perfil ? 'Rol: ' + resultado.perfil.rol : '';
            $('loginEstado').textContent = pendiente ? 'La sesión está activa, pero no pudimos guardar tu perfil. Usa Reintentar guardar perfil.' : 'Bienvenido, ' + resultado.perfil.usuario + '.';
        } catch (error) {
            $('loginEstado').textContent = errores[error.code] || 'No se pudo completar el acceso. Intenta nuevamente.';
        } finally { bloquear(false); }
    }
    $('vistaLogin').addEventListener('click', () => vista(false));
    $('vistaRegistro').addEventListener('click', () => vista(true));
    // Comprueba que las contraseñas coincidan solo durante el registro; usa la validación nativa del formulario.
    const validarConfirmacion = () => $('registroConfirmar').setCustomValidity(registro && $('registroConfirmar').value !== $('loginClave').value ? 'Las contraseñas no coinciden.' : '');
    $('loginClave').addEventListener('input', validarConfirmacion);
    $('registroConfirmar').addEventListener('input', validarConfirmacion);
    $('loginFormulario').addEventListener('submit', evento => {
        evento.preventDefault(); validarConfirmacion();
        if ($('loginFormulario').reportValidity()) acceder(false);
    });
    $('loginGoogle').addEventListener('click', () => acceder(true));
    $('cerrarSesion').addEventListener('click', async () => {
        if (ocupado || !servicio) return;
        bloquear(true);
        try { await servicio.cerrarSesion(); vista(false); $('loginEstado').textContent = 'Sesión cerrada.'; }
        catch { $('loginEstado').textContent = 'No se pudo cerrar la sesión. Intenta nuevamente.'; }
        finally { bloquear(false); }
    });
    // Reintenta únicamente el guardado del perfil de una sesión ya autenticada.
    $('reintentarPerfil').addEventListener('click', async () => {
        if (ocupado || !sesion) return;
        bloquear(true); $('loginEstado').textContent = 'Guardando perfil…';
        try {
            const perfil = await servicio.guardarPerfilUsuario(sesion, pendiente?.usuarioPendiente || '', pendiente?.rolPendiente || 'Invitado');
            pendiente = null; $('reintentarPerfil').hidden = true;
            $('sesionRol').textContent = 'Rol: ' + perfil.rol;
            $('loginEstado').textContent = 'Perfil guardado.';
            window.dispatchEvent(new Event('robotech:perfil-actualizado'));
        } catch { $('loginEstado').textContent = 'No se pudo guardar el perfil. Revisa la conexión e intenta nuevamente.'; }
        finally { bloquear(false); }
    });
    ingresar.addEventListener('click', () => { bootstrap.Modal.getOrCreateInstance(modal).show(); cargar(); });
    modal.addEventListener('shown.bs.modal', () => (sesion ? $('cerrarSesion') : registro ? $('loginUsuario') : $('loginCorreo')).focus());
    // Al cerrar, elimina contraseñas de los campos y devuelve el foco al botón de acceso.
    modal.addEventListener('hidden.bs.modal', () => { $('loginClave').value = ''; $('registroConfirmar').value = ''; ingresar.focus(); });
    vista(false);
    cargar();
});
