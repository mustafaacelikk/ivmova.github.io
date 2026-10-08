// Normal publication only: no bootstrap recovery or ledger mutation.
const REPO='mustafaacelikk/ivmova.github.io';
const fail=code=>{throw new Error(code);};
export function assertPublicationPagesAbsent(deployment,records){
 if(!Array.isArray(records))fail('PAGES_ABSENCE_UNPROVEN');
 if(records.length)fail('PAGES_ATTEMPT_ALREADY_EXISTS_RECONCILE');
 if(deployment===null)return;
 if(deployment&&typeof deployment==='object'&&!Array.isArray(deployment)&&deployment.status==='')return;
 fail('PAGES_ATTEMPT_ALREADY_EXISTS_RECONCILE');
}
export async function verifyPublicationPagesAbsence({api,commit,run,afterApproval=false}){
 if(!/^[0-9a-f]{40}$/.test(commit)||!/^\d+$/.test(run))fail('PAGES_CONTEXT_UNPROVEN');
 const deployment=await api('pages/deployments/'+commit,{allow404:true});
 const records=await api('deployments?sha='+commit+'&per_page=100');
 if(!afterApproval){assertPublicationPagesAbsent(deployment,records);return;}
 const jobs=await api('actions/runs/'+run+'/attempts/1/jobs?per_page=100');
 if(jobs?.total_count!==2||!Array.isArray(jobs.jobs)||jobs.jobs.length!==2)fail('PAGES_ENVIRONMENT_JOB_UNPROVEN');
 const validate=jobs.jobs.find(j=>j.name==='validate'),deploy=jobs.jobs.find(j=>j.name==='deploy');
 if(validate?.status!=='completed'||validate.conclusion!=='success'||deploy?.status!=='in_progress'||!/^\d+$/.test(String(deploy.id))||[validate,deploy].some(j=>String(j.run_id)!==run||j.run_attempt!==1||j.head_sha!==commit))fail('PAGES_ENVIRONMENT_JOB_UNPROVEN');
 if(!Array.isArray(records)||records.length!==1)fail('PAGES_ENVIRONMENT_IDENTITY_UNPROVEN');
 const record=records[0];
 if(!record||!/^\d+$/.test(String(record.id))||record.sha!==commit||record.ref!=='main'||record.task!=='deploy'||record.environment!=='github-pages'||record.performed_via_github_app?.id!==15368||record.performed_via_github_app?.slug!=='github-actions')fail('PAGES_ENVIRONMENT_IDENTITY_UNPROVEN');
 const statuses=await api('deployments/'+record.id+'/statuses?per_page=100');
 const url='https://github.com/'+REPO+'/actions/runs/'+run+'/job/'+deploy.id;
 if(!Array.isArray(statuses)||!statuses.length||statuses.length>=100||statuses[0].state!=='in_progress'||statuses.some(s=>!s||s.environment!=='github-pages'||s.log_url!==url||s.target_url!==url||!['waiting','queued','in_progress'].includes(s.state)))fail('PAGES_ENVIRONMENT_STATUS_UNPROVEN');
 // Exclude only the current environment job; a real or unknown Pages status still blocks.
 assertPublicationPagesAbsent(deployment,[]);
}
