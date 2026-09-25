// Pruebas de catálogo y carrito con un servicio simulado: no escriben en Firebase real.
const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const root = require('path').resolve(__dirname, '..') + '/';
const read = p => fs.readFileSync(root + p, 'utf8');
const seed = JSON.parse(read('datos/productos-iniciales.json'));
for (const file of ['productos','carrito','catalogo','producto','destacados']) new vm.Script(read('js/' + file + '.js'));
let servidor = structuredClone(seed), falla = false, guardado = '[]', lecturas = 0, falloGuardar = false;
// Simula las lecturas del servidor y permite provocar errores de red de forma controlada.
const servicio = {
  async consultarProductos() { lecturas++; if (falla) throw Error('offline'); return structuredClone(servidor); },
  async consultarProducto(id) { if (falla) throw Error('offline'); return structuredClone(servidor.find(p => p.id === id) || null); }
};
const eventos = new Map();
const document = { addEventListener(n, fn) { if (!eventos.has(n)) eventos.set(n, []); eventos.get(n).push(fn); },
  dispatchEvent(e) { (eventos.get(e.type) || []).forEach(fn => fn(e)); }, querySelector() { return null; }, querySelectorAll() { return []; } };
// Ejecuta los scripts en un contexto aislado con DOM, almacenamiento y servicio simulados.
const ctx = vm.createContext({ servicioMock: servicio, document, window: { addEventListener() {} }, Event, Intl, URLSearchParams,
  localStorage: { getItem: () => guardado, setItem: (_, valor) => { if (falloGuardar) throw Error(); guardado = valor; } } });
// Sustituye la importación de Firebase por el servicio de prueba, sin cambiar los archivos de la aplicación.
vm.runInContext(read('js/productos.js').replaceAll("import('./firebase.js')", 'Promise.resolve(servicioMock)') + '\n' + read('js/carrito.js') + '\n' + read('js/catalogo.js'), ctx);
const run = s => vm.runInContext(s, ctx);
// Verifica carga compartida, búsqueda, orden y operaciones del carrito contra distintas respuestas del servidor.
(async () => {
  await Promise.all([run('Productos.cargar()'), run('Productos.cargar()')]);
  assert.equal(lecturas, 1);
  assert.equal(run('productos.length'), 9);
  assert.equal((await run('Productos.obtener("arduino")')).nombre, 'Kit Arduino');
  assert.equal(await run('Productos.obtener("no-existe")'), null);
  assert.equal(run('filtrarProductos(productos,"MICROBIT").length'), 1);
  assert.equal(run('ordenarProductos(productos,"precio-asc")[0].id'), 'robopro');
  assert.equal(run('ordenarProductos(productos,"precio-desc")[0].id'), 'spike');
  assert.equal((await run('Carrito.agregar("robopro")')).ok, true);
  assert.equal(run('Carrito.stockDisponible("robopro")'), 9);
  servidor[0].stock = 1;
  assert.equal((await run('Carrito.agregar("robopro")')).ok, false);
  assert.equal(run('Carrito.stockDisponible("robopro")'), 0);
  servidor[0].disponible = false;
  assert.equal((await run('Carrito.agregar("robopro")')).ok, false);
  servidor[0].disponible = true; servidor[0].stock = 3;
  assert.equal((await run('Carrito.cambiarCantidad("robopro", 4)')).ok, false);
  assert.equal((await run('Carrito.cambiarCantidad("robopro", 2)')).ok, true);
  assert.equal(run('Carrito.stockDisponible("robopro")'), 1);
  assert.equal((await run('Carrito.cambiarCantidad("robopro", 1)')).ok, true);
  assert.equal(run('Carrito.stockDisponible("robopro")'), 2);
  // Comprueba que los fallos de red o de almacenamiento no borren el carrito previamente guardado.
  const anterior = guardado;
  falla = true;
  assert.equal((await run('Carrito.agregar("robopro")')).ok, false);
  assert.equal(run('Productos.estado'), 'error');
  assert.equal(guardado, anterior);
  falla = false;
  await run('Productos.cargar()');
  falloGuardar = true;
  assert.equal((await run('Carrito.agregar("robopro")')).ok, false);
  assert.equal(guardado, anterior);
  falloGuardar = false;
  await run('Carrito.eliminar("robopro")');
  assert.equal(run('Carrito.stockDisponible("robopro")'), 3);
  servidor[0].stock = 1;
  // Dos altas simultáneas con una sola unidad disponible deben producir un único agregado exitoso.
  const concurrentes = await Promise.all([run('Carrito.agregar("robopro")'), run('Carrito.agregar("robopro")')]);
  assert.equal(concurrentes.filter(r => r.ok).length, 1);
  // Distingue una colección vacía de una respuesta con campos inválidos.
  servidor = [];
  await run('Productos.cargar({forzar:true})');
  assert.equal(run('productos.length'), 0);
  assert.equal((await run('Carrito.agregar("robopro")')).ok, false);
  servidor = [{ id:'invalido', nombre: null }];
  await assert.rejects(run('Productos.cargar({forzar:true})'));
  assert.equal(run('Productos.estado'), 'error');
  console.log('OK: consultas y reintento, búsqueda y orden, producto inexistente, catálogo vacío/inválido, stock vigente, no disponible, límites, restauración, error de red/almacenamiento y clics concurrentes.');
})().catch(error => { console.error(error); process.exitCode = 1; });

