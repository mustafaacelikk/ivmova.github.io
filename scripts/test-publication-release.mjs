import './publication-no-network.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
import {canonicalBytes,sha256} from './publication-contract.mjs';
import {writeRelease,story,uid} from './publication-fixtures.mjs';
import {createBundle,verifyBundle,validateProvenance,inventory,treeHash,EMPTY_HEAD,planPromotion,simulateCAS,ledgerHead} from './publication-release.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ivmova-release-test-'));let assertions=0;
const ok=v=>{assert.ok(v);assertions++;},throws=f=>{assert.throws(f);assertions++;};
try{
 const source=path.join(tmp,'source'),out=path.join(tmp,'out'),bundle=path.join(tmp,'bundle');
 writeRelease(source,{stories:[story(1,2,true)],removals:[2]});fs.mkdirSync(path.join(out,'haber/sentetik-1'),{recursive:true});
 fs.writeFileSync(path.join(out,'index.html'),'Synthetic');fs.writeFileSync(path.join(out,'404.html'),'Not found');fs.writeFileSync(path.join(out,'sitemap.xml'),'<urlset/>');fs.writeFileSync(path.join(out,'haber/sentetik-1/index.html'),'Haber geri çekildi');
 const args={output:out,publication:source,destination:bundle,siteSourceCommit:'a'.repeat(40),buildTimestamp:'2026-10-07T09:00:00.000Z'};
 const first=createBundle(args),p=first.provenance;
 ok(canonicalBytes(p).equals(canonicalBytes(Object.fromEntries(Object.entries(p).reverse()))));
 for(const k of Object.keys(p)){const bad={...p};delete bad[k];throws(()=>validateProvenance(bad));}
 throws(()=>validateProvenance({...p,email:'private@example.test'}));
 for(const bad of [{manifestSha256:'x'},{buildTimestamp:'2026-02-30T09:00:00.000Z'},{itemCount:-1},{siteSourceCommit:'x'},{previousProduction:{releaseId:uid(1),provenanceSha256:null}}])throws(()=>validateProvenance({...p,...bad}));
 const second=path.join(tmp,'second');createBundle({...args,destination:second});ok(treeHash(bundle)===treeHash(second));
 throws(()=>createBundle(args));
 for(const f of ['internal/receipt.json','internal/provenance.json','internal/inventory.json','public/index.html','release.json']){const target=path.join(bundle,f),b=fs.readFileSync(target);fs.appendFileSync(target,' ');throws(()=>verifyBundle(bundle));fs.writeFileSync(target,b);}
 const prov=path.join(bundle,'internal/provenance.json');for(const key of ['manifestSha256','receiptSha256','contractManifestSha256','outputTreeSha256']){fs.writeFileSync(prov,canonicalBytes({...p,[key]:'b'.repeat(64)}));throws(()=>verifyBundle(bundle));}fs.writeFileSync(prov,canonicalBytes(p));
 fs.writeFileSync(path.join(bundle,'public/receipt.json'),'{}');throws(()=>verifyBundle(bundle));fs.unlinkSync(path.join(bundle,'public/receipt.json'));
 fs.writeFileSync(path.join(bundle,'unexpected.json'),'{}');throws(()=>verifyBundle(bundle));fs.unlinkSync(path.join(bundle,'unexpected.json'));
 const idx=path.join(bundle,'public/index.html'),saved=fs.readFileSync(idx);fs.unlinkSync(idx);throws(()=>verifyBundle(bundle));fs.writeFileSync(idx,saved);
 const linked=path.join(tmp,'linked');fs.symlinkSync(bundle,linked,process.platform==='win32'?'junction':'dir');throws(()=>verifyBundle(linked));fs.unlinkSync(linked);
 const secretFile=path.join(bundle,'public/example.txt');fs.writeFileSync(secretFile,'sb_secret_synthetic_only_test');throws(()=>verifyBundle(bundle));fs.unlinkSync(secretFile);
 const partial=path.join(tmp,'partial');fs.mkdirSync(partial);throws(()=>verifyBundle(partial));
 const opts={records:[],bundle,expectedPrevious:EMPTY_HEAD,expectedGeneration:0,operationId:uid(700)};
 const a=planPromotion(opts),b=planPromotion({...opts,operationId:uid(701)});let records=simulateCAS([],a);
 throws(()=>simulateCAS(records,b));throws(()=>planPromotion({...opts,records,operationId:uid(702)}));
 ok(planPromotion({...opts,records}).replay);ok(records.length===1);
 let concurrent=[];const competing=await Promise.allSettled([Promise.resolve().then(()=>{concurrent=simulateCAS(concurrent,a);}),Promise.resolve().then(()=>{concurrent=simulateCAS(concurrent,b);})]);
 ok(competing.filter(x=>x.status==='fulfilled').length===1);ok(competing.filter(x=>x.status==='rejected').length===1);ok(concurrent.length===1);
 const hardlink=path.join(out,'linked.html');fs.linkSync(path.join(out,'index.html'),hardlink);throws(()=>inventory(out));fs.unlinkSync(hardlink);
 const missing=path.join(out,'haber/sentetik-2');fs.mkdirSync(missing);fs.writeFileSync(path.join(missing,'index.html'),'Old content');throws(()=>createBundle({...args,destination:path.join(tmp,'remove-leak')}));fs.rmSync(missing,{recursive:true});
 const head=ledgerHead(records).head;
 throws(()=>planPromotion({...opts,records,expectedPrevious:head,expectedGeneration:1,operationId:uid(703)}));
 const nextSource=path.join(tmp,'next-source');writeRelease(nextSource,{run:2,stories:[story(1,2,true)],removals:[2]});
 const next=path.join(tmp,'next');createBundle({...args,publication:nextSource,destination:next,previousProduction:head});
 const n=planPromotion({records,bundle:next,expectedPrevious:head,expectedGeneration:1,operationId:uid(704)});records=simulateCAS(records,n);
 const rollback={records,bundle,expectedPrevious:ledgerHead(records).head,expectedGeneration:2,operationId:uid(705),operation:'ROLLBACK'};
 const rb=planPromotion(rollback);records=simulateCAS(records,rb);ok(records.length===3);ok(planPromotion({...rollback,records}).replay);ok(ledgerHead(records).head.releaseId===p.runId);
 const altered=path.join(tmp,'altered');createBundle({...args,destination:altered,buildTimestamp:'2026-10-07T09:01:00.000Z'});
 throws(()=>planPromotion({...opts,records,bundle:altered,operationId:uid(706)}));
 throws(()=>ledgerHead([{...records[0],generation:2}]));throws(()=>ledgerHead([records[0],records[0]]));
 const before=canonicalBytes(records);throws(()=>planPromotion({...opts,bundle:partial,records}));ok(before.equals(canonicalBytes(records)));
 ok(!inventory(bundle).some(x=>x.path.startsWith('public/internal')));
 console.log(JSON.stringify({result:'PASS',assertions,parallelPromotionSimulation:'one CAS succeeds, competing CAS rejects',rollbackRecords:records.length,productionDeploys:0}));
}finally{if(!path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(tmp).startsWith('ivmova-release-test-'))throw Error('CLEANUP');fs.rmSync(tmp,{recursive:true,force:true});console.log('TEMP_RELEASE_CLEANUP_OK');}
