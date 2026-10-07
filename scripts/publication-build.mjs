import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrent, normalize, canonicalBytes } from './publication-consumer.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function prepareSiteData() {
  const mode=process.env.NEXT_PUBLIC_IVMOVA_CONTENT_MODE??'demo';
  if(!['demo','publication'].includes(mode))throw new Error('CONTENT_MODE');
  if(mode==='publication') {const origin=process.env.NEXT_PUBLIC_IVMOVA_SITE_ORIGIN;let u;try{u=new URL(origin);}catch{throw new Error('STAGING_ORIGIN');}if(!['http:','https:'].includes(u.protocol)||!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.username||u.password||u.pathname!=='/')throw new Error('STAGING_ORIGIN');}
  const items=mode==='publication'?normalize(loadCurrent(process.env.IVMOVA_PUBLICATION_STORE).state.stories):[];
  const target=path.join(repo,'app','site-news.generated.json');const bytes=canonicalBytes({mode,items});
  if(!fs.existsSync(target)||!fs.readFileSync(target).equals(bytes))fs.writeFileSync(target,bytes);
  return mode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) prepareSiteData();
