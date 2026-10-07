// No network or deployment. Local ledger is a model, never a distributed authority.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalBytes,sha256,parseInput,checkText,verifyContracts} from './publication-contract.mjs';
import {validateRelease} from './publication-consumer.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=c=>{throw new Error(c);};
const equal=(a,b)=>canonicalBytes(a).equals(canonicalBytes(b));
export function inventory(root) {
 root=path.resolve(root);let at=path.parse(root).root;
 for(const part of root.slice(at.length).split(path.sep).filter(Boolean)){at=path.join(at,part);if(fs.lstatSync(at).isSymbolicLink())fail('SYMLINK');}
 const result=[];let bytes=0;
 function walk(dir){for(const e of fs.readdirSync(dir).sort()){if(!/^[A-Za-z0-9_.$@()\[\]~+,%=-]+$/.test(e)||e==='.'||e==='..')fail('PATH:'+e);const p=path.join(dir,e),s=fs.lstatSync(p);if(s.isSymbolicLink()||(s.isFile()&&s.nlink>1))fail('LINK');if(s.isDirectory())walk(p);else if(s.isFile()){bytes+=s.size;if(bytes>512*1024*1024||result.length>=50000)fail('LIMIT');result.push({path:path.relative(root,p).split(path.sep).join('/'),bytes:s.size,sha256:sha256(fs.readFileSync(p))});}else fail('FILE_TYPE');}}
 walk(root);return result.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
export const treeHash=root=>sha256(canonicalBytes(inventory(root)));
const hash=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export const EMPTY_HEAD={releaseId:null,provenanceSha256:null};
function head(v){return v&&equal(Object.keys(v).sort(),['provenanceSha256','releaseId'])&&((v.releaseId===null&&v.provenanceSha256===null)||(uuid(v.releaseId)&&hash(v.provenanceSha256)));}
const keys=['schemaVersion','runId','publicationVersion','manifestSha256','manifestBytes','receiptSha256','contractManifestSha256','siteSourceCommit','consumerVersion','buildTimestamp','itemCount','fileCount','actionCounts','previousProduction','outputTreeSha256'];
export function validateProvenance(p){
 if(!p||!equal(Object.keys(p).sort(),keys.slice().sort())||p.schemaVersion!==1||p.publicationVersion!==2||!uuid(p.runId)||p.consumerVersion!=='6c4-v1'||!head(p.previousProduction))fail('PROVENANCE_SCHEMA');
 for(const k of ['manifestSha256','receiptSha256','contractManifestSha256','outputTreeSha256'])if(!hash(p[k]))fail('PROVENANCE_HASH');
 if(!/^[0-9a-f]{40}$/.test(p.siteSourceCommit)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(p.buildTimestamp)||!Number.isFinite(Date.parse(p.buildTimestamp))||new Date(p.buildTimestamp).toISOString()!==p.buildTimestamp)fail('PROVENANCE_VALUE');
 for(const k of ['manifestBytes','itemCount','fileCount'])if(!Number.isSafeInteger(p[k])||p[k]<0)fail('PROVENANCE_COUNT');
 if(!p.actionCounts||!equal(Object.keys(p.actionCounts).sort(),['REMOVE','RETRACT','UPSERT']))fail('PROVENANCE_COUNTS');
 for(const n of Object.values(p.actionCounts))if(!Number.isSafeInteger(n)||n<0)fail('PROVENANCE_COUNTS');
 if(Object.values(p.actionCounts).reduce((a,b)=>a+b,0)!==p.itemCount)fail('PROVENANCE_COUNTS');checkText(p);return p;
}
function readCanonical(file){const b=fs.readFileSync(file),p=parseInput(b);if(!b.equals(canonicalBytes(p)))fail('NON_CANONICAL');return p;}
export function publicSafety(root){
 const list=inventory(root);if(!list.some(x=>x.path==='index.html')||!list.some(x=>x.path==='404.html'))fail('OUTPUT_INCOMPLETE');
 for(const x of list){if(/(?:^|\/)(?:internal|manifests|receipt|provenance|journal|import.lock|\.publication|\.git|\.env)|service-worker|sw\.js/i.test(x.path))fail('PUBLIC_INTERNAL');
 if(/\.(html|js|json|xml|txt)$/.test(x.path)){const t=fs.readFileSync(path.join(root,x.path),'utf8');if(/sb_secret_|sb_publishable_|ghp_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]{8,}|postgres(?:ql)?:\/\/|https?:\/\/[^\s/]*\.supabase\.co|eyJ[\w-]+\.[\w-]+\.[\w-]+/.test(t))fail('PUBLIC_SECRET');if(/manifestSha256|receiptSha256|operationId|seenRunIds|serviceWorker\.register/.test(t))fail('PUBLIC_METADATA');}}
 return list;
}
export function createBundle({output,publication,destination,siteSourceCommit,buildTimestamp,previousProduction=EMPTY_HEAD}){
 if(fs.existsSync(destination))fail('BUNDLE_EXISTS');verifyContracts();const r=validateRelease(publication),list=publicSafety(output);
 const p=validateProvenance({schemaVersion:1,runId:r.manifest.exportId,publicationVersion:2,manifestSha256:r.receipt.manifestSha256,manifestBytes:r.receipt.manifestBytes,receiptSha256:sha256(canonicalBytes(r.receipt)),contractManifestSha256:sha256(fs.readFileSync(path.join(repo,'contracts/publication-v2/contract-manifest.json'))),siteSourceCommit,consumerVersion:'6c4-v1',buildTimestamp,itemCount:r.manifest.itemCount,fileCount:r.receipt.fileCount,actionCounts:r.manifest.actionCounts,previousProduction,outputTreeSha256:sha256(canonicalBytes(list))});
 // Destination is unpublished until completion; any exception leaves an invalid bundle.
 fs.mkdirSync(path.join(destination,'internal'),{recursive:true});fs.cpSync(output,path.join(destination,'public'),{recursive:true});
 fs.cpSync(publication,path.join(destination,'internal/publication'),{recursive:true});
 fs.writeFileSync(path.join(destination,'internal/receipt.json'),canonicalBytes(r.receipt));
 fs.writeFileSync(path.join(destination,'internal/provenance.json'),canonicalBytes(p));
 fs.writeFileSync(path.join(destination,'internal/inventory.json'),canonicalBytes(list));
 fs.writeFileSync(path.join(destination,'release.json'),canonicalBytes({schemaVersion:1,releaseId:p.runId,provenanceSha256:sha256(canonicalBytes(p)),publicTreeSha256:p.outputTreeSha256}));
 return verifyBundle(destination);
}
export function verifyBundle(root,expected={}){
 inventory(root);const metadata=readCanonical(path.join(root,'release.json'));
 if(!equal(Object.keys(metadata).sort(),['provenanceSha256','publicTreeSha256','releaseId','schemaVersion'])||metadata.schemaVersion!==1)fail('RELEASE_SCHEMA');
 const p=validateProvenance(readCanonical(path.join(root,'internal/provenance.json'))),r=validateRelease(path.resolve(root,'internal/publication'));
 if(!equal(readCanonical(path.join(root,'internal/receipt.json')),r.receipt))fail('RECEIPT_CHAIN');
 const list=publicSafety(path.join(root,'public'));
 const expectedFiles=['release.json','internal/provenance.json','internal/receipt.json','internal/inventory.json',...inventory(path.join(root,'internal/publication')).map(x=>'internal/publication/'+x.path),...list.map(x=>'public/'+x.path)].sort();
 if(!equal(inventory(root).map(x=>x.path),expectedFiles))fail('BUNDLE_EXTRA');
 if(!equal(list,readCanonical(path.join(root,'internal/inventory.json')))||sha256(canonicalBytes(list))!==p.outputTreeSha256||metadata.publicTreeSha256!==p.outputTreeSha256)fail('TREE_CHAIN');
 if(p.runId!==r.manifest.exportId||metadata.releaseId!==p.runId||metadata.provenanceSha256!==sha256(canonicalBytes(p))||p.manifestSha256!==r.receipt.manifestSha256||p.manifestBytes!==r.receipt.manifestBytes||p.receiptSha256!==sha256(canonicalBytes(r.receipt))||p.itemCount!==r.manifest.itemCount||p.fileCount!==r.receipt.fileCount||!equal(p.actionCounts,r.manifest.actionCounts))fail('PUBLICATION_CHAIN');
 verifyContracts();if(p.contractManifestSha256!==sha256(fs.readFileSync(path.join(repo,'contracts/publication-v2/contract-manifest.json'))))fail('CONTRACT_CHAIN');
 for(const [k,v] of Object.entries(expected)){if(!['runId','manifestSha256','receiptSha256','siteSourceCommit'].includes(k)||p[k]!==v)fail('EXPECTED_CHAIN');}
 // FULL manifests permit direct route checks. Incremental builds also require consumer regression evidence.
 const sitemap=fs.existsSync(path.join(root,'public/sitemap.xml'))?fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8'):'';
 for(const item of r.manifest.items){const route=path.join(root,'public/haber',item.slug,'index.html');if(item.action==='REMOVE'&&(fs.existsSync(route)||sitemap.includes('/haber/'+item.slug+'/')))fail('REMOVE_LEAK');if(item.action==='RETRACT'&&(!fs.existsSync(route)||!fs.readFileSync(route,'utf8').includes('Haber geri çekildi')||sitemap.includes('/haber/'+item.slug+'/')))fail('RETRACT_ROUTE');}
 return {metadata,provenance:p};
}
export function ledgerHead(records){
 let previous=EMPTY_HEAD,prevHash=null;const operations=new Set(),runs=new Map();
 for(const [i,r] of records.entries()){
 if(!equal(Object.keys(r).sort(),['generation','operation','operationId','previous','previousRecordSha256','release'])||r.generation!==i+1||!['PROMOTE','ROLLBACK'].includes(r.operation)||!uuid(r.operationId)||operations.has(r.operationId)||!head(r.release)||r.release.releaseId===null||!equal(r.previous,previous)||r.previousRecordSha256!==prevHash)fail('LEDGER_CHAIN');
 const known=runs.get(r.release.releaseId);if(known&&known!==r.release.provenanceSha256)fail('RUN_CONFLICT');runs.set(r.release.releaseId,r.release.provenanceSha256);operations.add(r.operationId);previous=r.release;prevHash=sha256(canonicalBytes(r));}
 return {head:previous,generation:records.length,recordSha256:prevHash};
}
export function planPromotion({records,bundle,expectedPrevious,expectedGeneration,operationId,operation='PROMOTE'}){
 const verified=verifyBundle(bundle),state=ledgerHead(records),release={releaseId:verified.metadata.releaseId,provenanceSha256:verified.metadata.provenanceSha256};
 const prior=records.find(r=>r.operationId===operationId);
 if(prior){if(!equal(prior.release,release)||prior.operation!==operation||!equal(prior.previous,expectedPrevious))fail('OPERATION_CONFLICT');return {replay:true,record:prior};}
 if(records.some(r=>r.release.releaseId===release.releaseId&&r.release.provenanceSha256!==release.provenanceSha256))fail('RUN_CONFLICT');
 if(!head(expectedPrevious)||!equal(state.head,expectedPrevious)||state.generation!==expectedGeneration)fail('STALE_FENCE');
 if(operation==='PROMOTE'&&!equal(verified.provenance.previousProduction,expectedPrevious))fail('PREVIOUS_PRODUCTION');
 if(operation==='ROLLBACK'&&!records.some(r=>equal(r.release,release)))fail('ROLLBACK_UNKNOWN');
 const record={generation:state.generation+1,operation,operationId,previous:state.head,previousRecordSha256:state.recordSha256,release};
 ledgerHead([...records,record]);return {replay:false,record};
}
// Simulator requires an atomic compare-and-append supplied by authority.
// Production deliberately has no authority adapter: runner files are insufficient.
export function simulateCAS(records,plan){const s=ledgerHead(records);if(plan.replay)return records;if(plan.record.generation!==s.generation+1||!equal(plan.record.previous,s.head)||plan.record.previousRecordSha256!==s.recordSha256)fail('CAS_CONFLICT');return [...records,plan.record];}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,root]=process.argv.slice(2);
 if(mode==='verify')console.log(JSON.stringify(verifyBundle(root)));
 else if(mode==='inventory')console.log(canonicalBytes(inventory(root)).toString());
 else if(mode==='production-gate')fail('DISTRIBUTED_AUTHORITY_NOT_CONFIGURED_RECONCILE_REQUIRED');
 else fail('CLI_ARGUMENT');
}
