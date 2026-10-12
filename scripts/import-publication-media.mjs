import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {resolvePublicationMedia} from './publication-media.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
// Local editor acknowledgement, not a database signature. Git review binds this to the release source.
export function importMedia({reviewFile,storyFile,repo=root}){
 const read=f=>{const st=fs.lstatSync(f);if(!path.isAbsolute(f)||st.isSymbolicLink()||!st.isFile()||st.size>524288)throw Error('MEDIA_INPUT_INVALID');return JSON.parse(fs.readFileSync(f,'utf8'));};
 const review=read(reviewFile),story=read(storyFile),s=review.selection,r=review.receipt;
 if(review.version!==1||review.editorApproved!==true||r?.operation!=='approve_story'||r.status!=='PREPARED'||r.storyId!==story.storyId||r.revisionId!==story.revisionId||r.contentHash!==story.contentHash||s?.version!==1||s.sourceArticleImage!==false||s.reviewedContentSha256!==hash(Buffer.from(story.headline+'\n'+(story.standfirst??'')+'\n'+story.bodyMarkdown)))throw Error('MEDIA_REVIEW_MISMATCH');
 if(s.selection==='DEFAULT'){resolvePublicationMedia(story,{repo});return {selection:'DEFAULT',image:'/publication-default.svg'};}
 if(s.selection!=='CUSTOM'||!path.isAbsolute(s.assetFile)||!/^[0-9a-f]{64}$/.test(s.assetSha256))throw Error('MEDIA_INPUT_INVALID');
 let at=path.parse(s.assetFile).root;for(const part of s.assetFile.slice(at.length).split(path.sep).filter(Boolean)){at=path.join(at,part);if(fs.lstatSync(at).isSymbolicLink())throw Error('MEDIA_INPUT_INVALID');}
 const stat=fs.statSync(s.assetFile);if(!stat.isFile()||stat.size>8*1024*1024)throw Error('MEDIA_INPUT_INVALID');
 const bytes=fs.readFileSync(s.assetFile);if(hash(bytes)!==s.assetSha256)throw Error('MEDIA_ASSET_CHANGED');
 const image='/media/reviewed/'+s.assetSha256+path.extname(s.assetFile).toLowerCase();
 const entry={storyId:story.storyId,revisionId:story.revisionId,contentHash:story.contentHash,image,imageSha256:s.assetSha256,alt:s.alt,caption:s.caption,credit:s.credit,rights:s.rights,sourceUrl:s.sourceUrl,licenseUrl:s.licenseUrl,aiTool:s.aiTool,sourceArticleImage:false,editorApproved:true};
 const file=path.join(repo,'app/publication-media.json'),original=fs.readFileSync(file,'utf8'),catalog=JSON.parse(original);
 if(catalog.items.some(x=>x.revisionId===story.revisionId))throw Error('MEDIA_REVISION_EXISTS');
 // Validate in an isolated directory before mutating the site repository.
 const temp=fs.mkdtempSync(path.join(process.env.TEMP??process.env.TMP??'/tmp','ivmova-media-'));
 try{const asset=path.join(temp,'public',image);fs.mkdirSync(path.dirname(asset),{recursive:true});fs.writeFileSync(asset,bytes,{flag:'wx'});resolvePublicationMedia(story,{repo:temp,catalog:{schemaVersion:1,items:[entry]}});}finally{fs.rmSync(temp,{recursive:true,force:true});}
 const destination=path.join(repo,'public',image);fs.mkdirSync(path.dirname(destination),{recursive:true});
 at=repo;for(const part of ['public','media','reviewed']){at=path.join(at,part);if(fs.lstatSync(at).isSymbolicLink())throw Error('MEDIA_INPUT_INVALID');}
 if(fs.existsSync(destination)){if(fs.lstatSync(destination).isSymbolicLink()||hash(fs.readFileSync(destination))!==s.assetSha256)throw Error('MEDIA_ASSET_CHANGED');}else fs.writeFileSync(destination,bytes,{flag:'wx'});
 if(fs.readFileSync(file,'utf8')!==original)throw Error('MEDIA_CATALOG_CHANGED');
 catalog.items.push(entry);fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');return {selection:'CUSTOM',image};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const [reviewFile,storyFile]=process.argv.slice(2);console.log(JSON.stringify(importMedia({reviewFile,storyFile})));}
