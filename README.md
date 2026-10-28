# Robotech

Tienda web de kits y componentes de robótica educativa para que estudiantes, docentes y familias aprendan creando proyectos.

**Sitio publicado:** https://rubacuna.github.io/CFE-Desarrollo-Sprint--2/

## Funcionalidades principales

- Catálogo con búsqueda, filtros, fichas de producto, carrito y control de stock.
- Registro e inicio de sesión con correo y contraseña o Google.
- Compras confirmadas, historial de compras propio y reseñas de productos.
- Panel administrativo con gestión de productos, usuarios, pedidos y estadísticas de visitas y ventas.

## Tecnologías y servicios

- HTML, CSS, JavaScript y Bootstrap 5.
- Firebase Authentication para las sesiones y Firebase Firestore para los perfiles, productos, pedidos y reseñas.
- Cloudinary para almacenar imágenes cargadas desde el panel de productos.
- GitHub Pages para publicar el sitio estático.

## Roles

- **Visitante:** puede recorrer el catálogo; debe iniciar sesión para confirmar una compra.
- **Invitado:** inicia sesión con Google y puede usar las funciones de cliente asociadas a su propia cuenta.
- **Estudiante y Docente:** perfiles registrados con correo; pueden gestionar su perfil, comprar, consultar sus compras y publicar sus reseñas. El rol identifica el perfil y no concede permisos administrativos.
- **Administrador:** puede utilizar las operaciones de administración descritas abajo.

## Operaciones del administrador

- Crear y editar usuarios y asignar roles; eliminar perfiles de Firestore. Esto no elimina las cuentas de Firebase Authentication.
- Crear, editar y eliminar productos, incluido el stock, la disponibilidad y las imágenes.
- Consultar pedidos confirmados y actualizar su estado logístico, transportista, número de seguimiento y notas. El pago y el importe del pedido no se pueden modificar desde el panel.
- Consultar estadísticas de visitas, kits vendidos, ingresos por kit y ventas cronológicas.

## Cuentas de evaluación

Se deben usar cuentas dedicadas a la evaluación, una con rol cliente y otra con rol administrador. **Los identificadores de ambas cuentas están pendientes de confirmación.** Las contraseñas y demás datos de acceso se compartirán por un canal privado, nunca en este README.

## Limitaciones conocidas

- El checkout registra el pedido y el medio de pago elegido; no procesa cobros reales.
- El seguimiento del envío se actualiza manualmente y no está conectado a servicios de transportistas.
- El sitio es estático: Authentication y Firestore dependen de la configuración y las reglas de Firebase, y de que GitHub Pages esté autorizado como dominio.
- Eliminar un perfil desde el panel no elimina ni bloquea la cuenta de Authentication.
- Los datos de productos e inventario dependen de Firestore; el archivo de productos iniciales es de ejemplo.
