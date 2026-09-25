Robotech

Slogan: "Construimos el futuro, activamos tu potencial."

# Descripción del proyecto

Robotech es una tienda en línea especializada en kits, componentes y recursos educativos de robótica y programación. Su objetivo es facilitar el acceso a herramientas tecnológicas que permitan aprender mediante la experimentación, la construcción y la resolución de problemas.

# Nombre de la tienda

Robotech

El nombre combina los conceptos de robótica y tecnología. Es breve, fácil de recordar y representa claramente la actividad principal de la tienda.

# Temática del e-commerce

La tienda estará dedicada a la "robótica educativa, la electrónica y la programación". El sitio ofrecerá productos para aprender, crear prototipos y desarrollar proyectos tecnológicos desde un nivel inicial hasta uno avanzado.

# Productos

Robotech ofrecerá inicialmente:

- Kits de robótica educativa.
- Kits compatibles con Arduino, micro:bit, Raspberry Pi y ESP32.
- Kits modulares de construcción tipo SPIKE y EV3.
- Robots programables.
- Sensores, motores, servomotores y controladores.
- Placas de desarrollo y módulos electrónicos.
- Cables, protoboards, baterías y accesorios.
- Materiales y recursos para cursos de robótica.

# Público objetivo

La tienda está dirigida a:

- Docentes, Educadores,  colegios, liceos e  interesados en tecnología.
- Estudiantes de educación técnica y universitaria.
- Familias que buscan experiencias educativas prácticas.
- Personas aficionadas a la electrónica y al movimiento *maker*.
- Principiantes que desean aprender programación y robótica.
- Usuarios avanzados que desarrollan prototipos y proyectos de IoT.

# Estilo de comunicación

La comunicación de Robotech será:

- Clara, cercana y motivadora.
- Educativa, sin utilizar tecnicismos innecesarios.
- Dinámica y orientada a la acción.
- Inclusiva para personas con distintos niveles de experiencia.
- Enfocada en crear, programar, experimentar y aprender.

Ejemplos de mensajes:

- “Crea, programa, transforma.”
- “Convierte tus ideas en proyectos reales.”
- “Aprende robótica construyendo.”
- “Construimos el futuro, activamos tu potencial.”

# Colores principales

| Color | Código | Aplicación |

| Azul marino | `#06195C` | Logotipo, títulos y fondos destacados |
| Cian eléctrico | `#00BDE7` | Botones, enlaces y elementos tecnológicos |
| Magenta | `#EC0AA6` | Acentos, llamadas a la acción y detalles visuales |
| Blanco | `#FFFFFF` | Fondo principal y espacios de descanso visual |
| Gris claro | `#F3F6FC` | Secciones secundarias, tarjetas y formularios |
| Gris de texto | `#667085` | Párrafos y textos complementarios |

# Tipografías

- **Títulos:** Montserrat, en pesos 700 u 800.
- **Textos y controles:** Inter, en pesos 400, 500 y 600.
- **Alternativas del sistema:** Arial, Helvetica y sans-serif.

Las tipografías seleccionadas ofrecen una apariencia moderna, tecnológica y legible en computadoras y dispositivos móviles.

# Logotipo e identificación visual

La identificación visual utiliza la palabra "Robotech" en azul marino, con detalles en cian y magenta. La marca también cuenta con un robot azul de cuatro ruedas como mascota.

La identidad debe conservar:

- Formas geométricas y detalles inspirados en circuitos.
- Fondos limpios y composiciones con suficiente espacio.
- Uso consistente del azul, cian y magenta.
- Fotografías o ilustraciones claras de los productos.
- Botones y llamadas a la acción con alto contraste.

# Categorías iniciales

1. Kits Arduino
2. Kits micro:bit
3. Kits Raspberry Pi
4. Kits ESP32 e IoT
5. Kits SPIKE y EV3
6. Robots y autos programables
7. Sensores y módulos
8. Motores y movimiento
9. Placas y componentes
10. Accesorios y herramientas
11. Cursos y recursos educativos

# Objetivo de la tienda

Robotech busca convertirse en un punto de encuentro para estudiantes, docentes y creadores. La tienda no solo venderá productos: también ayudará a sus clientes a elegir el kit adecuado, comprender sus posibilidades y comenzar a desarrollar proyectos propios.

# Acceso y perfiles de Robotech

- `js/firebase.js`: conexión compartida, Firebase Authentication y operaciones de Firestore.
- `js/login.js`: modal de acceso, registro, Google, sesión persistente y cierre de sesión.
- `js/perfil.js`: consulta del perfil autenticado y actualización del nombre de usuario.
- `firestore.rules`: cada usuario puede leer su propio documento y modificar su nombre, sin cambiar su rol.

## Modelo de datos

Cada cuenta guarda el perfil en `usuarios/{uid}`, donde `uid` es el identificador de Firebase Authentication. Los campos son `usuario`, `email`, `rol`, `uid`, `proveedor`, `creadoEn` y `ultimoAcceso`.

