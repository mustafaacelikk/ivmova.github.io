# Aşama 6C-5 — Distributed release doğrulama raporu
Tarih: 2026-10-07. **Gerçek GitHub Actions build-only doğrulaması başarılı (f2b4d88). İlk production deploy'a hazır değil.**

## Başlangıç kanıtları ve kapsam
Site pilot/6c2-site-consumer temizdi. HEAD = origin/pilot/6c2-site-consumer = checkpoint-production-release-readiness-v1^{commit} = 17cdddfcf6ef6ca281d03dc6aac7cd6bdafc097f.
Editorial main temiz, HEAD = origin/main = 335e006a411941c9f6b52e0b8a813b3b2fc6ded8. Editorial yalnız Git metadata ile salt okunur doğrulandı.
Mevcut 6C-4 consumer/lock/recovery/provenance/bundle zinciri korundu. Hiçbir gerçek haber/export/credential kullanılmadı.

## Değişen ve yeni dosyalar
Tracked değişen 8 dosya: .github/workflows/deploy-pages.yml, .github/workflows/publication-build-only.yml, docs/PUBLICATION_PRODUCTION_RELEASE_RUNBOOK.md, package.json, scripts/publication-build-only-staging.mjs, scripts/publication-build.mjs, scripts/test-publication-builds.mjs, scripts/test-publication-workflow.mjs.
Yeni 23 dosya:
- Workflows: publication-ledger-check.yml, publication-release-producer.yml.
- Schemas: production-ledger-v1.schema.json, release-marker-v1.schema.json, deployment-outcome-v1.schema.json.
- Genesis: production/ledger.json (records boş, canonical).
- Scripts: publication-control-schema.mjs, publication-environment-policy.mjs, publication-extract-artifact.py, publication-git-history.mjs, publication-git-ledger.mjs, publication-ledger-history-check.mjs, publication-pages-reconciliation.mjs, publication-pages-runtime.mjs, publication-producer-trust.mjs, publication-release-producer.mjs.
- Tests: test-pages-reconciliation.mjs, test-publication-artifact.mjs, test-publication-artifact.py, test-publication-git-ledger.mjs.
- Docs: GITHUB_PAGES_ENVIRONMENT_SETUP.md, PUBLICATION_PRODUCTION_LEDGER.md, bu rapor.
Sentetik fixture'lar mevcut publication-fixtures builder'ı, tests/fixtures/publication ve yeni testlerin owned TEMP builder'larıyla üretildi; production dosyasına test release kayıtları konmadı.

## Git ledger/CAS kararı
Canonical tracked ledger + main Git geçmişi kalıcı otoritedir. Event'ler generation/previousRecordSha256/recordSha256 zinciriyle kapalı ve append-only'dir.
Git snapshot verifier first-parent full history boyunca canonical prefix eşitliğini kontrol eder; hashler yeniden hesaplanarak eski satır değiştirilmesi/silinmesi de reddedilir.
PREPARED record expected Git base'indeki ledger tam onun önceki prefix'idir. Deployment evidence commit'i orijinal PREPARED snapshot'ına ve main ancestry'sine bağlıdır.
Prepare CLI HEAD/expected base, head/generation, bundle/hash/safety fences doğrular; yalnız ledger/marker/summary taslağı yazar. Commit/push veya tracked ledger overwrite yapmaz.
Git non-fast-forward/expected parent review/PR aşamasındaki CAS'tır. İki async hazırlık yarışında expected-parent modelinde bir plan kabul edildi; ikinci stale parent reddedildi. Gerçek Git remote yarış/push denenmedi.
Git admin/force-push bypass veya alternatif Pages writer'ı kontrol edilmeyen ortamda dağıtık garanti iddia edilmez. Main protection ve required history check manuel önkoşuldur.
İlk yerel doğrulama sırasında genesis henüz commit edilmemişti; genesis schema generation=0 doğrulandı. O aşamada commit yasağı nedeniyle pozitif gerçek-Git snapshot integration çalıştırılmadı. Sonraki gerçek GitHub Actions build-only sonucu aşağıda ayrıca kayıtlıdır; remote CAS/production promotion kanıtı olarak yorumlanmaz.

## Provenance, producer ve marker
FULL publication manifest/receipt/proofs → pinned contract checksums → 6C provenance → public tree → bundle tree → reviewed ledger → same-repo/main/manual successful producer run/attempt/artifact identity + digest → verified outer ZIP → safe tar → marker/deploy tree → Pages artifact zinciri kuruldu.
API run/artifact kimliği saf metadata projector'da kontrol edilir; aktör/özel API cevabı ledger veya public çıktıya yazılmaz. Signed storage download yalnız allowlisted HTTPS redirect; authorization forward edilmez; raw ZIP SHA zorunlu.
GITHUB_RUN_DIGEST imzasız, review edilen Git/main + GitHub API provenance güven seviyesidir. GITHUB_ATTESTATION seçilirse signer workflow/repository/source digest/ref ve hosted runner verification zorunlu; fallback yok.
Resmi attestation producer job'u opsiyoneldir; mevcut plan/CLI/runner desteği bilinmiyor ve gerçek success iddia edilmedi. [Resmi doğrulama seçenekleri](https://cli.github.com/manual/gh_attestation_verify)
Public marker yalnız releaseId/treeHash/sourceCommit/generatedAt/contractVersion. Marker öncesi tree hash döngüyü önler; marker SHA ve marker dahil deployTreeSHA ledger'da ayrı bağlanır.
Marker uzaktan tüm site byte'larını yeniden hashlemez. Kritik route/asset probes ve CDN/browser cache sınırı runbook'ta ayrıca korunur.

