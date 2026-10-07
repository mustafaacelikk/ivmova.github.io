// Read-only Git authority + reviewable draft generation. No commit/push/deploy.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {canonicalBytes,sha256} from './publication-contract.mjs';
import {verifyBundle,inventory,treeHash,publicSafety} from './publication-release.mjs';
import {validateRelease} from './publication-consumer.mjs';
import {validate,readCanonical,equal,fail} from './publication-control-schema.mjs';
import {verifyHistory,prepareOutcomeFromGit} from './publication-git-history.mjs';
export const LEDGER_PATH='production/ledger.json',MARKER_PATH='.well-known/ivmova-release.json';
export const GENESIS={schemaVersion:1,records:[]},EMPTY_PRODUCTION={releaseId:null,treeHash:null};
const identity=r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['generation','previousRecordSha256','recordSha256','status','evidence'].includes(k)));
export const recordHash=r=>sha256(canonicalBytes(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='recordSha256'))));
export function markerFor(r){return validate('release-marker-v1',{releaseId:r.releaseId,treeHash:r.publicTreeSha256,sourceCommit:r.siteSourceCommit,generatedAt:r.createdAt,contractVersion:r.publicationVersion});}
export function validateLedger(ledger){
 validate('production-ledger-v1',ledger);let last=null,production=EMPTY_PRODUCTION,pending=null;const releases=new Map();
 for(const [i,r]of ledger.records.entries()){
 if(r.generation!==i+1||r.previousRecordSha256!==(last?.recordSha256??null)||r.recordSha256!==recordHash(r))fail('LEDGER_CHAIN');
 if((r.expectedPrevious.releaseId===null)!==(r.expectedPrevious.treeHash===null))fail('HEAD_PAIR');
 if(r.producer.sourceCommit!==r.siteSourceCommit||r.itemCount!==Object.values(r.actionCounts).reduce((a,b)=>a+b,0)||r.markerSha256!==sha256(canonicalBytes(markerFor(r))))fail('LEDGER_IDENTITY');
 if((r.releaseType==='ROLLBACK')!==(r.rollbackTarget!==null))fail('ROLLBACK_TARGET');
 if(!equal(r.safetyFences,[...r.safetyFences].sort((a,b)=>a.slug<b.slug?-1:a.slug>b.slug?1:0))||new Set(r.safetyFences.map(f=>f.slug)).size!==r.safetyFences.length)fail('FENCE_ORDER');
 const known=releases.get(r.releaseId);
 if(r.status==='PREPARED'){
 if(known)fail('RELEASE_ID_CONFLICT');const recoveryRollback=pending?.status==='FAILED'&&pending.evidence?.outcome==='UNKNOWN'&&r.releaseType==='ROLLBACK';const expected=recoveryRollback?{releaseId:pending.releaseId,treeHash:pending.publicTreeSha256}:production;if(pending&&!recoveryRollback||!equal(r.expectedPrevious,expected)||r.evidence!==null)fail('PREPARE_HEAD');
 if(r.releaseType==='ROLLBACK'){const target=releases.get(r.rollbackTarget);if(!target||target.status!=='RECONCILED'||target.publicTreeSha256!==r.publicTreeSha256||target.bundleTreeSha256!==r.bundleTreeSha256||target.provenanceSha256!==r.provenanceSha256)fail('ROLLBACK_UNVERIFIED');}
 const previous=recoveryRollback?pending:production.releaseId?releases.get(production.releaseId):null;
 if(previous?.safetyFences.some(f=>!r.safetyFences.some(n=>n.slug===f.slug&&(f.kind==='REMOVE'?n.kind==='REMOVE':n.kind==='REMOVE'||n.kind==='RETRACT'&&n.revisionNumber>=f.revisionNumber))))fail('FENCE_REGRESSION');
 pending=r;releases.set(r.releaseId,r);
 }else{
 if(!known||!pending||pending.releaseId!==r.releaseId||!equal(identity(r),identity(known))||!r.evidence)fail('STATUS_IDENTITY');
 const e=r.evidence;if(Date.parse(e.observedAt)<Date.parse(r.createdAt))fail('EVIDENCE_TIME');
 const allowed={PREPARED:['DEPLOYED','RECONCILED','FAILED'],DEPLOYED:['RECONCILED','FAILED'],FAILED:['RECONCILED']};
 if(!allowed[known.status]?.includes(r.status))fail('STATUS_TRANSITION');
 if(r.status==='RECONCILED'){if(e.outcome!=='RECONCILED'||e.pagesDeploymentId!==e.commit||e.markerSha256!==r.markerSha256)fail('RECONCILIATION_EVIDENCE');production={releaseId:r.releaseId,treeHash:r.publicTreeSha256};pending=null;}
 else if(r.status==='DEPLOYED'){if(e.outcome!=='DEPLOYED'||e.pagesDeploymentId!==e.commit||e.markerSha256!==null)fail('DEPLOYMENT_EVIDENCE');pending=r;}
 else{if(!['NOT_DEPLOYED','UNKNOWN'].includes(e.outcome)||e.markerSha256!==null||e.outcome==='NOT_DEPLOYED'&&(known.status!=='PREPARED'||e.pagesDeploymentId!==null))fail('FAILURE_EVIDENCE');pending=e.outcome==='NOT_DEPLOYED'?null:r;}
 releases.set(r.releaseId,r);
 }
 last=r;
 }
 return {generation:ledger.records.length,recordSha256:last?.recordSha256??null,production,pending,releases};
}
export function assertAppendOnly(before,after){validateLedger(before);validateLedger(after);if(after.records.length<before.records.length||!equal(after.records.slice(0,before.records.length),before.records))fail('HISTORY_REWRITE');return after;}
export function appendRecord(ledger,record){const s=validateLedger(ledger);const r={...record,generation:s.generation+1,previousRecordSha256:s.recordSha256};r.recordSha256=recordHash(r);return assertAppendOnly(ledger,{schemaVersion:1,records:[...ledger.records,r]});}
export function assertGitBase(expected,actual){if(!/^[0-9a-f]{40}$/.test(expected)||expected!==actual)fail('STALE_GIT_BASE');}
export function git(repo,args){return execFileSync('git',['-C',repo,...args],{encoding:'utf8',maxBuffer:32*1024*1024}).trim();}
export function verifyGitLedgerHistory(repo,commit){return verifyHistory(repo,commit);}
function nextFences(prior,manifest){const map=new Map(prior.map(f=>[f.slug,f]));for(const i of manifest.items){if(i.action==='REMOVE')map.set(i.slug,{slug:i.slug,kind:'REMOVE',revisionNumber:map.get(i.slug)?.revisionNumber??0});else if(i.action==='RETRACT'&&map.get(i.slug)?.kind!=='REMOVE')map.set(i.slug,{slug:i.slug,kind:'RETRACT',revisionNumber:i.revisionNumber});}return [...map.values()].sort((a,b)=>a.slug<b.slug?-1:a.slug>b.slug?1:0);}
export function verifySafetyFences(bundle,fences){
 const release=validateRelease(path.resolve(bundle,'internal/publication'));if(release.manifest.runType!=='FULL')fail('FULL_SNAPSHOT_REQUIRED');
 const root=path.join(bundle,'public');const list=publicSafety(root),sitemap=fs.existsSync(path.join(root,'sitemap.xml'))?fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'):'';
 for(const f of fences){const item=release.manifest.items.find(i=>i.slug===f.slug),route=path.join(root,'haber',f.slug,'index.html');
 if(f.kind==='REMOVE'){if(item&&item.action!=='REMOVE'||fs.existsSync(route)||sitemap.includes('/haber/'+f.slug+'/'))fail('REMOVE_RESURRECTION');for(const entry of list.filter(x=>/\.(html|js|json|xml|txt)$/.test(x.path)))if(fs.readFileSync(path.join(root,entry.path),'utf8').includes(f.slug))fail('REMOVE_STATIC_LEAK');}
 else if(!item||item.action!=='RETRACT'||item.revisionNumber<f.revisionNumber||!fs.existsSync(route)||!fs.readFileSync(route,'utf8').includes('Haber geri çekildi')||sitemap.includes('/haber/'+f.slug+'/'))fail('RETRACT_RESURRECTION');}
 return release;
}
export function deployInventory(bundle,marker){const list=inventory(path.join(bundle,'public'));if(list.some(x=>x.path===MARKER_PATH))fail('BUNDLE_ALREADY_HAS_MARKER');const b=canonicalBytes(validate('release-marker-v1',marker));return [...list,{path:MARKER_PATH,bytes:b.length,sha256:sha256(b)}].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);}
export function preparePromotion({ledger,bundle,releaseId,expectedGitBase,actualGitBase,expectedPrevious,expectedGeneration,createdAt,producer,releaseType='RELEASE',rollbackTarget=null}){
 assertGitBase(expectedGitBase,actualGitBase);const s=validateLedger(ledger),v=verifyBundle(bundle),p=v.provenance;
 const old=s.releases.get(releaseId);
 if(old){if(old.bundleTreeSha256!==treeHash(bundle)||old.provenanceSha256!==v.metadata.provenanceSha256||old.createdAt!==createdAt||old.releaseType!==releaseType||old.rollbackTarget!==rollbackTarget||!equal(old.producer,producer)||!equal(old.expectedPrevious,expectedPrevious)||old.expectedGitBase!==expectedGitBase)fail('RELEASE_ID_CONFLICT');return {ledger,record:old,marker:markerFor(old),replay:true};}
 const recoveryRollback=s.pending?.status==='FAILED'&&s.pending.evidence?.outcome==='UNKNOWN'&&releaseType==='ROLLBACK';const expected=recoveryRollback?{releaseId:s.pending.releaseId,treeHash:s.pending.publicTreeSha256}:s.production;if(s.pending&&!recoveryRollback||s.generation!==expectedGeneration||!equal(expected,expectedPrevious))fail('STALE_PRODUCTION_HEAD');
 const prior=recoveryRollback?s.pending.safetyFences:s.production.releaseId?s.releases.get(s.production.releaseId).safetyFences:[];
 const manifest=validateRelease(path.resolve(bundle,'internal/publication')).manifest;
 const fences=nextFences(prior,manifest);verifySafetyFences(bundle,fences);
 if(releaseType==='RELEASE'){const previous=s.production.releaseId?s.releases.get(s.production.releaseId):null;if(!equal(p.previousProduction,{releaseId:previous?.publicationRunId??null,provenanceSha256:previous?.provenanceSha256??null}))fail('PROVENANCE_PREVIOUS_HEAD');}
 const r={schemaVersion:1,releaseId,publicationRunId:p.runId,publicationVersion:p.publicationVersion,manifestSha256:p.manifestSha256,manifestBytes:p.manifestBytes,receiptSha256:p.receiptSha256,provenanceSha256:v.metadata.provenanceSha256,publicTreeSha256:p.outputTreeSha256,deployTreeSha256:'0'.repeat(64),bundleTreeSha256:treeHash(bundle),markerSha256:'0'.repeat(64),siteSourceCommit:p.siteSourceCommit,expectedGitBase,expectedPrevious,actionCounts:p.actionCounts,itemCount:p.itemCount,fileCount:p.fileCount,createdAt,releaseType,rollbackTarget,status:'PREPARED',producer,safetyFences:fences,evidence:null,generation:0,previousRecordSha256:null,recordSha256:'0'.repeat(64)};
 const marker=markerFor(r);r.markerSha256=sha256(canonicalBytes(marker));r.deployTreeSha256=sha256(canonicalBytes(deployInventory(bundle,marker)));
 const next=appendRecord(ledger,r);return {ledger:next,record:next.records.at(-1),marker,replay:false};
}
export function recordOutcome({ledger,releaseId,status,evidence,expectedGitBase,actualGitBase,expectedGeneration}){
 assertGitBase(expectedGitBase,actualGitBase);const s=validateLedger(ledger),r=s.releases.get(releaseId);if(!r)fail('UNKNOWN_RELEASE');
 if(r.status===status&&equal(r.evidence,evidence))return {ledger,replay:true};
 if(s.generation!==expectedGeneration||s.pending?.releaseId!==releaseId)fail('STALE_OUTCOME');
 return {ledger:appendRecord(ledger,{...r,status,evidence}),replay:false};
}
export function materializeOutput(bundle,record,destination){
 const v=verifyBundle(bundle);if(treeHash(bundle)!==record.bundleTreeSha256||v.metadata.provenanceSha256!==record.provenanceSha256||v.provenance.outputTreeSha256!==record.publicTreeSha256||v.provenance.siteSourceCommit!==record.siteSourceCommit)fail('BUNDLE_LEDGER_CHAIN');
 verifySafetyFences(bundle,record.safetyFences);if(fs.existsSync(destination))fail('OUTPUT_EXISTS');
 fs.cpSync(path.join(bundle,'public'),destination,{recursive:true});const marker=markerFor(record),target=path.join(destination,MARKER_PATH);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,canonicalBytes(marker));
 if(treeHash(destination)!==record.deployTreeSha256)fail('DEPLOY_TREE_CHAIN');publicSafety(destination);return marker;
}
export function prepareFromGit(request,destination){
 const repo=path.resolve(request.repo),base=git(repo,['rev-parse','HEAD']);assertGitBase(request.expectedGitBase,base);
 const ledger=verifyGitLedgerHistory(repo,base);const plan=preparePromotion({...request,ledger,actualGitBase:base});
 assertGitBase(base,git(repo,['rev-parse','HEAD']));if(!equal(readCanonical(path.join(repo,LEDGER_PATH)),ledger))fail('LOCAL_LEDGER_CHANGED');
 if(fs.existsSync(destination))fail('DRAFT_EXISTS');fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'ledger.json'),canonicalBytes(plan.ledger));fs.writeFileSync(path.join(destination,'release-marker.json'),canonicalBytes(plan.marker));fs.writeFileSync(path.join(destination,'summary.json'),canonicalBytes({releaseId:plan.record.releaseId,generation:plan.record.generation,expectedGitBase:base,publicTreeSha256:plan.record.publicTreeSha256,trustMode:plan.record.producer.trustMode,replay:plan.replay}));return plan;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const [mode,input,output]=process.argv.slice(2);if(mode==='prepare')console.log(JSON.stringify(prepareFromGit(readCanonical(input),output).record.releaseId));else if(mode==='outcome')console.log(JSON.stringify({replay:prepareOutcomeFromGit(readCanonical(input),output).replay}));else if(mode==='verify')console.log(JSON.stringify({generation:validateLedger(readCanonical(input)).generation}));else fail('CLI_ARGUMENT');}
