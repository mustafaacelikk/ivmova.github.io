// First publication only. Read-only GitHub evidence; never calls a deployment endpoint with POST.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {validateLedger,verifyGitLedgerHistory,git,assertGitBase} from './publication-git-ledger.mjs';
import {canonicalBytes} from './publication-contract.mjs';import {validate,fail} from './publication-control-schema.mjs';
import {verifyPublicationPagesAbsence} from './publication-pages-absence.mjs';import {limitedBody} from './publication-pages-reconciliation.mjs';
const REPO='mustafaacelikk/ivmova.github.io';
export async function cancellationEvidence({ledger,commit,expectedCommit,mainCommit,releaseId,runId,runAttempt,commits,api,now=new Date().toISOString()}){
 assertGitBase(expectedCommit,commit);assertGitBase(commit,mainCommit);
 if(!/^[1-9][0-9]*$/.test(runId)||runAttempt!==1||!Array.isArray(commits)||!commits.includes(commit)||!commits.length||commits.length>1000||commits.some(c=>!/^[0-9a-f]{40}$/.test(c)))fail('CANCELLATION_CONTEXT');
 const state=validateLedger(ledger),r=state.pending;
 if(state.production.releaseId!==null||!r||r.status!=='PREPARED'||r.releaseId!==releaseId||state.recordSha256!==r.recordSha256)fail('UNPUBLISHED_GENESIS_ONLY');
 // Inspect every normal promotion run, including old runs that were rerun later.
 const first=await api('actions/workflows/deploy-pages.yml/runs?per_page=100&page=1');
 if(!Number.isSafeInteger(first.total_count)||first.total_count<0||first.total_count>1000||!Array.isArray(first.workflow_runs))fail('CANCELLATION_HISTORY_UNPROVEN');
 const runs=[...first.workflow_runs];
 for(let page=2;page<=Math.ceil(first.total_count/100);page++){const packet=await api('actions/workflows/deploy-pages.yml/runs?per_page=100&page='+page);if(packet.total_count!==first.total_count||!Array.isArray(packet.workflow_runs))fail('CANCELLATION_HISTORY_CHANGED');runs.push(...packet.workflow_runs);}
 if(runs.length!==first.total_count||new Set(runs.map(x=>x.id)).size!==runs.length)fail('CANCELLATION_HISTORY_UNPROVEN');
 for(const x of runs){if(!Number.isFinite(Date.parse(x.created_at))||!Number.isFinite(Date.parse(x.updated_at)))fail('CANCELLATION_HISTORY_UNPROVEN');if(Date.parse(x.created_at)>=Date.parse(r.createdAt)||Date.parse(x.updated_at)>=Date.parse(r.createdAt))fail('PROMOTION_ATTEMPT_REQUIRES_RECONCILIATION');}
 // Also reject deployment records made outside the normal promotion workflow.
 let ended=false;
 for(let page=1;page<=10;page++){const records=await api('deployments?per_page=100&page='+page);if(!Array.isArray(records)||records.length>100)fail('CANCELLATION_HISTORY_UNPROVEN');for(const x of records){if(!Number.isFinite(Date.parse(x.created_at)))fail('CANCELLATION_HISTORY_UNPROVEN');if(x.environment==='github-pages'&&Date.parse(x.created_at)>=Date.parse(r.createdAt))fail('PAGES_ATTEMPT_REQUIRES_RECONCILIATION');}if(records.length<100){ended=true;break;}}
 if(!ended)fail('CANCELLATION_HISTORY_LIMIT');
 for(const sha of new Set(commits))await verifyPublicationPagesAbsence({api,commit:sha,run:runId});
 const current=await api('git/ref/heads/main');assertGitBase(commit,current.object?.sha);
 return validate('deployment-outcome-v1',{schemaVersion:1,releaseId:r.releaseId,releaseRecordSha256:r.recordSha256,deployTreeSha256:r.deployTreeSha256,status:'FAILED',evidence:{commit,workflowRunId:runId,workflowRunAttempt:1,pagesDeploymentId:null,markerSha256:null,observedAt:now,outcome:'NOT_DEPLOYED'}});
}
async function api(route,{allow404=false}={}){const response=await fetch('https://api.github.com/repos/'+REPO+'/'+route,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});if(allow404&&response.status===404){await response.body?.cancel();return null;}if(response.status!==200)fail('CANCELLATION_GITHUB_READ_FAILED');return JSON.parse((await limitedBody(response,4*1024*1024)).toString('utf8'));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==REPO||process.env.GITHUB_REF!=='refs/heads/main'||!process.env.GITHUB_WORKFLOW_REF?.startsWith(REPO+'/.github/workflows/cancel-prepared-release.yml@refs/heads/main'))fail('CANCELLATION_WORKFLOW_ONLY');
 const commit=process.env.GITHUB_SHA,ledger=verifyGitLedgerHistory(process.cwd(),commit),state=validateLedger(ledger);if(!state.pending)fail('NO_PENDING_RELEASE');
 const commits=git(process.cwd(),['rev-list',state.pending.expectedGitBase+'..'+commit]).split('\n').filter(Boolean);
 const main=await api('git/ref/heads/main');
 const packet=await cancellationEvidence({ledger,commit,expectedCommit:process.env.EXPECTED_COMMIT,mainCommit:main.object?.sha,releaseId:process.env.EXPECTED_RELEASE,runId:process.env.GITHUB_RUN_ID,runAttempt:Number(process.env.GITHUB_RUN_ATTEMPT),commits,api});
 assertGitBase(commit,git(process.cwd(),['rev-parse','HEAD']));fs.writeFileSync(process.argv[2],canonicalBytes(packet),{flag:'wx'});console.log('UNPUBLISHED_RELEASE_CANCELLATION_EVIDENCE_READY; NO_DEPLOYMENT; LEDGER_UNCHANGED');
}
