// Pestañas y formularios administrativos. Los datos se insertan como texto, nunca como HTML.
'use strict';
document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);
  $('entornoAdministracion').textContent='Firebase en la nube · robotech-8afa0';
  const panel=$('panelAdministracion'), estado=$('estadoAdministracion'), editor=$('editorRegistro');
  let servicio, seccion='usuarios', registros=[], seleccionado=null, administrador=null, version=0, ocupado=false;
  const esquemas={
    usuarios:[['usuario','Nombre','text',80],['email','Correo electrónico','email',254],['rol','Rol','select'],['password','Contraseña inicial','password',128],['uid','UID','readonly'],['proveedor','Método de acceso','readonly']],
    productos:[['id','ID (minúsculas, números y guiones)','text',80],['nombre','Nombre','text',150],['descripcion','Descripción','textarea',5000],['categoria','Categoría','text',100],['precio','Precio (UYU)','number'],['stock','Stock','number'],['disponible','Disponible para la venta','checkbox'],['imagenes','Imágenes: URL HTTPS o ruta img/, una por línea','textarea',100000],['caracteristicas','Características, una por línea (opcional)','textarea',100000]]
  };
  const crear=(tag,clase,texto)=>{const e=document.createElement(tag);e.className=clase;if(texto!==undefined)e.textContent=texto;return e;};
  const normalizar=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function bloquear(valor) {
    ocupado=valor;
    document.querySelectorAll('#panelAdministracion button, #reintentarAdministracion').forEach(b=>b.disabled=valor);
    editor.querySelectorAll('input,textarea,select').forEach(e=>e.disabled=valor || (e.id==='campo_rol' && seleccionado?.id===administrador));
    if(!valor) mostrar();
  }
  function limpiar() { registros=[];seleccionado=null;administrador=null;panel.hidden=true;editor.hidden=true;$('camposEditor').replaceChildren();$('listaRegistros').replaceChildren(); }
  // El servicio local verifica Authentication y rol; no se aceptan credenciales administrativas en el navegador.
  async function api(method='GET',id='',datos) {
    if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname)) throw new Error('Para administrar usuarios y productos, abre el proyecto en tu equipo mediante iniciar.ps1. GitHub Pages no ejecuta el servidor administrativo.');
    const token=await servicio.tokenAdministracion();
    let response;
    try { response=await fetch('http://127.0.0.1:5050/api/'+seccion+(id?'/'+encodeURIComponent(id):''),{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(datos?{body:JSON.stringify(datos)}:{})}); }
    catch { throw new Error('Falta iniciar el servicio con una credencial administrativa de robotech-8afa0. No se mostrarán datos locales.'); }
    const result=await response.json();
    if(!response.ok) throw Object.assign(new Error(result.error),{status:response.status});
    return result;
  }
  function error(e,destino=estado) {
    destino.textContent=e.message || 'No se pudo completar la operación.';
    if([401,403].includes(e.status)||['admin/sin-sesion','admin/sin-permiso'].includes(e.code)) {limpiar();estado.textContent=destino.textContent;$('accesoAdministracion').hidden=e.code!=='admin/sin-sesion'&&e.status!==401;}
  }
  async function cargar(mensaje='') {
    const actual=++version; editor.hidden=true; seleccionado=null; bloquear(true);
    registros=[];$('listaRegistros').replaceChildren();$('cantidadRegistros').textContent='';estado.textContent='Cargando…';
    try {
      const result=await api();if(actual!==version)return;
      registros=result.items;administrador=result.administrador;panel.hidden=false;$('accesoAdministracion').hidden=true;estado.textContent=mensaje;
    } catch(e) {if(actual===version)error(e);}
    finally {if(actual===version)bloquear(false);}
  }
  function mostrar() {
    const q=normalizar($('buscarRegistro').value), productos=seccion==='productos';
    const items=registros.filter(r=>(productos||!$('filtroRol').value||r.rol===$('filtroRol').value)&&normalizar([r.usuario,r.nombre,r.email,r.id,r.categoria,r.rol].join(' ')).includes(q));
    items.sort((a,b)=>String(a.nombre||a.usuario).localeCompare(String(b.nombre||b.usuario),'es'));
    const lista=$('listaRegistros');lista.replaceChildren();$('cantidadRegistros').textContent=items.length+' de '+registros.length+' '+seccion;
    if(!items.length)lista.append(crear('p','',registros.length?'No hay resultados para esta búsqueda.':'No hay registros. Puedes crear el primero.'));
    items.forEach(r=>{
      const card=crear('article','admin-usuario'),info=crear('div','admin-usuario-datos'),acciones=crear('div','d-flex flex-wrap gap-2');
      info.append(crear('h3','h5',productos?r.nombre:r.usuario),crear('p','mb-1',productos?`${r.categoria} · $ ${r.precio} · Stock: ${r.stock} · ${r.disponible?(r.stock>0?'Disponible':'Sin stock'):'No disponible'}`:`${r.email} · ${r.rol}`),crear('p','small mb-0','ID: '+r.id));
      const edit=crear('button','btn btn-robotech','Editar'),del=crear('button','btn btn-outline-danger','Eliminar');
      edit.type=del.type='button';edit.disabled=ocupado||(!productos&&!r.editable);del.disabled=edit.disabled||(!productos&&r.id===administrador);
      edit.setAttribute('aria-label','Editar '+(r.nombre||r.usuario));del.setAttribute('aria-label','Eliminar '+(r.nombre||r.usuario));
      edit.addEventListener('click',()=>abrir(r));del.addEventListener('click',()=>eliminar(r));acciones.append(edit,del);card.append(info,acciones);lista.append(card);
    });
  }
  // Genera todos los campos del modelo y conserva la revisión para evitar sobrescribir cambios ajenos.
  function abrir(registro=null) {
    seleccionado=registro;editor.reset();$('camposEditor').replaceChildren();$('estadoEditor').textContent='';editor.hidden=false;
    $('tituloEditor').textContent=(registro?'Editar ':'Crear ')+(seccion==='usuarios'?'usuario':'producto');
    for(const [key,label,type,max] of esquemas[seccion]) {
      if((key==='password'&&registro)||(type==='readonly'&&!registro))continue;
      const col=crear('div',type==='textarea'?'col-12':'col-md-6'),l=crear('label','form-label',label);l.htmlFor='campo_'+key;
      const input=crear(type==='textarea'?'textarea':type==='select'?'select':'input',type==='checkbox'?'form-check-input d-block':'form-control');input.id='campo_'+key;input.name=key;
      if(input.tagName==='INPUT')input.type=type==='readonly'?'text':type;
      if(type==='select')for(const role of ['Invitado','Estudiante','Docente','Administrador']) {const option=crear('option','',role);input.append(option);}
      if(max)input.maxLength=max;
      if(type==='textarea')input.rows=key==='descripcion'?3:4;
      if(type==='readonly'||(key==='id'&&registro))input.readOnly=true;
      if(key==='rol'&&registro?.id===administrador)input.disabled=true;
      if(type==='number'){input.min='0';input.max='100000000';input.step=key==='stock'?'1':'0.01';}
      if(key==='password'){input.minLength=6;input.autocomplete='new-password';}
      if(key==='id')input.pattern='[a-z0-9][a-z0-9-]*';
      input.required=!['caracteristicas','disponible','uid','proveedor'].includes(key);
      if(type==='checkbox')input.checked=registro?registro[key]:true;
      else input.value=Array.isArray(registro?.[key])?registro[key].join('\n'):registro?.[key]??(key==='rol'?'Invitado':type==='number'?'0':'');
      col.append(l,input);$('camposEditor').append(col);
    }
    $('camposEditor').querySelector('input,textarea,select')?.focus();editor.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  editor.addEventListener('submit',async e=>{
    e.preventDefault();if(ocupado||!editor.reportValidity())return;
    const datos={revision:seleccionado?.revision};
    for(const [key,,type] of esquemas[seccion]) {const input=$('campo_'+key);if(!input||type==='readonly')continue;datos[key]=type==='checkbox'?input.checked:type==='number'?Number(input.value):['imagenes','caracteristicas'].includes(key)?input.value.split('\n').map(v=>v.trim()).filter(Boolean):input.value;}
    const actual=version;bloquear(true);$('estadoEditor').textContent='Guardando…';
    try {await api(seleccionado?'PUT':'POST',seleccionado?.id,datos);if(actual!==version)return;editor.reset();await cargar('Cambios guardados correctamente.');}
    catch(e){if(actual===version){error(e,$('estadoEditor'));bloquear(false);}}
  });
  async function eliminar(registro) {
    if(ocupado||!confirm(`¿Eliminar ${registro.nombre||registro.usuario}? ${seccion==='usuarios'?'Se eliminarán la cuenta de acceso y su perfil.':'Se quitará del catálogo.'} Esta acción no se puede deshacer.`))return;
    const actual=version;bloquear(true);estado.textContent='Eliminando…';
    try {await api('DELETE',registro.id,{revision:registro.revision});if(actual===version)await cargar('Registro eliminado correctamente.');}
    catch(e){if(actual===version){error(e);bloquear(false);}}
  }
  function cambiar(tab) {
    if(ocupado)return;seccion=tab.dataset.seccion;$('buscarRegistro').value='';$('grupoFiltroRol').hidden=seccion!=='usuarios';
    document.querySelectorAll('[role=tab]').forEach(t=>{const active=t===tab;t.classList.toggle('active',active);t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;});
    $('adminContenido').setAttribute('aria-labelledby',tab.id);$('tituloListado').textContent=seccion==='usuarios'?'Usuarios registrados':'Productos del catálogo';$('nuevoRegistro').textContent=seccion==='usuarios'?'Nuevo usuario':'Nuevo producto';cargar();
  }
  document.querySelectorAll('[role=tab]').forEach(tab=>{tab.addEventListener('click',()=>cambiar(tab));tab.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?$('tabUsuarios'):e.key==='End'?$('tabProductos'):tab.id==='tabUsuarios'?$('tabProductos'):$('tabUsuarios');if(!ocupado){target.focus();cambiar(target);}}});});
  $('buscarRegistro').addEventListener('input',mostrar);$('filtroRol').addEventListener('change',mostrar);$('nuevoRegistro').addEventListener('click',()=>abrir());
  $('cancelarRegistro').addEventListener('click',()=>{editor.reset();editor.hidden=true;seleccionado=null;$('nuevoRegistro').focus();});
  $('accesoAdministracion').addEventListener('click',()=>$('btnLoginPlaceholder').click());
  $('reintentarAdministracion').addEventListener('click',()=>servicio?cargar():location.reload());
  try {servicio=await import('./firebase.js');servicio.observarSesion(()=>{++version;limpiar();cargar();});}catch(e){error(e);}
});
