// Sade toplu yayın: yayin-verisi dalındaki en yeni FULL export + editör onaylı görseller -> mevcut consumer ve Next build.
// Ledger/producer/marker zinciri kullanılmaz ve değiştirilmez. Görsel kataloğu yalnız CI çalışma kopyasında genişletilir.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {validateRelease,importRelease} from './publication-consumer.mjs';import {resolvePublicationMedia} from './publication-media.mjs';import {validateDetailsCatalog,resolvePublicationDetails} from './publication-details.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=c=>{throw Error(c);};const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const plainDir=p=>{const s=fs.lstatSync(p);if(s.isSymbolicLink()||!s.isDirectory())fail('DATA_ENTRY_INVALID');};
export function latestFullInput(dataDir){
 const inputs=path.join(dataDir,'input');if(!fs.existsSync(inputs))fail('NO_PUBLICATION_INPUT');plainDir(inputs);let best=null;
 for(const name of fs.readdirSync(inputs)){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(name))fail('DATA_ENTRY_INVALID');
  const dir=path.join(inputs,name);plainDir(dir);const release=validateRelease(dir);
  if(release.manifest.exportId!==name||release.manifest.runType!=='FULL')fail('FULL_INPUT_REQUIRED');
  if(!best||Date.parse(release.manifest.generatedAt)>Date.parse(best.release.manifest.generatedAt))best={dir,release};
 }
 if(!best)fail('NO_PUBLICATION_INPUT');return best;
}
export function mergeMedia(dataDir,{repo=root}={}){
 const extraFile=path.join(dataDir,'media','publication-media.json');if(!fs.existsSync(extraFile))return 0;
 const extra=JSON.parse(fs.readFileSync(extraFile,'utf8')),file=path.join(repo,'app/publication-media.json'),catalog=JSON.parse(fs.readFileSync(file,'utf8'));
 if(extra?.schemaVersion!==1||!Array.isArray(extra.items))fail('PUBLICATION_MEDIA_INVALID');let added=0;
 for(const entry of extra.items){
  const existing=catalog.items.find(x=>x.revisionId===entry.revisionId);
  if(existing){if(JSON.stringify(existing)!==JSON.stringify(entry))fail('PUBLICATION_MEDIA_CONFLICT');continue;}
  const name=path.basename(String(entry.image));if(entry.image!=='/media/reviewed/'+name||!/^[0-9a-f]{64}\.(png|jpg|jpeg|webp)$/.test(name))fail('PUBLICATION_MEDIA_INVALID');
  const source=path.join(dataDir,'media','reviewed',name),s=fs.lstatSync(source);if(s.isSymbolicLink()||!s.isFile()||s.size>8*1024*1024)fail('PUBLICATION_MEDIA_INVALID');
  const bytes=fs.readFileSync(source);if(hash(bytes)!==entry.imageSha256)fail('PUBLICATION_MEDIA_INVALID');
  fs.mkdirSync(path.join(repo,'public/media/reviewed'),{recursive:true});fs.writeFileSync(path.join(repo,'public/media/reviewed',name),bytes);catalog.items.push(entry);added++;
 }
 fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');return added;
}
// Reader notes and subcategories (Editorial writes the complete list on every Yayına al); absent file keeps the committed empty catalog.
export function mergeDetails(dataDir,{repo=root}={}){
 const file=path.join(dataDir,'media','publication-details.json');if(!fs.existsSync(file))return 0;const s=fs.lstatSync(file);if(s.isSymbolicLink()||!s.isFile()||s.size>4*1024*1024)fail('PUBLICATION_DETAILS_INVALID');
 const catalog=validateDetailsCatalog(JSON.parse(fs.readFileSync(file,'utf8')));fs.writeFileSync(path.join(repo,'app/publication-details.json'),JSON.stringify(catalog,null,2)+'\n');return catalog.items.length;
}
// Import + media checks before the build so a broken image or input never reaches Pages.
export function prepareSimplePublication(dataDir,{repo=root,store}){
 const {dir,release}=latestFullInput(dataDir),added=mergeMedia(dataDir,{repo}),details=mergeDetails(dataDir,{repo});
 for(const story of release.stories){resolvePublicationMedia(story,{repo});resolvePublicationDetails(story,{repo});}
 importRelease(dir,{store});return {runId:release.manifest.exportId,manifestSha256:release.receipt.manifestSha256,itemCount:release.manifest.itemCount,addedMedia:added,details};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REF!=='refs/heads/main'||!/^[0-9a-f]{40}$/.test(process.env.DATA_COMMIT??''))fail('SIMPLE_PUBLISH_MAIN_ONLY');
 const store=fs.mkdtempSync(path.join(os.tmpdir(),'ivmova-simple-store-'));const summary=prepareSimplePublication(path.resolve(process.argv[2]??''),{store});
 const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_IVMOVA_CONTENT_MODE:'publication',NEXT_PUBLIC_IVMOVA_SITE_ORIGIN:'https://ivmova.com',IVMOVA_BUILD_PROFILE:'reviewed-production',IVMOVA_PUBLICATION_STORE:store}});
 if(result.status!==0)process.exit(result.status??1);
 fs.mkdirSync(path.join(root,'out/.well-known'),{recursive:true});
 fs.writeFileSync(path.join(root,'out/.well-known/ivmova-simple-publish.json'),JSON.stringify({schemaVersion:1,runId:summary.runId,manifestSha256:summary.manifestSha256,dataCommit:process.env.DATA_COMMIT}));
 console.log(JSON.stringify({...summary,dataCommit:process.env.DATA_COMMIT,deployed:false}));
}
