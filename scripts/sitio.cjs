// Sirve únicamente los archivos públicos; nunca entrega scripts del servidor ni credenciales.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = new Set(['index.html','admin.html','catalogo.html','producto.html','carrito.html','perfil.html']);
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
exports.start = function(port = 5000) {
  const server = http.createServer((req, res) => {
    let name; try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html'; } catch { res.writeHead(400); return res.end(); }
    const file = path.resolve(root, name), extension = path.extname(file).toLowerCase();
    if (!['GET','HEAD'].includes(req.method) || name.includes('..') || name.includes('\\') || !file.startsWith(root+path.sep) || !mime[extension] || !(pages.has(name) || /^(css|js|img)\//.test(name))) { res.writeHead(404); return res.end(); }
    fs.readFile(file, (error, content) => {
      if(error) {res.writeHead(404);return res.end();}
      res.setHeader('Content-Type', mime[extension]+'; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
      res.end(req.method==='HEAD'?undefined:content);
    });
  });
  server.listen(port,'127.0.0.1',()=>console.log('Sitio conectado a Firebase real: http://127.0.0.1:'+server.address().port+'/admin.html'));
  return server;
};
