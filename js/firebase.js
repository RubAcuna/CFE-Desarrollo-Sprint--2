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
export let app = null;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.error('No se pudo inicializar Firebase:', error);
}
function auth() {
  if (!app) throw new Error('Firebase no está disponible.');
  return getAuth(app);
}
const rolesRegistro = ['Estudiante', 'Docente', 'Invitado'];

// Firestore almacena perfiles; las contraseñas pertenecen a Firebase Authentication.
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
async function completarAcceso(resultado, usuario = '', rol = 'Invitado') {
  try {
    const perfil = await guardarPerfilUsuario(resultado.user, usuario, rol);
    return { user: resultado.user, perfil, perfilPendiente: false };
  } catch (error) {
    // Una falla de Firestore no significa que falló la autenticación.
    return { user: resultado.user, perfilPendiente: true, perfilError: error.code || 'unknown', usuarioPendiente: usuario, rolPendiente: rol };
  }
}
export async function registrarUsuario(usuario, email, passwd, rol) {
  if (!usuario.trim() || usuario.trim().length > 80 || !rolesRegistro.includes(rol)) {
    throw new Error('Revisa el usuario y el rol seleccionados.');
  }
  const resultado = await createUserWithEmailAndPassword(auth(), email.trim(), passwd);
  return completarAcceso(resultado, usuario, rol);
}
export async function iniciarConCorreo(email, passwd) {
  const resultado = await signInWithEmailAndPassword(auth(), email.trim(), passwd);
  return completarAcceso(resultado);
}
export async function iniciarConGoogle() {
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: 'select_account' });
  const resultado = await signInWithPopup(auth(), proveedor);
  return completarAcceso(resultado);
}
export function observarSesion(callback) { return onAuthStateChanged(auth(), callback); }
export function cerrarSesion() { return signOut(auth()); }
export async function obtenerPerfil() {
  const user = auth().currentUser;
  if (!user) return null;
  const documento = await getDoc(doc(getFirestore(app), 'usuarios', user.uid));
  return documento.exists() ? documento.data() : null;
}
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
export async function consultarProductos() {
  if (!app) throw new Error('Firebase no está disponible.');
  const snapshot = await getDocsFromServer(collection(getFirestore(app), 'productos'));
  return snapshot.docs.map(documento => ({ ...documento.data(), id: documento.id }));
}
export async function consultarProducto(id) {
  if (!app) throw new Error('Firebase no está disponible.');
  const snapshot = await getDocFromServer(doc(getFirestore(app), 'productos', id));
  return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
}
