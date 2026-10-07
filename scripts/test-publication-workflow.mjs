// Static policy check for this deliberately small YAML subset, not a general YAML parser.
import fs from 'node:fs';import assert from 'node:assert/strict';
let assertions=0;const ok=v=>{assert.ok(v);assertions++;};
const production=fs.readFileSync(new URL('../.github/workflows/deploy-pages.yml',import.meta.url),'utf8');
const staging=fs.readFileSync(new URL('../.github/workflows/publication-build-only.yml',import.meta.url),'utf8');
for(const text of [production,staging]){ok(!text.includes('\t'));ok(text.includes('  workflow_dispatch:'));ok(!/^  (push|pull_request|schedule):/m.test(text));ok(!/supabase|service.role|secrets\./i.test(text));}
ok(production.includes('group: ivmova-production-pages'));ok(production.includes('cancel-in-progress: false'));
const validate=production.split('  validate:')[1].split('  deploy:')[0],deploy=production.split('  deploy:')[1];
ok(!/pages: write|id-token: write/.test(validate));ok(validate.includes('production-gate'));
ok(validate.indexOf('production-gate')<validate.indexOf('actions/upload-pages-artifact'));
ok(deploy.includes('if: ${{ false }}'));ok(deploy.includes('name: github-pages'));
ok(deploy.includes('contents: read')&&deploy.includes('pages: write')&&deploy.includes('id-token: write'));
ok(!/actions: write|contents: write|packages: write/.test(production));
ok(!/^  deploy:/m.test(staging));ok(!/uses:.*deploy-pages|uses:.*upload-pages-artifact|pages: write|id-token: write|environment:/m.test(staging));
for(const key of ['release_run_id','publication_run_id','manifest_sha256','receipt_sha256','provenance_sha256','previous_release_id','previous_provenance_sha256'])ok(production.includes('      '+key+':'));
console.log(JSON.stringify({result:'PASS',assertions,scope:'static YAML subset/policy; general parser not installed; no GitHub execution'}));
