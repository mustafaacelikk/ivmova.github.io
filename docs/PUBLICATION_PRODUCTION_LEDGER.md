# Git production ledger, provenance ve Pages reconciliation
6C-5, 2026-10-07. Git'e yazan deployment worker yoktur. Production ledger production/ledger.json canonical dosyası ve main Git geçmişidir. Pilot üzerinde yalnız boş genesis bulunur; production state uydurulmadı.

## Otorite ve CAS
Her event kapalı production-ledger-v1 schema'sına uyar; generation, previousRecordSha256 ve recordSha256 checksum zinciri vardır. Canonical JSON key sırası/LF, duplicate key ve unknown field reddi korunur.
Her PREPARED event release/publication ID, manifest bytes/hash, receipt/provenance, contracta bağlı bundle/public/deploy tree hashes, source commit, expected Git base, previous release/tree, counters, timestamp, RELEASE/ROLLBACK, rollback target, producer identity ve metadata-only safety fences taşır.
Git history verifier first-parent snapshot'ların genesis'ten itibaren aynı canonical prefix'i koruduğunu kontrol eder. Geçmiş satırın hashleri yeniden hesaplanarak değiştirilmesi de önceki Git snapshot'ına karşı reddedilir. Ledger silinmesi, truncation, reordering ve generation atlama reddedilir.
Expected Git base gerçek HEAD ile eşleşir; PREPARED kaydın base commit'indeki ledger tam olarak onun öncesindeki prefix olmalıdır. Review edilen PR non-fast-forward/expected-parent kontrolüyle main'e alınır. Stale hazırlık yeniden üretilir; eski dosya HEAD'e zorla kopyalanmaz.
Yerel test iki async hazırlık + expected-parent authority modelidir; gerçek remote Git yarışında commit/push yapılmadı. Git'in review/protection/ruleset ayarları güven modelinin şartıdır. Force push veya privileged admin bypass'a direnç iddia edilmez.

## Durumlar gerçeği nasıl ifade eder
PREPARED intent/reservation'dır; DEPLOYED veya RECONCILED anlamına gelmez. Tek pending reservation yeni RELEASE'i bloke eder.
Workflow ledger yazamaz. Deployment/reconciliation sonucu metadata-only deployment-outcome artifactıdır; operatör outcome taslağını ayrıca PR ile append eder.
DEPLOYED, RECONCILED ve FAILED aynı release kimliğinin yeni immutable event'leridir; eski PREPARED satırı değişmez. Normal HEAD yalnız RECONCILED event'inde ilerler.
FAILED/NOT_DEPLOYED önceki verified head'i korur; bunun kanıtı deployment başlamadığının gerçek kontrolüdür, HTTP timeout buna kanıt değildir.
FAILED/UNKNOWN pending kalır. Yanlış marker/runner kaybında yeni RELEASE veya otomatik ikinci deploy yoktur.
Manuel recovery ROLLBACK, yalnız FAILED/UNKNOWN reservation ID/tree'sini expectedPrevious olarak ve en güncel generation/Git base'i alır. Hedef daha önce RECONCILED bundle olmalı; başarısız release'in safety fences'i korunur. Runtime eski Pages deployment status succeed değilse recovery rollback başlatmaz. Bu yeni kayıt geçmiş başarısızlığı silmez; normal approval/concurrency/provenance/reconciliation yolunu kullanır.

## Promotion taslağı
node scripts/publication-git-ledger.mjs prepare request.json DRAFT_DIRECTORY
Request canonical JSON: repo, bundle, releaseId, expectedGitBase, expectedPrevious {releaseId,treeHash}, expectedGeneration, createdAt, producer; rollback için releaseType=ROLLBACK ve rollbackTarget.
producer: repository=mustafaacelikk/ivmova.github.io, workflowPath=.github/workflows/publication-release-producer.yml, runId, runAttempt, sourceCommit, artifactId, artifactDigest, trustMode.
Script Git/base/head ve bundle zincirini doğrular; ledger.json, release-marker.json ve summary.json taslağı verir. Commit/push/stage veya tracked ledger overwrite yapmaz. Tracked empty genesis main'de ayrı reviewed commit olarak bulunmadan release hazırlığı yapılamaz.
Aynı kimlik/hash/input/base replay event eklemez; farklı hash conflict'tir. Expected Git base kontrolü replay için de korunur; stale base ile tekrar deneme reddedilir. Yeni main commit'inde kayıt zaten varsa read-only verify ile kontrol edin, eski base'i sahte biçimde HEAD kabul etmeyin.
Outcome: node scripts/publication-git-ledger.mjs outcome request.json DRAFT_DIRECTORY. Request: repo, expectedGitBase, expectedGeneration, outcome (indirilen canonical metadata dosyasının yolu). Script original deploy commit ledger'ını ve PR base ancestry'sini doğrular, yeni ledger taslağını üretir. Outcome metadata elle başarılı gibi işaretlenmez; reviewers Pages/workflow durumu ve sonucu doğrular.

