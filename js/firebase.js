// Conexión con Firebase y funciones de acceso a Authentication y Firestore.
// Las pantallas importan este módulo para consultar datos o gestionar la sesión.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, getDocsFromServer, getDocFromServer, doc, getDoc, updateDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyBBaLxBzpPxl6IES1x8gDbW9JDGHGLQGGk",
    authDomain: "robotech-8afa0.firebaseapp.com",
    projectId: "robotech-8afa0",
    storageBucket: "robotech-8afa0.firebasestorage.app",
    messagingSenderId: "34299747483",
    appId: "1:34299747483:web:0ddcd5ecc77e9cecf4fa3e",
    measurementId: "G-16R0NME4DV"
  };
// Todos los entornos consultan exclusivamente el proyecto Firebase real.
export let app = null;
// Reutiliza la aplicación Firebase si ya existe, evitando inicializarla dos veces.
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.error('No se pudo inicializar Firebase:', error);
}
// Devuelve el servicio de autenticación; interrumpe la operación si Firebase no se inicializó.
function auth() {
  if (!app) throw new Error('Firebase no está disponible.');
  return getAuth(app);
}
const rolesRegistro = ['Estudiante', 'Docente', 'Invitado'];

// Firestore almacena perfiles; las contraseñas pertenecen a Firebase Authentication.
// Crea o actualiza usuarios/{uid} dentro de una transacción. Conserva el rol de cuentas existentes y devuelve el perfil; no guarda contraseñas.
export async function guardarPerfilUsuario(user, usuario = '', rol = 'Invitado') {
  if (auth().currentUser?.uid !== user.uid) throw new Error('Sesión no válida.');
  if (!rolesRegistro.includes(rol)) throw new Error('Rol de registro no válido.');
  const token = await user.getIdTokenResult();
  const db = getFirestore(app);
  const referencia = doc(db, 'usuarios', user.uid);
  let perfil;
  await runTransaction(db, async transaction => {
    const documento = await transaction.get(referencia);
    const anterior = documento.exists() ? documento.data() : {};
    const datos = {
      uid: user.uid,
      usuario: anterior.usuario || anterior.Usuario || usuario.trim() || user.displayName || 'Usuario',
      email: user.email || '',
      proveedor: token.signInProvider,
      ultimoAcceso: serverTimestamp()
    };
    if (!documento.exists()) {
      datos.rol = rol;
      datos.creadoEn = serverTimestamp();
    }
    transaction.set(referencia, datos, { merge: true });
    perfil = { ...anterior, ...datos };
  });
  return perfil;
}
// Intenta guardar el perfil después de autenticar. Si Firestore falla, conserva la sesión y devuelve perfilPendiente para permitir un reintento.
async function completarAcceso(resultado, usuario = '', rol = 'Invitado') {
  try {
    const perfil = await guardarPerfilUsuario(resultado.user, usuario, rol);
    return { user: resultado.user, perfil, perfilPendiente: false };
  } catch (error) {
    // Una falla de Firestore no significa que falló la autenticación.
    return { user: resultado.user, perfilPendiente: true, perfilError: error.code || 'unknown', usuarioPendiente: usuario, rolPendiente: rol };
  }
}
// Valida nombre y rol, crea la cuenta en Authentication y completa su perfil en Firestore.
export async function registrarUsuario(usuario, email, passwd, rol) {
  if (!usuario.trim() || usuario.trim().length > 80 || !rolesRegistro.includes(rol)) {
    throw new Error('Revisa el usuario y el rol seleccionados.');
  }
  const resultado = await createUserWithEmailAndPassword(auth(), email.trim(), passwd);
  return completarAcceso(resultado, usuario, rol);
}
// Autentica con correo y contraseña y luego intenta completar el perfil del usuario.
export async function iniciarConCorreo(email, passwd) {
  const resultado = await signInWithEmailAndPassword(auth(), email.trim(), passwd);
  return completarAcceso(resultado);
}
// Abre el acceso con Google y completa el perfil; una cuenta nueva recibe el rol Invitado.
export async function iniciarConGoogle() {
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: 'select_account' });
  const resultado = await signInWithPopup(auth(), proveedor);
  return completarAcceso(resultado);
}
// Ejecuta callback cuando cambia la sesión y devuelve la función que permite cancelar esa suscripción.
export function observarSesion(callback) { return onAuthStateChanged(auth(), callback); }
// Solicita a Authentication cerrar la sesión; devuelve una promesa que puede fallar.
export function cerrarSesion() { return signOut(auth()); }
// Lee usuarios/{uid} de la sesión actual. Devuelve null si no hay sesión o documento.
export async function obtenerPerfil() {
  const user = auth().currentUser;
  if (!user) return null;
  const documento = await getDoc(doc(getFirestore(app), 'usuarios', user.uid));
  return documento.exists() ? documento.data() : null;
}
// Valida el nombre y actualiza el perfil autenticado junto con sus metadatos de acceso, sin modificar el rol.
export async function actualizarNombreUsuario(usuario) {
  const user = auth().currentUser;
  const nombre = usuario.trim();
  if (!user || !nombre || nombre.length > 80) throw new Error('Usuario no válido.');
  const token = await user.getIdTokenResult();
  await updateDoc(doc(getFirestore(app), 'usuarios', user.uid), {
    usuario: nombre,
    email: user.email || '',
    proveedor: token.signInProvider,
    ultimoAcceso: serverTimestamp()
  });
}

