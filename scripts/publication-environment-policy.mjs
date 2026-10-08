import {fail} from './publication-control-schema.mjs';
export function verifyEnvironmentPolicy(environment,policies){
 const reviewer=environment.protection_rules?.find(r=>r.type==='required_reviewers');
 // Accepted single-operator model: explicit approval by the named owner, including self-review.
 if(environment.name!=='github-pages'||reviewer?.reviewers?.length!==1||reviewer.reviewers[0].type!=='User'||reviewer.reviewers[0].reviewer?.login!=='mustafaacelikk'||reviewer.prevent_self_review!==false)fail('ENVIRONMENT_REVIEW_REQUIRED');
 if(environment.deployment_branch_policy?.custom_branch_policies!==true||environment.deployment_branch_policy?.protected_branches!==false||policies.total_count!==1||policies.branch_policies?.length!==1||policies.branch_policies[0].name!=='main'||policies.branch_policies[0].type!=='branch')fail('ENVIRONMENT_MAIN_BRANCH_ONLY');
 return {environment:'github-pages',reviewRequired:true,preventSelfReview:false,branch:'main'};
}
