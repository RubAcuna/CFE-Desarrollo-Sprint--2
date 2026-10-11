const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const hoyDate = new Date();
const hoy = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, '0')}-${String(hoyDate.getDate()).padStart(2, '0')}`;
const datos = {
  vistas: [
    { id: 'v1', pagina: 'inicio', fecha: hoy },
    { id: 'v2', pagina: 'catalogo', fecha: '2026-01-01' }
  ],
  compras: [
    { id: 'c1', productos: {
      'curso-directo': { id: 'curso-directo', nombre: 'Curso inicial', categoria: 'Cursos', cantidad: 2, subtotal: 2400 },
      kit: { id: 'kit', nombre: 'Kit Arduino', categoria: 'Kits Arduino', cantidad: 1, subtotal: 900 }
    } },
    { id: 'c2', productos: {
      'curso-anterior': { id: 'curso-anterior', nombre: 'Programación', cantidad: 1, subtotal: 1500 }
    } }
  ],
  productos: [
    { id: 'curso-anterior', nombre: 'Programación', categoria: 'Cursos y recursos educativos' },
    { id: 'kit', nombre: 'Kit Arduino', categoria: 'Kits Arduino' }
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
  assert.equal(await run("registrarVistaPagina('inicio')"), true);
  assert.equal(await run("registrarVistaPagina('inicio')"), false);
  assert.equal(creadas, 1, 'una pestaña registra una sola vista diaria por página');
  const resumen = await run('consultarEstadisticasAdministracion()');
  assert.equal(resumen.vistas.total, 3);
  assert.equal(resumen.vistas.hoy, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(resumen.vistas.paginas)), [
    { pagina: 'inicio', cantidad: 2 }, { pagina: 'catalogo', cantidad: 1 }
  ]);
  assert.equal(resumen.cursos.pedidos, 2);
  assert.equal(resumen.cursos.unidades, 3);
  assert.equal(resumen.cursos.ingresos, 3900);
  assert.equal(resumen.cursos.productos.length, 2);
  console.log('OK estadísticas: vista diaria anónima, agrupación por página y ventas de cursos actuales o históricas.');
})().catch(error => { console.error(error); process.exitCode = 1; });
