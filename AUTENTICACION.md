# Acceso y perfiles de Robotech

- `js/firebase.js`: conexión compartida, Firebase Authentication y operaciones de Firestore.
- `js/login.js`: modal de acceso, registro, Google, sesión persistente y cierre de sesión.
- `js/perfil.js`: consulta del perfil autenticado y actualización del nombre de usuario.
- `firestore.rules`: cada usuario puede leer su propio documento y modificar su nombre, sin cambiar su rol.

## Modelo de datos

Cada cuenta guarda el perfil en `usuarios/{uid}`, donde `uid` es el identificador de Firebase Authentication. Los campos son `usuario`, `email`, `rol`, `uid`, `proveedor`, `creadoEn` y `ultimoAcceso`.

La contraseña se envía exclusivamente a Firebase Authentication. No se guarda `passwd` en Firestore.

El registro admite Estudiante, Docente e Invitado. Google crea perfiles Invitado. El responsable puede asignar Administrador desde la consola de Firebase en el documento correspondiente al UID; el navegador no puede conceder ese rol. Los roles guardados no conceden por sí solos permisos sobre otros recursos: cada recurso requiere reglas propias.

## Usuarios anteriores

Los documentos antiguos con ID aleatorio y `passwd` no son cuentas de Authentication y no se usan para validar contraseñas. Para migrar una cuenta, registrarla mediante Authentication y trasladar sus datos al documento `usuarios/{uid}` desde un entorno administrativo. No copiar contraseñas al nuevo documento. El documento anterior no se elimina automáticamente.

## Uso local

Abrir el sitio con Live Server usando localhost (no mediante file://). Correo/contraseña y Google deben estar habilitados en Authentication. El dominio de GitHub Pages es rubacuna.github.io.

Las pruebas de interfaz y del servicio con SDK simulado validan registro, roles, manejo de errores y separación de perfiles. La prueba completa con una cuenta real debe realizarla el titular de la cuenta.
