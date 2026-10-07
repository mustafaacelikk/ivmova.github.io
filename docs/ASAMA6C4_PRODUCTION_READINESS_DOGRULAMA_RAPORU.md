# Aşama 6C-4 — Production readiness doğrulama raporu
Tarih: 2026-10-07. Karar: **production için hazır değil**; yerel build-only release doğrulaması için hazır.

## Başlangıç
Site branch pilot/6c2-site-consumer temizdi. HEAD = origin/pilot/6c2-site-consumer = checkpoint-site-staging-recovery-v1^{commit} = 28b22024ab16455e242a8f658607954284753e8c.
Tag nesnesi SHA'sı 6cdde00e32705516a27ea87427b36082982ecca1; commit SHA ile karıştırılmadı.
Editorial main temiz; HEAD = origin/main = 335e006a411941c9f6b52e0b8a813b3b2fc6ded8. Editorial'e yazılmadı.

## Uygulama
Değişen: .github/workflows/deploy-pages.yml, package.json, next.config.ts, scripts/publication-build.mjs, scripts/publication-build.d.mts, scripts/test-publication-builds.mjs.
Yeni: .github/workflows/publication-build-only.yml, contracts/release-provenance-v1.schema.json, scripts/publication-release.mjs, scripts/publication-promotion-check.mjs, scripts/publication-build-only-staging.mjs, scripts/test-publication-release.mjs, scripts/test-publication-workflow.mjs, docs/PUBLICATION_PRODUCTION_RELEASE_RUNBOOK.md ve bu rapor.
Consumer/transaction sözleşmeleri, publication-v2 checksum pinleri, package-lock, CNAME ve kullanıcı out/.next çıktıları değiştirilmedi. Build işlemleri yalnız owned TEMP kopyalarında yapıldı; kullanıcı out/.next için başlangıç SHA inventory snapshot'ı alınmadığından before/after hash eşitliği iddia edilmez.

## Workflow ve distributed fencing
main push otomatik deploy kaldırıldı. workflow_dispatch release artifact run ID, publication UUID, manifest/receipt/provenance hash ve previous production UUID/hash inputları taşır.
Validate: contents:read/actions:read, deploy yetkisi yok. Deploy: yalnız contents:read/pages:write/id-token:write; github-pages environment.
Tek production concurrency grubu, cancel-in-progress:false. Supabase/JWT/service-role/database erişimi yok.
Durable production ledger adapterı ve Pages reconciliation **uygulanmadı**. production-gate fail-closed ve deploy if:false interlock nedeniyle bu taslak production yayınlayamaz. Önceki production inputları otoriteye bağlanmadığı için dağıtık garanti tamamlandı denmez.
Yerel append-only checksum/generation ledger modeli, expected previous head ve generation, operation replay, runId/hash conflict, competing CAS ve rollback event sözleşmesi testlidir. Yerel filesystem veya in-memory model gerçek dağıtık otorite değildir.

## Provenance/bundle
Kapalı schema ve semantic validator: canonical bytes, duplicate-key reddi, explicit build timestamp, source commit, consumer/publication version, manifest bytes/hash, receipt hash, pinned contract manifest hash, sayaçlar, previous production ve output tree.
Inventory path/byte/SHA-256 sıralıdır. Public/internal ayrımı, symlink/junction/hardlink, bilinmeyen/eksik/bozuk bundle, hash-chain mismatch ve public secret/metadata reddi testlidir.
Hashes producer authenticity yerine geçmez. Draft producer workflow/run/commit allowlist doğrulaması ve signed trust zinciri eksiktir.
Next build ID kaynak/input hashine bağlıdır; aynı local toolchain/input ile temiz rebuild tree eşitliği test edilir. Cross-platform/toolchain reproducibility kanıtı yoktur.
Gerçek publication artifact kullanılmadı. Sentetik fixture'lar mevcut publication fixture builder'ı ve tests/fixtures/publication üzerinden üretildi.

## Cache, REMOVE/RETRACT, rollback
REMOVE route/sitemap/list/category yeni pakette yok; RETRACT uyarılı route korunur ve list/sitemap'ten çıkar. Temiz full output paketlenir; eski dosyalar birleştirilmez.
CNAME ivmova.com; export/trailingSlash; varsayılan root basePath. Layout noindex/nofollow; robots.txt kaynağı ve service worker registration bulunmadı.
Loopback HTTP cache header'ları GitHub Pages garantisi değildir. CDN/browser purge varsayılmaz. Gerçek cache/404/custom domain/TLS ve postdeploy hash probes doğrulanmadı.
Rollback A predeploy hata production'ı değiştirmez. Rollback B immutable bundle + yeni append-only event modelidir; aynı rollback replay ek event üretmez.
Eski bundle latest REMOVE/RETRACT fence uyumluluğu olmadan production rollback alamaz. Bunun distributed authority kontrolü eksiktir; mevcut 6C-3 safety rollback build regresyonu korunur.
Runner/power-loss: local atomic rename Pages garantisi değildir. Deployment ambiguity otomatik redeploy yerine reconciliation gerektirir; bu external adapter henüz yoktur.