// Las consultas de inventario requieren respuesta del servidor, sin usar stock de caché.
// Consulta toda la colección productos en el servidor y devuelve un arreglo de objetos con su id de documento. Los errores se propagan a la pantalla.
export async function consultarProductos() {
  if (!app) throw new Error('Firebase no está disponible.');
  const snapshot = await getDocsFromServer(collection(getFirestore(app), 'productos'));
  return snapshot.docs.map(documento => ({ ...documento.data(), id: documento.id }));
}
// Lee productos/{id} directamente del servidor. Devuelve el objeto con su id, o null si ese documento no existe.
export async function consultarProducto(id) {
  if (!app) throw new Error('Firebase no está disponible.');
  const snapshot = await getDocFromServer(doc(getFirestore(app), 'productos', id));
  return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
}

// Administración: el permiso se verifica con el perfil del servidor y con las reglas.
export const rolesAdministrables = ['Invitado', 'Estudiante', 'Docente', 'Administrador'];

// Comprueba la sesión y el rol actual; nunca usa un rol enviado por el formulario.
export async function comprobarAdministrador() {
  const user = auth().currentUser;
  if (!user) throw Object.assign(new Error('Inicia sesión para administrar usuarios.'), { code: 'admin/sin-sesion' });
  const snapshot = await getDocFromServer(doc(getFirestore(app), 'usuarios', user.uid));
  if (auth().currentUser?.uid !== user.uid || !snapshot.exists() || snapshot.data().rol !== 'Administrador') {
    throw Object.assign(new Error('Tu cuenta no tiene permiso de administrador.'), { code: 'admin/sin-permiso' });
  }
  return user.uid;
}

// Devuelve únicamente los atributos que el panel necesita; omite campos antiguos o sensibles.
function resumirUsuario(documento) {
  const datos = documento.data();
  return {
    id: documento.id,
    usuario: typeof datos.usuario === 'string' ? datos.usuario : typeof datos.Usuario === 'string' ? datos.Usuario : '',
    email: typeof datos.email === 'string' ? datos.email : '',
    rol: typeof datos.rol === 'string' ? datos.rol : '',
    uid: typeof datos.uid === 'string' ? datos.uid : '',
    proveedor: typeof datos.proveedor === 'string' ? datos.proveedor : '',
    editable: datos.uid === documento.id && rolesAdministrables.includes(datos.rol)
  };
}

// Lee usuarios desde Firestore solo después de comprobar permisos; no usa datos de caché.
export async function listarUsuariosAdministracion() {
  const administrador = await comprobarAdministrador();
  const snapshot = await getDocsFromServer(collection(getFirestore(app), 'usuarios'));
  if (auth().currentUser?.uid !== administrador) throw Object.assign(new Error('La sesión cambió.'), { code: 'admin/sin-sesion' });
  return { administrador, usuarios: snapshot.docs.map(resumirUsuario) };
}

// Cambia solo nombre y rol. La transacción detecta ediciones simultáneas y registra quién guardó.
export async function actualizarUsuarioAdministracion(id, cambios, anterior) {
  const usuario = typeof cambios?.usuario === 'string' ? cambios.usuario.trim() : '';
  if (!id || typeof id !== 'string' || id.includes('/') || !usuario || usuario.length > 80 ||
      !rolesAdministrables.includes(cambios?.rol) || !anterior || typeof anterior.usuario !== 'string' || typeof anterior.rol !== 'string') {
    throw Object.assign(new Error('Revisa el nombre y el rol seleccionados.'), { code: 'admin/datos-invalidos' });
  }
  const administrador = await comprobarAdministrador();
  if (id === administrador && cambios.rol !== 'Administrador') {
    throw Object.assign(new Error('No puedes quitarte tu propio rol de administrador.'), { code: 'admin/rol-propio' });
  }
  const referencia = doc(getFirestore(app), 'usuarios', id);
  await runTransaction(getFirestore(app), async transaction => {
    const documento = await transaction.get(referencia);
    if (!documento.exists()) throw Object.assign(new Error('El usuario ya no existe.'), { code: 'admin/no-existe' });
    const actual = resumirUsuario(documento);
    if (!actual.editable) throw Object.assign(new Error('Este perfil antiguo requiere migración antes de editarlo.'), { code: 'admin/perfil-antiguo' });
    if (actual.usuario !== anterior.usuario || actual.rol !== anterior.rol) {
      throw Object.assign(new Error('Otro cambio modificó este perfil. Actualiza la lista antes de guardar.'), { code: 'admin/conflicto' });
    }
    if (auth().currentUser?.uid !== administrador) throw Object.assign(new Error('La sesión cambió.'), { code: 'admin/sin-sesion' });
    transaction.update(referencia, { usuario, rol: cambios.rol, actualizadoEn: serverTimestamp(), actualizadoPor: administrador });
  });
  return { usuario, rol: cambios.rol };
}

// Obtiene un token vigente sin exponer credenciales al código de administración.
export async function tokenAdministracion() {
  await comprobarAdministrador();
  return auth().currentUser.getIdToken();
}