## Workflow ayrımı
Build-only: pilot push/manual, yalnız contents:read, environment/Pages deploy/upload/write permission yok; synthetic consumer/recovery/provenance/ledger/archive/workflow/production build ve HTTP suite. Checkout full history'dir; committed genesis/history kontrolü ayrıca vardır.
Production: yalnız manual/main; expected commit/release/tree hash zorunlu. Checkout github.sha; API main HEAD aynı olmalı. Read-only validate stage kaynağı/bundle/ledger/hash/marker/out'u doğrular, sonra Pages artifact oluşturur.
Deploy stage yalnız contents:read/pages:write/id-token:write; github-pages approval ve tek concurrency group cancel-in-progress:false. Approval sonrası main/previous release yeniden kontrol edilir. Repo/ledger yazamaz.
Environment policy required reviewer, prevent_self_review ve yalnız Branch main kuralını read-only API ile ister. Plan/API kısıtı varsa fail-closed; bu turda ayar okunmadı/değiştirilmedi.
Rerun attempt>1, mevcut same-commit Pages attempt veya önceki same-commit production run tekrar deploy'u engeller. Outcome/reconciliation gerekir; eski run yeni head'i geçemez.
Git ref ve Pages çağrısı tek atomik transaction değildir. Reservation, protected review, tek writer/concurrency ve approval sonrası fence bu sınırı yönetir.

## Reconciliation ve rollback
HTTPS aynı origin, redirectsiz, sınırlı poll/timeout/byte/canonical JSON/schema + tüm marker alanları eşitliği. Pages status succeed + marker doğrulaması olmadan workflow başarılı sayılmaz.
Mock success/mismatch/timeout/oversize header/chunked/redirect/invalid JSON/extra field/404, HTTPS/origin sınırları ve benzersiz query testleri geçti. Canlı ivmova.com çağrısı yoktur.
Workflow metadata-only outcome artifactı verir; ayrı reviewed PR yeni DEPLOYED/RECONCILED/FAILED event'i append eder, eski PREPARED değişmez.
Rollback verified eski immutable bundle'ı yeni release ID/event/marker/deploy tree ile kullanır. Append-only completed rollback, replay ve stale rollback testlidir; latest REMOVE/RETRACT fence uyumluluğu zorunlu.
FAILED/UNKNOWN outstanding attempt normal RELEASE'i bloke eder. Manuel recovery rollback expected failed reservation ID/tree/generation/base ile ve yalnız settled Pages succeed kontrolünden sonra ilerler. Otomatik ikinci deploy/rollback yoktur.

## İlk yerel aşamada çalıştırılan doğrulamalar (tarihsel)
| Kontrol | Sonuç |
| --- | --- |
| 6C-2 consumer | 71 assertion PASS |
| 6C-3 recovery/concurrency | 198 assertion, 17 child process, 10 crash execution PASS |
| 6C-4 release/bundle regression | 58 assertion PASS |
| Git ledger/CAS/producer/environment/rollback | 100 assertion PASS |
| Mock reconciliation | 16 assertion, 12 loopback HTTP request, 1 server close PASS |
| Safe artifact extraction | 11 assertion PASS; synthetic ZIP/tar traversal/link/duplicate/unknown entry |
| Workflow static policy | 42 assertion PASS |
| Build/output/bundle/marker/route suite | 20.782 assertion PASS |
| Toplam | **21.278 assertion PASS** |
| Başarılı build | **10**: demo, recovery-full, recovery-full-repeat, incremental, rollback, retract, remove, safety-rollback, synthetic-production, empty |
| Beklenen build reddi | **2**: missing-input, tampered-input |
| Verified marker dahil public paket | **9** |
| HTTP / kapanan server | **85 / 9** (73 build + 12 mock; 8 build server + 1 mock) |
| Same input public tree | Clean repeat eşitliği PASS |
| Protected kullanıcı out/.next | Before/after path/size/mtime/link metadata inventory eşitliği PASS; dosya silinmedi |
| Syntax | 28 MJS node --check; 2 Python AST syntax |
| Whitespace | git diff --check PASS |

