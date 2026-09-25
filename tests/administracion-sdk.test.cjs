const fs=require('fs');const vm=require('vm');const assert=require('node:assert/strict');
const rows=new Map();let session='admin',rollback=0,secondary=false,denyWrite=false;
const snap=ref=>({id:ref.id,exists:()=>rows.has(ref.col+'/'+ref.id),data:()=>structuredClone(rows.get(ref.col+'/'+ref.id))});
const ctx=vm.createContext({crypto:require('crypto').webcrypto,getApps:()=>[{}],getApp:()=>({options:{}}),getDocFromServer:async()=>({exists:()=>true,data:()=>({rol:session==='admin'?'Administrador':'Invitado'})}),app:{options:{}},comprobarAdministrador:async()=>{if(session!=='admin')throw Error('sin permiso');return session;},getFirestore:()=>({}),getAuth:a=>({currentUser:{uid:session},secondary:a?.secondary}),initializeApp:()=>{secondary=true;return{secondary:true};},deleteApp:async()=>{secondary=false;},inMemoryPersistence:{},setPersistence:async()=>{},signOut:async()=>{},createUserWithEmailAndPassword:async(a,email)=>{assert.equal(a.secondary,true);return{user:{uid:'new-user',email}};},deleteUser:async()=>{rollback++;},serverTimestamp:()=>({seconds:1,nanoseconds:1}),doc:(_db,col,id)=>({col,id}),collection:(_db,col)=>({col}),getDocsFromServer:async ref=>({docs:[...rows.keys()].filter(k=>k.startsWith(ref.col+'/')).map(k=>snap({col:ref.col,id:k.split('/')[1]}))}),runTransaction:async(_db,fn)=>fn({get:async ref=>snap(ref),set:(r,d)=>{if(denyWrite)throw Error('denied');rows.set(r.col+'/'+r.id,d);},update:(r,d)=>rows.set(r.col+'/'+r.id,{...rows.get(r.col+'/'+r.id),...d}),delete:r=>rows.delete(r.col+'/'+r.id)})});
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../js/firebase.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,''),ctx);
const run=s=>vm.runInContext(s,ctx);
(async()=>{
 session='user';await assert.rejects(run("administrar('productos')"));session='admin';
 const p={id:'kit-test',nombre:'Kit',descripcion:'Descripción',categoria:'Kits',precio:10,stock:3,disponible:true,imagenes:['img/kit.jpg'],caracteristicas:[]};ctx.p=p;
 await run("administrar('productos','POST','',p)");await assert.rejects(run("administrar('productos','POST','',p)"));
 let item=(await run("administrar('productos')")).items[0];ctx.rev=item.revision;
 await assert.rejects(run("administrar('productos','PUT','kit-test',{...p,revision:'vieja'})"));
 await assert.rejects(run("administrar('productos','PUT','kit-test',{...p,stock:-1,revision:rev})"));
 await run("administrar('productos','PUT','kit-test',{...p,stock:0,revision:rev})");assert.equal(rows.get('productos/kit-test').stock,0);
 ctx.rev=(await run("administrar('productos')")).items[0].revision;
 await run("administrar('productos','DELETE','kit-test',{revision:rev})");assert.equal(rows.size,0);
 await assert.rejects(run("administrar('usuarios','DELETE','admin',{})"));
 await assert.rejects(run("administrar('usuarios','PUT','admin',{usuario:'Admin',rol:'Invitado'})"));
 await run("administrar('usuarios','POST','',{usuario:'Nuevo',email:'nuevo@example.test',rol:'Docente',password:'test-only-password'})");
 assert.equal(session,'admin');assert.equal(secondary,false);assert.equal(rows.get('usuarios/new-user').rol,'Docente');assert.ok(!JSON.stringify([...rows]).includes('test-only-password'));
 rows.clear();denyWrite=true;
 await assert.rejects(run("administrar('usuarios','POST','',{usuario:'Nuevo',email:'nuevo@example.test',rol:'Invitado',password:'test-only-password'})"));assert.equal(rollback,1);assert.equal(secondary,false);
 console.log('OK SDK: autorización, CRUD de productos, conflictos, validación, protección propia, sesión secundaria y reversión de alta fallida.');
})().catch(e=>{console.error(e);process.exitCode=1;});

