const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict'), path = require('path');
let usuario = { uid: 'u1', email: 'cliente@example.test' }, secuencia = 0;
const documentos = new Map([
  ['productos/kit-a', { nombre: 'Kit A', precio: 100, stock: 3, disponible: true }],
  ['productos/kit-b', { nombre: 'Kit B', precio: 50, stock: 1, disponible: true }]
]);
const ref = (coleccion, id) => ({ coleccion, id, clave: coleccion + '/' + id });
const snapshot = referencia => ({ exists: () => documentos.has(referencia.clave), data: () => structuredClone(documentos.get(referencia.clave)) });
const ctx = vm.createContext({
  console, structuredClone,
  initializeApp: () => ({ options: {} }), getApps: () => [{}], getApp: () => ({ options: {} }), deleteApp: async () => {},
  getAuth: () => ({ currentUser: usuario }), createUserWithEmailAndPassword: async () => {}, signInWithEmailAndPassword: async () => {},
  GoogleAuthProvider: function () {}, signInWithPopup: async () => {}, onAuthStateChanged: () => {}, signOut: async () => {},
  deleteUser: async () => {}, inMemoryPersistence: {}, setPersistence: async () => {}, getFirestore: () => ({}),
  collection: (_db, nombre) => ({ coleccion: nombre }),
  doc: (a, b, c) => b === undefined ? ref(a.coleccion, 'compra-' + (++secuencia)) : ref(b, c),
  getDocsFromServer: async () => ({ docs: [] }), getDocFromServer: async r => snapshot(r), getDoc: async r => snapshot(r), updateDoc: async () => {},
  serverTimestamp: () => 'fecha-servidor',
  runTransaction: async (_db, trabajo) => {
    const cambios = [];
    const resultado = await trabajo({
      get: async r => snapshot(r),
      update: (r, datos) => cambios.push(() => documentos.set(r.clave, { ...documentos.get(r.clave), ...datos })),
      set: (r, datos) => cambios.push(() => documentos.set(r.clave, structuredClone(datos)))
    });
    cambios.forEach(aplicar => aplicar());
    return resultado;
  }
});
const source = fs.readFileSync(path.resolve(__dirname, '../js/firebase.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '');
vm.runInContext(source, ctx);
const confirmar = (items, envio, pago) => vm.runInContext('confirmarCompra', ctx)(items, envio, pago);
const envio = { nombreCompleto: 'Cliente Prueba', departamento: 'Rivera', ciudad: 'Rivera', direccion: 'Calle 1', telefono: '099000000', rut: '' };

(async () => {
  const compra = await confirmar([{ id: 'kit-a', cantidad: 2 }, { id: 'kit-b', cantidad: 1 }], envio, 'Mercado Pago');
  assert.equal(compra.total, 250); assert.equal(documentos.get('productos/kit-a').stock, 1);
  assert.equal(documentos.get('productos/kit-b').stock, 0); assert.equal(documentos.get('productos/kit-b').disponible, false);
  const guardada = documentos.get('compras/' + compra.id);
  assert.equal(guardada.usuarioId, 'u1'); assert.equal(guardada.medioPago, 'Mercado Pago'); assert.equal(guardada.fecha, 'fecha-servidor');
  assert.equal(guardada.productos['kit-a'].cantidad, 2);
  const antes = structuredClone(documentos.get('productos/kit-a'));
  await assert.rejects(confirmar([{ id: 'kit-a', cantidad: 2 }], envio, 'eBROU'), error => error.code === 'compra/sin-stock');
  assert.deepEqual(documentos.get('productos/kit-a'), antes);
  usuario = null;
  await assert.rejects(confirmar([{ id: 'kit-a', cantidad: 1 }], envio, 'eBROU'), error => error.code === 'compra/sin-sesion');
  console.log('OK compra: registro asociado, total, descuento atómico, disponibilidad, falta de stock y sesión requerida.');
})().catch(error => { console.error(error); process.exitCode = 1; });
