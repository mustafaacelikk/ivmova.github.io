import './publication-no-network.mjs';import http from 'node:http';import assert from 'node:assert/strict';import {canonicalBytes} from './publication-contract.mjs';import {reconcileMarker} from './publication-pages-reconciliation.mjs';
let assertions=0,httpChecks=0,secretRequests=0;const ok=v=>{assert.ok(v);assertions++;};
const expected={releaseId:'00000000-0000-0000-0000-000000000001',treeHash:'a'.repeat(64),sourceCommit:'b'.repeat(40),generatedAt:'2026-10-07T12:00:00.000Z',contractVersion:2};let mode='success';const queries=new Set();
const server=http.createServer((req,res)=>{httpChecks++;queries.add(req.url);if(req.url.startsWith('/secret')){secretRequests++;res.end('never');return;}
 if(mode==='timeout'){const timer=setTimeout(()=>res.end(canonicalBytes(expected)),1000);res.once('close',()=>clearTimeout(timer));return;}
 if(mode==='redirect'){res.writeHead(302,{Location:'/secret'});res.end();return;}
 if(mode==='oversize'){res.writeHead(200,{'Content-Length':'5000'});res.end('x'.repeat(5000));return;}
 if(mode==='streamoversize'){res.writeHead(200,{'Content-Type':'application/json'});res.write('x'.repeat(3000));res.end('y'.repeat(3000));return;}
 if(mode==='invalid'){res.end('{invalid');return;}if(mode==='missing'){res.writeHead(404);res.end();return;}if(mode==='extra'){res.end(canonicalBytes({...expected,actor:'private'}));return;}
 res.setHeader('Content-Type','application/json');res.end(canonicalBytes(mode==='mismatch'?{...expected,treeHash:'f'.repeat(64)}:expected));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const local='http://127.0.0.1:'+server.address().port;
async function mockTransport(url,options){const r=await fetch(local+url.pathname+url.search,options);return {status:r.status,redirected:r.redirected,url:url.href,headers:r.headers,body:r.body};}
const config={origin:'https://example.test',expected,nonce:'synthetic',attempts:2,timeoutMs:100,intervalMs:0};
try{
 ok((await reconcileMarker(config,mockTransport)).attempts===1);
 for(const value of ['mismatch','timeout','oversize','streamoversize','redirect','invalid','extra','missing']){mode=value;await assert.rejects(()=>reconcileMarker({...config,nonce:value},mockTransport));assertions++;}
 mode='success';for(const origin of ['http://127.0.0.1','https://user@example.test','https://example.test/path','https://example.test:444']){await assert.rejects(()=>reconcileMarker({...config,origin},mockTransport));assertions++;}
 await assert.rejects(()=>reconcileMarker({...config,attempts:7},mockTransport));assertions++;ok(secretRequests===0);ok(queries.size===httpChecks);
 console.log(JSON.stringify({result:'PASS',assertions,httpChecks,redirectFollowed:0,liveSiteRequests:0}));
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));console.log('MOCK_HTTP_SERVER_CLEANUP_OK');}
