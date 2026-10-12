import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=()=>{throw Error('PUBLICATION_MEDIA_INVALID');};
const shape=(x,k)=>x&&Object.getPrototypeOf(x)===Object.prototype&&Object.keys(x).sort().join(',')===k.sort().join(',');
export function resolvePublicationMedia(story,{repo=root,catalog}={}){
 catalog??=JSON.parse(fs.readFileSync(path.join(repo,'app/publication-media.json'),'utf8'));
 if(!shape(catalog,['schemaVersion','items'])||catalog.schemaVersion!==1||!Array.isArray(catalog.items)||catalog.items.length>10000)fail();
 const ids=new Set();
 for(const r of catalog.items){
  if(!shape(r,['storyId','revisionId','contentHash','image','imageSha256','alt','caption','credit','rights','sourceUrl','licenseUrl','aiTool','sourceArticleImage','editorApproved'])||!/^([0-9a-f]{8})-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(r.storyId)||!/^([0-9a-f]{8})-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(r.revisionId)||!/^[0-9a-f]{64}$/.test(r.contentHash)||ids.has(r.revisionId)||r.sourceArticleImage!==false||r.editorApproved!==true)fail();
  ids.add(r.revisionId);
 }
 const selected=catalog.items.find(x=>x.revisionId===story.revisionId);
 if(!selected){
  const file=path.join(repo,'public/publication-default.svg');
  if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile())fail();
  return {image:'/publication-default.svg',imageSource:'IVMOVA',imageAlt:'IVMOVA yayın görseli',imageCaption:'IVMOVA marka görseli; olay fotoğrafı değildir.',imageMethod:'brand_default'};
 }
 const r=selected;
 if(r.storyId!==story.storyId||r.contentHash!==story.contentHash||!/^\/media\/reviewed\/[0-9a-f]{64}\.(png|jpg|jpeg|webp)$/.test(r.image)||!/^[0-9a-f]{64}$/.test(r.imageSha256)||!r.image.includes(r.imageSha256)||!['OWN','CC0','PUBLIC_DOMAIN','CC_BY','LICENSED','GENERATED'].includes(r.rights))fail();
 for(const key of ['alt','caption','credit'])if(typeof r[key]!=='string'||!r[key].trim()||r[key].length>500||/[\u0000-\u001f]/.test(r[key]))fail();
 if(['CC0','PUBLIC_DOMAIN','CC_BY','LICENSED'].includes(r.rights)){
  for(const key of ['sourceUrl','licenseUrl']){let u;try{u=new URL(r[key]);}catch{fail();}if(u.protocol!=='https:'||u.username||u.password)fail();}
  // A news source's image cannot be relabelled as an independently licensed stock image.
  if(story.sources.some(s=>new URL(s.url).hostname===new URL(r.sourceUrl).hostname))fail();
 }else if(r.sourceUrl!==null||r.licenseUrl!==null)fail();
 if(r.rights==='GENERATED'?(typeof r.aiTool!=='string'||!r.aiTool.trim()||r.aiTool.length>100):r.aiTool!==null)fail();
 const file=path.join(repo,'public',r.image.slice(1));
 let at=repo;for(const part of ['public',...r.image.slice(1).split('/')]){at=path.join(at,part);if(fs.lstatSync(at).isSymbolicLink())fail();}
 const size=fs.statSync(file).size;if(size<12||size>8*1024*1024)fail();
 const b=fs.readFileSync(file);if(hash(b)!==r.imageSha256)fail();
 const ext=path.extname(file);if(!(ext==='.png'&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||['.jpg','.jpeg'].includes(ext)&&b[0]===255&&b[1]===216&&b.at(-2)===255&&b.at(-1)===217||ext==='.webp'&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'))fail();
 return {image:r.image,imageSource:r.credit,imageAlt:r.alt,imageCaption:r.caption,imageMethod:r.rights==='GENERATED'?'ai_generated':'reviewed_asset',imageAiTool:r.aiTool??undefined};
}
