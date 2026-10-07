import {git,verifyGitLedgerHistory} from './publication-git-ledger.mjs';
const head=git(process.cwd(),['rev-parse','HEAD']);const ledger=verifyGitLedgerHistory(process.cwd(),head);
console.log('APPEND_ONLY_GIT_HISTORY_PASS records='+ledger.records.length);
