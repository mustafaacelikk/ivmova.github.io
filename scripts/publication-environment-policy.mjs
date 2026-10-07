import {fail} from './publication-control-schema.mjs';
export function verifyEnvironmentPolicy(environment,policies){
 const reviewer=environment.protection_rules?.find(r=>r.type==='required_reviewers');
 if(environment.name!=='github-pages'||!reviewer?.reviewers?.length||reviewer.prevent_self_review!==true)fail('ENVIRONMENT_REVIEW_REQUIRED');
 if(environment.deployment_branch_policy?.custom_branch_policies!==true||environment.deployment_branch_policy?.protected_branches!==false||policies.total_count!==1||policies.branch_policies?.length!==1||policies.branch_policies[0].name!=='main'||policies.branch_policies[0].type!=='branch')fail('ENVIRONMENT_MAIN_BRANCH_ONLY');
 return {environment:'github-pages',reviewRequired:true,preventSelfReview:true,branch:'main'};
}
