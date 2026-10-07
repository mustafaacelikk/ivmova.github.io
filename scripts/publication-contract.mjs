import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export class ExportError extends Error {
  constructor(code,message=code) { super(message); this.code = code; }
}
const fail = (code,message) => { throw new ExportError(code,message); };
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const cmp = (a,b) => a < b ? -1 : a > b ? 1 : 0;
function ordered(v) {
  if (Array.isArray(v)) return v.map(ordered);
  if (v !== null && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort(cmp).map(k=>[k,ordered(v[k])]));
  return v;
}
export const canonicalBytes = value => Buffer.from(JSON.stringify(ordered(value))+'\n','utf8');
const schemaFiles = ["public-story-export.schema.json","publication-export-input-v2.schema.json","publication-manifest-v2.schema.json","publication-export-receipt-v2.schema.json","publication-removal-proof-v2.schema.json"];
const schemas = Object.fromEntries(schemaFiles.map(name=>[name,JSON.parse(fs.readFileSync(path.join(repoRoot,'contracts','publication-v2',name),'utf8'))]));
const keywords = new Set(['$schema','$ref','$comment','title','type','const','enum','properties','required','additionalProperties','items','minItems','maxItems','uniqueItems','contains','minContains','maxContains','minimum','maxLength','pattern','format','allOf','anyOf','if','then','else']);
function inspect(s) {
  for (const k of Object.keys(s)) if (!keywords.has(k)) fail('UNSUPPORTED_SCHEMA');
  if(s.$ref && !Object.hasOwn(schemas,s.$ref)) fail('UNSUPPORTED_SCHEMA_REF');
  if(s.format && !['uuid','uri','date-time'].includes(s.format)) fail('UNSUPPORTED_SCHEMA_FORMAT');
  for (const child of Object.values(s.properties||{})) inspect(child);
  for (const k of ['items','contains','if','then','else']) if(s[k]) inspect(s[k]);
  for (const child of [...(s.allOf||[]),...(s.anyOf||[])]) inspect(child);
}
Object.values(schemas).forEach(inspect);
const pinned = {"public-story-export.schema.json":"3f02e6f7b0a07f56265c6f5af5596052619b487bcdd6f7e6f02f1c7707e7c3cb","publication-export-input-v2.schema.json":"2545d51d59d395f1707075677b4de826713f1bd48de7d5675ce04ffd42577d9b","publication-manifest-v2.schema.json":"f8321ec361b3b7ac7acd4024f0758385037a996736616e94bf20ee22a7f9769c","publication-export-receipt-v2.schema.json":"3390c4af1c7b851c7a16df5aac6b5ce86dbda6e55c0924a4ade1ab5c119121a5","publication-removal-proof-v2.schema.json":"94cc9246e593cc6b20202826dd2a096c40a55b4fa14b56ac134a0310732867a9"};
export function verifyContracts() { if (sha256(fs.readFileSync(path.join(repoRoot,'contracts','publication-v2','contract-manifest.json'))) !== '6c896f7fd0c1921555eee4a06a2ce8bcccbe5e01530308034639a4297d2cd473') fail('CONTRACT_MANIFEST_PIN'); for (const name of schemaFiles) if (sha256(fs.readFileSync(path.join(repoRoot,'contracts','publication-v2',name))) !== pinned[name]) fail('CONTRACT_PIN'); }
verifyContracts();
function dateTime(v) {
  const m=/^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/.exec(v);
  if(!m) return false;
  const [y,mo,d,h,mi,se]=m.slice(1,7).map(Number), leap=y%4===0 && (y%100!==0||y%400===0);
  return mo>=1 && mo<=12 && d>=1 && d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][mo-1] && h<24 && mi<60 && se<60 && (!m[7] || Number(m[8])<24 && Number(m[9])<60);
}
export function validateSchema(name,value) {
  if(!Object.hasOwn(schemas,name)) fail('UNSUPPORTED_SCHEMA_REF');
  function valid(s,v) {
    if(s.$ref && !valid(schemas[s.$ref],v)) return false;
    const obj=v!==null && typeof v==='object' && !Array.isArray(v);
    const types={object:obj && Object.getPrototypeOf(v)===Object.prototype,array:Array.isArray(v),string:typeof v==='string',integer:Number.isSafeInteger(v),null:v===null};
    if(s.type && !(Array.isArray(s.type)?s.type:[s.type]).some(t=>types[t])) return false;
    if('const' in s && JSON.stringify(v)!==JSON.stringify(s.const)) return false;
    if(s.enum && !s.enum.some(x=>JSON.stringify(x)===JSON.stringify(v))) return false;
    if(obj) {
      if(s.required?.some(k=>!Object.hasOwn(v,k))) return false;
      if(s.additionalProperties===false && Object.keys(v).some(k=>!Object.hasOwn(s.properties||{},k))) return false;
      for(const [k,c] of Object.entries(s.properties||{})) if(Object.hasOwn(v,k) && !valid(c,v[k])) return false;
    }
    if(typeof v==='string') {
      // Refuse NUL, malformed Unicode and non-printable controls. LF/tab are
      // allowed in original Markdown; CR is refused rather than normalized.
      if(/[\u0000-\u0008\u000B-\u001F\u007F]/u.test(v) || !v.isWellFormed()) return false;
      if(s.maxLength!==undefined && [...v].length>s.maxLength) return false;
      if(s.pattern && !new RegExp(s.pattern,'u').test(v)) return false;
      if(s.format==='uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)) return false;
      if(s.format==='date-time' && !dateTime(v)) return false;
      if(s.format==='uri') { try { const u=new URL(v); if(!['http:','https:'].includes(u.protocol) || !u.hostname || u.username || u.password || /\s/.test(v)) return false; } catch { return false; } }
    }
    if(typeof v==='number' && s.minimum!==undefined && v<s.minimum) return false;
    if(Array.isArray(v)) {
      if(s.minItems!==undefined && v.length<s.minItems || s.maxItems!==undefined && v.length>s.maxItems) return false;
      if(s.items && !v.every(x=>valid(s.items,x))) return false;
      if(s.uniqueItems && new Set(v.map(x=>canonicalBytes(x).toString())).size!==v.length) return false;
      if(s.contains) {const n=v.filter(x=>valid(s.contains,x)).length;if(n<(s.minContains??1)||n>(s.maxContains??Infinity))return false;}
    }
    if(s.allOf && !s.allOf.every(x=>valid(x,v))) return false;
    if(s.anyOf && !s.anyOf.some(x=>valid(x,v))) return false;
    if(s.if && !(valid(s.if,v) ? !s.then||valid(s.then,v) : !s.else||valid(s.else,v))) return false;
    return true;
  }
  return valid(schemas[name],value);
}

// Reject duplicate keys, which JSON.parse would otherwise silently discard.
export function parseInput(bytes) {
  let text;
  try { text=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes); } catch { fail('INPUT_UTF8'); }
  if(text.charCodeAt(0)===0xFEFF || bytes.length>16*1024*1024) fail('INPUT_ENCODING_OR_SIZE');
  let value;
  try {value=JSON.parse(text);} catch {fail('INPUT_JSON');}
  let at=0;
  const ws=()=>{while(/\s/.test(text[at]||'') && at<text.length)at++;};
  function string() { const start=at++; while(at<text.length) {if(text[at]==='\\'){at+=2;continue;}if(text[at++]==='"')break;} return JSON.parse(text.slice(start,at)); }
  function walk(depth=0) {
    if(depth>40)fail('INPUT_DEPTH'); ws();
    if(text[at]==='{') {
      at++;ws();const keys=new Set();if(text[at]==='}'){at++;return;}
      while(true){ws();const k=string();if(keys.has(k))fail('INPUT_DUPLICATE_KEY');keys.add(k);ws();at++;walk(depth+1);ws();if(text[at++]==='}')break;}
    } else if(text[at]==='[') {
      at++;ws();if(text[at]===']'){at++;return;}
      while(true){walk(depth+1);ws();if(text[at++]===']')break;}
    } else if(text[at]==='"') string();
    else {while(at<text.length && !/[\s,}\]]/.test(text[at]))at++;}
  }
  walk();return value;
}
export function contentHash(story) {
  // 5E RPC PostgreSQL JSONB text array uses comma-space separators.
  // Inputs must already be normalized; no silent correction is permitted.
  const values=['ivmova-story-content-v1',story.headline,story.standfirst,story.bodyMarkdown];
  return sha256(Buffer.from('['+values.map(x=>JSON.stringify(x)).join(', ')+']','utf8'));
}
export function checkText(v) {
  if(typeof v==='string' && /(?:postgres(?:ql)?:\/\/|https?:\/\/[^\s/]*\.supabase\.co|\b(?:sb_secret_|sb_publishable_|ghp_|github_pat_|sk-)[A-Za-z0-9_-]{8,}|eyJ[\w-]+\.[\w-]+\.[\w-]+|\b(?:password|token|api[_ -]?key|service[_ -]?(?:role|key)|connection[_ -]?string)\s*[:=])/i.test(v)) fail('PRIVATE_CONTENT');
  if(Array.isArray(v)) v.forEach(checkText);
  else if(v && typeof v==='object') Object.values(v).forEach(checkText);
}
export function safeArtifactPath(p) {
  if(typeof p!=='string' || p.length>500 || !/^[a-z0-9_-]+(\/[a-z0-9_-]+)*[.]json$/.test(p) || /[\u0000-\u0020\u007F]/u.test(p)) fail('UNSAFE_ARTIFACT_PATH');
  if(!/^stories\/(tr|en)\/[a-z0-9]+(-[a-z0-9]+)*[.]json$/.test(p)) fail('UNSAFE_ARTIFACT_PATH');
  return p;
}
