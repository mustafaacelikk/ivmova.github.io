import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { importRelease, rollback, loadCurrent, validateRelease, normalize, canonicalBytes, sha256 } from './publication-consumer.mjs';
import { story, uid, writeRelease } from './publication-fixtures.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ivmova-consumer-test-'));let assertions=0;let counter=20;
const ok=(v,m)=>{assert.ok(v,m);assertions++;}; const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++;};
const rejected=(fn,m)=>{assert.throws(fn,undefined,m);assertions++;};
const make=(opt={})=>{const dir=path.join(tmp,'input-'+counter);return {dir,...writeRelease(dir,{run:counter++,minute:10,...opt})};};
function mutate(input,fn) {fn(input.manifest);fs.writeFileSync(input.file,canonicalBytes(input.manifest));}
function replaceStory(input,fn) {const x=input.manifest.items[0];const f=path.join(input.dir,x.artifactPath);const s=JSON.parse(fs.readFileSync(f));fn(s);const b=canonicalBytes(s);fs.writeFileSync(f,b);x.artifactSha256=sha256(b);x.artifactBytes=b.length;mutate(input,()=>{});}
try {
  const store=path.join(tmp,'store');const first=make({minute:1});importRelease(first.dir,{store});eq(loadCurrent(store).state.stories.length,1,'FULL UPSERT');
  const before=canonicalBytes(normalize(loadCurrent(store).state.stories));const beforeStateHash=loadCurrent(store).pointer.stateSha256;
  const second=make({type:'INCREMENTAL',minute:2,stories:[story(2)]});importRelease(second.dir,{store});eq(loadCurrent(store).state.stories.length,2,'INCREMENTAL UPSERT');
  rollback({store});eq(canonicalBytes(normalize(loadCurrent(store).state.stories)),before,'rollback public hash/state equality');eq(loadCurrent(store).pointer.stateSha256,beforeStateHash,'rollback raw state SHA equality');
  rejected(()=>importRelease(first.dir,{store}),'replayed old FULL');
  const rt=make({type:'INCREMENTAL',minute:3,stories:[story(1,2,true)]});importRelease(rt.dir,{store});const retracted=loadCurrent(store).state.stories[0];eq(retracted.publicationStatus,'RETRACTED','route notice preserved');eq(normalize([retracted]).filter(s=>s.publicationStatus!=='RETRACTED').length,0,'notice excluded from listing');
  rollback({store});eq(loadCurrent(store).state.stories[0].headline,'Haber geri çekildi','rollback retains retraction fence');
  const rm=make({type:'INCREMENTAL',minute:4,stories:[],removals:[1]});validateRelease(rm.dir);eq(fs.existsSync(path.join(rm.dir,'stories/tr/sentetik-1.json')),false,'REMOVE no Story');importRelease(rm.dir,{store});eq(loadCurrent(store).state.stories.length,0,'REMOVE excludes routes');eq(loadCurrent(store).state.fences[0].kind,'REMOVE','tombstone');
  rollback({store});eq(loadCurrent(store).state.stories.length,0,'rollback retains REMOVE tombstone');
  const revive=make({type:'INCREMENTAL',minute:5,stories:[story(1,3)]});const stable=fs.readFileSync(path.join(store,'current.json'));rejected(()=>importRelease(revive.dir,{store}),'newer UPSERT cannot revive tombstone');eq(fs.readFileSync(path.join(store,'current.json')),stable,'failed import preserves current');
  const empty=make({minute:6,stories:[]});importRelease(empty.dir,{store});eq(loadCurrent(store).state.stories.length,0,'empty FULL');eq(loadCurrent(store).state.fences.length,1,'FULL preserves tombstones');
  const base=make({type:'INCREMENTAL'});rejected(()=>importRelease(base.dir,{store:path.join(tmp,'no-base')}),'incremental needs base');
  const determinism=make();const a=path.join(tmp,'det-a'),b=path.join(tmp,'det-b');importRelease(determinism.dir,{store:a});importRelease(determinism.dir,{store:b});eq(fs.readFileSync(path.join(a,'current.json')),fs.readFileSync(path.join(b,'current.json')),'deterministic state/pointer');
  for(const [label,change] of [
    ['unknown contract',m=>m.schemaVersion=99],['unknown action',m=>m.items[0].action='EXECUTE'],['extra manifest field',m=>m.privateNote='x'],['missing field',m=>delete m.target],['bad count',m=>m.itemCount++],['bad action count',m=>m.actionCounts.UPSERT++],['hash mismatch',m=>m.items[0].artifactSha256='0'.repeat(64)],['byte mismatch',m=>m.items[0].artifactBytes++],
    ['traversal',m=>m.items[0].artifactPath='stories/tr/../../x.json'],['absolute',m=>m.items[0].artifactPath='/stories/tr/x.json'],['backslash',m=>m.items[0].artifactPath='stories\\tr\\x.json'],['URL',m=>m.items[0].artifactPath='https://example.test/x.json'],
    ['duplicate ID',m=>{m.items.push({...m.items[0],slug:'other',artifactPath:'stories/tr/other.json'});m.itemCount++;m.actionCounts.UPSERT++}],['duplicate slug/path',m=>{m.items.push({...m.items[0],storyId:uid(999)});m.itemCount++;m.actionCounts.UPSERT++}],
  ]) {const input=make();mutate(input,change);rejected(()=>validateRelease(input.dir),label);}
  for(const [label,change] of [['language',s=>s.language='en'],['category',s=>s.primaryCategory='Bilinmeyen'],['extra Story field',s=>s.actorId='not-public'],['missing Story field',s=>delete s.headline],['content hash',s=>s.contentHash='0'.repeat(64)],['private credential',s=>s.bodyMarkdown='password=never-public']]) {const input=make();replaceStory(input,change);rejected(()=>validateRelease(input.dir),label);}
  const missing=make();fs.unlinkSync(path.join(missing.dir,missing.manifest.items[0].artifactPath));rejected(()=>validateRelease(missing.dir),'missing artifact');
  const extra=make();fs.writeFileSync(path.join(extra.dir,'unexpected.json'),'{}');rejected(()=>validateRelease(extra.dir),'extra file');
  const removalExtra=make({stories:[],removals:[9]});fs.mkdirSync(path.join(removalExtra.dir,'stories/tr'),{recursive:true});fs.writeFileSync(path.join(removalExtra.dir,'stories/tr/sentetik-9.json'),'{}');rejected(()=>validateRelease(removalExtra.dir),'REMOVE Story forbidden');
  const symlink=make();const junction=path.join(symlink.dir,'linked');fs.symlinkSync(tmp,junction,'junction');rejected(()=>validateRelease(symlink.dir),'symlink rejected');fs.unlinkSync(junction);
  const bom=make();fs.writeFileSync(bom.file,Buffer.concat([Buffer.from([239,187,191]),fs.readFileSync(bom.file)]));rejected(()=>validateRelease(bom.dir),'BOM');
  const duplicateKeys=make();fs.writeFileSync(duplicateKeys.file,fs.readFileSync(duplicateKeys.file,'utf8').replace('"schemaVersion":2','"schemaVersion":2,"schemaVersion":2'));rejected(()=>validateRelease(duplicateKeys.dir),'duplicate JSON keys');
  const receiptInput=make();const computed=validateRelease(receiptInput.dir).receipt;fs.writeFileSync(path.join(receiptInput.dir,'receipt.json'),canonicalBytes(computed));ok(validateRelease(receiptInput.dir),'valid detached receipt');computed.manifestBytes++;fs.writeFileSync(path.join(receiptInput.dir,'receipt.json'),canonicalBytes(computed));rejected(()=>validateRelease(receiptInput.dir),'receipt mismatch');
  const large=make();fs.writeFileSync(path.join(large.dir,'too-big'),Buffer.alloc(17*1024*1024));rejected(()=>validateRelease(large.dir),'byte limit');
  const record=loadCurrent(store).record;ok(Object.hasOwn(record,'manifestBytes')&&Object.hasOwn(record,'previousRelease'),'internal release record');
  const publicData=canonicalBytes(normalize(loadCurrent(a).state.stories)).toString();for(const field of ['runId','manifestSha256','receipt','fences','contractVersion','revisionId','contentHash'])ok(!publicData.includes('"'+field+'"'),'public excludes '+field);
  const safePointer=fs.readFileSync(path.join(a,'current.json'));
  const next=make({type:'INCREMENTAL',minute:11,stories:[story(2)]});
  const rename=fs.renameSync;fs.renameSync=function(from,to){if(to===path.join(a,'current.json'))throw new Error('SIMULATED_SWAP_FAILURE');return rename(from,to);};
  try{rejected(()=>importRelease(next.dir,{store:a}),'swap failure');}finally{fs.renameSync=rename;}
  eq(fs.readFileSync(path.join(a,'current.json')),safePointer,'failed swap preserves current pointer');eq(loadCurrent(a).state.stories.length,1,'failed swap preserves previous bytes');
  importRelease(next.dir,{store:a});eq(loadCurrent(a).state.stories.length,2,'retry after failed swap reuses verified orphan');
  const ownerCollision=make({type:'INCREMENTAL',minute:12,stories:[{...story(2),slug:'sentetik-1'}]});rejected(()=>importRelease(ownerCollision.dir,{store:a}),'slug owner collision');
  const tombRetract=make({type:'INCREMENTAL',minute:12,stories:[story(1,5,true)]});rejected(()=>importRelease(tombRetract.dir,{store}),'REMOVE cannot become RETRACT');
  const countLimit=make();for(let i=0;i<1003;i++)fs.writeFileSync(path.join(countLimit.dir,'extra-'+i),'');rejected(()=>validateRelease(countLimit.dir),'file count limit');
  const unsafeRetraction=make({stories:[story(3,2,true)]});replaceStory(unsafeRetraction,s=>s.headline='Eski metin');rejected(()=>validateRelease(unsafeRetraction.dir),'unsafe notice');
  const invalidUtf=make();fs.writeFileSync(invalidUtf.file,Buffer.from([255,254,253]));rejected(()=>validateRelease(invalidUtf.dir),'invalid UTF8');
  const duplicatedPath=make({stories:[story(1),story(2)]});mutate(duplicatedPath,m=>m.items[1].artifactPath=m.items[0].artifactPath);rejected(()=>validateRelease(duplicatedPath.dir),'duplicate artifact path separately');
  const duplicatedSlug=make({stories:[story(1),story(2)]});mutate(duplicatedSlug,m=>m.items[1].slug=m.items[0].slug);rejected(()=>validateRelease(duplicatedSlug.dir),'duplicate slug separately');
  const fullResetStore=path.join(tmp,'full-reset');importRelease(determinism.dir,{store:fullResetStore});const fullReset=make({minute:13,stories:[]});importRelease(fullReset.dir,{store:fullResetStore});eq(loadCurrent(fullResetStore).state.stories.length,0,'FULL authoritative reset');eq(loadCurrent(fullResetStore).state.fences.length,1,'FULL omission fence');const resetRevive=make({type:'INCREMENTAL',minute:14,stories:[story(1,2)]});rejected(()=>importRelease(resetRevive.dir,{store:fullResetStore}),'FULL omitted Story cannot revive');rollback({store:fullResetStore});eq(loadCurrent(fullResetStore).state.stories.length,0,'rollback retains FULL omission fence');
  const corrupt=path.join(a,'releases',loadCurrent(a).pointer.current,'state.json');const intact=fs.readFileSync(corrupt);fs.appendFileSync(corrupt,' ');rejected(()=>loadCurrent(a),'generated state tamper rejected');fs.writeFileSync(corrupt,intact);
  console.log(JSON.stringify({assertions,networkCalls:0,result:'PASS'}));
} finally {const resolved=path.resolve(tmp);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('ivmova-consumer-test-'))throw new Error('CLEANUP_BOUNDARY');fs.rmSync(resolved,{recursive:true,force:true});}
