// Loopback-only static staging. Not a production server or deploy tool.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const root=path.resolve(process.argv[2]??'');if(!root.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(path.dirname(path.dirname(root))).startsWith('ivmova-build-test-')||fs.lstatSync(root).isSymbolicLink())throw new Error('STAGING_BOUNDARY');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}const u=new URL(req.url,'http://localhost');const decoded=decodeURIComponent(u.pathname);if(decoded.includes('\\')||decoded.includes('\0'))throw new Error();let file=path.resolve(root,'.'+decoded);if(file!==root&&!file.startsWith(root+path.sep))throw new Error();if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');const exists=fs.existsSync(file)&&fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink();if(!exists)file=path.join(root,'404.html');res.writeHead(exists?200:404,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':exists&&decoded.startsWith('/_next/static/')?'public, max-age=31536000, immutable':'no-cache, max-age=0','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:fs.readFileSync(file));}catch{res.writeHead(400);res.end();}});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));
function close(){server.close(()=>process.exit(0));server.closeAllConnections();}
process.on('message',message=>{if(message==='close')close();});
process.on('SIGTERM',close);
