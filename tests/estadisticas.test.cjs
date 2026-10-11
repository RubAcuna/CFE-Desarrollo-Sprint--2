const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const hoyDate = new Date();
const hoy = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, '0')}-${String(hoyDate.getDate()).padStart(2, '0')}`;
const datos = {
  vistas: [
    { id: 'v1', pagina: 'producto', productoId: 'arduino', fecha: hoy },
    { id: 'v2', pagina: 'producto', productoId: 'microbit', fecha: '2026-01-01' },
    { id: 'v3', pagina: 'catalogo', fecha: hoy }
  ],
  compras: [
    { id: 'c1', productos: {
      arduino: { id: 'arduino', nombre: 'Kit Arduino', cantidad: 2, subtotal: 2400 },
      microbit: { id: 'microbit', nombre: 'Kit micro:bit', cantidad: 1, subtotal: 900 }
    } },
    { id: 'c2', productos: {
      arduino: { id: 'arduino', nombre: 'Kit Arduino', cantidad: 1, precio: 1200 }
    } }
  ],
  productos: [
    { id: 'arduino', nombre: 'Kit Arduino' },
    { id: 'microbit', nombre: 'Kit micro:bit' }
  ]
};
const almacenSesion = new Map(); let creadas = 0;
const documentos = lista => lista.map(item => ({ id: item.id, data: () => structuredClone(item) }));
const ctx = vm.createContext({
  console, sessionStorage: { getItem: clave => almacenSesion.get(clave) || null, setItem: (clave, valor) => almacenSesion.set(clave, valor) },
  initializeApp: () => ({}), getApps: () => [{}], getApp: () => ({}), getAuth: () => ({ currentUser: { uid: 'admin' } }),
  getFirestore: () => ({}), collection: (_db, col) => ({ col }), doc: (_db, col, id) => ({ col, id }),
  serverTimestamp: () => 'server-time',
  addDoc: async (_ref, vista) => { creadas++; datos.vistas.push({ id: `n${creadas}`, ...vista }); },
  getDocFromServer: async () => ({ exists: () => true, data: () => ({ rol: 'Administrador' }) }),
  getDocsFromServer: async ref => { const docs = documentos(datos[ref.col] || []); return { docs, size: docs.length }; }
});
const source = fs.readFileSync(require('path').join(__dirname, '../js/firebase.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '');
vm.runInContext(source, ctx);
const run = codigo => vm.runInContext(codigo, ctx);
(async () => {
  assert.equal(await run("registrarVistaProducto('esp32')"), true);
  assert.equal(await run("registrarVistaProducto('esp32')"), false);
  assert.equal(creadas, 1, 'una pestaña registra una sola visita diaria por kit');
  const resumen = await run('consultarEstadisticasAdministracion()');
  assert.equal(resumen.kits.visitasTotal, 3, 'ignora vistas generales sin productoId');
  assert.equal(resumen.kits.visitasHoy, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(resumen.kits.visitados)), [
    { id: 'esp32', nombre: 'esp32', cantidad: 1 },
    { id: 'arduino', nombre: 'Kit Arduino', cantidad: 1 },
    { id: 'microbit', nombre: 'Kit micro:bit', cantidad: 1 }
  ]);
  assert.equal(resumen.kits.vendidosTotal, 4);
  assert.equal(resumen.kits.ingresos, 4500);
  assert.deepEqual(JSON.parse(JSON.stringify(resumen.kits.vendidos)), [
    { id: 'arduino', nombre: 'Kit Arduino', cantidad: 3, ingresos: 3600 },
    { id: 'microbit', nombre: 'Kit micro:bit', cantidad: 1, ingresos: 900 }
  ]);
  console.log('OK estadísticas: visitas por kit y unidades vendidas desde compras confirmadas.');
})().catch(error => { console.error(error); process.exitCode = 1; });
