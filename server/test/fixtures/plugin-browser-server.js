'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'plugin-lifecycle-ui.mjs'));
const server=http.createServer((req,res)=>{if(req.url.startsWith('/plugins/review_lifecycle/ui.js')){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});res.end(code);}else{res.writeHead(404);res.end();}});
server.listen(5191,'127.0.0.1',()=>console.log('Synthetic plugin UI server on 127.0.0.1:5191'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
