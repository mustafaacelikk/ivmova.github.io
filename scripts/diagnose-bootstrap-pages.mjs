import {fileURLToPath} from 'node:url';
import path from 'node:path';
const REPO='mustafaacelikk/ivmova.github.io';
const SHA='db9c21ab60a71d9f1407e68b8f22011ee476dc97';
const RUN='37751560162';
export function summarize(route,http,body){
 const result={route,http};
 if(route.startsWith('pages/deployments/'))result.pagesStatus=typeof body?.status==='string'?body.status:null;
 if(body?.workflow_runs)result.runs=body.workflow_runs.map(r=>({id:r.id,name:r.name,event:r.event,head_sha:r.head_sha,status:r.status,conclusion:r.conclusion}));
 if(body?.jobs)result.jobs=body.jobs.map(j=>({id:j.id,name:j.name,status:j.status,conclusion:j.conclusion,steps:j.steps?.map(s=>({name:s.name,conclusion:s.conclusion}))}));
 if(Array.isArray(body))result.deployments=body.map(d=>({id:d.id,sha:d.sha,environment:d.environment,created_at:d.created_at}));
 if(route==='pages')result.site={build_type:body?.build_type,status:body?.status,cname:body?.cname};
 return result;
}
async function main(){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==REPO||!process.env.GITHUB_TOKEN)throw Error('DIAGNOSTIC_CONTEXT');
 for(const route of ['pages/deployments/'+SHA,'deployments?sha='+SHA+'&per_page=100','actions/runs?head_sha='+SHA+'&per_page=100','actions/runs/'+RUN+'/jobs?per_page=100','pages']){
  const response=await fetch('https://api.github.com/repos/'+REPO+'/'+route,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
  let size=0;const chunks=[];
  for await(const chunk of response.body){size+=chunk.length;if(size>4*1024*1024)throw Error('DIAGNOSTIC_BODY_LIMIT');chunks.push(chunk);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  console.log(JSON.stringify(summarize(route,response.status,body)));
  if(![200,404].includes(response.status))throw Error('DIAGNOSTIC_READ_FAILED');
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('DIAGNOSTIC_FAILED_NO_DEPLOY');process.exitCode=1;});
