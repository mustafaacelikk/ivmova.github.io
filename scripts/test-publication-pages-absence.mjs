import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyPublicationPagesAbsence} from './publication-pages-absence.mjs';
let assertions=0;
const commit='a'.repeat(40),run='123',job='456';
const record={id:789,sha:commit,ref:'main',task:'deploy',environment:'github-pages',performed_via_github_app:{id:15368,slug:'github-actions'}};
const url='https://github.com/mustafaacelikk/ivmova.github.io/actions/runs/'+run+'/job/'+job;
const status=state=>({state,environment:'github-pages',log_url:url,target_url:url});
const jobs={total_count:2,jobs:[{id:455,name:'validate',status:'completed',conclusion:'success',run_id:123,run_attempt:1,head_sha:commit},{id:456,name:'deploy',status:'in_progress',run_id:123,run_attempt:1,head_sha:commit}]};
async function check({page={status:''},records=[],afterApproval=false,jobList=jobs,statuses=[status('in_progress'),status('queued'),status('waiting')],error}={}){
 const calls=[];
 const routes=new Map([['pages/deployments/'+commit,page],['deployments?sha='+commit+'&per_page=100',records],['actions/runs/'+run+'/attempts/1/jobs?per_page=100',jobList],['deployments/789/statuses?per_page=100',statuses]]);
 const api=async(route,options)=>{calls.push(route);assert.ok(routes.has(route),'unexpected API route');if(route.startsWith('pages/'))assert.deepEqual(options,{allow404:true});return structuredClone(routes.get(route));};
 const task=()=>verifyPublicationPagesAbsence({api,commit,run,afterApproval});
 if(error)await assert.rejects(task,new RegExp(error));else await task();
 assertions++;
 assert.ok(calls.length<=4);assertions++;
}
await check();await check({page:null});
for(const page of [{},{status:null},{status:'succeed'},{status:'failed'},{status:'queued'},{status:'finished'},[],false])await check({page,error:'PAGES_ATTEMPT_ALREADY_EXISTS_RECONCILE'});
await check({records:null,error:'PAGES_ABSENCE_UNPROVEN'});
await check({records:[record],error:'PAGES_ATTEMPT_ALREADY_EXISTS_RECONCILE'});
const guard={afterApproval:true,records:[record]};
await check(guard);await check({...guard,page:null});
await check({...guard,records:[],error:'PAGES_ENVIRONMENT_IDENTITY_UNPROVEN'});
await check({...guard,records:[record,record],error:'PAGES_ENVIRONMENT_IDENTITY_UNPROVEN'});
for(const patch of [{sha:'b'.repeat(40)},{ref:'other'},{task:'other'},{environment:'preview'},{performed_via_github_app:{id:1,slug:'github-actions'}},{performed_via_github_app:{id:15368,slug:'other'}}])await check({...guard,records:[{...record,...patch}],error:'PAGES_ENVIRONMENT_IDENTITY_UNPROVEN'});
for(const statuses of [[],null,Array(100).fill(status('in_progress')),[status('success')],[status('failure')],[status('queued')],[status('in_progress'),status('success')],[{...status('in_progress'),log_url:url+'other'}],[{...status('in_progress'),target_url:url+'other'}],[{...status('in_progress'),environment:'preview'}]])await check({...guard,statuses,error:'PAGES_ENVIRONMENT_STATUS_UNPROVEN'});
for(const patch of [{status:'completed'},{run_attempt:2},{run_id:321},{head_sha:'b'.repeat(40)},{name:'other'}])await check({...guard,jobList:{...jobs,jobs:[jobs.jobs[0],{...jobs.jobs[1],...patch}]},error:'PAGES_ENVIRONMENT_JOB_UNPROVEN'});
await check({...guard,jobList:{...jobs,total_count:3},error:'PAGES_ENVIRONMENT_JOB_UNPROVEN'});
await check({...guard,jobList:{...jobs,jobs:[{...jobs.jobs[0],conclusion:'failure'},jobs.jobs[1]]},error:'PAGES_ENVIRONMENT_JOB_UNPROVEN'});
for(const page of [{},{status:null},{status:'succeed'},{status:'deployment_in_progress'},{status:'deployment_failed'}])await check({...guard,page,error:'PAGES_ATTEMPT_ALREADY_EXISTS_RECONCILE'});
// Verify the runtime uses the same checked path before and after approval.
const runtime=fs.readFileSync(new URL('./publication-pages-runtime.mjs',import.meta.url),'utf8');
assert.ok(runtime.includes('await verifyPublicationPagesAbsence({api,commit:c.commit,run:process.env.GITHUB_RUN_ID,afterApproval})'));assertions++;
assert.ok(runtime.includes('gate({checkPrior:false,afterApproval:true})'));assertions++;
assert.ok(runtime.includes("GITHUB_RUN_ATTEMPT!=='1'")&&runtime.includes('PRIOR_RUN_RECONCILIATION_REQUIRED'));assertions++;
console.log(JSON.stringify({result:'PASS',assertions,scope:'normal publication Pages absence and current environment evidence; mocked read-only API; no deployment'}));

