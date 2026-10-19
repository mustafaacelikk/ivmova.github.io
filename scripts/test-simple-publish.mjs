import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {latestFullInput,mergeMedia,prepareSimplePublication} from './simple-publish-build.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');let checks=0;const ok=v=>{assert.ok(v);checks++;};const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const throws=(fn,code)=>{assert.throws(fn,e=>e.message===code);checks++;};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ivmova-simple-test-'));
try{
 // Workflow: manual main-only dispatch, protected Pages environment, shared production concurrency, no write/secrets.
 const wf=fs.readFileSync(path.join(repo,'.github/workflows/simple-publish.yml'),'utf8');
 ok(/^on:\n  workflow_dispatch:/m.test(wf));ok(!/^\s+(push|pull_request|schedule|workflow_run):/m.test(wf));
 ok(wf.includes("if: ${{ github.ref == 'refs/heads/main' }}"));ok(wf.includes("if: ${{ github.ref == 'refs/heads/main' && needs.build.result == 'success' }}"));
 ok(/environment:\n      name: github-pages/.test(wf));ok(/group: ivmova-production-pages\n  cancel-in-progress: false/.test(wf));
 ok(!/contents: write|actions: write|secrets\.|persist-credentials: true/.test(wf));ok(wf.indexOf('simple-publish-build.mjs')<wf.indexOf('actions/deploy-pages'));
 ok(wf.includes('merge-base --is-ancestor "$DATA_COMMIT" HEAD'));ok(wf.includes('exit 1'));
 // Data: two reviewed FULL exports; the newest one is selected and imported through the existing consumer.
 const inputs=fs.readdirSync(path.join(repo,'production/input')),data=path.join(temp,'data'),site=path.join(temp,'site'),store=path.join(temp,'store');
 // Committed bytes (LF), not a Windows autocrlf working copy: hashes are byte-exact like the Linux runner.
 const git=args=>execFileSync('git',args,{cwd:repo,maxBuffer:64*1024*1024});
 for(const file of git(['ls-tree','-r','--name-only','HEAD','production/input']).toString('utf8').trim().split('\n')){const target=path.join(data,'input',...file.split('/').slice(2));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,git(['show','HEAD:'+file]));}
 const generated=Object.fromEntries(inputs.map(id=>[id,JSON.parse(fs.readFileSync(path.join(data,'input',id,'manifests',id+'.json'),'utf8')).generatedAt]));
 const newest=inputs.sort((a,b)=>Date.parse(generated[b])-Date.parse(generated[a]))[0];eq(latestFullInput(data).release.manifest.exportId,newest);
 fs.mkdirSync(path.join(site,'app'),{recursive:true});fs.copyFileSync(path.join(repo,'app/publication-media.json'),path.join(site,'app/publication-media.json'));fs.cpSync(path.join(repo,'public'),path.join(site,'public'),{recursive:true});
 const summary=prepareSimplePublication(data,{repo:site,store});eq([summary.runId,summary.addedMedia],[newest,0]);ok(fs.existsSync(path.join(store,'current.json')));
 // Media: identical rows are skipped, new reviewed rows are copied with their hash, conflicts and tampered bytes fail.
 const catalog=JSON.parse(fs.readFileSync(path.join(site,'app/publication-media.json'),'utf8'));
 const png=Buffer.from('89504e470d0a1a0a0000000d49484452','hex'),sha=crypto.createHash('sha256').update(png).digest('hex');
 const entry={storyId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',contentHash:'a'.repeat(64),image:'/media/reviewed/'+sha+'.png',imageSha256:sha,alt:'Alt',caption:'Açıklama',credit:'IVMOVA',rights:'OWN',sourceUrl:null,licenseUrl:null,aiTool:null,sourceArticleImage:false,editorApproved:true};
 fs.mkdirSync(path.join(data,'media','reviewed'),{recursive:true});fs.writeFileSync(path.join(data,'media','reviewed',sha+'.png'),png);
 fs.writeFileSync(path.join(data,'media','publication-media.json'),JSON.stringify({schemaVersion:1,items:[...catalog.items.slice(0,1),entry]}));
 eq(mergeMedia(data,{repo:site}),1);ok(fs.readFileSync(path.join(site,'public/media/reviewed',sha+'.png')).equals(png));eq(mergeMedia(data,{repo:site}),0);
 fs.writeFileSync(path.join(data,'media','publication-media.json'),JSON.stringify({schemaVersion:1,items:[{...entry,caption:'Değişti'}]}));throws(()=>mergeMedia(data,{repo:site}),'PUBLICATION_MEDIA_CONFLICT');
 fs.writeFileSync(path.join(data,'media','publication-media.json'),JSON.stringify({schemaVersion:1,items:[{...entry,revisionId:'00000000-0000-4000-8000-000000000003',imageSha256:'b'.repeat(64)}]}));throws(()=>mergeMedia(data,{repo:site}),'PUBLICATION_MEDIA_INVALID');
 // Non-FULL or unexpected entries are refused.
 fs.mkdirSync(path.join(data,'input','not-a-run'));throws(()=>latestFullInput(data),'DATA_ENTRY_INVALID');
 throws(()=>latestFullInput(path.join(temp,'empty')),'NO_PUBLICATION_INPUT');
 eq(fs.existsSync(path.join(repo,'public/media/reviewed',sha+'.png')),false);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({result:'PASS',checks,deployments:0,network:0}));
