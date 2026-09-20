/** Smart Computer POS static server (Node 18+) */
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const MIME = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon',
};
const server=http.createServer((req,res)=>{
  if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405);return res.end('Method Not Allowed');}
  let pathname; try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { pathname='/'; }
  if(pathname==='/') pathname='/index.html';
  const filePath=path.resolve(ROOT,'.'+pathname);
  if(!filePath.startsWith(ROOT)){res.writeHead(403);return res.end('Forbidden');}
  fs.stat(filePath,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Not found');}
    const ext=path.extname(filePath).toLowerCase();
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control': ext==='.html'?'no-cache':'public, max-age=300'});
    if(req.method==='HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});
server.listen(PORT,()=>console.log(`Smart Computer POS: http://localhost:${PORT}`));
