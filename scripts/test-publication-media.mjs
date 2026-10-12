import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {resolvePublicationMedia} from './publication-media.mjs';
import {importMedia} from './import-publication-media.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ivmova-site-media-test-'));let checks=0;const pass=f=>{f();checks++;};const bad=f=>pass(()=>assert.throws(f));
try{
 fs.mkdirSync(path.join(temp,'public/media/reviewed'),{recursive:true});fs.writeFileSync(path.join(temp,'public/publication-default.svg'),'<svg/>');
 const story={storyId:'8c3a02a8-6b13-4e5f-8f6c-73fe612bcbd2',revisionId:'e3e753e4-38e3-4e3b-b7e5-08168d3178ab',contentHash:'a'.repeat(64),sources:[{url:'https://news.example/article'}]};
 const call=items=>resolvePublicationMedia(story,{repo:temp,catalog:{schemaVersion:1,items}});
 pass(()=>assert.equal(call([]).image,'/publication-default.svg'));
 const bytes=Buffer.from('89504e470d0a1a0a00000000','hex'),digest=crypto.createHash('sha256').update(bytes).digest('hex'),image='/media/reviewed/'+digest+'.png';fs.writeFileSync(path.join(temp,'public',image),bytes);
 const entry={storyId:story.storyId,revisionId:story.revisionId,contentHash:story.contentHash,image,imageSha256:digest,alt:'Image',caption:'Representative image',credit:'IVMOVA',rights:'OWN',sourceUrl:null,licenseUrl:null,aiTool:null,sourceArticleImage:false,editorApproved:true};
 pass(()=>assert.equal(call([entry]).image,image));
 for(const patch of [{editorApproved:false},{sourceArticleImage:true},{contentHash:'b'.repeat(64)},{image:'/../image.png'},{imageSha256:'b'.repeat(64)},{rights:'GENERATED'},{alt:''},{extra:true}])bad(()=>call([{...entry,...patch}]));
 bad(()=>call([entry,entry]));
 pass(()=>assert.equal(call([{...entry,rights:'GENERATED',aiTool:'Example'}]).imageMethod,'ai_generated'));
 bad(()=>call([{...entry,rights:'CC0',sourceUrl:'https://news.example/image',licenseUrl:'https://stock.example/license'}]));
 pass(()=>assert.equal(call([{...entry,rights:'CC0',sourceUrl:'https://stock.example/image',licenseUrl:'https://stock.example/license'}]).image,image));
 const textStory={...story,headline:'Title',standfirst:'Summary',bodyMarkdown:'Body'};
 const textHash=crypto.createHash('sha256').update('Title\nSummary\nBody').digest('hex');
 const review={version:1,editorApproved:true,receipt:{operation:'approve_story',status:'PREPARED',storyId:story.storyId,revisionId:story.revisionId,contentHash:story.contentHash},selection:{version:1,selection:'CUSTOM',reviewedContentSha256:textHash,assetFile:path.join(temp,'public',image),assetSha256:digest,alt:entry.alt,caption:entry.caption,credit:entry.credit,rights:'OWN',sourceUrl:null,licenseUrl:null,aiTool:null,sourceArticleImage:false}};
 fs.mkdirSync(path.join(temp,'app'));fs.writeFileSync(path.join(temp,'app/publication-media.json'),JSON.stringify({schemaVersion:1,items:[]}));
 const reviewFile=path.join(temp,'review.json'),storyFile=path.join(temp,'story.json');fs.writeFileSync(storyFile,JSON.stringify(textStory));
 fs.writeFileSync(reviewFile,JSON.stringify({...review,editorApproved:false}));bad(()=>importMedia({reviewFile,storyFile,repo:temp}));
 fs.writeFileSync(reviewFile,JSON.stringify({...review,selection:{...review.selection,reviewedContentSha256:'b'.repeat(64)}}));bad(()=>importMedia({reviewFile,storyFile,repo:temp}));
 fs.writeFileSync(reviewFile,JSON.stringify(review));pass(()=>assert.equal(importMedia({reviewFile,storyFile,repo:temp}).image,image));
 bad(()=>importMedia({reviewFile,storyFile,repo:temp}));
 fs.writeFileSync(path.join(temp,'public',image),Buffer.alloc(12));bad(()=>call([entry]));
 console.log(JSON.stringify({result:'PASS',checks,networkCalls:0,productionDeploys:0}));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
