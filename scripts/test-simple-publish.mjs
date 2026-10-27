import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {latestFullInput,mergeMedia,mergeDetails,prepareSimplePublication} from './simple-publish-build.mjs';import {resolvePublicationDetails,validateDetailsCatalog} from './publication-details.mjs';import {normalize} from './publication-consumer.mjs';
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
 // Reader note + subcategory: bound to the current revision, copied into the build copy; no file keeps the committed empty catalog.
 eq(mergeDetails(data,{repo:site}),0);eq(JSON.parse(fs.readFileSync(path.join(repo,'app/publication-details.json'),'utf8')),{schemaVersion:1,runId:null,items:[]});
 const story=latestFullInput(data).release.stories.find(x=>x.publicationStatus==='PUBLISHED'),runId='00000000-0000-4000-8000-0000000000aa';
 const row={storyId:story.storyId,revisionId:story.revisionId,subcategory:'Sanayi ve Petrokimya',note:null};
 fs.writeFileSync(path.join(data,'media','publication-details.json'),JSON.stringify({schemaVersion:1,runId,items:[row]}));eq(mergeDetails(data,{repo:site}),1);
 eq(resolvePublicationDetails(story,{repo:site}),{subcategory:'Sanayi ve Petrokimya'});eq(resolvePublicationDetails({...story,revisionId:'00000000-0000-4000-8000-0000000000bb'},{repo:site}),{subcategory:''});
 eq(normalize([story]).map(x=>[x.subcategory,x.readerNote]),[['',undefined]]);
 const edited={...story,revisionType:'CORRECTION'},note={kind:'CORRECTION',text:'İlk sürümde tarih yanlıştı; düzeltildi.'};
 eq(resolvePublicationDetails(edited,{catalog:{schemaVersion:1,runId,items:[{...row,note}]}}),{subcategory:'Sanayi ve Petrokimya',readerNote:note});
 throws(()=>resolvePublicationDetails(story,{catalog:{schemaVersion:1,runId,items:[{...row,note}]}}),'PUBLICATION_DETAILS_INVALID');
 for(const bad of [{...row,subcategory:null},{...row,note:{kind:'UPDATE',text:' boşluklu '}},{...row,extra:1},{...row,note:{kind:'RETRACTION',text:'Not'}}])throws(()=>validateDetailsCatalog({schemaVersion:1,runId,items:[bad]}),'PUBLICATION_DETAILS_INVALID');
 throws(()=>validateDetailsCatalog({schemaVersion:1,runId,items:[row,row]}),'PUBLICATION_DETAILS_INVALID');
 // 2026-10-27 topic group ("Aynı konuya bağla"): optional {id,title}; a row may carry only a topic; bad topics are refused.
 const topic={id:'00000000-0000-4000-8000-0000000000e1',title:'COP31 Antalya'};
 eq(resolvePublicationDetails(story,{catalog:{schemaVersion:1,runId,items:[{...row,subcategory:null,topic}]}}),{subcategory:'',topic});
 eq(resolvePublicationDetails(edited,{catalog:{schemaVersion:1,runId,items:[{...row,note,topic}]}}),{subcategory:'Sanayi ve Petrokimya',readerNote:note,topic});
 for(const bad of [{...row,topic:null},{...row,topic:{id:'x',title:'COP31'}},{...row,topic:{id:topic.id,title:''}},{...row,topic:{...topic,extra:1}},{...row,subcategory:null,topic:undefined}])throws(()=>validateDetailsCatalog({schemaVersion:1,runId,items:[JSON.parse(JSON.stringify(bad))]}),'PUBLICATION_DETAILS_INVALID');
 const page=fs.readFileSync(path.join(repo,'app/haber/[slug]/page.tsx'),'utf8');
 eq(['aria-label="Bu konudaki gelişmeler"','entry.topic?.id === item.topic?.id && entry.id !== item.id','Temsilî görsel · Yapay zekâ ile üretildi'].every(x=>page.includes(x))&&!page.includes('AI ile üretilmiştir'),true);
 fs.writeFileSync(path.join(data,'media','publication-details.json'),'{"schemaVersion":2,"runId":null,"items":[]}');throws(()=>mergeDetails(data,{repo:site}),'PUBLICATION_DETAILS_INVALID');fs.rmSync(path.join(data,'media','publication-details.json'));
 // Non-FULL or unexpected entries are refused.
 fs.mkdirSync(path.join(data,'input','not-a-run'));throws(()=>latestFullInput(data),'DATA_ENTRY_INVALID');
 throws(()=>latestFullInput(path.join(temp,'empty')),'NO_PUBLICATION_INPUT');
 eq(fs.existsSync(path.join(repo,'public/media/reviewed',sha+'.png')),false);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({result:'PASS',checks,deployments:0,network:0}));
