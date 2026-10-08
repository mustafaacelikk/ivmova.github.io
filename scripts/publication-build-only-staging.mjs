// All inputs synthetic; isolated builds; no deploy/runtime network modes invoked.
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
for(const name of ['test-publication-consumer.mjs','test-publication-recovery.mjs','test-publication-release.mjs','test-publication-git-ledger.mjs','test-pages-reconciliation.mjs','test-publication-artifact.mjs','test-publication-workflow.mjs','test-bootstrap-demo-pages.mjs','test-publication-builds.mjs']){
 const result=spawnSync(process.execPath,[fileURLToPath(new URL(name,import.meta.url))],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status??1);
}
console.log('BUILD_ONLY_PASS; GIT_LEDGER_UNCHANGED; DEPLOY_NOT_INVOKED');