La contraseña se envía exclusivamente a Firebase Authentication. No se guarda `passwd` en Firestore.

El registro admite Estudiante, Docente e Invitado. Google crea perfiles Invitado. El responsable puede asignar Administrador desde la consola de Firebase en el documento correspondiente al UID; el registro público no puede conceder ese rol. Una cuenta Administrador puede asignarlo desde el panel de administración cuando sus reglas estén publicadas. Los roles guardados no conceden por sí solos permisos sobre otros recursos: cada recurso requiere reglas propias.

## Usuarios anteriores

Los documentos antiguos con ID aleatorio y `passwd` no son cuentas de Authentication y no se usan para validar contraseñas. Para migrar una cuenta, registrarla mediante Authentication y trasladar sus datos al documento `usuarios/{uid}` desde un entorno administrativo. No copiar contraseñas al nuevo documento. El documento anterior no se elimina automáticamente.

## Uso local

Abrir el sitio con Live Server usando localhost (no mediante file://). Correo/contraseña y Google deben estar habilitados en Authentication. El dominio de GitHub Pages es rubacuna.github.io.

Las pruebas de interfaz y del servicio con SDK simulado validan registro, roles, manejo de errores y separación de perfiles. La prueba completa con una cuenta real debe realizarla el titular de la cuenta.



## Catálogo en Firestore

La colección pública es `productos` en `robotech-8afa0`. El identificador del documento es la referencia usada en los enlaces (por ejemplo, `arduino`). Cada documento contiene:

- `nombre`, `descripcion` y `categoria`: texto.
- `precio`: número en UYU; `stock`: entero no negativo.
- `disponible`: booleano.
- `imagenes`: lista de rutas del proyecto (`img/…`) o URLs HTTPS; la primera se usa en tarjetas.
- `caracteristicas`: lista de textos, mostrada en la ficha si contiene elementos.

La carga inicial de nueve kits está documentada en `datos/productos-iniciales.json`. Conserva el stock de ejemplo de 10 unidades; las características están vacías hasta incorporar especificaciones verificadas. Este archivo no se usa como respaldo en la tienda: los datos mostrados proceden de Firestore.

Inicio, catálogo, ficha y carrito comparten las consultas de `js/productos.js`, a través de `js/firebase.js`. La búsqueda, los filtros por categoría y disponibilidad y los cuatro órdenes se aplican a los productos recuperados. Las consultas fallidas muestran un aviso y permiten reintentar.

Antes de agregar o cambiar cantidades se consulta nuevamente el inventario del servidor. Las unidades en el carrito reducen la disponibilidad mostrada únicamente en ese navegador; no son una reserva global ni descuentan el inventario de otros clientes. El checkout sigue siendo una demostración. Una compra real requiere transacciones de inventario y pedidos en un backend confiable.

Las reglas permiten leer productos sin iniciar sesión y bloquean escrituras desde clientes web. Los productos se administran desde la consola o con credenciales administrativas. Las reglas de perfiles permiten a cada usuario editar su nombre y a los administradores gestionar nombre y rol. Para desplegar las reglas con Firebase CLI autenticado: `firebase deploy --only firestore:rules --project robotech-8afa0`.

Pruebas de integración con servicio simulado: `node tests/firestore.test.cjs`. Cubren consultas, reintentos, catálogo vacío, documento inexistente, búsqueda, orden, stock vigente, errores y operaciones concurrentes. Servir el proyecto por HTTP para probarlo contra Firebase.


## Administración con Firebase real

La página usa exclusivamente Authentication y las colecciones usuarios y productos de robotech-8afa0. No hay datos de respaldo ni cuentas de demostración.

Ejecutar iniciar.ps1 para abrir http://127.0.0.1:5000/admin.html. El script usa Firebase en la nube. Para habilitar operaciones administrativas, proporcionar -Credencial con la ruta a una credencial de servidor autorizada, guardada fuera del proyecto. Sin ella la página permite iniciar sesión, pero la API administrativa no se activa ni devuelve usuarios de prueba.

El navegador consulta su propio perfil de Firebase para comprobar el rol Administrador. La API en 127.0.0.1:5050 verifica Authentication y rol en cada operación. Los formularios permiten altas, bajas y modificaciones de productos y cuentas, con validaciones y detección de conflictos. Las cuentas y contraseñas se gestionan con Authentication; los perfiles se guardan en usuarios/{uid}. No se almacena ninguna contraseña en Firestore.

No ejecutar pruebas de escritura contra producción. Las pruebas simuladas siguen disponibles en tests/administracion.test.cjs y tests/firestore.test.cjs.

## Publicación en GitHub Pages

GitHub Pages publica el sitio estático y el catálogo consulta Firestore. La administración requiere el servidor Node de iniciar.ps1, que se ejecuta en el equipo y no en Pages. Para administrarlo remotamente se necesita desplegar el backend en un alojamiento compatible con Node y configurar su URL y orígenes autorizados. No se publican .servidor.json, claves privadas ni dependencias instaladas.
