# Production release runbook — 6C-5
Güncelleme: 2026-10-08. Bu dosya deploy onayı değildir. Normal publication production yolu PREPARED release gerektirir; boş ledger ile publication yayımlanmaz. Aşağıdaki ayrı bootstrap yolu yalnız mevcut demo site altyapısının ilk yayını içindir.

## Tek kullanımlık demo bootstrap
Workflow: **One-time reviewed demo Pages bootstrap** (`bootstrap-demo-pages.yml`), yalnız workflow_dispatch. Publication producer/bundle/input/fixture/ledger event üretmez; mevcut reviewed main demo içeriğini `NEXT_PUBLIC_IVMOVA_CONTENT_MODE=demo`, root base path ve https://ivmova.com ile npm ci + production build kullanarak yayımlar. Demo haberler, demo uyarıları ve mevcut noindex/layout kararı değişmez. Yalnız ek metadata `/.well-known/ivmova-demo-bootstrap.json` receipt'idir; publication marker'ı değildir.

Deploy öncesi: bu değişiklikleri PR ile reviewed main'e alın; staging ve **ledger** required check'leri, güncel branch, conversation resolution ve force-push/delete yasağı korunsun. Environment required reviewer yalnız mustafaacelikk, prevent self-review=false ve tek Branch main; secrets/variables boş. Pages GitHub Actions / ivmova.com / HTTPS. Başka Pages writer bulunmasın. Main HEAD'in tam SHA'sını alın; eski infrastructure checkpoint SHA'sını kullanmayın.

GitHub Actions → **One-time reviewed demo Pages bootstrap** → Run workflow → branch **main**. Input **expected_commit** = güncel reviewed main HEAD'in tam 40 karakter SHA'sı; **confirm_demo_bootstrap** = tam olarak **BOOTSTRAP_DEMO_ONCE**. Yeni açık yayın yetkisi olmadan dispatch yapmayın. Build/read-only validate tamamlandıktan sonra github-pages environment için **Review deployments → Approve and deploy**; onaylayan tek operatör mustafaacelikk olabilir. Approval sonrası main SHA, boş ledger, önceki Pages attempt ve iki marker'ın yokluğu tekrar kontrol edilir. Deploy job yalnız contents:read/pages:write/id-token:write; iki production yolu aynı ivmova-production-pages concurrency grubunda, cancel-in-progress=false.

Yanlış ref/event/SHA, run_attempt != 1, dolu ledger, önceki herhangi bir bootstrap run'ı (başarısız/iptal dahil), mevcut bootstrap/publication marker'ı veya aynı commit'in Pages attempt'i fail-closed reddedilir. Bu yol ilk dispatch ile tüketilir: **Re-run jobs / yeni bootstrap dispatch / geçmiş run veya marker silerek yeniden açma yoktur.** Sıfırlanmış workflow geçmişi ya da kaldırılmış marker, bu güvenlik modelinin dışında idari bypass'tır; branch/Pages yazma yetkileri buna izin verecek şekilde kullanılmaz. Hata veya belirsizlikte outcome ve Pages durumunu manuel inceleyin; otomatik retry deploy/rollback yok. Normal publication genesis kontrolü ayrı bootstrap receipt'ini release saymaz.

Deploy sonrası bounded reconciliation (en çok 6 deneme, istek başına timeout ve body limit): Pages status=succeed; normal URL ve cache-busting HTTPS root, enerji kategori, mevcut demo haber, sitemap, SVG, custom 404 ve bootstrap receipt byte hashleri; publication marker 404. Remote tüm tree için atomik doğrulama/cache purge garantisi yoktur. **demo-bootstrap-outcome-<run>-1** artifact'ında RECONCILED olmadan başarı ilan etmeyin; UNKNOWN durumunda yeniden deploy etmeyin. Tarayıcıda demo uyarıları ve haber/kategori rotalarını da kontrol edin. Bu outcome production ledger'a taşınmaz; ilk gerçek publication için aşağıdaki producer/PREPARED/reconciliation sözleşmesi aynen geçerlidir.

## İlk yayın hazırlığı
Önce GITHUB_PAGES_ENVIRONMENT_SETUP.md ve PUBLICATION_PRODUCTION_LEDGER.md okunur. Boş canonical production/ledger.json genesis'i reviewed main geçmişinde bulunur. Linux build-only Actions kontrolü başarılıdır; production deploy yapılmamıştır.
Required reviewer mustafaacelikk / prevent-self-review=false / main-only environment, main PR/append-only required check/force-push yasağı doğrulanır. Runtime environment kurallarını read-only kontrol eder. İzinli bootstrap dışında normal publication güvenlik kapıları bypass edilemez.

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
Bu bootstrap hazırlığında hosted runtime, gerçek runner power loss, environment approval, signed attestation, API/Pages/cache/custom domain ve Git remote CAS yarışı çalıştırılmadı. Önceki Linux build-only sonucu başarılıdır; bu turdaki doğrulama yerel test ve demo production build'idir.
