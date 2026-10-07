// Existing isolated synthetic suite provides builds, route checks and owned TEMP cleanup.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for(const name of ['test-publication-release.mjs','test-publication-builds.mjs']){
 const r=spawnSync(process.execPath,[fileURLToPath(new URL(name,import.meta.url))],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status??1);
}
console.log('BUILD_ONLY_PASS; PRODUCTION_LEDGER_UNCHANGED; DEPLOY_NOT_INVOKED');
