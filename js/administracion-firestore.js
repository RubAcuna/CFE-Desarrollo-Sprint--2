// Operaciones directas de Firestore; las reglas verifican permisos en el servidor de Firebase.
import { app, comprobarAdministrador } from './firebase.js';
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, deleteUser, signOut, inMemoryPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, getDocsFromServer, doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
const db=getFirestore(app), roles=['Invitado','Estudiante','Docente','Administrador'];
function fallo(message){throw new Error(message);}
function texto(v,max){if(typeof v!=='string'||!v.trim()||v.trim().length>max)fallo('Revisa los campos de texto.');return v.trim();}
function producto(d){
 const p={nombre:texto(d.nombre,150),descripcion:texto(d.descripcion,5000),categoria:texto(d.categoria,100),precio:d.precio,stock:d.stock,disponible:d.disponible};
 if(!Number.isFinite(p.precio)||p.precio<0||p.precio>100000000||!Number.isSafeInteger(p.stock)||p.stock<0||p.stock>100000000||typeof p.disponible!=='boolean')fallo('Precio, stock o disponibilidad inválidos.');
 for(const k of ['imagenes','caracteristicas']){if(!Array.isArray(d[k])||d[k].length>50)fallo('Lista inválida.');p[k]=d[k].map(v=>texto(v,2000));}
 if(!p.imagenes.length||p.imagenes.some(v=>!(/^(https:\/\/[^\s]+|img\/[\w./ -]+)$/.test(v))||v.includes('..')))fallo('Usa imágenes HTTPS o rutas img/ del proyecto.');
 return p;
}
function perfil(d){const usuario=texto(d.usuario,80);if(!roles.includes(d.rol))fallo('Rol inválido.');return{usuario,rol:d.rol};}
// La revisión incluye los campos editables y la marca de tiempo para detectar ediciones simultáneas.
function revision(d){return JSON.stringify([d.usuario,d.email,d.rol,d.uid,d.proveedor,d.nombre,d.descripcion,d.categoria,d.precio,d.stock,d.disponible,d.imagenes,d.caracteristicas,d.actualizadoEn?.seconds,d.actualizadoEn?.nanoseconds]);}
function resumir(s,tipo){const d=s.data();return tipo==='productos'?{...d,id:s.id,revision:revision(d)}:{id:s.id,uid:d.uid||s.id,usuario:d.usuario||d.Usuario||'',email:d.email||'',rol:d.rol||'',proveedor:d.proveedor||'',editable:d.uid===s.id&&roles.includes(d.rol),revision:revision(d)};}
// Crea la cuenta en una aplicación secundaria para conservar la sesión del administrador.
async function crearCuenta(d,admin){
 const p=perfil(d),email=texto(d.email,254);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof d.password!=='string'||d.password.length<6||d.password.length>128)fallo('Revisa correo y contraseña (6 a 128 caracteres).');
 const secundaria=initializeApp(app.options,'alta-'+crypto.randomUUID());let cuenta,guardado=false;
 try{
   const auth=getAuth(secundaria);await setPersistence(auth,inMemoryPersistence);
   cuenta=(await createUserWithEmailAndPassword(auth,email,d.password)).user;
   await runTransaction(db,async tx=>{
     const ref=doc(db,'usuarios',cuenta.uid),snap=await tx.get(ref);
     if(snap.exists())fallo('Ya existe un perfil para esta cuenta.');
     if(getAuth(app).currentUser?.uid!==admin)fallo('La sesión cambió.');
     tx.set(ref,{...p,email:cuenta.email,uid:cuenta.uid,proveedor:'password',creadoEn:serverTimestamp(),ultimoAcceso:serverTimestamp(),actualizadoEn:serverTimestamp(),actualizadoPor:admin});
   });guardado=true;
 }catch(error){if(cuenta&&!guardado){try{await deleteUser(cuenta);}catch{throw new Error('Se creó la cuenta pero no su perfil. Revisa Authentication antes de reintentar.');}}throw error;}
 finally{try{await signOut(getAuth(secundaria));}catch{}await deleteApp(secundaria);}
}
export async function administrar(tipo,method='GET',id='',d={}){
 if(!['usuarios','productos'].includes(tipo)||!['GET','POST','PUT','DELETE'].includes(method))fallo('Operación inválida.');
 const admin=await comprobarAdministrador();
 if(method==='GET'){
  const snapshot=await getDocsFromServer(collection(db,tipo));
  if(getAuth(app).currentUser?.uid!==admin)fallo('La sesión cambió.');
  return{administrador:admin,items:snapshot.docs.map(s=>resumir(s,tipo))};
 }
 if(tipo==='usuarios'&&method==='POST'){await crearCuenta(d,admin);return{ok:true};}
 if(method==='POST')id=texto(d.id,80);
 if(typeof id!=='string'||!id||id.includes('/'))fallo('Identificador inválido.');
 if(tipo==='productos'&&method==='POST'&&!/^[a-z0-9][a-z0-9-]*$/.test(id))fallo('El ID admite minúsculas, números y guiones.');
 const cambios=method==='DELETE'?null:tipo==='productos'?producto(d):perfil(d);
 if(tipo==='usuarios'&&id===admin&&(method==='DELETE'||cambios.rol!=='Administrador'))fallo('No puedes eliminar tu perfil ni quitarte el rol de administrador.');
 await runTransaction(db,async tx=>{
  const ref=doc(db,tipo,id),snap=await tx.get(ref);
  if(method==='POST'){if(snap.exists())fallo('Ya existe un producto con ese ID.');}
  else{if(!snap.exists())fallo('El registro ya no existe.');if(revision(snap.data())!==d.revision)fallo('Otro cambio modificó este registro. Actualiza la lista.');}
  if(getAuth(app).currentUser?.uid!==admin)fallo('La sesión cambió.');
  if(method==='DELETE')tx.delete(ref);
  else if(method==='POST')tx.set(ref,{...cambios,actualizadoEn:serverTimestamp(),actualizadoPor:admin});
  else tx.update(ref,{...cambios,actualizadoEn:serverTimestamp(),actualizadoPor:admin});
 });return{ok:true};
}