## Doğrulama sonuçları
| Kontrol | Sonuç |
| --- | --- |
| Release/provenance/bundle/CAS/rollback | 58 assertion PASS; rollback sonunda 3 append-only event; same rollback replay yeni event yok |
| 6C-2 consumer | 71 assertion PASS |
| 6C-3 recovery/concurrency | 198 assertion PASS; 17 child process; 10 crash execution |
| Workflow statik policy | 26 assertion PASS; build-only deploy job yok, production iki kapıyla kapalı |
| Final build/output/bundle/HTTP suite | 18.463 assertion PASS |
| Başarılı build | 9: demo, recovery-full, aynı input repeat, incremental, rollback, retract, remove, safety-rollback, empty |
| Beklenen build reddi | 2: missing-input, tampered-input |
| Bundle/public tar inventory | 8 publication build için PASS; tar yalnız public dosya inventory içerir |
| Deterministik public tree | recovery-full ve temiz repeat hash eşitliği PASS |
| HTTP / kapatılan server | 63 kontrol / 7 server exit 0 |
| Toplam assertion | 18.816 |
| Syntax | 16 MJS node --check PASS |
| Git whitespace | git diff --check PASS |
| Production deploy / dış ağ | 0 / 0 gerçekleşen bağlantı |

Build-only entrypoint exit 0, TEMP_BUILD_CLEANUP_OK ve DEPLOY_NOT_INVOKED verdi. Release/recovery TEMP cleanup marker'ları doğrulandı. Son TEMP prefix taramasında ivmova-*test-* dizini yoktu.
Final site Git: pilot/6c2-site-consumer, HEAD/origin değişmedi; 6 tracked modified ve 9 untracked yeni dosya. Staging/commit yapılmadı.
Final editorial Git: main temiz; HEAD/origin/main değişmedi.

YAML için kurulu genel parser bulunmadı; 26 assertion yalnız kullanılan YAML subsetinin statik policy kontrolüdür. GitHub syntax/execution doğrulaması değildir.
Offline audit dış ağ blocker hook ve boş TEMP cache ile denendi. EXTERNAL_NETWORK_BLOCKED görüldü; npm boş/0 raporu döndürdü. Bu güncel advisory doğrulaması değildir, dependency güvenliği kararı için kullanılmadı. Audit cache güvenli sınır kontrolünden sonra temizlendi.
İlk yerel build denemeleri Next $d$slug asset path allowlist'i ve derlenmiş framework generic token/password false positive'i nedeniyle reddedildi. Bunlar düzeltildi; önceki başarısız denemeler final başarı sayaçlarına dahil edilmedi. Her failed build harness TEMP cleanup yaptı.

## Temizlik ve yasaklar
Owned release/build/consumer/recovery TEMP store ve clone/out/.next/node_modules kopyaları finally cleanup ile kaldırılır. HTTP process'ler IPC graceful close ile kapanır; final server sayısı sonuçlarda verilir.
Commit/push/tag/merge, main checkout, workflow trigger, Pages deploy, canlı site isteği, Supabase/SQL/JWT/credential veya gerçek haber/export yoktur.
GitHub environment/Pages/branch ayarları değiştirilmedi. Editorial salt okunur kaldı.

## Manuel ve gerçek ortam eksikleri
github-pages required reviewers/prevent-self-review/bypass kontrolü; Pages source/domain/TLS; branch/workflow protection ve alternate writers; approved producer run/source SHA policy; durable expected-head/generation CAS, pending deployment reservation ve reconciliation; latest content fence authority; artifact retention/rollback erişimi; immutable action SHA pinleri.
Gerçek Node22 CI, environment approval, iki GitHub promotion yarışı, stale waiting run, timeout/rerun/reconciliation ve Pages cache/URL/hash kontrolleri yapılmalıdır.
Publication builder halen loopback origin ile sınırlıdır; production origin policy ayrıca review gerektirir.
Bu eksikler çözülmeden kapılar kaldırılmamalı. Kontrollü ilk production yayınına hazır değildir.

