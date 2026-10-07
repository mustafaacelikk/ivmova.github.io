import './publication-no-network.mjs';
import {createBundle, verifyBundle, inventory, treeHash} from './publication-release.mjs';
import {writeRelease,uid} from './publication-fixtures.mjs';
import {GENESIS,EMPTY_PRODUCTION,preparePromotion,materializeOutput} from './publication-git-ledger.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { importRelease, rollback, loadCurrent, canonicalBytes, recoveryPlan, recover } from './publication-consumer.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ivmova-build-test-'));const clone=path.join(tmp,'reader'),store=path.join(tmp,'store');let assertions=0;const builds=[];let httpChecks=0,serversClosed=0;const servers=[];const promotedOutputs=new Map();
function protectedSnapshot(){const entries=[];function walk(dir){if(!fs.existsSync(dir))return;for(const name of fs.readdirSync(dir).sort()){const p=path.join(dir,name),s=fs.lstatSync(p);entries.push({path:path.relative(repo,p),size:s.size,mtime:s.mtimeMs,link:s.isSymbolicLink()});if(s.isDirectory()&&!s.isSymbolicLink())walk(p);}}for(const name of ['out','.next'])walk(path.join(repo,name));return canonicalBytes(entries);}
const protectedBefore=protectedSnapshot();
const ok=(v,m)=>{assert.ok(v,m);assertions++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++;};
function removeOwned(p) {const target=path.resolve(p);if(!target.startsWith(path.resolve(tmp)+path.sep)||fs.lstatSync(target).isSymbolicLink())throw new Error('CLEANUP_BOUNDARY');fs.rmSync(target,{recursive:true,force:true});}
function outputFiles(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?outputFiles(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function build(label,mode='publication',selectedStore=store,expectedFailure=false) {
  for(const name of ['out','.next'])if(fs.existsSync(path.join(clone,name)))removeOwned(path.join(clone,name));
  console.log('BUILD_START '+label);
  const env={...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_IVMOVA_CONTENT_MODE:mode,NEXT_PUBLIC_IVMOVA_SITE_ORIGIN:'http://localhost:4173',IVMOVA_PUBLICATION_STORE:selectedStore};delete env.NEXT_PUBLIC_BASE_PATH;
  if(label==='synthetic-production'){env.NEXT_PUBLIC_IVMOVA_SITE_ORIGIN='https://ivmova.com';env.IVMOVA_BUILD_PROFILE='reviewed-production';}
  env.NODE_OPTIONS='--import '+pathToFileURL(path.join(clone,'scripts/publication-no-network.mjs')).href;
  const r=spawnSync(process.execPath,[path.join(clone,'node_modules/next/dist/bin/next'),'build'],{cwd:clone,env,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
  ok(!(r.stdout+r.stderr).includes('EXTERNAL_NETWORK_BLOCKED'),label+' no external network attempt');
  if(expectedFailure){ok(r.status!==0,'missing publication input fails build');console.log('BUILD_EXPECTED_REJECTION '+label);return;}
  if(r.status!==0){console.error(r.stdout);console.error(r.stderr);throw new Error('BUILD_FAILED '+label);}
  eq(r.status,0,label+' exit');builds.push(label);
  const out=path.join(clone,'out');ok(fs.existsSync(path.join(out,'index.html')),label+' home');ok(fs.existsSync(path.join(out,'404.html')),label+' 404');
  ok(!fs.existsSync(path.join(out,'CNAME')),label+' no production CNAME');
  for(const f of outputFiles(out).filter(f=>/\.(html|js|json|xml|txt)$/.test(f))) {
    const text=fs.readFileSync(f,'utf8');for(const key of ['manifestSha256','removalReceiptSha256','previousRelease','seenRunIds','stateSha256','recordSha256'])ok(!text.includes(key),label+' public excludes '+key);
    ok(!/sb_secret_|postgres(?:ql)?:\/\/|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(text),label+' secret scan');
    if(f.endsWith('.html'))ok(!text.includes('<script>alert(1)</script>'),label+' raw script inert HTML');
  }
    if(mode==='publication'){
    const current=loadCurrent(selectedStore);
    const publication=path.join(tmp,'release-input-'+label),destination=path.join(tmp,'bundle-'+label);
    const removed=current.state.fences.filter(f=>f.kind==='REMOVE').map(f=>Number(f.slug.replace('sentetik-','')));
    writeRelease(publication,{run:100+builds.length,stories:current.state.stories,removals:removed});
    const checked=createBundle({output:out,publication,destination,siteSourceCommit:'17cdddfcf6ef6ca281d03dc6aac7cd6bdafc097f',buildTimestamp:'2026-10-07T09:00:00.000Z'});
    eq(verifyBundle(destination).metadata,checked.metadata,label+' bundle chain');
    const commit='17cdddfcf6ef6ca281d03dc6aac7cd6bdafc097f';
    const plan=preparePromotion({ledger:GENESIS,bundle:destination,releaseId:uid(800+builds.length),expectedGitBase:commit,actualGitBase:commit,expectedPrevious:EMPTY_PRODUCTION,expectedGeneration:0,createdAt:'2026-10-07T09:00:00.000Z',producer:{repository:'mustafaacelikk/ivmova.github.io',workflowPath:'.github/workflows/publication-release-producer.yml',runId:'123',runAttempt:1,sourceCommit:commit,artifactId:'456',artifactDigest:'sha256:'+'a'.repeat(64),trustMode:'GITHUB_RUN_DIGEST'}});
    const promoted=path.join(tmp,'promotion-'+label,'out');materializeOutput(destination,plan.record,promoted);promotedOutputs.set(label,promoted);
    eq(treeHash(promoted),plan.record.deployTreeSha256,label+' marker/deploy tree chain');
    const archive=path.join(tmp,label+'-pages.tar');
    const pack=spawnSync('tar',['-cf',archive,'-C',promoted,'.'],{encoding:'utf8'});
    eq(pack.status,0,label+' public artifact packaging');
    const listed=spawnSync('tar',['-tf',archive],{encoding:'utf8'});eq(listed.status,0,label+' tar inventory');
    const entries=listed.stdout.trim().split(/\r?\n/).filter(x=>!x.endsWith('/')).map(x=>x.replace(/^\.\//,'')).sort();
    eq(entries,inventory(promoted).map(x=>x.path),label+' only verified public files in package');
    console.log('BUNDLE_PACKAGE_PASS '+label);
  }
  console.log('BUILD_PASS '+label);
}
async function httpStage(label, expected) {
 const out=label==='synthetic-production'?promotedOutputs.get(label):path.join(clone,'out');const server=spawn(process.execPath,[path.join(clone,'scripts/publication-static-staging.mjs'),out],{stdio:['ignore','pipe','pipe','ipc']});servers.push(server);let log='';server.stderr.on('data',b=>log+=b);const closed=new Promise(resolve=>server.once('close',resolve));
 try {
 const port=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('SERVER_TIMEOUT '+log)),10000);server.stdout.once('data',b=>{clearTimeout(timeout);try{resolve(JSON.parse(String(b)).port);}catch(e){reject(e);}});server.once('error',reject);});
 const origin='http://127.0.0.1:'+port;
 async function get(route,status=200){const r=await fetch(origin+route);eq(r.status,status,label+' HTTP '+route);httpChecks++;return {text:await r.text(),cache:r.headers.get('cache-control')};}
 if(label==='synthetic-production'){const probe=await get('/.well-known/ivmova-release.json?local_probe=1');ok(JSON.parse(probe.text).contractVersion===2,'production marker route');}
 const home=await get('/');await get('/kategori/enerji/');const sitemap=await get('/sitemap.xml');await get('/publication-placeholder.svg');await get('/does-not-exist/',404);
 ok(!home.text.includes('Enerji dönüşümünde yeni dönem'),label+' no demo HTML');ok(!sitemap.text.includes('enerji-donusumunde-yeni-donem'),label+' no demo sitemap');
 for(const [slug,status,notice] of expected){const r=await get('/haber/'+slug+'/',status);if(notice)ok(r.text.includes('Haber geri çekildi'),label+' RETRACT HTTP notice');if(status===404||notice)ok(!sitemap.text.includes('/haber/'+slug+'/'),label+' absent sitemap');}
 const asset=outputFiles(out).find(f=>f.includes(path.sep+'_next'+path.sep+'static'+path.sep)&&f.endsWith('.js'));ok(asset,label+' emitted JS');const ar=await get('/'+path.relative(out,asset).split(path.sep).join('/'));ok(ar.cache.includes('immutable'),label+' immutable local asset header');ok(home.cache.includes('no-cache'),label+' mutable local HTML header');
 const json=outputFiles(out).find(f=>f.endsWith('.json')||f.endsWith('.txt'));ok(json,label+' static data payload');await get('/'+path.relative(out,json).split(path.sep).join('/'));
 for(const f of outputFiles(out).filter(f=>/\.(html|js|json|xml|txt)$/.test(f))){const t=fs.readFileSync(f,'utf8');for(const key of ['operationId','generation-head','operation.json','import.lock','rollbackTarget','implicitRemovals','manifestSha256','recordSha256','seenRunIds'])ok(!t.includes(key),label+' no internal '+key);ok(!t.includes('enerji-donusumunde-yeni-donem'),label+' demo slug absent public package');}
 console.log('HTTP_STAGE_PASS '+label);
 }finally{if(server.connected)server.send('close');else server.kill();await closed;serversClosed++;eq(server.exitCode,0,label+' server closed');}
}
try {
  fs.mkdirSync(clone);
  for(const dir of ['app','public','scripts','contracts','tests'])if(fs.existsSync(path.join(repo,dir)))fs.cpSync(path.join(repo,dir),path.join(clone,dir),{recursive:true,filter:p=>!p.endsWith('site-news.generated.json')});
  for(const f of ['package.json','package-lock.json','next.config.ts','next-env.d.ts','tsconfig.json','postcss.config.mjs'])fs.copyFileSync(path.join(repo,f),path.join(clone,f));
  fs.unlinkSync(path.join(clone,'public','CNAME'));console.log('COPY_LOCAL_DEPENDENCIES');fs.cpSync(fs.realpathSync(path.join(repo,'node_modules')),path.join(clone,'node_modules'),{recursive:true});
  const actionsOnly=process.argv[2]==='--actions-only';if(process.argv.length>3||process.argv[2]&&!actionsOnly)throw new Error('CLI_ARGUMENT');
  const fixtures=path.join(repo,'tests/fixtures/publication');
  if(!actionsOnly) {
    build('demo','demo');ok(fs.existsSync(path.join(clone,'out/haber/enerji-donusumunde-yeni-donem/index.html')),'demo route preserved');
    build('missing-input','publication',path.join(tmp,'missing'),true);
    const rename=fs.renameSync;fs.renameSync=function(from,to){if(to===path.join(store,'current.json'))throw new Error('TEST_LOCAL_SWAP');return rename(from,to);};try{assert.throws(()=>importRelease(path.join(fixtures,'full'),{store}));assertions++;}finally{fs.renameSync=rename;}const recovery=recoveryPlan(store);eq(recovery.decision,'VERIFIED_PENDING','build recovery plan');recover({store,action:'resume',planHash:recovery.planHash});build('recovery-full');await httpStage('recovery-full',[['sentetik-1',200,false],['sentetik-2',404,false]]);ok(fs.existsSync(path.join(clone,'out/haber/sentetik-1/index.html')),'full detail');ok(fs.readFileSync(path.join(clone,'out/haber/sentetik-1/index.html'),'utf8').includes('&lt;script&gt;alert(1)&lt;/script&gt;'),'fixture script rendered as escaped text');
    const originalTree=treeHash(path.join(clone,'out'));build('recovery-full-repeat');eq(treeHash(path.join(clone,'out')),originalTree,'same input deterministic public tree');
    const fullHash=canonicalBytes(loadCurrent(store).state.stories);
    importRelease(path.join(fixtures,'incremental'),{store});build('incremental');await httpStage('incremental',[['sentetik-1',200,false],['sentetik-2',200,false]]);ok(fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'incremental detail');
    rollback({store});eq(canonicalBytes(loadCurrent(store).state.stories),fullHash,'rollback exact Story state');build('rollback');await httpStage('rollback',[['sentetik-1',200,false],['sentetik-2',404,false]]);ok(!fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'rollback route removed');
  } else {
    importRelease(path.join(fixtures,'full'),{store});importRelease(path.join(fixtures,'incremental'),{store});rollback({store});
  }
  importRelease(path.join(fixtures,'incremental-after-rollback'),{store});
  importRelease(path.join(fixtures,'retract'),{store});build('retract');await httpStage('retract',[['sentetik-1',200,true],['sentetik-2',200,false]]);const notice=fs.readFileSync(path.join(clone,'out/haber/sentetik-1/index.html'),'utf8');ok(notice.includes('Haber geri çekildi'),'notice route');ok(!fs.readFileSync(path.join(clone,'out/sitemap.xml'),'utf8').includes('/haber/sentetik-1/'),'notice absent sitemap');ok(fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'REMOVE target exists before action');
  importRelease(path.join(fixtures,'remove'),{store});build('remove');await httpStage('remove',[['sentetik-1',200,true],['sentetik-2',404,false]]);ok(!fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'remove absent static route');ok(!fs.readFileSync(path.join(clone,'out/sitemap.xml'),'utf8').includes('/haber/sentetik-2/'),'remove absent sitemap');
  rollback({store});build('safety-rollback');await httpStage('safety-rollback',[['sentetik-1',200,true],['sentetik-2',404,false]]);ok(!fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'safe rollback no REMOVE resurrection');ok(fs.readFileSync(path.join(clone,'out/haber/sentetik-1/index.html'),'utf8').includes('Haber geri çekildi'),'safe rollback no RETRACT resurrection');
  build('synthetic-production');await httpStage('synthetic-production',[['sentetik-1',200,true],['sentetik-2',404,false]]);
  const corrupt=path.join(store,'releases',loadCurrent(store).pointer.current,'state.json');fs.appendFileSync(corrupt,' ');build('tampered-input','publication',store,true);
  if(!actionsOnly){const emptyStore=path.join(tmp,'empty-store');importRelease(path.join(fixtures,'empty'),{store:emptyStore});build('empty','publication',emptyStore);await httpStage('empty',[['sentetik-1',404,false],['sentetik-2',404,false]]);ok(fs.readFileSync(path.join(clone,'out/index.html'),'utf8').includes('Henüz yayımlanmış haber yok'),'empty render');}
  eq(protectedSnapshot(),protectedBefore,'user out/.next metadata inventory preserved');
  console.log(JSON.stringify({assertions,builds,httpChecks,serversClosed,expectedBuildRejections:actionsOnly?1:2,networkCalls:0,result:'PASS'}));
} finally {
  for(const server of servers)if(server.exitCode===null)server.kill();
  const link=path.join(clone,'node_modules');if(fs.existsSync(link)&&fs.lstatSync(link).isSymbolicLink())fs.unlinkSync(link);
  const abs=path.resolve(tmp);if(!abs.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(abs).startsWith('ivmova-build-test-'))throw new Error('CLEANUP_BOUNDARY');fs.rmSync(abs,{recursive:true,force:true});console.log('TEMP_BUILD_CLEANUP_OK');
}
