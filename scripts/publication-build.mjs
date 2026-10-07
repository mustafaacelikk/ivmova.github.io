import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrent, normalize, canonicalBytes, sha256 } from './publication-consumer.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function prepareSiteData() {
  const mode=process.env.NEXT_PUBLIC_IVMOVA_CONTENT_MODE??'demo';
  if(!['demo','publication'].includes(mode))throw new Error('CONTENT_MODE');
  if(mode==='publication') {const origin=process.env.NEXT_PUBLIC_IVMOVA_SITE_ORIGIN;let u;try{u=new URL(origin);}catch{throw new Error('STAGING_ORIGIN');}const production=process.env.IVMOVA_BUILD_PROFILE==='reviewed-production'&&origin==='https://ivmova.com';if(!production&&!['http:','https:'].includes(u.protocol)||!production&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.username||u.password||u.pathname!=='/')throw new Error('STAGING_ORIGIN');}
  const items=mode==='publication'?normalize(loadCurrent(process.env.IVMOVA_PUBLICATION_STORE).state.stories):[];
  const target=path.join(repo,'app','site-news.generated.json');const bytes=canonicalBytes({mode,items});
  if(!fs.existsSync(target)||!fs.readFileSync(target).equals(bytes))fs.writeFileSync(target,bytes);
  return mode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) prepareSiteData();

export function deterministicBuildId() {
  const files=[];
  function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const full=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('BUILD_SOURCE_LINK');if(e.isDirectory())walk(full);else if(e.isFile())files.push({path:path.relative(repo,full).split(path.sep).join('/'),sha256:sha256(fs.readFileSync(full))});}}
  for(const name of ['app','public','scripts','contracts'])walk(path.join(repo,name));
  for(const name of ['package.json','package-lock.json','next.config.ts','tsconfig.json','postcss.config.mjs'])files.push({path:name,sha256:sha256(fs.readFileSync(path.join(repo,name)))});
  files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  return sha256(canonicalBytes({version:1,files,mode:process.env.NEXT_PUBLIC_IVMOVA_CONTENT_MODE??'demo',origin:process.env.NEXT_PUBLIC_IVMOVA_SITE_ORIGIN??'https://ivmova.com',basePath:process.env.NEXT_PUBLIC_BASE_PATH??''}));
}
