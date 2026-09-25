// Administración del proyecto real; nunca conecta con emuladores.
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIRESTORE_EMULATOR_HOST;
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const http = require('node:http');
// Lee el archivo privado explícitamente: evita la resolución de rutas de ADC que falla en Windows.
let credential;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const serviceAccount = JSON.parse(require('node:fs').readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8').replace(/^\uFEFF/, ''));
  if (serviceAccount.type !== 'service_account' || serviceAccount.project_id !== 'robotech-8afa0') throw new Error('La credencial no corresponde a robotech-8afa0.');
  credential = cert(serviceAccount);
} else credential = applicationDefault();
initializeApp({ projectId: 'robotech-8afa0', credential });
const auth = getAuth(), db = getFirestore();
const roles = ['Invitado', 'Estudiante', 'Docente', 'Administrador'];
const sitePort = 5000, apiPort = 5050;
const origins = new Set([`http://127.0.0.1:${sitePort}`, `http://localhost:${sitePort}`]);
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function text(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`Revisa ${label}.`);
  return value.trim();
}
function product(data) {
  const out = { nombre: text(data.nombre, 150, 'el nombre'), descripcion: text(data.descripcion, 5000, 'la descripción'), categoria: text(data.categoria, 100, 'la categoría') };
  if (!Number.isFinite(data.precio) || data.precio < 0 || data.precio > 100000000) fail('Precio inválido.');
  if (!Number.isSafeInteger(data.stock) || data.stock < 0 || data.stock > 100000000) fail('Stock inválido.');
  if (typeof data.disponible !== 'boolean') fail('Disponibilidad inválida.');
  for (const key of ['imagenes', 'caracteristicas']) {
    if (!Array.isArray(data[key]) || data[key].length > 50 || data[key].some(v => typeof v !== 'string' || !v.trim() || v.length > 2000)) fail(`Revisa ${key}.`);
    out[key] = data[key].map(v => v.trim());
  }
  if (!out.imagenes.length || out.imagenes.some(v => !/^(img\/[\w./ -]+|https:\/\/[^\s]+)$/.test(v) || v.includes('..'))) fail('Usa imágenes HTTPS o rutas img/ del proyecto.');
  return { ...out, precio: data.precio, stock: data.stock, disponible: data.disponible };
}
function user(data, creating) {
  const out = { usuario: text(data.usuario, 80, 'el nombre'), email: text(data.email, 254, 'el correo'), rol: data.rol };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email) || !roles.includes(out.rol)) fail('Correo o rol inválidos.');
  if (creating && (typeof data.password !== 'string' || data.password.length < 6 || data.password.length > 128)) fail('La contraseña debe tener entre 6 y 128 caracteres.');
  return out;
}
const revision = snap => snap.updateTime?.toDate().toISOString() + ':' + snap.updateTime?.nanoseconds;
function checkRevision(snap, value) {
  if (!snap.exists) fail('El registro ya no existe. Actualiza la lista.', 404);
  if (typeof value !== 'string' || revision(snap) !== value) fail('Otro cambio modificó el registro. Actualiza la lista antes de continuar.', 409);
}
// Comprueba el token, la cuenta activa y el rol real en cada solicitud.
async function authorize(req) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) fail('Inicia sesión como administrador.', 401);
  let decoded;
  try { decoded = await auth.verifyIdToken(token, true); } catch { fail('La sesión no es válida. Inicia sesión nuevamente.', 401); }
  const profile = await db.doc(`usuarios/${decoded.uid}`).get();
  if (profile.data()?.rol !== 'Administrador') fail('No tienes permiso de administrador.', 403);
  return decoded.uid;
}
async function list(collection, uid) {
  const docs = await db.collection(collection).get();
  if (collection === 'productos') return { administrador: uid, items: docs.docs.map(d => ({ ...d.data(), id: d.id, revision: revision(d) })) };
  // No se devuelven contraseñas, hashes ni atributos privados de Authentication.
  const accounts = new Map(); let page;
  do { const result = await auth.listUsers(1000, page); result.users.forEach(u => accounts.set(u.uid, u)); page = result.pageToken; } while (page);
  return { administrador: uid, items: docs.docs.map(d => {
    const p = d.data(), a = accounts.get(d.id);
    return { id: d.id, uid: d.id, usuario: p.usuario || p.Usuario || '', email: a?.email || p.email || '', rol: p.rol || '', proveedor: p.proveedor || '', revision: revision(d), editable: !!a && p.uid === d.id };
  }) };
}
async function mutate(collection, method, id, body, administrator) {
  if (collection === 'productos') {
    const data = method === 'DELETE' ? null : product(body);
    if (method === 'POST') {
      id = text(body.id, 80, 'el identificador');
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail('El ID admite minúsculas, números y guiones.');
    }
    const ref = db.collection(collection).doc(id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (method === 'POST') { if (snap.exists) fail('Ya existe un producto con ese ID.', 409); }
      else checkRevision(snap, body.revision);
      if (method === 'DELETE') tx.delete(ref);
      else tx.set(ref, { ...data, actualizadoEn: FieldValue.serverTimestamp(), actualizadoPor: administrator }, { merge: method !== 'POST' });
    });
    return;
  }
  if (method === 'POST') {
    const data = user(body, true);
    const account = await auth.createUser({ email: data.email, password: body.password, displayName: data.usuario });
    try { await db.doc(`usuarios/${account.uid}`).create({ ...data, uid: account.uid, proveedor: 'password', creadoEn: FieldValue.serverTimestamp(), actualizadoEn: FieldValue.serverTimestamp(), actualizadoPor: administrator }); }
    catch (error) { await auth.deleteUser(account.uid); throw error; }
    return;
  }
  const ref = db.doc(`usuarios/${id}`), snap = await ref.get();
  checkRevision(snap, body.revision);
  const account = await auth.getUser(id);
  if (id === administrator && (method === 'DELETE' || body.rol !== 'Administrador')) fail('No puedes eliminar tu cuenta ni quitarte el rol de administrador.');
  if (method === 'DELETE') {
    // Se deshabilita primero para impedir accesos durante la baja. Si falla, se restaura.
    await auth.updateUser(id, { disabled: true });
    try { await ref.delete({ lastUpdateTime: snap.updateTime }); }
    catch (error) { await auth.updateUser(id, { disabled: account.disabled }); throw error; }
    try { await auth.deleteUser(id); }
    catch (error) { await ref.create(snap.data()); await auth.updateUser(id, { disabled: account.disabled }); throw error; }
    return;
  }
  const data = user(body, false);
  await auth.updateUser(id, { email: data.email, displayName: data.usuario });
  try { await ref.update({ ...data, actualizadoEn: FieldValue.serverTimestamp(), actualizadoPor: administrator }, { lastUpdateTime: snap.updateTime }); }
  catch (error) { await auth.updateUser(id, { email: account.email, displayName: account.displayName || '' }); throw error; }
}
// Las mutaciones se serializan y vuelven a comprobar permisos al tomar su turno.
let queue = Promise.resolve();
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
  try {
    if (req.headers.origin && !origins.has(req.headers.origin)) fail('Origen no permitido.', 403);
    if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return reply(204, null);
    const match = req.url.match(/^\/api\/(usuarios|productos)(?:\/([A-Za-z0-9_-]{1,128}))?$/);
    if (!match) fail('Ruta no encontrada.', 404);
    const [, collection, id] = match;
    if (req.method === 'GET' && !id) return reply(200, await list(collection, await authorize(req)));
    if (!['POST', 'PUT', 'DELETE'].includes(req.method) || (req.method === 'POST' ? !!id : !id)) fail('Operación no válida.', 405);
    let raw = '';
    for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 150000) fail('Formulario demasiado grande.', 413); }
    let body; try { body = JSON.parse(raw); } catch { fail('Formulario inválido.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Formulario inválido.');
    const operation = queue.then(async () => mutate(collection, req.method, id, body, await authorize(req)));
    queue = operation.catch(() => {});
    await operation; reply(200, { ok: true });
  } catch (error) {
    const known = { 'auth/email-already-exists': 'Ya existe una cuenta con ese correo.', 'auth/user-not-found': 'La cuenta ya no existe.', 'auth/invalid-email': 'Correo inválido.' };
    const status = error.status || (known[error.code] ? 400 : 500);
    reply(status, { error: error.status ? error.message : known[error.code] || 'No se pudo completar la operación. Comprueba la conexión y actualiza la lista.' });
  }
});
async function start() {
  {
    // Pruebas de lectura antes de habilitar la interfaz. No crean ni modifican datos.
    await auth.listUsers(1);
    await db.collection('usuarios').limit(1).get();
  }
  server.listen(apiPort, '127.0.0.1', () => console.log('API administrativa lista en 127.0.0.1:' + apiPort));

}
start().catch(() => {
  console.error('No se pudo autorizar el acceso a robotech-8afa0. Configura credenciales de servidor con permisos de Firebase Authentication y Firestore; consulta README.md. No se modificaron datos.');
  process.exitCode = 1;
});
