// Local single-host cooperative writers. No production fault switches.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { canonicalBytes, sha256, parseInput, ExportError } from './publication-contract.mjs';
const fail=c=>{throw new ExportError(c);};
const contexts=new Map();
const phases=['prepared','staged','verified','swap_started','committed','rollback_started','rolled_back'];
const transient=new Set(['EBUSY','EAGAIN','EMFILE','ENFILE']);
export function retryIO(fn) {for(let n=0;;n++){try{return fn();}catch(e){if(!transient.has(e.code)||n===2)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,[10,20][n]);}}}
function read(p) {const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>1024*1024)fail('METADATA_FILE');const b=fs.readFileSync(p),v=parseInput(b);if(!canonicalBytes(v).equals(b))fail('METADATA_CANONICAL');return v;}
function syncFile(p,b,flag='wx') {const fd=retryIO(()=>fs.openSync(p,flag));try{retryIO(()=>fs.writeFileSync(fd,b));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(!fs.readFileSync(p).equals(b))fail('READBACK');}
function replace(p,v) {const temp=p+'.next';if(fs.existsSync(temp))fail('METADATA_PENDING');syncFile(temp,canonicalBytes(v));retryIO(()=>fs.renameSync(temp,p));}
function json(p){return fs.existsSync(p)?read(p):null;}
function pointer(store){return json(path.join(store,'current.json'));}
function exact(v,keys){if(!v||Object.keys(v).sort().join(',')!==keys.sort().join(','))fail('METADATA_SCHEMA');}
export function generation(store) {
 const dir=path.join(store,'generations');if(!fs.existsSync(dir)){if(fs.existsSync(path.join(store,'generation-head.json')))fail('GENERATION_REGRESSION');return 0;}
 if(fs.lstatSync(dir).isSymbolicLink())fail('SYMLINK');const names=fs.readdirSync(dir).sort();if(names.length>10000)fail('GENERATION_LIMIT');let prior=null;
 for(let i=0;i<names.length;i++){const expected=String(i+1).padStart(10,'0')+'.json';if(names[i]!==expected)fail('GENERATION_GAP');const v=read(path.join(dir,names[i]));exact(v,['version','generation','operationId','previousHash']);if(v.version!==1||v.generation!==i+1||v.previousHash!==prior||!uuid(v.operationId))fail('GENERATION_CORRUPT');prior=sha256(canonicalBytes(v));}
 const head=json(path.join(store,'generation-head.json'));if(head)exact(head,['version','generation','lastHash']);if(!head||head.version!==1||head.generation!==names.length||head.lastHash!==prior)fail('GENERATION_REGRESSION');
 const p=pointer(store);if(p&&(!Number.isSafeInteger(p.generation)||p.generation<1||p.generation>names.length))fail('GENERATION_REGRESSION');return names.length;
}
const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v);
function lockValue(store){const v=json(path.join(store,'import.lock'));if(!v)return null;exact(v,['operationId','processId','startedAt','generation']);if(!uuid(v.operationId)||!Number.isSafeInteger(v.processId)||v.processId<1||!Number.isSafeInteger(v.generation)||v.generation<1||!Number.isFinite(Date.parse(v.startedAt)))fail('LOCK_CORRUPT');return v;}
function alive(pid){try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;return true;}}
export function assertOwner(store,ctx=contexts.get(store)) {const l=lockValue(store);if(!ctx||!l||l.operationId!==ctx.operationId||l.processId!==process.pid||l.generation!==ctx.generation||generation(store)!==ctx.generation)fail('FENCED_WRITER');}
function acquire(store) {
 fs.mkdirSync(store,{recursive:true});const next=generation(store)+1;const v={operationId:randomUUID(),processId:process.pid,startedAt:new Date().toISOString(),generation:next};
 try{syncFile(path.join(store,'import.lock'),canonicalBytes(v));}catch(e){if(e.code==='EEXIST')fail('WRITER_LOCKED');throw e;}
 try{const dir=path.join(store,'generations');fs.mkdirSync(dir,{recursive:true});const prev=next===1?null:sha256(fs.readFileSync(path.join(dir,String(next-1).padStart(10,'0')+'.json')));syncFile(path.join(dir,String(next).padStart(10,'0')+'.json'),canonicalBytes({version:1,generation:next,operationId:v.operationId,previousHash:prev}));const head={version:1,generation:next,lastHash:sha256(fs.readFileSync(path.join(dir,String(next).padStart(10,'0')+'.json')))};const headFile=path.join(store,'generation-head.json');if(fs.existsSync(headFile))replace(headFile,head);else syncFile(headFile,canonicalBytes(head));contexts.set(store,v);return v;}catch(e){/* retain explicit recovery evidence */throw e;}
}
function release(store,ctx){assertOwner(store,ctx);fs.unlinkSync(path.join(store,'import.lock'));contexts.delete(store);}
export function locked(store,fn) {
 if(fs.existsSync(path.join(store,'import.lock')))fail('WRITER_LOCKED');
 if(fs.existsSync(path.join(store,'operation.json'))||fs.existsSync(path.join(store,'operation.json.next')))fail('RECOVERY_REQUIRED');
 const ctx=acquire(store);try{return fn(store);}finally{release(store,ctx);}
}
function journal(store,v){assertOwner(store);const p=path.join(store,'operation.json');if(fs.existsSync(p))replace(p,v);else syncFile(p,canonicalBytes(v));}
function checkedJournal(store){const j=json(path.join(store,'operation.json'));if(!j)return null;exact(j,['version','operationId','generation','phase','kind','basePointer','nextPointer','releaseId','stage']);if(j.version!==1||!uuid(j.operationId)||!Number.isSafeInteger(j.generation)||j.generation<1||!phases.includes(j.phase)||!['IMPORT','ROLLBACK'].includes(j.kind)||!/^[0-9a-f]{64}$/.test(j.releaseId)||j.stage!=='stage-'+j.operationId||j.nextPointer?.current!==j.releaseId||j.nextPointer?.generation!==j.generation)fail('JOURNAL_CORRUPT');return j;}
function eq(a,b){return canonicalBytes(a).equals(canonicalBytes(b));}
function verifyRelease(store,j) {const dir=path.join(store,'releases',j.releaseId);if(fs.lstatSync(dir).isSymbolicLink())fail('SYMLINK');for(const n of ['state.json','record.json']){const stat=fs.lstatSync(path.join(dir,n));if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024*1024)fail('RECOVERY_INTEGRITY');}const b=fs.readFileSync(path.join(dir,'state.json')),r=fs.readFileSync(path.join(dir,'record.json'));if(sha256(Buffer.concat([b,r]))!==j.releaseId||sha256(b)!==j.nextPointer.stateSha256||sha256(r)!==j.nextPointer.recordSha256)fail('RECOVERY_INTEGRITY');}
function cleanup(store,j){
 const stage=path.join(store,j.stage);if(fs.existsSync(stage)){if(fs.lstatSync(stage).isSymbolicLink())fail('SYMLINK');for(const n of fs.readdirSync(stage)){if(!['state.json','record.json'].includes(n))fail('CLEANUP_FOREIGN');const p=path.join(stage,n);if(!fs.lstatSync(p).isFile()||fs.lstatSync(p).isSymbolicLink())fail('CLEANUP_FOREIGN');fs.unlinkSync(p);}fs.rmdirSync(stage);}
 const temp=path.join(store,'pointer-'+j.operationId+'.tmp');if(fs.existsSync(temp)){if(!eq(read(temp),j.nextPointer))fail('POINTER_TEMP_CONFLICT');fs.unlinkSync(temp);}
 fs.unlinkSync(path.join(store,'operation.json'));
}
export function publishTransaction(store,state,record,old,highWatermark,seenRunIds) {
 assertOwner(store);const ctx=contexts.get(store),b=canonicalBytes(state),r=canonicalBytes(record);if(b.length>16*1024*1024||r.length>16*1024*1024||state.stories.length>1000||state.fences.length>2000||seenRunIds.length>10000)fail('STATE_LIMIT');
 const id=sha256(Buffer.concat([b,r]));const next={version:1,current:id,previous:old?.pointer.current??null,stateSha256:sha256(b),recordSha256:sha256(r),highWatermark,seenRunIds,generation:ctx.generation};
 const j={version:1,operationId:ctx.operationId,generation:ctx.generation,phase:record.operation==='ROLLBACK'?'rollback_started':'prepared',kind:record.operation,basePointer:old?.pointer??null,nextPointer:next,releaseId:id,stage:'stage-'+ctx.operationId};journal(store,j);
 const stage=path.join(store,j.stage);fs.mkdirSync(stage);syncFile(path.join(stage,'state.json'),b);syncFile(path.join(stage,'record.json'),r);j.phase='staged';journal(store,j);
 const dir=path.join(store,'releases',id);fs.mkdirSync(path.dirname(dir),{recursive:true});if(fs.existsSync(dir)){verifyRelease(store,j);}else retryIO(()=>fs.renameSync(stage,dir));verifyRelease(store,j);j.phase='verified';journal(store,j);
 const temp=path.join(store,'pointer-'+ctx.operationId+'.tmp');syncFile(temp,canonicalBytes(next));j.phase='swap_started';journal(store,j);assertOwner(store);if(!eq(pointer(store),j.basePointer))fail('BASE_CHANGED');retryIO(()=>fs.renameSync(temp,path.join(store,'current.json')));if(!eq(pointer(store),next))fail('SWAP_READBACK');
 j.phase=j.kind==='ROLLBACK'?'rolled_back':'committed';journal(store,j);cleanup(store,j);return {releaseId:id,storyCount:state.stories.length,record,generation:ctx.generation,replay:false};
}
export function inspectTransaction(store){const g=generation(store),lock=lockValue(store),j=checkedJournal(store);return {generation:g,lock:lock?{...lock,active:alive(lock.processId)}:null,journal:j?{operationId:j.operationId,generation:j.generation,phase:j.phase,kind:j.kind,releaseId:j.releaseId}:null,current:pointer(store)?.current??null};}
export function recoveryPlan(store) {
 const info=inspectTransaction(store),j=checkedJournal(store);const pending=fs.existsSync(path.join(store,'operation.json.next'));let decision='NONE',actions=[];
 if(pending)decision='AMBIGUOUS_METADATA';else if(info.lock?.active)decision='ACTIVE_WRITER';else if(j){const p=pointer(store);if(eq(p,j.nextPointer)){verifyRelease(store,j);decision='ALREADY_SWAPPED';actions=['resume'];}else if(eq(p,j.basePointer)){if(['verified','swap_started','committed','rolled_back'].includes(j.phase)){verifyRelease(store,j);decision='VERIFIED_PENDING';actions=['resume','abort'];}else {decision='PARTIAL_STAGE';actions=['abort'];}}else decision='AMBIGUOUS_POINTER';}
 else if(info.lock){if(info.lock.generation>info.generation+1)decision='AMBIGUOUS_GENERATION';else {decision='STALE_LOCK';actions=['unlock'];}}
 const details={...info,decision,actions};return {...details,planHash:sha256(canonicalBytes({details,j,pointer:pointer(store)}))};
}
export function recoverTransaction(store,{action,planHash}={}) {
 const plan=recoveryPlan(store);if(plan.planHash!==planHash||!plan.actions.includes(action))fail('RECOVERY_PLAN_CHANGED');
 // Caller prints the plan first; exact hash is explicit acknowledgement. PID reuse fails closed.
 if(plan.lock){const l=lockValue(store);const expected={operationId:plan.lock.operationId,processId:plan.lock.processId,startedAt:plan.lock.startedAt,generation:plan.lock.generation};if(!l||!eq(l,expected))fail('RECOVERY_PLAN_CHANGED');if(alive(l.processId))fail('ACTIVE_WRITER');fs.unlinkSync(path.join(store,'import.lock'));}
 if(action==='unlock'){const ctx=acquire(store);try{return {recovered:'unlocked',generation:ctx.generation};}finally{release(store,ctx);}}
 const j=checkedJournal(store),ctx=acquire(store);try{
 if(action==='resume'&&plan.decision==='VERIFIED_PENDING'){
 verifyRelease(store,j);const staleTemp=path.join(store,'pointer-'+j.operationId+'.tmp');if(fs.existsSync(staleTemp)){if(!eq(read(staleTemp),j.nextPointer))fail('POINTER_TEMP_CONFLICT');fs.unlinkSync(staleTemp);}j.generation=ctx.generation;j.nextPointer.generation=ctx.generation;j.phase='swap_started';journal(store,j);
 const temp=path.join(store,'pointer-'+j.operationId+'.tmp');if(fs.existsSync(temp))fail('POINTER_TEMP_CONFLICT');syncFile(temp,canonicalBytes(j.nextPointer));assertOwner(store);if(!eq(pointer(store),j.basePointer))fail('BASE_CHANGED');retryIO(()=>fs.renameSync(temp,path.join(store,'current.json')));
 j.phase=j.kind==='ROLLBACK'?'rolled_back':'committed';journal(store,j);cleanup(store,j);
 } else {if(action==='resume')verifyRelease(store,j);cleanup(store,j);}
 return {recovered:action,generation:ctx.generation,current:pointer(store)?.current??null};
 }finally{release(store,ctx);}
}
