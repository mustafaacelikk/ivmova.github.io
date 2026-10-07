import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const result=spawnSync(process.platform==='win32'?'python':'python3',[fileURLToPath(new URL('./test-publication-artifact.py',import.meta.url))],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
