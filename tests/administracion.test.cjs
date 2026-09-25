const fs=require('fs'), vm=require('vm'), assert=require('node:assert/strict');
const root=require('path').resolve(__dirname, '..') + '/';
let session={uid:'admin'}, fail=false;
const rows=new Map([
 ['admin',{uid:'admin',usuario:'Responsable',rol:'Administrador',email:'admin@example.test',proveedor:'password'}],
 ['user',{uid:'user',usuario:'Alumno',rol:'Estudiante',email:'user@example.test',proveedor:'password',campoPrivado:'NO MOSTRAR'}],
 ['legacy',{Usuario:'Antiguo',passwd:'NO MOSTRAR'}]
]);
let updates=[];
const snapshot=id=>({id,exists:()=>rows.has(id),data:()=>structuredClone(rows.get(id))});
const ctx=vm.createContext({
 initializeApp:()=>({}),getApps:()=>[], getApp:()=>({}),getAuth:()=>({currentUser:session}), getFirestore:()=>({}),
 doc:(_db,col,id)=>({col,id}), collection:(_db,col)=>({col}),
 getDocFromServer:async ref=>{if(fail)throw Object.assign(Error('offline'),{code:'unavailable'});return snapshot(ref.id);},
 getDocsFromServer:async()=>({docs:[...rows.keys()].map(snapshot)}),
 serverTimestamp:()=> 'server-time',
 runTransaction:async(_db,fn)=>fn({get:async ref=>snapshot(ref.id),update:(ref,data)=>{updates.push({id:ref.id,data});rows.set(ref.id,{...rows.get(ref.id),...data});}})
});
const source=fs.readFileSync(root+'js/firebase.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'');
vm.runInContext(source,ctx);
const run=s=>vm.runInContext(s,ctx);
async function rejects(code,expr){await assert.rejects(run(expr),e=>e.code===code);}
(async()=>{
 session=null;
 await rejects('admin/sin-sesion','listarUsuariosAdministracion()');
 session={uid:'user'};
 await rejects('admin/sin-permiso','listarUsuariosAdministracion()');
 await rejects('admin/sin-permiso',`actualizarUsuarioAdministracion('user',{usuario:'Nuevo',rol:'Administrador'},{usuario:'Alumno',rol:'Estudiante'})`);
 session={uid:'admin'};
 const lista=await run('listarUsuariosAdministracion()');
 assert.equal(lista.administrador,'admin');assert.equal(lista.usuarios.length,3);
 assert.equal(lista.usuarios.find(u=>u.id==='legacy').editable,false);
 assert.ok(!JSON.stringify(lista).includes('NO MOSTRAR'));
 await rejects('admin/datos-invalidos',`actualizarUsuarioAdministracion('user',{usuario:'  ',rol:'Docente'},{usuario:'Alumno',rol:'Estudiante'})`);
 await rejects('admin/datos-invalidos',`actualizarUsuarioAdministracion('user',{usuario:'Nuevo',rol:'Superusuario'},{usuario:'Alumno',rol:'Estudiante'})`);
 await rejects('admin/rol-propio',`actualizarUsuarioAdministracion('admin',{usuario:'Responsable',rol:'Docente'},{usuario:'Responsable',rol:'Administrador'})`);
 await rejects('admin/perfil-antiguo',`actualizarUsuarioAdministracion('legacy',{usuario:'Nuevo',rol:'Invitado'},{usuario:'Antiguo',rol:''})`);
 await rejects('admin/no-existe',`actualizarUsuarioAdministracion('missing',{usuario:'Nuevo',rol:'Invitado'},{usuario:'Antiguo',rol:'Invitado'})`);
 await rejects('admin/conflicto',`actualizarUsuarioAdministracion('user',{usuario:'Nuevo',rol:'Docente'},{usuario:'Nombre obsoleto',rol:'Estudiante'})`);
 assert.equal(updates.length,0);
 await run(`actualizarUsuarioAdministracion('user',{usuario:'  Nuevo nombre  ',rol:'Docente'},{usuario:'Alumno',rol:'Estudiante'})`);
 assert.equal(rows.get('user').usuario,'Nuevo nombre');assert.equal(rows.get('user').rol,'Docente');
 assert.equal(rows.get('user').email,'user@example.test');assert.equal(rows.get('user').uid,'user');
 assert.deepEqual(Object.keys(updates[0].data).sort(),['actualizadoEn','actualizadoPor','rol','usuario']);
 fail=true;await assert.rejects(run('listarUsuariosAdministracion()'));
 console.log('OK: acceso anónimo/no administrador bloqueado, datos limitados, validaciones, rol propio, perfiles antiguos, conflictos y actualización de nombre/rol.');
})().catch(e=>{console.error(e);process.exitCode=1;});
