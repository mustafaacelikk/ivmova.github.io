import fs from 'node:fs';
import {canonicalBytes,parseInput} from './publication-contract.mjs';
export const equal=(a,b)=>canonicalBytes(a).equals(canonicalBytes(b));
export const fail=code=>{throw Error(code);};
export function readCanonical(file){const b=fs.readFileSync(file);const value=parseInput(b);if(!b.equals(canonicalBytes(value)))fail('NON_CANONICAL');return value;}
const schemas=new Map();
export function validate(name,value){
 if(!schemas.has(name))schemas.set(name,JSON.parse(fs.readFileSync(new URL('../contracts/'+name+'.schema.json',import.meta.url),'utf8')));
 function check(s,v){
 if(s.anyOf)return s.anyOf.some(x=>check(x,v));
 if(s.const!==undefined&&!equal(s.const,v))return false;
 if(s.enum&&!s.enum.some(x=>equal(x,v)))return false;
 if(s.type==='null')return v===null;
 if(s.type==='string'){if(typeof v!=='string'||!v.isWellFormed()||/[\u0000-\u001f\u007f]/.test(v))return false;if(s.pattern&&!new RegExp(s.pattern).test(v)||s.maxLength&&v.length>s.maxLength)return false;if(s.format==='uuid'&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v))return false;if(s.format==='date-time'&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v))return false;}
 if(s.type==='integer'&&(!Number.isSafeInteger(v)||v<(s.minimum??0)))return false;
 if(s.type==='array'){if(!Array.isArray(v)||v.length>(s.maxItems??Infinity)||!v.every(x=>check(s.items,x)))return false;}
 if(s.type==='object'){if(!v||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||s.required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!Object.hasOwn(s.properties,k)))return false;return Object.entries(s.properties).every(([k,p])=>check(p,v[k]));}
 return true;}
 if(!check(schemas.get(name),value))fail('SCHEMA_'+name);return value;
}
