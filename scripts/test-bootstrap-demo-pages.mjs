import './publication-no-network.mjs';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bootstrapGate,prepareDemo,verifyHealth,reconcileHealth,BOOTSTRAP_MARKER,assertNoPagesAttempt,verifyRecoveryEvidence,verifyBootstrapHistory} from './bootstrap-demo-pages.mjs';
let assertions=0;const ok=v=>{assert.ok(v);assertions++;},bad=fn=>{assert.throws(fn);assertions++;};
const c={repository:'mustafaacelikk/ivmova.github.io',ref:'refs/heads/main',event:'workflow_dispatch',attempt:'1',expected:'a'.repeat(40),commit:'a'.repeat(40),confirm:'BOOTSTRAP_DEMO_ONCE',run:'123'};
const genesis={schemaVersion:1,records:[]},runs={total_count:1,workflow_runs:[{id:123}]};
bootstrapGate(c,c.commit,genesis,runs);assertions++;
for(const patch of [{ref:'refs/heads/pilot'},{ref:'refs/tags/main'},{event:'push'},{attempt:'2'},{repository:'other/repo'},{confirm:''},{expected:'b'.repeat(40)}])bad(()=>bootstrapGate({...c,...patch},c.commit,genesis,runs));
bad(()=>bootstrapGate(c,'b'.repeat(40),genesis,runs));bad(()=>bootstrapGate(c,c.commit,{schemaVersion:1,records:[{}]},runs));
for(const r of [{total_count:0,workflow_runs:[]},{total_count:2,workflow_runs:[{id:123},{id:122}]},{total_count:1,workflow_runs:[{id:122}]}])bad(()=>bootstrapGate(c,c.commit,genesis,r));
// Regression: authenticated Pages API returned 200/status:"" while deployments
// were empty. Unknown or real deployment states must still block.
assertNoPagesAttempt(null,[]);assertions++;
assertNoPagesAttempt({status:''},[]);assertions++;
for(const response of [{},{status:null},{status:'unexpected'},[],false])bad(()=>assertNoPagesAttempt(response,[]));
for(const status of ['succeed','pending','queued','deployment_in_progress','syncing_files','finished','deployment_failed','cancelled','failed'])bad(()=>assertNoPagesAttempt({status},[]));
for(const response of [null,{status:''}])bad(()=>assertNoPagesAttempt(response,[{id:1}]));
bad(()=>assertNoPagesAttempt({status:''},null));
const oldRun={id:37751560162,head_sha:'db9c21ab60a71d9f1407e68b8f22011ee476dc97',run_attempt:1,event:'workflow_dispatch',head_branch:'main',path:'.github/workflows/bootstrap-demo-pages.yml',status:'completed',conclusion:'failure'};
const oldSteps=[['Set up job','success'],['Run actions/checkout@v4','success'],['Run actions/setup-node@v4','success'],['Reject wrong ref, stale main, publication state and any previous bootstrap run','failure'],['Run npm ci','skipped'],['Build existing demo for the custom domain','skipped'],['Verify demo output and add bootstrap-only receipt','skipped'],['Run actions/upload-pages-artifact@v3','skipped'],['Post Run actions/setup-node@v4','skipped'],['Post Run actions/checkout@v4','success'],['Complete job','success']].map(([name,conclusion])=>({name,conclusion,status:'completed'}));
const oldJobs={total_count:2,jobs:[{name:'build',status:'completed',conclusion:'failure',steps:oldSteps},{name:'deploy',status:'completed',conclusion:'skipped',steps:[]}]},noArtifacts={total_count:0,artifacts:[]};
ok(verifyRecoveryEvidence(oldRun,oldJobs,noArtifacts));
for(const patch of [{id:1},{head_sha:'a'.repeat(40)},{run_attempt:2},{event:'push'},{head_branch:'other'},{path:'other'},{conclusion:'success'}])bad(()=>verifyRecoveryEvidence({...oldRun,...patch},oldJobs,noArtifacts));
bad(()=>verifyRecoveryEvidence(oldRun,oldJobs,{total_count:1,artifacts:[{}]}));
bad(()=>verifyRecoveryEvidence(oldRun,{...oldJobs,jobs:[oldJobs.jobs[0],{...oldJobs.jobs[1],conclusion:'success'}]},noArtifacts));
bad(()=>verifyRecoveryEvidence(oldRun,{...oldJobs,jobs:[{...oldJobs.jobs[0],steps:oldSteps.map(s=>s.name==='Run npm ci'?{...s,conclusion:'success'}:s)},oldJobs.jobs[1]]},noArtifacts));
bad(()=>verifyRecoveryEvidence(oldRun,{...oldJobs,total_count:3},noArtifacts));
const recoveryContext={...c,recovery:'37751560162'},recoveryRuns={total_count:2,workflow_runs:[{id:123},oldRun]};
verifyBootstrapHistory(recoveryContext,recoveryRuns);assertions++;
bad(()=>verifyBootstrapHistory(c,recoveryRuns));
for(const patch of [{recovery:'other'},{run:'37751560162'},{commit:oldRun.head_sha}])bad(()=>verifyBootstrapHistory({...recoveryContext,...patch},recoveryRuns));
bad(()=>verifyBootstrapHistory(recoveryContext,{total_count:3,workflow_runs:[...recoveryRuns.workflow_runs,{id:124}]}));
bad(()=>verifyBootstrapHistory(recoveryContext,{total_count:2,workflow_runs:[{id:123},{...oldRun,conclusion:'success'}]}));
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8').replace(/\r/g,'');
const wf=read('.github/workflows/bootstrap-demo-pages.yml'),runtime=read('scripts/bootstrap-demo-pages.mjs');
ok(wf.match(/^on:\n([\s\S]*?)^permissions:/m)?.[1].startsWith('  workflow_dispatch:\n'));
ok(!/^  (push|pull_request|pull_request_target|workflow_run|schedule):/m.test(wf));
ok(wf.includes('group: ivmova-production-pages\n  cancel-in-progress: false'));
ok((wf.match(/persist-credentials: false/g)||[]).length===2);
const build=wf.split('  build:')[1].split('  deploy:')[0],deploy=wf.split('  deploy:')[1];
ok(!/\w+: write|environment:/.test(build));
ok(deploy.match(/^    permissions:\n([\s\S]*?)^    environment:/m)?.[1]==='      contents: read\n      pages: write\n      actions: read\n      deployments: read\n      id-token: write\n');
ok(deploy.includes('needs: build')&&deploy.includes('name: github-pages'));
ok(build.indexOf('.mjs validate')<build.indexOf('npm ci'));
ok(build.indexOf('npm run build')<build.indexOf('.mjs prepare')&&build.indexOf('.mjs prepare')<build.indexOf('actions/upload-pages-artifact'));
ok(deploy.indexOf('.mjs guard')<deploy.indexOf('uses: actions/deploy-pages')&&deploy.indexOf('uses: actions/deploy-pages')<deploy.indexOf('.mjs reconcile'));
ok(wf.includes('NEXT_PUBLIC_IVMOVA_CONTENT_MODE: demo')&&wf.includes('NEXT_PUBLIC_BASE_PATH: \'\''));
ok(!/secrets\.|service.role|supabase|contents: write|publication-(fixtures|release-producer|pages-runtime|git-ledger)|release-bundle-/.test(wf+runtime));
ok(!/import .*publication-(fixtures|release|consumer|git-ledger)/.test(runtime));
for(const mode of ['validate','prepare','guard','reconcile'])ok(wf.includes('bootstrap-demo-pages.mjs '+mode));
ok(read('.github/workflows/deploy-pages.yml').includes('publication-pages-runtime.mjs validate')&&read('.github/workflows/deploy-pages.yml').includes('expected_release'));
ok(read('.github/workflows/publication-ledger-check.yml').includes('  ledger:\n'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ivmova-bootstrap-test-'));
try{
 fs.mkdirSync(path.join(tmp,'production'));fs.writeFileSync(path.join(tmp,'production/ledger.json'),JSON.stringify(genesis));
 fs.mkdirSync(path.join(tmp,'app'));fs.writeFileSync(path.join(tmp,'app/site-news.generated.json'),JSON.stringify({mode:'demo',items:[]}));
 const out=path.join(tmp,'out');fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'CNAME'),'ivmova.com\n');
 const files=['index.html','kategori/enerji/index.html','haber/enerji-donusumunde-yeni-donem/index.html','sitemap.xml','404.html','ivmova-wordmark.svg'];
 for(const file of files){fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});fs.writeFileSync(path.join(out,file),'test demo bytes '+file);}
 const before=files.map(file=>fs.readFileSync(path.join(out,file)));
 const h=verifyHealth(prepareDemo(tmp,out,c),c);ok(h.checks.length===7);
 for(const [i,file] of files.entries())ok(fs.readFileSync(path.join(out,file)).equals(before[i]));
 ok(fs.readFileSync(path.join(tmp,'production/ledger.json'),'utf8')===JSON.stringify(genesis));
 ok(!fs.existsSync(path.join(tmp,'production/input'))&&!fs.existsSync(path.join(out,'.well-known/ivmova-release.json')));
 bad(()=>prepareDemo(tmp,out,c));bad(()=>verifyHealth(h,{...c,run:'124'}));bad(()=>verifyHealth({...h,checks:h.checks.slice(1)},c));
 const responses=new Map(h.checks.map((p,i)=>[p.route,{status:p.status,bytes:fs.readFileSync(path.join(out,i===6?BOOTSTRAP_MARKER.slice(1):files[i]))}]));
 const get=async route=>responses.get(route)??{status:404,bytes:Buffer.from('absent')};
 await reconcileHealth(h,{get,status:async()=>({status:'succeed'}),sleep:async()=>{}});assertions++;
 let tries=0;await assert.rejects(reconcileHealth(h,{get,status:async()=>{tries++;return {status:'pending'};},sleep:async()=>{},attempts:2}));ok(tries===2);
 await assert.rejects(reconcileHealth(h,{get:async()=>({status:200,bytes:Buffer.from('wrong')}),status:async()=>({status:'succeed'}),attempts:1}));assertions++;
 await assert.rejects(reconcileHealth(h,{get:async route=>route.endsWith('ivmova-release.json')?{status:200,bytes:Buffer.from('{}')}:get(route),status:async()=>({status:'succeed'}),attempts:1}));assertions++;
 // Optional real demo build validation: copy to isolated temp, preserving the original output.
 if(process.argv[2]==='--built-out'){
  const root=fileURLToPath(new URL('..',import.meta.url));
  const real=path.join(tmp,'real');fs.mkdirSync(path.join(real,'production'),{recursive:true});fs.mkdirSync(path.join(real,'app'));
  fs.copyFileSync(path.join(root,'production/ledger.json'),path.join(real,'production/ledger.json'));fs.copyFileSync(path.join(root,'app/site-news.generated.json'),path.join(real,'app/site-news.generated.json'));
  fs.cpSync(path.join(root,'out'),path.join(real,'out'),{recursive:true});
  const checks=verifyHealth(prepareDemo(real,path.join(real,'out'),c),c).checks;
  ok(checks.length===7&&fs.readFileSync(path.join(real,'out/index.html'),'utf8').includes('Bu sürüm yayın yapısını'));
  ok(fs.readFileSync(path.join(real,'out/CNAME'),'utf8').trim()==='ivmova.com');
  ok(createHash('sha256').update(fs.readFileSync(path.join(root,'out/index.html'))).digest('hex')===checks[0].sha256);
 }
}finally{
 if(!path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(tmp).startsWith('ivmova-bootstrap-test-'))throw Error('CLEANUP_BOUNDARY');
 fs.rmSync(tmp,{recursive:true,force:true});
}
console.log(JSON.stringify({result:'PASS',assertions,scope:'bootstrap isolation, fail-closed gates, bounded reconciliation',productionDeploys:0}));