## Hash ve producer güven zinciri
Reviewed publication FULL input → manifest/receipt/removal proofs → pinned contract checksum manifest → 6C provenance → public inventory/tree → immutable bundle tree → reviewed ledger → GitHub producer run/artifact metadata → SHA-256 outer ZIP → safe inner tar → marker eklenmiş deploy tree → aynı workflow'un Pages artifactı.
Production producer yalnız main üzerinde reviewed production/input/<publication UUID> FULL snapshot'ını derler. Gerçek input bu turda eklenmedi. Supabase veya DB erişmez; fresh hosted workspace'te sabit https://ivmova.com build profili kullanır. Bu origin yalnız static URL üretimi içindir.
Download'da repository, head repository, main branch, workflow path, run ID/attempt, workflow_dispatch/completed/success, source commit ancestry, artifact ID/name/time/digest/expiration kontrol edilir. Tek allowlist edilmiş HTTPS GitHub storage redirect'ine token forward edilmez; outer ZIP byte SHA eşitliği zorunludur. Safe extraction link/traversal/duplicate/special file reddeder.
GITHUB_RUN_DIGEST, reviewed Git/main + GitHub API artifact/run kimliği güvenidir; kriptografik attestation değildir. GITHUB_ATTESTATION seçilirse gh attestation verify repository/signer-workflow/source-digest/source-ref ve hosted runner policy'yle zorunlu geçmelidir; sessiz fallback yoktur. Optional producer attestation job'u minimum contents:read/id-token:write/attestations:write kullanır; build-only bu izinleri istemez. Plan/runner/CLI desteği bu turda denenmedi. [Resmi attestation verification](https://cli.github.com/manual/gh_attestation_verify)
GitHub ZIP digest API alanı ve run metadata resmi endpoint sözleşmesine dayanır. [Artifact API](https://docs.github.com/en/rest/actions/artifacts), [Workflow runs API](https://docs.github.com/en/rest/actions/workflow-runs)

## Public marker ve tree hesabı
Yalnız .well-known/ivmova-release.json eklenir: releaseId, treeHash, sourceCommit, generatedAt, contractVersion. Actor/e-posta/manifest/receipt/internal provenance/journal/lock yoktur.
treeHash, marker eklenmeden önceki verified public tree'dir. Marker bunu taşıdığı için kendisini hashleyen döngü kurulmaz. markerSha256 ayrı; deployTreeSha256 marker dahil public inventory'dir. Ledger bütün bu değerleri bağlar. Marker tam siteyi uzaktan yeniden hashlediğini kanıtlamaz; taze kimlik kontrolüdür. Kritik URL/asset byte hash probes runbook'ta ayrıca gerekir.

## Workflow fencing ve başarısızlık
Production yalnız workflow_dispatch, main ve expected commit/release/public tree hash. Checkout inputtan bağımsız github.sha'ya sabittir. Main API HEAD dispatch SHA ile eşleşmelidir; environment onayından sonra yeniden okunur. Tek ivmova-production-pages concurrency grubu, cancel-in-progress:false.
Validate/build aşaması artifactı tekrar doğrular ve out'u materialize eder; minimum read-only izinlidir. Deploy contents:read/actions:read/deployments:read/pages:write/id-token:write; github-pages environment; repo/ledger write yoktur.
Pages deployment'ın commit SHA ile durumu sorgulanabilir. Mevcut aynı-commit deployment veya önceki aynı-commit run, rerun attempt>1 durumunda ikinci deploy reddedilir; reconciliation gerekir. [Pages API](https://docs.github.com/en/rest/pages/pages)
Git main güncellemesi ile Pages çağrısı tek atomik transaction değildir. Güvence, reviewed reservation, unresolved release'in yeni RELEASE'i bloke etmesi, bütün deployment writer'larının aynı concurrency kullanması ve approval sonrası fresh main/previous head kontrolüne dayanır. Başka writer/admin bypass bu model dışında kalır.

## Reconciliation ve rollback
HTTPS sabit production origin; redirect yok. Marker query her probe için farklı; en çok 4 attempt (kütüphane hard cap 6), timeout 2s (hard cap 5s), 4096 byte; canonical JSON/schema ve tüm marker alanlarının eşitliği zorunlu.
Pages status succeed + marker match olmadan workflow başarılı sayılmaz. API failure/invalid JSON/mismatch/timeout/oversize/redirect başarısızlıktır; otomatik rollback/redeploy yoktur. Raw actor/API cevabı veya credential outcome'a girmez.
Canlı ağ sadece explicit GitHub Actions runtime CLI modlarında bulunur; yerel test injection loopback mock'tur. Bu turda canlı siteye veya görevdeki GitHub depolarının API'lerine istek yapılmadı; yalnız GitHub resmi dokümantasyonu ve action kaynak sözleşmesi incelendi.
Rollback yeni release UUID ile verified eski bundle'ı tekrar kullanır; önceki kayıt/marker/provenance yeniden yazılmaz. Yeni marker ve deploy tree hazırlanır. Latest REMOVE/RETRACT safety fences'in dirilmesi reddedilir. Bundle retention/expiry operatör sorumluluğudur; expire olmuş artifact geçerli rollback kaynağı sayılmaz.
