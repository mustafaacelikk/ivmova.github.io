// Separate one-shot demo infrastructure path; never prepares or mutates a publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {verifyEnvironmentPolicy} from './publication-environment-policy.mjs';

const REPO='mustafaacelikk/ivmova.github.io', ORIGIN='https://ivmova.com';
export const BOOTSTRAP_MARKER='/.well-known/ivmova-demo-bootstrap.json';
const PUBLICATION_MARKER='/.well-known/ivmova-release.json';
const fail=code=>{throw new Error(code);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function bootstrapGate(c,main,ledger,runs){
 if(c.repository!==REPO||c.ref!=='refs/heads/main'||c.event!=='workflow_dispatch'||c.attempt!=='1')fail('BOOTSTRAP_CONTEXT');
 if(c.confirm!=='BOOTSTRAP_DEMO_ONCE'||! /^[0-9a-f]{40}$/.test(c.expected)||c.expected!==c.commit||c.commit!==main)fail('BOOTSTRAP_MAIN_FENCE');
 if(ledger.schemaVersion!==1||!Array.isArray(ledger.records)||ledger.records.length!==0||Object.keys(ledger).sort().join(',')!=='records,schemaVersion')fail('BOOTSTRAP_GENESIS_ONLY');
 if(runs)verifyBootstrapHistory(c,runs);
}
// GitHub Actions returned HTTP 200 with an empty status for the absent deployment
// of db9c21a (diagnostic run 37758836914). Never infer absence from HTTP 200 alone.
export function assertNoPagesAttempt(deployment,records){
 if(!Array.isArray(records))fail('BOOTSTRAP_PAGES_ABSENCE_UNPROVEN');
 if(records.length!==0)fail('BOOTSTRAP_PAGES_ATTEMPT_EXISTS');
 if(deployment===null)return;
 if(deployment&&typeof deployment==='object'&&!Array.isArray(deployment)&&deployment.status==='')return;
 if(deployment&&['deployment_in_progress','syncing_files','finished','succeed','deployment_failed','cancelled','queued','pending','in_progress','failed'].includes(deployment.status))fail('BOOTSTRAP_PAGES_ATTEMPT_EXISTS');
 fail('BOOTSTRAP_PAGES_ABSENCE_UNPROVEN');
}
const RECOVERY_RUN='37751560162',RECOVERY_SHA='db9c21ab60a71d9f1407e68b8f22011ee476dc97';
export function verifyRecoveryEvidence(run,jobs,artifacts){
 if(String(run?.id)!==RECOVERY_RUN||run.head_sha!==RECOVERY_SHA||run.run_attempt!==1||run.event!=='workflow_dispatch'||run.head_branch!=='main'||run.path!=='.github/workflows/bootstrap-demo-pages.yml'||run.status!=='completed'||run.conclusion!=='failure')fail('BOOTSTRAP_RECOVERY_RUN_UNPROVEN');
 if(!Array.isArray(jobs?.jobs)||jobs.total_count!==2||jobs.jobs.length!==2)fail('BOOTSTRAP_RECOVERY_JOBS_UNPROVEN');
 const build=jobs.jobs.find(j=>j.name==='build'),deploy=jobs.jobs.find(j=>j.name==='deploy');
 if(build?.status!=='completed'||build.conclusion!=='failure'||deploy?.status!=='completed'||deploy.conclusion!=='skipped'||deploy.steps?.length)fail('BOOTSTRAP_RECOVERY_DEPLOY_UNPROVEN');
 const steps=build.steps;
 const before=['Set up job','Run actions/checkout@v4','Run actions/setup-node@v4'];
 const skipped=['Run npm ci','Build existing demo for the custom domain','Verify demo output and add bootstrap-only receipt','Run actions/upload-pages-artifact@v3','Post Run actions/setup-node@v4'];
 const failure='Reject wrong ref, stale main, publication state and any previous bootstrap run';
 const after=['Post Run actions/checkout@v4','Complete job'];
 if(!Array.isArray(steps)||steps.length!==before.length+skipped.length+after.length+1||steps.some(s=>s.status!=='completed'))fail('BOOTSTRAP_RECOVERY_STEPS_UNPROVEN');
 const matches=(name,conclusion)=>steps.filter(s=>s.name===name&&s.conclusion===conclusion).length===1;
 if(!before.every(n=>matches(n,'success'))||!skipped.every(n=>matches(n,'skipped'))||!after.every(n=>matches(n,'success'))||!matches(failure,'failure'))fail('BOOTSTRAP_RECOVERY_STEPS_UNPROVEN');
 if(artifacts?.total_count!==0||!Array.isArray(artifacts.artifacts)||artifacts.artifacts.length)fail('BOOTSTRAP_RECOVERY_ARTIFACT_UNPROVEN');
 return true;
}
const GUARD_RUN='37761123163',GUARD_SHA='8f9c8e69874fe3ab37b4f08ad4dfc7250c75aa73';
export function verifyEnvironmentRecord(record,statuses,owner){
 const url='https://github.com/'+REPO+'/actions/runs/'+owner.run+'/job/'+owner.job;
 if(!record||record.sha!==owner.commit||record.ref!=='main'||record.task!=='deploy'||record.environment!=='github-pages'||record.performed_via_github_app?.id!==15368||record.performed_via_github_app?.slug!=='github-actions'||owner.id&&String(record.id)!==owner.id)fail('BOOTSTRAP_ENVIRONMENT_IDENTITY_UNPROVEN');
 if(!Array.isArray(statuses)||!statuses.length||statuses.length>=100)fail('BOOTSTRAP_ENVIRONMENT_STATUS_UNPROVEN');
 const allowed=owner.failed?['waiting','queued','in_progress','failure']:['waiting','queued','in_progress'];
 if(statuses[0].state!==(owner.failed?'failure':'in_progress')||statuses.some(s=>s.environment!=='github-pages'||s.log_url!==url||s.target_url!==url||!allowed.includes(s.state)))fail('BOOTSTRAP_ENVIRONMENT_STATUS_UNPROVEN');
 return true;
}
export function verifyGuardFailure(run,jobs,artifacts){
 if(String(run?.id)!==GUARD_RUN||run.head_sha!==GUARD_SHA||run.run_attempt!==1||run.event!=='workflow_dispatch'||run.head_branch!=='main'||run.path!=='.github/workflows/bootstrap-demo-pages.yml'||run.status!=='completed'||run.conclusion!=='failure')fail('BOOTSTRAP_GUARD_RECOVERY_UNPROVEN');
 if(jobs?.total_count!==2||jobs.jobs?.length!==2)fail('BOOTSTRAP_GUARD_RECOVERY_UNPROVEN');
 const build=jobs.jobs.find(j=>j.name==='build'),deploy=jobs.jobs.find(j=>j.name==='deploy');
 if(String(build?.id)!=='113257510213'||build.status!=='completed'||build.conclusion!=='success'||build.steps?.length!==11||build.steps.some(s=>s.status!=='completed'||s.conclusion!=='success')||String(deploy?.id)!=='113257925974'||deploy.status!=='completed'||deploy.conclusion!=='failure')fail('BOOTSTRAP_GUARD_RECOVERY_UNPROVEN');
 const expected=[['Set up job','success'],['Run actions/checkout@v4','success'],['Run actions/setup-node@v4','success'],['Recheck main and bootstrap absence after approval','failure'],['Deploy demo once','skipped'],['Bounded Pages and HTTPS byte reconciliation','skipped'],['Preserve bootstrap-only outcome (never a ledger event)','skipped'],['Post Run actions/setup-node@v4','skipped'],['Post Run actions/checkout@v4','success'],['Complete job','success']];
 if(!Array.isArray(deploy.steps)||deploy.steps.length!==expected.length||expected.some(([name,conclusion],i)=>deploy.steps[i].name!==name||deploy.steps[i].status!=='completed'||deploy.steps[i].conclusion!==conclusion))fail('BOOTSTRAP_GUARD_RECOVERY_UNPROVEN');
 const artifact=artifacts?.artifacts?.[0];
 if(artifacts?.total_count!==1||artifacts.artifacts.length!==1||String(artifact?.id)!=='11541823983'||artifact.name!=='github-pages'||artifact.expired!==false||artifact.workflow_run?.id!==Number(GUARD_RUN)||artifact.workflow_run.head_sha!==GUARD_SHA)fail('BOOTSTRAP_GUARD_ARTIFACT_UNPROVEN');
 return true;
}
export function verifyBootstrapHistory(c,runs){
 const entries=runs?.workflow_runs;
 if(!Array.isArray(entries)||runs.total_count!==entries.length)fail('BOOTSTRAP_ALREADY_ATTEMPTED');
 if(!c.recovery){if(entries.length!==1||String(entries[0].id)!==c.run)fail('BOOTSTRAP_ALREADY_ATTEMPTED');return;}
 const prior=c.recovery===RECOVERY_RUN?[[RECOVERY_RUN,RECOVERY_SHA]]:c.recovery===GUARD_RUN?[[RECOVERY_RUN,RECOVERY_SHA],[GUARD_RUN,GUARD_SHA]]:null;
 if(!prior||prior.some(([id,sha])=>c.run===id||c.commit===sha)||entries.length!==prior.length+1||entries.filter(r=>String(r.id)===c.run).length!==1||prior.some(([id,sha])=>entries.filter(r=>String(r.id)===id&&r.head_sha===sha&&r.conclusion==='failure').length!==1))fail('BOOTSTRAP_RECOVERY_HISTORY_UNPROVEN');
}
async function assertCommitAbsence(commit,owner=null){
 const deployment=await api('pages/deployments/'+commit,true),records=await api('deployments?sha='+commit+'&per_page=100');
 if(!Array.isArray(records))fail('BOOTSTRAP_PAGES_ABSENCE_UNPROVEN');
 if(owner){
  if(records.length!==1)fail('BOOTSTRAP_ENVIRONMENT_IDENTITY_UNPROVEN');
  verifyEnvironmentRecord(records[0],await api('deployments/'+records[0].id+'/statuses?per_page=100'),owner);
  // Only the positively identified environment job record is excluded. The Pages
  // status itself still must prove no real Pages attempt.
  assertNoPagesAttempt(deployment,[]);
 }else assertNoPagesAttempt(deployment,records);
}
async function currentEnvironmentOwner(c){
 const jobs=await api('actions/runs/'+c.run+'/attempts/1/jobs?per_page=100');
 if(jobs.total_count!==2||jobs.jobs?.length!==2)fail('BOOTSTRAP_ENVIRONMENT_JOB_UNPROVEN');
 const deploy=jobs.jobs.find(j=>j.name==='deploy'),build=jobs.jobs.find(j=>j.name==='build');
 if(deploy?.status!=='in_progress'||String(deploy.run_id)!==c.run||deploy.run_attempt!==1||deploy.head_sha!==c.commit||build?.status!=='completed'||build.conclusion!=='success')fail('BOOTSTRAP_ENVIRONMENT_JOB_UNPROVEN');
 return {commit:c.commit,run:c.run,job:String(deploy.id)};
}
async function proveRecovery(c){
 if(!c.recovery)return;
 if(![RECOVERY_RUN,GUARD_RUN].includes(c.recovery))fail('BOOTSTRAP_RECOVERY_RUN_UNPROVEN');
 verifyRecoveryEvidence(await api('actions/runs/'+RECOVERY_RUN),await api('actions/runs/'+RECOVERY_RUN+'/attempts/1/jobs?per_page=100'),await api('actions/runs/'+RECOVERY_RUN+'/artifacts?per_page=100'));
 await assertCommitAbsence(RECOVERY_SHA);
 if(c.recovery===GUARD_RUN){
  verifyGuardFailure(await api('actions/runs/'+GUARD_RUN),await api('actions/runs/'+GUARD_RUN+'/attempts/1/jobs?per_page=100'),await api('actions/runs/'+GUARD_RUN+'/artifacts?per_page=100'));
  await assertCommitAbsence(GUARD_SHA,{id:'6932706709',commit:GUARD_SHA,run:GUARD_RUN,job:'113257925974',failed:true});
 }
}
function context(){return {repository:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF,event:process.env.GITHUB_EVENT_NAME,attempt:process.env.GITHUB_RUN_ATTEMPT,expected:process.env.EXPECTED_COMMIT,commit:process.env.GITHUB_SHA,confirm:process.env.CONFIRM_DEMO_BOOTSTRAP,run:process.env.GITHUB_RUN_ID,recovery:process.env.RECOVERY_RUN_ID};}
async function bounded(response,limit){
 let size=0;const chunks=[];
 for await(const chunk of response.body){size+=chunk.length;if(size>limit)fail('BOOTSTRAP_RESPONSE_LIMIT');chunks.push(chunk);}
 return Buffer.concat(chunks);
}
async function api(route,allow404=false){
 const r=await fetch('https://api.github.com/repos/'+REPO+'/'+route,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
 if(allow404&&r.status===404){await r.body?.cancel();return null;}
 if(r.status!==200){await r.body?.cancel();fail('BOOTSTRAP_GITHUB_READ_FAILED');}
 return JSON.parse((await bounded(r,4*1024*1024)).toString('utf8'));
}
async function httpsGet(route,nonce){
 const r=await fetch(ORIGIN+route+(nonce?'?bootstrap_probe='+encodeURIComponent(nonce):''),{redirect:'manual',signal:AbortSignal.timeout(5000),headers:{'Cache-Control':'no-cache'}});
 return {status:r.status,bytes:await bounded(r,4*1024*1024)};
}
async function absence(){
 for(const marker of [BOOTSTRAP_MARKER,PUBLICATION_MARKER])if((await httpsGet(marker,process.env.GITHUB_RUN_ID+'_'+Date.now())).status!==404)fail('BOOTSTRAP_MARKER_ALREADY_PRESENT_OR_UNKNOWN');
}
export async function remoteGate(history){
 const c=context();
 // Reject malformed/ref/replay dispatch before any network request.
 bootstrapGate(c,c.commit,JSON.parse(fs.readFileSync('production/ledger.json','utf8')));
 const main=await api('git/ref/heads/main');
 bootstrapGate(c,main.object?.sha,JSON.parse(fs.readFileSync('production/ledger.json','utf8')),history||c.recovery?await api('actions/workflows/bootstrap-demo-pages.yml/runs?per_page=100'):null);
 await proveRecovery(c);
 await assertCommitAbsence(c.commit,history?null:await currentEnvironmentOwner(c));
 await absence();
 if(history)verifyEnvironmentPolicy(await api('environments/github-pages'),await api('environments/github-pages/deployment-branch-policies?per_page=100'));
}
export function prepareDemo(root,out,c){
 bootstrapGate(c,c.commit,JSON.parse(fs.readFileSync(path.join(root,'production/ledger.json'),'utf8')));
 const generated=JSON.parse(fs.readFileSync(path.join(root,'app/site-news.generated.json'),'utf8'));
 if(generated.mode!=='demo'||generated.items?.length!==0)fail('BOOTSTRAP_DEMO_ONLY');
 if(fs.readFileSync(path.join(out,'CNAME'),'utf8').trim()!=='ivmova.com')fail('BOOTSTRAP_DOMAIN');
 if(fs.existsSync(path.join(out,PUBLICATION_MARKER.slice(1)))||fs.existsSync(path.join(out,BOOTSTRAP_MARKER.slice(1))))fail('BOOTSTRAP_OUTPUT_MARKER_CONFLICT');
 const probes=[['/','index.html',200],['/kategori/enerji/','kategori/enerji/index.html',200],['/haber/enerji-donusumunde-yeni-donem/','haber/enerji-donusumunde-yeni-donem/index.html',200],['/sitemap.xml','sitemap.xml',200],['/__ivmova_bootstrap_missing__','404.html',404],['/ivmova-wordmark.svg','ivmova-wordmark.svg',200]];
 const receipt={kind:'IVMOVA_DEMO_BOOTSTRAP_ONLY',version:1,sourceCommit:c.commit,workflowRunId:c.run};
 const bytes=Buffer.from(JSON.stringify(receipt)+'\n');
 const checks=probes.map(([route,file,status])=>({route,status,sha256:hash(fs.readFileSync(path.join(out,file)))}));
 const marker=path.join(out,BOOTSTRAP_MARKER.slice(1));fs.mkdirSync(path.dirname(marker),{recursive:true});fs.writeFileSync(marker,bytes,{flag:'wx'});
 checks.push({route:BOOTSTRAP_MARKER,status:200,sha256:hash(bytes)});
 return {receipt,checks};
}
export function verifyHealth(h,c){
 if(h?.receipt?.kind!=='IVMOVA_DEMO_BOOTSTRAP_ONLY'||h.receipt.version!==1||h.receipt.sourceCommit!==c.commit||h.receipt.workflowRunId!==c.run)fail('BOOTSTRAP_HANDOFF');
 const routes=['/','/kategori/enerji/','/haber/enerji-donusumunde-yeni-donem/','/sitemap.xml','/__ivmova_bootstrap_missing__','/ivmova-wordmark.svg',BOOTSTRAP_MARKER];
 if(!Array.isArray(h.checks)||h.checks.length!==routes.length||h.checks.some((p,i)=>p.route!==routes[i]||p.status!==(i===4?404:200)||! /^[0-9a-f]{64}$/.test(p.sha256)))fail('BOOTSTRAP_HEALTH_CONTRACT');
 return h;
}
function handoff(){const c=context();bootstrapGate(c,c.commit,JSON.parse(fs.readFileSync('production/ledger.json','utf8')));return verifyHealth(JSON.parse(Buffer.from(process.env.BOOTSTRAP_HEALTH??'','base64').toString('utf8')),c);}
export async function reconcileHealth(h,{get= httpsGet,status=()=>api('pages/deployments/'+process.env.GITHUB_SHA),sleep=ms=>new Promise(r=>setTimeout(r,ms)),attempts=6}={}){
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   if((await status()).status!=='succeed')fail('BOOTSTRAP_PAGES_NOT_SUCCEEDED');
   for(const probe of h.checks)for(const nonce of [null,'health_'+attempt+'_'+Date.now()]){const r=await get(probe.route,nonce);if(r.status!==probe.status||hash(r.bytes)!==probe.sha256)fail('BOOTSTRAP_HTTPS_MISMATCH');}
   // A demo bootstrap must never masquerade as a publication release.
   if((await get(PUBLICATION_MARKER,'health_'+Date.now())).status!==404)fail('BOOTSTRAP_PUBLICATION_MARKER_PRESENT');
   return;
  }catch{if(attempt+1<attempts)await sleep(5000);}
 }
 fail('BOOTSTRAP_RECONCILIATION_REQUIRED_NO_REDEPLOY');
}
async function main(){
 if(process.env.GITHUB_ACTIONS!=='true')fail('BOOTSTRAP_ACTIONS_ONLY');
 const mode=process.argv[2];
 if(mode==='validate'){await remoteGate(true);return;}
 if(mode==='prepare'){
  const c=context(),out=path.join(process.env.RUNNER_TEMP,'demo-bootstrap/out');
  // Build may only change ignored generated output, never reviewed content or the ledger.
  execFileSync('git',['diff','--exit-code','HEAD','--','app','public','production'],{stdio:'pipe'});
  function regular(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isSymbolicLink()||!entry.isFile()&&!entry.isDirectory())fail('BOOTSTRAP_OUTPUT_NOT_REGULAR');if(entry.isDirectory())regular(full);}}
  regular('out');
  if(fs.existsSync(out))fail('BOOTSTRAP_TEMP_EXISTS');fs.cpSync('out',out,{recursive:true,dereference:false});
  const h=verifyHealth(prepareDemo(process.cwd(),out,c),c);
  fs.appendFileSync(process.env.GITHUB_OUTPUT,'health='+Buffer.from(JSON.stringify(h)).toString('base64')+'\n');return;
 }
 if(mode==='guard'){handoff();await remoteGate(false);return;}
 if(mode==='reconcile'){
  const h=handoff(),outcome={kind:'IVMOVA_DEMO_BOOTSTRAP_ONLY',sourceCommit:process.env.GITHUB_SHA,workflowRunId:process.env.GITHUB_RUN_ID,status:'UNKNOWN'};
  let error;try{await reconcileHealth(h);outcome.status='RECONCILED';}catch(e){error=e;}
  fs.writeFileSync(path.join(process.env.RUNNER_TEMP,'demo-bootstrap-outcome.json'),JSON.stringify(outcome)+'\n',{flag:'wx'});
  if(error)throw error;return;
 }
 fail('BOOTSTRAP_CLI');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(/^BOOTSTRAP_[A-Z_]+$/.test(e.message)?e.message:'BOOTSTRAP_FAILURE_NO_AUTOMATIC_REDEPLOY');process.exitCode=1;});
