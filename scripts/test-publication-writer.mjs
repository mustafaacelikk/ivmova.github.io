// Test harness only: interception requires this dedicated script and an owned TEMP root.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importRelease, rollback, recover } from './publication-consumer.mjs';
import { assertOwner } from './publication-transaction.mjs';
const [mode,store,input,point,ready]=process.argv.slice(2);
const root=path.dirname(store);if(!path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(root).startsWith('ivmova-recovery-test-'))throw new Error('TEST_BOUNDARY');
const rename=fs.renameSync,write=fs.writeFileSync,open=fs.openSync;const fds=new Map();let fired=false;
fs.openSync=function(p,...args){const fd=open(p,...args);fds.set(fd,String(p));return fd;};
function trigger(label){if(fired||label!==point)return;fired=true;if(mode==='hold'){write(ready,'ready');while(!fs.existsSync(ready+'.go'))Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);}else process.exit(73);}
fs.writeFileSync=function(p,b,...args){const r=write(p,b,...args);if((fds.get(p)??String(p)).endsWith('state.json')&&String(p)!==path.join(store,'current.json'))trigger('stage_write');return r;};
fs.renameSync=function(from,to){if(to===path.join(store,'current.json'))trigger('before_swap');const r=rename(from,to);if(to===path.join(store,'current.json'))trigger('during_swap');if(to===path.join(store,'operation.json')){const phase=JSON.parse(fs.readFileSync(to)).phase;trigger(phase);}return r;};
// Initial journal creation has no rename.
const originalWrite=fs.writeFileSync;fs.writeFileSync=function(p,b,...args){const r=originalWrite(p,b,...args);const name=fds.get(p)??String(p);if(name===path.join(store,'operation.json')){try{trigger(JSON.parse(Buffer.from(b).toString()).phase);}catch{}}return r;};
try {let result;if(mode==='fence'){const ctx=JSON.parse(input);assertOwner(store,ctx);result='unexpected';}else if(mode==='recover')result=recover({store,...JSON.parse(input)});else result=input==='ROLLBACK'?rollback({store}):importRelease(input,{store});console.log(JSON.stringify({result}));}catch(e){console.error(e.code??e.message);process.exitCode=1;}
