import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {canonicalBytes,parseInput} from './publication-contract.mjs';import {GENESIS,LEDGER_PATH,assertAppendOnly,assertGitBase,git,recordOutcome} from './publication-git-ledger.mjs';import {equal,readCanonical,validate,fail} from './publication-control-schema.mjs';
export function verifyHistorySnapshots(snapshots,current){
 if(!snapshots.length)fail('GENESIS_NOT_TRACKED');if(!equal(snapshots[0],GENESIS))fail('GENESIS_MUST_BE_EMPTY');let previous=GENESIS;
 for(const s of snapshots){assertAppendOnly(previous,s);previous=s;}if(!equal(previous,current))fail('UNCOMMITTED_LEDGER');return current;
}
export function gitLedgerBlob(repo,commit){
 let bytes;try{bytes=execFileSync('git',['-C',repo,'show',commit+':'+LEDGER_PATH],{maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});}catch{fail('GIT_LEDGER_DELETED_OR_BASE_MISSING');}
 const value=parseInput(bytes);if(!bytes.equals(canonicalBytes(value)))fail('GIT_LEDGER_NON_CANONICAL');return value;
}
export function verifyHistory(repo,commit){
 assertGitBase(commit,git(repo,['rev-parse',commit+'^{commit}']));
 const commits=git(repo,['rev-list','--full-history','--first-parent','--reverse',commit,'--',LEDGER_PATH]).split('\n').filter(Boolean);
 const current=readCanonical(path.join(repo,LEDGER_PATH));verifyHistorySnapshots(commits.map(c=>gitLedgerBlob(repo,c)),current);
 for(const r of current.records.filter(r=>r.status==='PREPARED')){git(repo,['merge-base','--is-ancestor',r.expectedGitBase,commit]);const base=gitLedgerBlob(repo,r.expectedGitBase);if(!equal(base.records,current.records.slice(0,r.generation-1)))fail('PREPARED_GIT_BASE_LEDGER_MISMATCH');}
 for(const r of current.records.filter(r=>r.evidence)){git(repo,['merge-base','--is-ancestor',r.evidence.commit,commit]);const original=current.records.find(p=>p.status==='PREPARED'&&p.releaseId===r.releaseId);if(gitLedgerBlob(repo,r.evidence.commit).records.at(-1)?.recordSha256!==original.recordSha256)fail('EVIDENCE_DEPLOY_COMMIT_LEDGER');}
 return current;
}
export function prepareOutcomeFromGit(request,destination){
 const repo=path.resolve(request.repo),base=git(repo,['rev-parse','HEAD']);assertGitBase(request.expectedGitBase,base);const ledger=verifyHistory(repo,base),packet=validate('deployment-outcome-v1',readCanonical(request.outcome));
 const prepared=ledger.records.find(r=>r.status==='PREPARED'&&r.releaseId===packet.releaseId);if(!prepared||prepared.recordSha256!==packet.releaseRecordSha256||prepared.deployTreeSha256!==packet.deployTreeSha256)fail('OUTCOME_RELEASE_CHAIN');
 git(repo,['merge-base','--is-ancestor',prepared.expectedGitBase,packet.evidence.commit]);git(repo,['merge-base','--is-ancestor',packet.evidence.commit,base]);
 const atDeploy=gitLedgerBlob(repo,packet.evidence.commit);if(!equal(atDeploy.records.at(-1),prepared))fail('OUTCOME_DEPLOY_COMMIT_LEDGER');
 const plan=recordOutcome({ledger,releaseId:packet.releaseId,status:packet.status,evidence:packet.evidence,expectedGitBase:base,actualGitBase:base,expectedGeneration:request.expectedGeneration});
 assertGitBase(base,git(repo,['rev-parse','HEAD']));if(!equal(readCanonical(path.join(repo,LEDGER_PATH)),ledger))fail('LOCAL_LEDGER_CHANGED');if(fs.existsSync(destination))fail('DRAFT_EXISTS');fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'ledger.json'),canonicalBytes(plan.ledger));return plan;
}
