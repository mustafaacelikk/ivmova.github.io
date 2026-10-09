import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { canonicalBytes, sha256, parseInput, validateSchema, contentHash, safeArtifactPath, checkText, verifyContracts, ExportError } from './publication-contract.mjs';
export { canonicalBytes, sha256 };
import { locked as transactionLock, publishTransaction, generation, inspectTransaction, recoveryPlan as planRecovery, recoverTransaction } from './publication-transaction.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const defaultStore = path.join(repo, '.publication-local');
const fail = code => { throw new ExportError(code); };
const MAX_BYTES = 16 * 1024 * 1024, MAX_FILES = 1002;
const categoryMap = Object.freeze({ 'Enerji':'enerji', 'Enerji Piyasaları':'piyasalar', 'Teknoloji':'teknoloji', 'Mobilite':'mobilite', 'İklim':'iklim', 'Analiz':'analiz', ENERGY:'enerji', 'enerji-piyasalari':'piyasalar', enerji:'enerji', piyasalar:'piyasalar', teknoloji:'teknoloji', mobilite:'mobilite', iklim:'iklim', analiz:'analiz' });
const cmp = (a,b) => a < b ? -1 : a > b ? 1 : 0;
function inside(r,p) { const rel=path.relative(r,p); return rel!=='' && !rel.startsWith('..') && !path.isAbsolute(rel); }
function noLinks(p) {
  let at=path.parse(path.resolve(p)).root;
  for(const part of path.resolve(p).slice(at.length).split(path.sep).filter(Boolean)) {
    at=path.join(at,part); if(fs.existsSync(at)||fs.lstatSync(path.dirname(at)).isDirectory()) {
      try {const s=fs.lstatSync(at); if(s.isSymbolicLink())fail('SYMLINK');} catch(e){if(e.code!=='ENOENT')throw e;}
    }
  }
}
function rootPath(p) { if(typeof p!=='string'||!path.isAbsolute(p)||p.startsWith('\\\\')||p.startsWith('//')||/[\u0000-\u001f]/.test(p))fail('ROOT_PATH'); noLinks(p); return path.resolve(p); }
function storePath(p) {p=rootPath(p); if(p!==defaultStore && !inside(path.resolve(os.tmpdir()),p))fail('STORE_BOUNDARY'); return p;}
function listFiles(dir) {
  noLinks(dir); const files=[]; let total=0, entries=0;
  function walk(at) { for(const e of fs.readdirSync(at,{withFileTypes:true})) {
    if(++entries>MAX_FILES*4||path.relative(dir,at).split(path.sep).length>8)fail('RELEASE_LIMIT'); const full=path.join(at,e.name); const s=fs.lstatSync(full); if(s.isSymbolicLink())fail('SYMLINK');
    if(s.isDirectory())walk(full); else if(s.isFile()) { total+=s.size; files.push(path.relative(dir,full).split(path.sep).join('/')); if(total>MAX_BYTES||files.length>MAX_FILES)fail('RELEASE_LIMIT'); } else fail('FILE_TYPE');
  }} walk(dir);return files.sort(cmp);
}
function readJson(file) { const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.size>MAX_BYTES)fail('FILE_LIMIT'); return parseInput(fs.readFileSync(file)); }
function equal(a,b) { return canonicalBytes(a).equals(canonicalBytes(b)); }
export function validateRelease(input) {
  verifyContracts(); const dir=rootPath(input); const files=listFiles(dir);
  const manifests=files.filter(f=>/^manifests\/[0-9a-f-]{36}\.json$/.test(f)); if(manifests.length!==1)fail('MANIFEST_COUNT');
  const bytes=fs.readFileSync(path.join(dir,manifests[0])); const m=parseInput(bytes);
  if(m.schemaVersion!==2||!validateSchema('publication-manifest-v2.schema.json',m))fail('MANIFEST_SCHEMA');
  checkText(m);if(!bytes.equals(canonicalBytes(m)))fail('MANIFEST_CANONICAL');
  if(manifests[0]!=='manifests/'+m.exportId+'.json')fail('MANIFEST_ID');
  if(m.itemCount!==m.items.length)fail('COUNTS');
  for(const a of ['UPSERT','RETRACT','REMOVE'])if(m.actionCounts[a]!==m.items.filter(x=>x.action===a).length)fail('COUNTS');
  for(const k of ['storyId','slug','artifactPath'])if(new Set(m.items.map(x=>x[k])).size!==m.items.length)fail('DUPLICATE');
  const expected=[manifests[0]], stories=[];
  for(const [i,x] of m.items.entries()) {
    safeArtifactPath(x.artifactPath); if(!x.artifactPath.startsWith('stories/tr/')||x.artifactPath!=='stories/tr/'+x.slug+'.json')fail('LANGUAGE_PATH');
    if(i && cmp(m.items[i-1].artifactPath,x.artifactPath)>=0)fail('ITEM_ORDER');
    if(x.action==='REMOVE') {
      const proof={contractVersion:2,runId:m.exportId,storyId:x.storyId,slug:x.slug,targetPath:x.artifactPath};
      if(!equal(proof,x.removalProof)||sha256(canonicalBytes(proof))!==x.removalReceiptSha256)fail('REMOVAL_PROOF');
      continue;
    }
    expected.push(x.artifactPath); const file=path.join(dir,...x.artifactPath.split('/')); if(!fs.existsSync(file))fail('MISSING_STORY');
    const b=fs.readFileSync(file);if(b.length!==x.artifactBytes||sha256(b)!==x.artifactSha256)fail('ARTIFACT_INTEGRITY');
    const s=parseInput(b);validateStory(s);
    if(!b.equals(canonicalBytes(s)))fail('STORY_CANONICAL');
    for(const k of ['storyId','slug','revisionId','revisionNumber'])if(s[k]!==x[k])fail('IDENTITY');
    if(s.contentHash!==x.revisionContentHash)fail('REVISION_HASH');
    if(s.publicationStatus!==(x.action==='UPSERT'?'PUBLISHED':'RETRACTED'))fail('ACTION_STORY');
    if(Date.parse(s.updatedAt)>Date.parse(m.generatedAt))fail('TIMESTAMP'); stories.push(s);
  }
  // Optional detached receipt: the editorial generator returns it but does not write it.
  const r={contractVersion:2,runId:m.exportId,manifestSha256:sha256(bytes),manifestBytes:bytes.length,itemCount:m.itemCount,fileCount:stories.length+1,actionCounts:m.actionCounts,
    artifacts:m.items.filter(x=>x.action!=='REMOVE').map(x=>({artifactPath:x.artifactPath,artifactSha256:x.artifactSha256,artifactBytes:x.artifactBytes})),
    removals:m.items.filter(x=>x.action==='REMOVE').map(x=>({removalProof:x.removalProof,removalReceiptSha256:x.removalReceiptSha256}))};
  if(files.includes('receipt.json')) {expected.push('receipt.json');const provided=readJson(path.join(dir,'receipt.json'));if(!validateSchema('publication-export-receipt-v2.schema.json',provided)||!equal(provided,r))fail('RECEIPT');}
  if(!equal(files,expected.sort(cmp)))fail('EXTRA_FILES');
  return {manifest:m,stories,receipt:r};
}
function validateStory(s) {
  if(!validateSchema('public-story-export.schema.json',s))fail('STORY_SCHEMA');checkText(s);
  if(s.language!=='tr')fail('LANGUAGE'); if(!Object.hasOwn(categoryMap,s.primaryCategory))fail('CATEGORY');
  if(contentHash(s)!==s.contentHash)fail('CONTENT_HASH');
  if(new Set(s.sources.map(x=>x.url)).size!==s.sources.length)fail('DUPLICATE_SOURCE');
  if(!equal(s.sources,[...s.sources].sort((a,b)=>cmp(canonicalBytes(a).toString(),canonicalBytes(b).toString()))))fail('SOURCE_ORDER');
  if(s.headline!==s.headline.trim()||s.bodyMarkdown!==s.bodyMarkdown.trim()||s.standfirst!==null&&(!s.standfirst.trim()||s.standfirst!==s.standfirst.trim()))fail('NORMALIZATION');
  if(Date.parse(s.updatedAt)<Date.parse(s.publishedAt))fail('TIMESTAMP');
  if(s.publicationStatus==='RETRACTED') {
    if(s.revisionType!=='RETRACTION'||s.headline!=='Haber geri çekildi'||s.standfirst!==null||s.bodyMarkdown!=='Bu haber geri çekilmiştir.'||Date.parse(s.retractedAt)<Date.parse(s.publishedAt)||Date.parse(s.retractedAt)>Date.parse(s.updatedAt))fail('RETRACTION');
  } else if(s.revisionType==='RETRACTION'||s.retractedAt!==null)fail('ACTION_STORY');
}
export function normalize(stories) {
  return [...stories].sort((a,b)=>cmp(b.publishedAt,a.publishedAt)||cmp(a.slug,b.slug)).map(s=>({id:s.storyId,slug:s.slug,category:categoryMap[s.primaryCategory],subcategory:'',title:s.headline,summary:s.standfirst??'',image:'/publication-placeholder.svg',imageSource:'IVMOVA yerel staging',imageAlt:'Nötr staging görseli',imageCaption:'Yerel staging için nötr görsel',time:s.publishedAt,published:s.publishedAt,updated:s.updatedAt,publishedIso:s.publishedAt,updatedIso:s.updatedAt,priority:0,breaking:false,author:'',source:s.sources.find(x=>x.role==='PRIMARY').sourceName,body:s.bodyMarkdown.split('\n'),publicationStatus:s.publicationStatus,retractedAt:s.retractedAt,sources:s.sources.map(x=>({sourceName:x.sourceName,title:x.title,url:x.url,publishedAt:x.publishedAt,role:x.role}))}));
}
function exactKeys(v,keys) {if(!v||typeof v!=='object'||Array.isArray(v)||!equal(Object.keys(v).sort(),keys.sort()))fail('STATE_SCHEMA');}
function stateBytes(store,id) { if(!/^[0-9a-f]{64}$/.test(id))fail('RELEASE_ID'); const dir=path.join(store,'releases',id); noLinks(dir);const b=fs.readFileSync(path.join(dir,'state.json'));const rb=fs.readFileSync(path.join(dir,'record.json'));if(sha256(Buffer.concat([b,rb]))!==id)fail('RELEASE_INTEGRITY');return b; }
export function loadCurrent(store=defaultStore) {
  store=storePath(store); const file=path.join(store,'current.json'); if(!fs.existsSync(file))fail('NO_CURRENT');
  const p=readJson(file);exactKeys(p,['version','current','previous','stateSha256','recordSha256','highWatermark','seenRunIds','generation']);if(p.version!==1)fail('STATE_VERSION');if(!Array.isArray(p.seenRunIds)||p.seenRunIds.length>10000||new Set(p.seenRunIds).size!==p.seenRunIds.length||p.seenRunIds.some(x=>typeof x!=='string'||!/^([0-9a-f]{8}-){1}[0-9a-f-]{27}$/.test(x))||!Number.isFinite(Date.parse(p.highWatermark)))fail('STATE_SCHEMA');
  generation(store);const b=stateBytes(store,p.current);if(sha256(b)!==p.stateSha256)fail('STATE_INTEGRITY');const state=parseInput(b);exactKeys(state,['version','stories','fences']);if(state.version!==1||!Array.isArray(state.stories)||!Array.isArray(state.fences)||!b.equals(canonicalBytes(state)))fail('STATE_SCHEMA');
  state.stories.forEach(validateStory); for(const k of ['storyId','slug'])if(new Set(state.stories.map(s=>s[k])).size!==state.stories.length)fail('STATE_DUPLICATE');
  for(const f of state.fences){exactKeys(f,['storyId','slug','kind','story']);if(!['REMOVE','RETRACT'].includes(f.kind)||!validateSchema('public-story-export.schema.json',f.story)&&f.kind==='RETRACT')fail('FENCE');if(f.kind==='REMOVE'&&f.story!==null)fail('FENCE');}
  const recordFile=path.join(store,'releases',p.current,'record.json');if(sha256(fs.readFileSync(recordFile))!==p.recordSha256)fail('RECORD_INTEGRITY');
  return {pointer:p,state,record:readJson(recordFile)};
}
function locked(store,fn) {store=storePath(store);noLinks(store);return transactionLock(store,fn);}
function publish(store,state,record,old,highWatermark,seenRunIds){return publishTransaction(store,state,record,old,highWatermark,seenRunIds);}
export function inspectStore(store=defaultStore){store=storePath(store);noLinks(store);const info=inspectTransaction(store);if(info.current)loadCurrent(store);return info;}
export function recoveryPlan(store=defaultStore){store=storePath(store);noLinks(store);if(fs.existsSync(path.join(store,'current.json')))loadCurrent(store);return planRecovery(store);}
export function recover({store=defaultStore,action,planHash}={}){store=storePath(store);const plan=recoveryPlan(store);if(plan.planHash!==planHash)fail('RECOVERY_PLAN_CHANGED');return recoverTransaction(store,{action,planHash});}
function replay(store,old,m,hash){
 if(!old?.pointer.seenRunIds.includes(m.exportId))return null;
 const ids=fs.readdirSync(path.join(store,'releases')).filter(id=>/^[0-9a-f]{64}$/.test(id));let match=false;
 for(const id of ids){stateBytes(store,id);const r=readJson(path.join(store,'releases',id,'record.json'));if(r.operation==='IMPORT'&&r.runId===m.exportId){if(r.manifestSha256!==hash)fail('RUN_CONFLICT');match=true;}}
 if(!match)fail('REPLAY_RECORD_MISSING');return {releaseId:old.pointer.current,storyCount:old.state.stories.length,record:old.record,generation:old.pointer.generation,replay:true};
}
function fenced(stories,fences) {
  const result=stories.filter(s=>!fences.some(f=>f.storyId===s.storyId||f.slug===s.slug));
  for(const f of fences.filter(f=>f.kind==='RETRACT'))result.push(f.story);
  for(const k of ['storyId','slug'])if(new Set(result.map(s=>s[k])).size!==result.length)fail('STATE_DUPLICATE');
  return result.sort((a,b)=>cmp(a.slug,b.slug));
}
export function importRelease(input,{store=defaultStore}={}) {
  const release=validateRelease(input);
  return locked(store,store=>{
    const old=fs.existsSync(path.join(store,'current.json'))?loadCurrent(store):null;const m=release.manifest;
    const repeated=replay(store,old,m,release.receipt.manifestSha256);if(repeated)return repeated;
    if(old&&Date.parse(m.generatedAt)<=Date.parse(old.pointer.highWatermark))fail('STALE_RELEASE');
    if(!old&&m.runType!=='FULL')fail('BASE_REQUIRED');
    const fences=[...(old?.state.fences??[])];const implicitRemovals=[];
    if(m.runType==='FULL'&&old)for(const s of old.state.stories)if(!m.items.some(x=>x.storyId===s.storyId)&&!fences.some(f=>f.storyId===s.storyId)){fences.push({storyId:s.storyId,slug:s.slug,kind:'REMOVE',story:null});implicitRemovals.push({storyId:s.storyId,slug:s.slug});}
    let stories=m.runType==='FULL'?[]:[...old.state.stories];
    for(const x of m.items) {
      const collision=old?.state.stories.find(s=>s.slug===x.slug&&s.storyId!==x.storyId);if(collision)fail('SLUG_OWNER');
      const prior=old?.state.stories.find(s=>s.storyId===x.storyId);
      if(prior&&prior.slug!==x.slug)fail('SLUG_CHANGE_REQUIRES_REMOVE');
      const fence=fences.find(f=>f.storyId===x.storyId||f.slug===x.slug);
      if(fence&&(fence.storyId!==x.storyId||x.action==='UPSERT'||fence.kind==='REMOVE'&&x.action!=='REMOVE'))fail('TOMBSTONE');
      stories=stories.filter(s=>s.storyId!==x.storyId&&s.slug!==x.slug);
      if(x.action==='REMOVE'||x.action==='RETRACT') {
        if(fence)fences.splice(fences.indexOf(fence),1);
        fences.push({storyId:x.storyId,slug:x.slug,kind:x.action,story:x.action==='RETRACT'?release.stories.find(s=>s.storyId===x.storyId):null});
      }
      if(x.action!=='REMOVE') {
        const s=release.stories.find(s=>s.storyId===x.storyId);
        if(prior&&s.revisionNumber<prior.revisionNumber)fail('STALE_REVISION');
        if(prior&&s.revisionNumber===prior.revisionNumber&&!equal(s,prior))fail('REVISION_CONFLICT');stories.push(s);
      }
    }
    fences.sort((a,b)=>cmp(a.slug,b.slug));stories=fenced(stories,fences);
    const state={version:1,stories,fences}; const record={runId:m.exportId,contractVersion:2,generatedAt:m.generatedAt,manifestSha256:release.receipt.manifestSha256,manifestBytes:release.receipt.manifestBytes,previousRelease:old?.pointer.current??null,actionCounts:m.actionCounts,operation:'IMPORT',implicitRemovals,receipt:release.receipt};
    return publish(store,state,record,old,m.generatedAt,[...(old?.pointer.seenRunIds??[]),m.exportId]);
  });
}
export function rollback({store=defaultStore}={}) {
  return locked(store,store=>{
    const old=loadCurrent(store);if(!old.pointer.previous)fail('NO_PREVIOUS');const previous=parseInput(stateBytes(store,old.pointer.previous));previous.stories.forEach(validateStory);
    const state={version:1,stories:fenced(previous.stories,old.state.fences),fences:old.state.fences};
    return publish(store,state,{...old.record,operation:'ROLLBACK',rollbackTarget:old.pointer.previous,previousRelease:old.pointer.current},old,old.pointer.highWatermark,old.pointer.seenRunIds);
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try {
 const [command,...args]=process.argv.slice(2);const store=defaultStore;let result;
 if(command==='import'&&args.length===1)result=importRelease(args[0]);
 else if(command==='rollback'&&!args.length)result=rollback();
 else if(['state','lock','recovery-plan'].includes(command)&&!args.length)result=command==='recovery-plan'?recoveryPlan(store):inspectStore(store);
 else if(command==='recover'&&args.length===2){const [action,planHash]=args;const plan=recoveryPlan(store);console.log(JSON.stringify({target:store,plan}));result=recover({store,action,planHash});}
 else fail('CLI_ARGUMENT');console.log(JSON.stringify(result.record?{releaseId:result.releaseId,storyCount:result.storyCount,generation:result.generation,replay:result.replay}:result));
 }catch(e){console.error(e instanceof ExportError?e.code:'CONSUMER_FAILED');process.exitCode=1;}
}
