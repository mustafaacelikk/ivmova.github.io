import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { importRelease, rollback, loadCurrent, canonicalBytes } from './publication-consumer.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ivmova-build-test-'));const clone=path.join(tmp,'reader'),store=path.join(tmp,'store');let assertions=0;const builds=[];
const ok=(v,m)=>{assert.ok(v,m);assertions++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++;};
function removeOwned(p) {const target=path.resolve(p);if(!target.startsWith(path.resolve(tmp)+path.sep)||fs.lstatSync(target).isSymbolicLink())throw new Error('CLEANUP_BOUNDARY');fs.rmSync(target,{recursive:true,force:true});}
function outputFiles(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?outputFiles(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function build(label,mode='publication',selectedStore=store,expectedFailure=false) {
  for(const name of ['out','.next'])if(fs.existsSync(path.join(clone,name)))removeOwned(path.join(clone,name));
  console.log('BUILD_START '+label);
  const env={...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_IVMOVA_CONTENT_MODE:mode,NEXT_PUBLIC_IVMOVA_SITE_ORIGIN:'http://localhost:4173',IVMOVA_PUBLICATION_STORE:selectedStore};delete env.NEXT_PUBLIC_BASE_PATH;
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
  console.log('BUILD_PASS '+label);
}
try {
  fs.mkdirSync(clone);
  for(const dir of ['app','public','scripts','contracts','tests'])if(fs.existsSync(path.join(repo,dir)))fs.cpSync(path.join(repo,dir),path.join(clone,dir),{recursive:true,filter:p=>!p.endsWith('site-news.generated.json')});
  for(const f of ['package.json','package-lock.json','next.config.ts','next-env.d.ts','tsconfig.json','postcss.config.mjs'])fs.copyFileSync(path.join(repo,f),path.join(clone,f));
  fs.unlinkSync(path.join(clone,'public','CNAME'));console.log('COPY_LOCAL_DEPENDENCIES');fs.cpSync(path.join(repo,'node_modules'),path.join(clone,'node_modules'),{recursive:true});
  const actionsOnly=process.argv[2]==='--actions-only';if(process.argv.length>3||process.argv[2]&&!actionsOnly)throw new Error('CLI_ARGUMENT');
  const fixtures=path.join(repo,'tests/fixtures/publication');
  if(!actionsOnly) {
    build('demo','demo');ok(fs.existsSync(path.join(clone,'out/haber/enerji-donusumunde-yeni-donem/index.html')),'demo route preserved');
    build('missing-input','publication',path.join(tmp,'missing'),true);
    importRelease(path.join(fixtures,'full'),{store});build('full');ok(fs.existsSync(path.join(clone,'out/haber/sentetik-1/index.html')),'full detail');ok(fs.readFileSync(path.join(clone,'out/haber/sentetik-1/index.html'),'utf8').includes('&lt;script&gt;alert(1)&lt;/script&gt;'),'fixture script rendered as escaped text');
    const fullHash=canonicalBytes(loadCurrent(store).state.stories);
    importRelease(path.join(fixtures,'incremental'),{store});build('incremental');ok(fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'incremental detail');
    rollback({store});eq(canonicalBytes(loadCurrent(store).state.stories),fullHash,'rollback exact Story state');build('rollback');ok(!fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'rollback route removed');
  } else {
    importRelease(path.join(fixtures,'full'),{store});importRelease(path.join(fixtures,'incremental'),{store});rollback({store});
  }
  importRelease(path.join(fixtures,'incremental-after-rollback'),{store});
  importRelease(path.join(fixtures,'retract'),{store});build('retract');const notice=fs.readFileSync(path.join(clone,'out/haber/sentetik-1/index.html'),'utf8');ok(notice.includes('Haber geri çekildi'),'notice route');ok(!fs.readFileSync(path.join(clone,'out/sitemap.xml'),'utf8').includes('/haber/sentetik-1/'),'notice absent sitemap');ok(fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'REMOVE target exists before action');
  importRelease(path.join(fixtures,'remove'),{store});build('remove');ok(!fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'remove absent static route');ok(!fs.readFileSync(path.join(clone,'out/sitemap.xml'),'utf8').includes('/haber/sentetik-2/'),'remove absent sitemap');
  rollback({store});build('safety-rollback');ok(!fs.existsSync(path.join(clone,'out/haber/sentetik-2/index.html')),'safe rollback no REMOVE resurrection');ok(fs.readFileSync(path.join(clone,'out/haber/sentetik-1/index.html'),'utf8').includes('Haber geri çekildi'),'safe rollback no RETRACT resurrection');
  const corrupt=path.join(store,'releases',loadCurrent(store).pointer.current,'state.json');fs.appendFileSync(corrupt,' ');build('tampered-input','publication',store,true);
  if(!actionsOnly){const emptyStore=path.join(tmp,'empty-store');importRelease(path.join(fixtures,'empty'),{store:emptyStore});build('empty','publication',emptyStore);ok(fs.readFileSync(path.join(clone,'out/index.html'),'utf8').includes('Henüz yayımlanmış haber yok'),'empty render');}
  console.log(JSON.stringify({assertions,builds,expectedBuildRejections:actionsOnly?1:2,networkCalls:0,result:'PASS'}));
} finally {
  const link=path.join(clone,'node_modules');if(fs.existsSync(link)&&fs.lstatSync(link).isSymbolicLink())fs.unlinkSync(link);
  const abs=path.resolve(tmp);if(!abs.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(abs).startsWith('ivmova-build-test-'))throw new Error('CLEANUP_BOUNDARY');fs.rmSync(abs,{recursive:true,force:true});console.log('TEMP_BUILD_CLEANUP_OK');
}
