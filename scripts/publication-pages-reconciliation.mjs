import {setTimeout as delay} from 'node:timers/promises';
import {canonicalBytes,sha256,parseInput} from './publication-contract.mjs';
import {validate,equal,fail} from './publication-control-schema.mjs';
import {MARKER_PATH} from './publication-git-ledger.mjs';
export async function limitedBody(response,maxBytes){
 if(Number(response.headers.get('content-length'))>maxBytes)fail('RESPONSE_OVERSIZE');
 if(!response.body)fail('RESPONSE_EMPTY');const reader=response.body.getReader(),chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes)fail('RESPONSE_OVERSIZE');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks);
}
export function markerURL(origin,nonce){
 const u=new URL(origin);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.port&&u.port!=='443')fail('HTTPS_ORIGIN_REQUIRED');
 const result=new URL('/'+MARKER_PATH,u);result.searchParams.set('release_probe',nonce);return result;
}
// Test transport is injected only by tests. CLI/runtime never enables insecure origin.
export async function reconcileMarker({origin,expected,nonce,attempts=4,timeoutMs=2000,intervalMs=250,maxBytes=4096},fetchImpl=globalThis.fetch){
 validate('release-marker-v1',expected);if(typeof nonce!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(nonce)||!Number.isInteger(attempts)||attempts<1||attempts>6||!Number.isInteger(timeoutMs)||timeoutMs<10||timeoutMs>5000||!Number.isInteger(intervalMs)||intervalMs<0||intervalMs>1000||!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>4096)fail('POLL_LIMITS');
 let last='MARKER_UNAVAILABLE';
 for(let i=0;i<attempts;i++){
 const url=markerURL(origin,nonce+'_'+i),controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
 const response=await fetchImpl(url,{redirect:'manual',signal:controller.signal,headers:{Accept:'application/json','Cache-Control':'no-cache'}});
 if(response.status>=300&&response.status<400||response.redirected||response.url&&new URL(response.url).origin!==url.origin)fail('REDIRECT_REJECTED');
 if(response.status!==200){last='MARKER_HTTP_'+response.status;await response.body?.cancel();continue;}
 const bytes=await limitedBody(response,maxBytes),marker=validate('release-marker-v1',parseInput(bytes));
 if(!bytes.equals(canonicalBytes(marker)))fail('MARKER_NON_CANONICAL');
 if(!equal(marker,expected)){last='MARKER_MISMATCH';continue;}
 return {attempts:i+1,markerSha256:sha256(bytes)};
 }catch(e){if(controller.signal.aborted)last='MARKER_TIMEOUT';else throw e;}
 finally{clearTimeout(timer);if(i+1<attempts)await delay(intervalMs);}
 }
 fail(last+'_RECONCILIATION_REQUIRED');
}