Final build-only entrypoint exit 0: BUILD_ONLY_PASS; GIT_LEDGER_UNCHANGED; DEPLOY_NOT_INVOKED.
Workflow static policy testi YAML yapısına yönelik repo policy check'tir; genel YAML parser/GitHub interpreter validation iddiası değildir. İlk yerel rapor anında gerçek GitHub Actions çalışma sayısı 0 idi; sonraki iki çalışmanın sonucu aşağıdadır.
İlk yeni ledger fixture koşusunda yanlış sourceCommit shorthand'i düzeltildi; final PASS sayaçlarına başarısız deneme katılmadı.
Offline audit yeniden çalıştırılmadı; 6C-4'te dış bağlantı blocker ile boş rapor üretildiği bilindiğinden güncel advisory güvenliği iddiası korunmadı.

## Gerçek GitHub Actions build-only sonucu
Bu bölüm kullanıcı tarafından bildirilen gerçek Actions sonuçlarına dayanır; bu belge güncellemesinde test veya workflow yeniden çalıştırılmadı.

- İlk `Synthetic build-only staging` çalışması `Error: LINK` ile başarısız oldu. Kök neden, Linux dizinlerinde normal olan `nlink > 1` değerinin hardlink sanılmasıydı; async assertion hatası değildi.
- Güvenlik kontrolü gevşetilmedi: hardlink kontrolü yalnız dosyalara uygulandı; tüm symlink/junction reddi korundu. Test fixture temizliği `finally` ile güvenceye alındı.
- İkinci çalışma: commit `f2b4d88`, workflow `Synthetic build-only staging`, branch `pilot/6c2-site-consumer`, GitHub Linux runner. Başarıyla tamamlandı; süre yaklaşık **1 dakika 38 saniye**.
- Production `Deploy GitHub Pages` workflow'u tetiklenmedi. `main`, `github-pages` environment ve canlı site değiştirilmedi.

Bu sonuç gerçek Linux runner'da build-only doğrulamasının geçtiğini gösterir. Production deploy, producer/approval/reconciliation veya gerçek remote CAS başarısı iddiası değildir.

## İlk yerel aşamanın temizlik ve Git durumu (tarihsel)
Owned consumer/recovery/release/ledger/build/archive TEMP clone/store/out/.next/node_modules kopyaları finally cleanup marker'larıyla kaldırıldı. 9 HTTP server kapandı. Syntax sırasında oluşan yalnız publication-extract-artifact Python cache'i temizlendi. Final TEMP/process prefix kontrolleri yapıldı.
Site pilot/6c2-site-consumer; HEAD/origin/checkpoint 17cdddfcf6ef6ca281d03dc6aac7cd6bdafc097f değişmedi; 8 tracked modified + 23 yeni untracked dosya, stage/commit yok.
Editorial main temiz; HEAD/origin/main 335e006a411941c9f6b52e0b8a813b3b2fc6ded8 değişmedi.
Commit/push/tag/release/merge, main checkout, workflow trigger, Pages deploy, GitHub ayar yazımı, canlı site isteği, Supabase/SQL/JWT/gerçek credential/haber/export yapılmadı. Yalnız resmi GitHub docs/action kaynak sözleşmesi web'den incelendi.

## Dashboard ve gerçek ortamda kalan doğrulamalar
Kullanıcı: github-pages create/main-only branch/reviewer/prevent-self-review/admin bypass; Pages source Actions; branch/ruleset PR-review/force-push/delete yasağı/required history status check; alternatif deployment writer'larını kapatma; default read-only token; plan availability, domain/TLS/noindex ve action SHA pin review.
Gerçek GitHub Linux runner'da build-only workflow başarıyla tamamlandı (f2b4d88). Production için kalan doğrulamalar: gerçek remote CAS; producer/production ledger history integration; artifact digest transport/storage host; producer API identity; attestation desteği; environment approvals; Pages artifact/deployment API/current-commit fencing; gerçek reconciliation/CDN/404/custom domain.
Kontrollü gerçek build-only doğrulaması tamamlandı; belge checkpoint'ine hazır. İlk production deploy'a **hazır değil**: manuel settings + gerçek producer/provenance/approval/reconciliation kanıtı + reviewed genesis/release PR'ı ve açık deploy yetkisi gerekir.

Otomatik güvenlik incelemesi expected-base replay kontrolünü gevşetme önerisini stale/conflicting promotion riski nedeniyle reddetti. Güvenli alternatifte kontrol aynen korundu; reddedilen değişiklik uygulanmadı, bu nedenle pending izin talebi yoktur.

## Bu belge güncellemesinin kapsamı
Yalnız bu rapor güncellendi; PUBLICATION_PRODUCTION_LEDGER.md içindeki durum/güvenlik sözleşmelerinde değişiklik gerekmedi. Test/Actions/SQL/build/deploy yeniden çalıştırılmadı; kod değiştirilmedi. Commit/push/tag yapılmadı. Yalnız git diff --check ve belge hassas veri taraması yapıldı.
