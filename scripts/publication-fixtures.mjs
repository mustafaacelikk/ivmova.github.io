// Synthetic fixture construction only; no DB, network, or editorial generator.
import fs from 'node:fs';
import path from 'node:path';
import { canonicalBytes, sha256, contentHash } from './publication-contract.mjs';
export const uid=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
export function story(n,revision=1,retract=false) {
  const s={schemaVersion:1,storyId:uid(n),slug:'sentetik-'+n,language:'tr',publicationStatus:retract?'RETRACTED':'PUBLISHED',revisionId:uid(n*100+revision),revisionNumber:revision,revisionType:retract?'RETRACTION':revision===1?'INITIAL':'UPDATE',headline:retract?'Haber geri çekildi':'Sentetik staging haberi '+n,standfirst:retract?null:'Yalnız yerel test içeriği.',bodyMarkdown:retract?'Bu haber geri çekilmiştir.':'## Sentetik başlık\n**Güvenli** yerel metin.\n- Liste\n<script>alert(1)</script>',contentHash:'',publishedAt:'2026-10-07T08:00:00Z',updatedAt:'2026-10-07T08:00:00Z',retractedAt:retract?'2026-10-07T08:00:00Z':null,primaryCategory:'Enerji',sources:[{sourceName:'Sentetik Kaynak',title:'Sentetik kaynak başlığı',url:'https://example.test/source-'+n,publishedAt:'2026-10-07T07:00:00Z',role:'PRIMARY'}]};s.contentHash=contentHash(s);return s;
}
export function writeRelease(dir,{run=1,type='FULL',minute=1,stories=[story(1)],removals=[]}={}) {
  fs.mkdirSync(path.join(dir,'manifests'),{recursive:true});const exportId=uid(9000+run);const items=[];
  for(const s of stories) {const artifactPath='stories/'+s.language+'/'+s.slug+'.json';const b=canonicalBytes(s);fs.mkdirSync(path.dirname(path.join(dir,artifactPath)),{recursive:true});fs.writeFileSync(path.join(dir,artifactPath),b);items.push({storyId:s.storyId,slug:s.slug,action:s.publicationStatus==='RETRACTED'?'RETRACT':'UPSERT',artifactPath,revisionId:s.revisionId,revisionNumber:s.revisionNumber,revisionContentHash:s.contentHash,artifactSha256:sha256(b),artifactBytes:b.length,removalProof:null,removalReceiptSha256:null});}
  for(const n of removals) {const slug='sentetik-'+n,artifactPath='stories/tr/'+slug+'.json';const proof={contractVersion:2,runId:exportId,storyId:uid(n),slug,targetPath:artifactPath};items.push({storyId:uid(n),slug,action:'REMOVE',artifactPath,revisionId:null,revisionNumber:null,revisionContentHash:null,artifactSha256:null,artifactBytes:null,removalProof:proof,removalReceiptSha256:sha256(canonicalBytes(proof))});}
  items.sort((a,b)=>a.artifactPath<b.artifactPath?-1:1);const actionCounts={UPSERT:0,RETRACT:0,REMOVE:0};items.forEach(i=>actionCounts[i.action]++);
  const m={schemaVersion:2,exportId,generatedAt:'2026-10-07T09:'+String(minute).padStart(2,'0')+':00Z',runType:type,target:'GITHUB_PAGES',itemCount:items.length,actionCounts,items};const file=path.join(dir,'manifests',exportId+'.json');fs.writeFileSync(file,canonicalBytes(m));return {file,manifest:m};
}
