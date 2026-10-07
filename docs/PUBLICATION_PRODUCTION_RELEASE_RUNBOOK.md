# Production release runbook — 6C-5
Tarih: 2026-10-07. Bu dosya deploy onayı değildir. Kontrollü build-only denemesine yerel olarak hazır; ilk production deploy'a henüz hazır değil.

## İlk yayın hazırlığı
Önce GITHUB_PAGES_ENVIRONMENT_SETUP.md ve PUBLICATION_PRODUCTION_LEDGER.md okunur. Bu turda GitHub ayarı veya main değiştirilmedi; workflow tetiklenmedi, canlı siteye istek yapılmadı. Workflow dosyaları yalnız pilot çalışma ağacında güncellendi.
Boş canonical production/ledger.json genesis'i reviewed main geçmişinde ayrı bir başlangıç commit'i olarak bulunmalı. Bu çalışma yalnız pilot üzerinde taslak içerir.
Required reviewer/prevent-self-review/main-only environment, main PR review/append-only required check/force-push yasağı ve tek deployment writer doğrulanır. Runtime bu environment kurallarını read-only kontrol eder; mevcut planda bulunmuyorsa production bloke olur.
Kontrollü pilot build-only Actions run'ı ile Linux/Node22/npm ci/workflow syntax ve sentetik testler doğrulanır. Bu turda yalnız Windows/Node24 yerel eşdeğer çalıştırıldı.

## Bundle üretimi ve review
Gerçek release input'u yalnız reviewed main'deki production/input/<publication UUID> FULL snapshot'ından gelebilir; gerçek input bu turda eklenmedi.
Reviewed producer workflow manual/main çalışır, manifest SHA doğrular, production static build ve immutable bundle/tar oluşturur. Optional attestation job'u istenirse unsupported/failure run'ı başarılı sayılmaz.
Bundle'a producer run/attempt/artifact ID, exact GitHub digest, source SHA ve trustMode bağlanır. GITHUB_RUN_DIGEST açıkça imzasız GitHub kimlik güvenidir; GITHUB_ATTESTATION zorunlu signer/source/subject doğrulaması gerektirir.
Promotion prepare script'i expected Git base/current generation/previous head, bütün hashler ve latest safety fences ile taslak oluşturur; commit/push yapmaz.
Taslak ledger append'i PR ile review edilir. Stale PR yeni main'e göre yeniden hazırlanır. Ledger snapshot/prefix check zorunludur; eski satır düzenlenmez.

## Manuel production promotion
Workflow dispatch yalnız reviewed main HEAD için expected_commit, expected_release ve expected_tree inputlarıyla yapılır. Yapılmadan önce yeni explicit kullanıcı yayın yetkisi gerekir.
Validate sadece read-only token ile committed ledger/Git geçmişi/producer identity/digest/archive/bundle/marker/deploy tree'yi doğrular. Pages artifact yalnız verified runner TEMP out'tan oluşur.
github-pages environment approval sonrası main HEAD ve previous release tekrar kontrol edilir. Deploy job repo yazamaz; yalnız contents:read/pages:write/id-token:write.
Tek production concurrency group cancel-in-progress:false. Aynı commit için Pages attempt veya prior production run varsa rerun ikinci deploy başlatmaz; reconciliation gerekir.
Başka deployment writer, force push veya admin bypass ile bu Git+workflow modeli geçerli sayılmaz.

## Reconciliation
Pages API status succeed ve bounded fresh HTTPS marker eşitliği olmadan production başarılı sayılmaz. Marker yalnız releaseId/treeHash/sourceCommit/generatedAt/contractVersion.
Marker öncesi public tree hash ve marker dahil deployTree hash ledger'da ayrı tutulur. Marker identity gözlemidir; remote bütün tree'nin byte doğrulaması değildir.
Metadata-only outcome artifactı ayrı reviewed PR ile DEPLOYED/RECONCILED/FAILED event'i olarak append edilir. Workflow ledger yazmaz.
Postdeploy probes: root; kategori/enerji/; sitemap.xml; custom 404; her REMOVE route 404 + sitemap/list/category ve static payload yokluğu; RETRACT 200 + uyarı + sitemap/list dışı; seçilmiş HTML/JS/SVG byte hashleri. Cache-busting probe ve normal URL ayrı kontrol edilir.
GitHub Pages CDN/browser cache purge varsayılmaz. Local no-cache/immutable test header'ı Pages garantisi değildir. CNAME ivmova.com ve layout noindex/nofollow kararı production öncesi ayrıca review edilir.

## Rollback A — deploy tamamlanmadan
Build/bundle/source/ledger/approval gate hatasında Pages deploy başlamaz; önceki verified production korunur.
Ledger PREPARED state kendiliğinden success/failed'e çevrilmez. Deploy hiç başlamadığı Pages/workflow kanıtıyla doğrulanırsa review edilen FAILED/NOT_DEPLOYED event'i reservation'ı kapatır. Timeout veya runner kaybı tek başına bu kanıt değildir.

## Rollback B — hatalı deploy tamamlandıktan sonra
Önceki RECONCILED immutable bundle, provenance ve GitHub producer/artifact zinciri yeniden doğrulanır. Artifact expired ise kaynak kabul edilmez.
Normal durumda expectedPrevious son RECONCILED release ID/tree'sidir. FAILED/UNKNOWN son attempt için manual recovery rollback, tam o failed reservation ID/tree + latest generation/Git base'i alır; Pages status succeed olmadan runtime başlatmaz.
Hedef old verified bundle latest REMOVE/RETRACT fence'lerini diriltemez. Uyumsuz eski bundle kör rollback alamaz; fence uyumlu yeni doğrulanmış recovery release gerekir.
Yeni rollback UUID/event ve marker/deploy tree; önceki provenance/records değiştirilmez. Aynı approval, concurrency, source/hash ve reconciliation gate'leri uygulanır. Elle dosya geri kopyalama veya otomatik rollback yoktur.
Same rollback replay yeni ledger event üretmez; stale base/head/generation reddedilir. Marker mismatch'e rağmen eski paketi otomatik tekrar deploy etmek yasaktır.

## Runner/power-loss
Hosted runner kalıcı ledger değildir; authoritative history Git/main'dir. Local rename, Git ref update ve Pages deployment tek atomik transaction değildir.
PREPARED reservation ve outstanding failure yeni RELEASE'i bloke eder. Deploy sonrası belirsizlikte Pages status/workflow sonucu/fresh marker reconciliation gerekir.
Outcome yazılamadan runner ölürse Git PREPARED'i korunur; operatör status kanıtını toplar ve reviewed FAILED/UNKNOWN veya RECONCILED event taslağı hazırlar. Aynı workflow retry deploy'u tekrarlamaz.
Bu turda gerçek runner power loss, Linux CI, environment approval, signed attestation, API/Pages/cache/custom domain ve Git remote CAS yarışı çalıştırılmadı.
