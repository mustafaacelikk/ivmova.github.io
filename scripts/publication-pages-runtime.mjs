// Network actions exist only in explicit CLI modes; local tests use pure gates/mocks.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {canonicalBytes,sha256} from './publication-contract.mjs';
import {validateLedger,verifyGitLedgerHistory,git,markerFor,materializeOutput,LEDGER_PATH,assertGitBase} from './publication-git-ledger.mjs';
import {readCanonical,equal,fail} from './publication-control-schema.mjs';
import {verifyProducerIdentity} from './publication-producer-trust.mjs';
import {limitedBody,reconcileMarker} from './publication-pages-reconciliation.mjs';
import {verifyEnvironmentPolicy} from './publication-environment-policy.mjs';
export const REPOSITORY='mustafaacelikk/ivmova.github.io',PRODUCTION_ORIGIN='https://ivmova.com';
export function dispatchGate({ref,commit,mainCommit,expectedCommit,expectedReleaseId,expectedTreeHash,ledger}){
 if(ref!=='refs/heads/main')fail('MAIN_ONLY');assertGitBase(expectedCommit,commit);assertGitBase(expectedCommit,mainCommit);
 const state=validateLedger(ledger),r=state.pending;if(!r||r.status!=='PREPARED'||r.releaseId!==expectedReleaseId||r.publicTreeSha256!==expectedTreeHash||state.recordSha256!==r.recordSha256)fail('DISPATCH_LEDGER_MISMATCH');
 return r;
}
async function api(route,{allow404=false}={}){
 const response=await fetch('https://api.github.com/repos/'+REPOSITORY+'/'+route,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
 if(allow404&&response.status===404){await response.body?.cancel();return null;}
 if(response.status!==200)fail('GITHUB_READ_FAILED_'+response.status);return JSON.parse((await limitedBody(response,4*1024*1024)).toString('utf8'));
}
function context(){if(process.env.GITHUB_REPOSITORY!==REPOSITORY)fail('REPOSITORY_MISMATCH');return {ref:process.env.GITHUB_REF,commit:process.env.GITHUB_SHA,expectedCommit:process.env.EXPECTED_COMMIT,expectedReleaseId:process.env.EXPECTED_RELEASE,expectedTreeHash:process.env.EXPECTED_TREE};}
async function gate({history=true,checkPrior=true}={}){
 const c=context(),main=await api('git/ref/heads/main'),ledger=history?verifyGitLedgerHistory(process.cwd(),c.commit):readCanonical(LEDGER_PATH);
 const r=dispatchGate({...c,mainCommit:main.object?.sha,ledger});
 if(process.env.GITHUB_RUN_ATTEMPT!=='1')fail('RERUN_RECONCILE_WITHOUT_REDEPLOY');
 // A prior request against this prepared commit may have reached Pages even if its runner died.
 if(checkPrior){const runs=await api('actions/workflows/deploy-pages.yml/runs?head_sha='+c.commit+'&per_page=100');if(runs.total_count>100||runs.workflow_runs.some(x=>String(x.id)!==process.env.GITHUB_RUN_ID))fail('PRIOR_RUN_RECONCILIATION_REQUIRED');}
 const deployment=await api('pages/deployments/'+c.commit,{allow404:true});if(deployment)fail('PAGES_ATTEMPT_ALREADY_EXISTS_RECONCILE');
 return r;
}
async function downloadProducer(record,root){
 if(fs.existsSync(root))fail('TRANSFER_EXISTS');fs.mkdirSync(root,{recursive:true});
 const p=record.producer,run=await api('actions/runs/'+p.runId+'/attempts/'+p.runAttempt),artifact=await api('actions/artifacts/'+p.artifactId);verifyProducerIdentity(p,run,artifact);
 git(process.cwd(),['merge-base','--is-ancestor',p.sourceCommit,process.env.GITHUB_SHA]);
 const redirect=await fetch('https://api.github.com/repos/'+REPOSITORY+'/actions/artifacts/'+p.artifactId+'/zip',{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json'}});
 if(redirect.status!==302)fail('ARTIFACT_REDIRECT_EXPECTED');const signed=new URL(redirect.headers.get('location'));await redirect.body?.cancel();
 // Exactly one trusted GitHub storage redirect; never forward authorization.
 if(signed.protocol!=='https:'||signed.username||signed.password||signed.port&&signed.port!=='443'||!(/\.blob\.core\.windows\.net$/.test(signed.hostname)||/\.actions\.githubusercontent\.com$/.test(signed.hostname)))fail('ARTIFACT_STORAGE_ORIGIN');
 const response=await fetch(signed,{redirect:'error',signal:AbortSignal.timeout(60000)});if(response.status!==200)fail('ARTIFACT_DOWNLOAD_FAILED');
 const bytes=await limitedBody(response,512*1024*1024);if('sha256:'+sha256(bytes)!==p.artifactDigest)fail('ARTIFACT_DIGEST_MISMATCH');const archive=path.join(root,'artifact.zip');fs.writeFileSync(archive,bytes,{flag:'wx'});
 const bundle=path.join(root,'bundle');execFileSync('python3',['scripts/publication-extract-artifact.py',archive,bundle],{stdio:'pipe',timeout:60000});
 if(p.trustMode==='GITHUB_ATTESTATION'){
 try{execFileSync('gh',['attestation','verify',path.join(root,'bundle-bundle.tar'),'--repo',REPOSITORY,'--signer-workflow',REPOSITORY+'/'+p.workflowPath,'--source-digest',p.sourceCommit,'--source-ref','refs/heads/main','--deny-self-hosted-runners'],{stdio:'pipe',timeout:60000,env:{...process.env,GH_TOKEN:process.env.GITHUB_TOKEN}});}catch{fail('ATTESTATION_REQUIRED_FAILED');}
 }else console.log('TRUST_LEVEL=GITHUB_RUN_DIGEST; NO_CRYPTOGRAPHIC_ATTESTATION');
 return bundle;
}
async function previousMarkerCheck(record){
 const state=validateLedger(readCanonical(LEDGER_PATH));
 const previous=record.expectedPrevious.releaseId?state.releases.get(record.expectedPrevious.releaseId):null;if(previous?.status==='FAILED'){if(record.releaseType!=='ROLLBACK'||previous.evidence.outcome!=='UNKNOWN')fail('RECOVERY_ROLLBACK_ONLY');const settled=await api('pages/deployments/'+previous.evidence.commit);if(settled.status!=='succeed')fail('UNSETTLED_FAILED_DEPLOYMENT');console.log('REVIEWED_RECOVERY_ROLLBACK; PREVIOUS MARKER WAS NOT RECONCILED');return;}
 if(previous){await reconcileMarker({origin:PRODUCTION_ORIGIN,expected:markerFor(previous),nonce:'pre_'+process.env.GITHUB_RUN_ID+'_'+Date.now(),attempts:1});}
 else{const response=await fetch(PRODUCTION_ORIGIN+'/.well-known/ivmova-release.json?genesis_probe='+process.env.GITHUB_RUN_ID,{redirect:'manual',signal:AbortSignal.timeout(3000)});await response.body?.cancel();if(response.status!==404)fail('GENESIS_MARKER_NOT_ABSENT');}
}
async function main(){
 if(process.env.GITHUB_ACTIONS!=='true')fail('GITHUB_ACTIONS_RUNTIME_ONLY');const [mode,root,out]=process.argv.slice(2);
 if(mode==='validate'){
 const record=await gate();verifyEnvironmentPolicy(await api('environments/github-pages'),await api('environments/github-pages/deployment-branch-policies?per_page=100'));await previousMarkerCheck(record);const bundle=await downloadProducer(record,root);materializeOutput(bundle,record,out);
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'release_record_sha256='+record.recordSha256+'\n');
 console.log('VALIDATED_LEDGER_BUNDLE_OUTPUT');return;
 }
 if(mode==='guard'){
 const record=await gate({checkPrior:false});if(process.env.EXPECTED_RECORD!==record.recordSha256)fail('HANDOFF_RECORD_MISMATCH');await previousMarkerCheck(record);console.log('POST_APPROVAL_FENCE_PASS');return;
 }
 if(mode==='reconcile'){
 const ledger=readCanonical(LEDGER_PATH),state=validateLedger(ledger),record=state.pending;
 if(!record||record.releaseId!==process.env.EXPECTED_RELEASE||record.recordSha256!==process.env.EXPECTED_RECORD)fail('RECONCILIATION_LEDGER');
 const evidence={commit:process.env.GITHUB_SHA,workflowRunId:process.env.GITHUB_RUN_ID,workflowRunAttempt:Number(process.env.GITHUB_RUN_ATTEMPT),pagesDeploymentId:process.env.GITHUB_SHA,markerSha256:null,observedAt:new Date().toISOString(),outcome:'UNKNOWN'};
 const outcome={schemaVersion:1,releaseId:record.releaseId,releaseRecordSha256:record.recordSha256,deployTreeSha256:record.deployTreeSha256,status:'FAILED',evidence};
 let error=null;
 try{const deployment=await api('pages/deployments/'+process.env.GITHUB_SHA);if(deployment.status!=='succeed')fail('PAGES_STATUS_NOT_SUCCEEDED');
 const verified=await reconcileMarker({origin:PRODUCTION_ORIGIN,expected:markerFor(record),nonce:'post_'+process.env.GITHUB_RUN_ID+'_'+Date.now()});evidence.markerSha256=verified.markerSha256;evidence.outcome='RECONCILED';outcome.status='RECONCILED';}
 catch(e){error=e;}
 fs.writeFileSync(root,canonicalBytes(outcome),{flag:'wx'});if(error)fail('RECONCILIATION_REQUIRED_NO_AUTOMATIC_REDEPLOY');console.log('PAGES_RECONCILED_REVIEW_OUTCOME_GIT_PR_REQUIRED');return;
 }
 fail('CLI_ARGUMENT');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(/^[A-Z][A-Z0-9_]+$/.test(e.message)?e.message:'RUNTIME_FAILURE_RECONCILIATION_REQUIRED');process.exitCode=1;});
