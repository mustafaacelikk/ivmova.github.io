import {verifyBundle} from './publication-release.mjs';
const r=verifyBundle(process.argv[2],{runId:process.env.EXPECTED_RUN,manifestSha256:process.env.EXPECTED_MANIFEST,receiptSha256:process.env.EXPECTED_RECEIPT});
if(r.metadata.provenanceSha256!==process.env.EXPECTED_PROVENANCE)throw Error('EXPECTED_PROVENANCE');
console.log('BUNDLE_CHAIN_VERIFIED; NOT DEPLOY AUTHORIZATION');
