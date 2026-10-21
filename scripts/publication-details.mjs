// Okura not ve alt kategori: yayın paketinin dışında, revizyona bağlı katalog. Editorial "Yayına al" bunu yayin-verisi
// dalına media/publication-details.json olarak yazar; sade yayın derlemesi app/publication-details.json içine kopyalar.
// Kayıt yalnız haberin güncel revizyonuyla eşleşirse kullanılır; eski revizyona ait kayıt yok sayılır.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=()=>{throw Error('PUBLICATION_DETAILS_INVALID');};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
const shape=(x,k)=>x&&Object.getPrototypeOf(x)===Object.prototype&&Object.keys(x).sort().join(',')===[...k].sort().join(',');
const text=(x,max)=>typeof x==='string'&&x.length>=1&&x.length<=max&&x===x.trim()&&!/[\u0000-\u001f\u007f]/.test(x);
export function validateDetailsCatalog(c){
 if(!shape(c,['schemaVersion','runId','items'])||c.schemaVersion!==1||c.runId!==null&&!uuid(c.runId)||!Array.isArray(c.items)||c.items.length>10000)fail();
 const stories=new Set();
 for(const r of c.items){
  if(!shape(r,['storyId','revisionId','subcategory','note'])||!uuid(r.storyId)||!uuid(r.revisionId)||stories.has(r.storyId))fail();stories.add(r.storyId);
  if(r.subcategory!==null&&!text(r.subcategory,80))fail();
  if(r.note!==null&&(!shape(r.note,['kind','text'])||!['UPDATE','CORRECTION'].includes(r.note.kind)||!text(r.note.text,500)))fail();
  if(r.subcategory===null&&r.note===null)fail();
 }
 return c;
}
export function readDetailsCatalog(repo=root){
 const file=path.join(repo,'app/publication-details.json');if(!fs.existsSync(file))return {schemaVersion:1,runId:null,items:[]};
 return validateDetailsCatalog(JSON.parse(fs.readFileSync(file,'utf8')));
}
// NewsItem fields: subcategory is always present ('' when none); readerNote only for an edited revision that has one.
export function resolvePublicationDetails(story,{repo=root,catalog}={}){
 catalog=validateDetailsCatalog(catalog??readDetailsCatalog(repo));
 const r=catalog.items.find(x=>x.storyId===story.storyId&&x.revisionId===story.revisionId);if(!r)return {subcategory:''};
 if(r.note&&r.note.kind!==story.revisionType)fail();
 return r.note?{subcategory:r.subcategory??'',readerNote:{...r.note}}:{subcategory:r.subcategory??''};
}
