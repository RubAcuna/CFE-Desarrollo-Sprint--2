// Checkout: exige una sesión autenticada, presenta el resumen y confirma la compra en Firestore.
'use strict';
document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);
  const formulario = $('formCheckout'), estado = $('estadoCheckout'), acceso = $('iniciarCheckout');
  let firebase, usuario = null, enviando = false;
  const dinero = valor => '$ ' + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(valor);
  const mensajeError = error => ({
    'compra/sin-sesion': 'Debes iniciar sesión para confirmar la compra.',
    'compra/sin-stock': error.message,
    'compra/carrito-invalido': 'El carrito cambió. Vuelve al carrito y revisa las cantidades.',
    'permission-denied': 'Firestore rechazó la compra. Revisa las reglas publicadas.'
  })[error.code] || error.message || 'No se pudo confirmar la compra. Intenta nuevamente.';

  function mostrarProductos() {
    const items = Carrito.leer(), lista = $('productosCheckout');
    lista.replaceChildren();
    let total = 0, valido = !!items.length;
    for (const item of items) {
      const producto = productos.find(p => p.id === item.id);
      if (!producto || !Number.isFinite(producto.precio) || item.cantidad > producto.stock || !producto.disponible) { valido = false; continue; }
      const subtotal = producto.precio * item.cantidad; total += subtotal;
      const fila = document.createElement('article'); fila.className = 'checkout-producto';
      const texto = document.createElement('span'); texto.textContent = `${producto.nombre} · ${item.cantidad} × ${dinero(producto.precio)}`;
      const importe = document.createElement('strong'); importe.textContent = dinero(subtotal);
      fila.append(texto, importe); lista.append(fila);
    }
    $('totalCompra').textContent = 'Total: ' + dinero(total) + ' UYU';
    $('confirmarCompra').disabled = !valido;
    return { items, valido };
  }

  function actualizarSesion(actual) {
    usuario = actual;
    acceso.hidden = !!actual;
    formulario.hidden = !actual || !Carrito.leer().length;
    $('checkoutVacio').hidden = !!Carrito.leer().length;
    estado.textContent = actual ? '' : 'Inicia sesión para completar la compra.';
    if (actual) mostrarProductos();
  }

  acceso.addEventListener('click', () => $('btnLoginPlaceholder').click());
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    if (enviando || !usuario || !formulario.reportValidity()) return;
    const resumen = mostrarProductos(); if (!resumen.valido) { estado.textContent = 'Revisa el stock del carrito antes de continuar.'; return; }
    const datos = Object.fromEntries(new FormData(formulario));
    enviando = true; $('confirmarCompra').disabled = true; $('resultadoCompra').textContent = 'Confirmando compra…';
    try {
      const compra = await firebase.confirmarCompra(resumen.items, {
        nombreCompleto: datos.nombreCompleto, departamento: datos.departamento, ciudad: datos.ciudad,
        direccion: datos.direccion, telefono: datos.telefono, rut: datos.rut || ''
      }, datos.medioPago);
      await Carrito.vaciar(); formulario.hidden = true; estado.textContent = '';
      $('detalleConfirmacion').textContent = `Compra ${compra.id} registrada por ${dinero(compra.total)} UYU. Medio de pago: ${compra.medioPago}.`;
      $('compraConfirmada').hidden = false; $('compraConfirmada').focus();
    } catch (error) { $('resultadoCompra').textContent = mensajeError(error); }
    finally { enviando = false; if (!formulario.hidden) $('confirmarCompra').disabled = false; }
  });

  try {
    await Productos.cargar({ forzar: true });
    firebase = await import('./firebase.js');
    firebase.observarSesion(actualizarSesion);
    mostrarProductos();
  } catch { estado.textContent = 'No se pudo cargar el inventario. Revisa tu conexión e intenta nuevamente.'; }
});
