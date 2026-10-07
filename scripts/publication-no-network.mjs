// Next compiler IPC may use loopback. External network is forbidden.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
const loopback=host=>['localhost','127.0.0.1','::1','[::1]'].includes(host);
const deny=()=>{console.error('EXTERNAL_NETWORK_BLOCKED');throw new Error('EXTERNAL_NETWORK_DISABLED');};
function hostOf(arg){if(typeof arg==='string'||arg instanceof URL){try{return new URL(arg).hostname;}catch{return null;}}return arg?.hostname??arg?.host??'localhost';}
for(const mod of [http,https])for(const name of ['request','get']){const original=mod[name];mod[name]=function(...args){if(!loopback(hostOf(args[0])))return deny();return original.apply(this,args);};}
const fetch=globalThis.fetch;globalThis.fetch=function(input,init){if(!loopback(hostOf(input?.url??input)))return deny();return fetch(input,{...init,redirect:'error'});};
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const opt=Array.isArray(args[0])?args[0][0]:args[0];if(typeof opt==='number'){if(!loopback(typeof args[1]==='string'?args[1]:'localhost'))return deny();}else if(opt&&typeof opt==='object'&&opt.port!==undefined&&!loopback(opt.host??'localhost'))return deny();return connect.apply(this,args);};
