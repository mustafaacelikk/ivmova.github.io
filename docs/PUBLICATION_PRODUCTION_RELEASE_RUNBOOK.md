# Production release runbook — 6C-4
Tarih: 2026-10-07. Bu dosya deploy yetkisi değildir. Pilot taslak production için hazır değildir.

## Mevcut sınır
Checkpoint commit 28b22024ab16455e242a8f658607954284753e8c üzerinde çalışıldı. Editorial salt okunurdur.
Production workflow artık yalnız workflow_dispatch alır. Validate job contents:read/actions:read; deploy job contents:read/pages:write/id-token:write ile github-pages environment kullanır. Supabase, database veya özel credential yoktur.
Validate yalnız immutable-release-bundle artifactını alır ve publication UUID, manifest/receipt/provenance SHA-256 zincirini yeniden doğrular. Artifact source run ID onayı ayrıca gereklidir.
Production gate her zaman reddeder; deploy job if:false ikinci bağımsız kapıdır. Bu iki kapıyı yalnız YAML düzenleyerek kaldırmak güvenli değildir.

## Dağıtık otorite: zorunlu eksik
Tek ivmova-production-pages concurrency grubu ve cancel-in-progress:false bütün promotion/rollback yollarında korunmalıdır. Concurrency FIFO veya kalıcı ledger değildir.
Runner dosyası, cache, yeniden indirilen artifact veya local atomic rename dağıtık compare-and-swap otoritesi olamaz.
Gerekli adapter: kalıcı append-only checksum zinciri, monotonic generation, expected previous UUID/hash, operation UUID, aynı UUID/farklı hash conflict ve atomik rezervasyon. Bütün production yazarları aynı otoriteyi kullanmalıdır.
Rezervasyon -> verified artifact -> Pages deployment ID -> reconciliation -> confirmed ledger head akışı gereklidir. Pending/ambiguous rezervasyon yeni promotion'u bloke eder.
Approval bekleyen eski run environment kapısından çıktıktan sonra expected head/generation yeniden doğrulanmalıdır.
Bu adapter ve Pages deployment reconciliation henüz uygulanmadı. Yerel planPromotion/simulateCAS yalnız sözleşme modelidir; production çağıranı yoktur. İki operatör aynı generation ile plan kurduğunda yalnız bir CAS kabul edilir.
Aynı operation replay yeni kayıt/deploy üretmemelidir; eski başarılı operation replay HEAD daha yeni olsa bile eski paketi deploy etmemelidir. Aynı publication UUID farklı provenance conflict'tir.
Gerekli izinleri mevcut minimum deploy izinlerine eklemeden kalıcı otorite tasarımı ayrıca seçilmelidir; bu turda dış sistem veya secret kurulmadı.

## Bundle ve provenance
Bundle root yalnız release.json, public/ ve internal/ taşır. Internal altında publication/, receipt.json, provenance.json ve inventory.json bulunur.
Consumer publication manifest/story/removal proof sözleşmesini doğrular; receipt deterministik projeksiyonla karşılaştırılır. Contract checksum manifest repo pinine bağlıdır.
Provenance schemaVersion, publication run/version, manifest SHA/byte length, receipt/contract hashes, source commit, consumer version, açık build timestamp, item/file/action counts, önceki production head ve public tree hash taşır.
Canonical UTF-8 JSON, LF sonlandırma, kapalı alanlar, duplicate-key reddi uygulanır. Timestamp explicit input olduğundan aynı input aynı provenance üretir; farklı build timestamp yeni provenance hash'tir.
Inventory sıralı path/byte/SHA-256 üçlüleri taşır. Symlink/hardlink, traversal, özel dosya, bilinmeyen bundle dosyası ve eksik completion metadata reddedilir.
Hash'ler bütünlük kontrolüdür; imza veya güvenilir builder kimliği değildir. Artifact producer run/repository/commit/workflow conclusion ve provenance siteSourceCommit'in approved source ile bağı ayrıca doğrulanmalıdır. Mevcut draft bu producer trust politikasını henüz uygulamaz.
Public artifact yalnız doğrulama sonrasında public/ üzerinden paketlenir. Internal bundle public Pages artifactına verilmez. Üretim bundle transferi ve artifact retention henüz devreye alınmadı.
Rollback için önceki bundle immutable tutulur; yeni rollback event mevcut production head'e bağlanır. Eski provenance içindeki previousProduction yeniden yazılmaz.

## REMOVE / RETRACT / cache
output:export, trailingSlash:true, varsayılan basePath boş. CNAME ivmova.com. Layout noindex/nofollow; robots.txt kaynağı yok. Sitemap yalnız siteNews; RETRACT routeNews içinde kalır, siteNews'den çıkar.
REMOVE yeni static route, sitemap ve kategori/listelerden çıkar. RETRACT route ve güvenli uyarı kalır. Safety rollback önceki REMOVE/RETRACT fence'lerini geri almamalıdır.
Önceki full bundle'ın kör rollback'i bu fence'leri diriltebilir: üretim rollback adapterı latest fences ile uyumluluk kanıtı yoksa fail-closed olmalıdır. Yerel CAS modeli içerik fence otoritesi değildir.
Yeni build temiz izole TEMP out/.next kullanır; eski release dosyası birleştirilmez. Service worker registration kaynağı bulunmadı; public validator bu eklemeyi reddeder.
Loopback test sunucusunun Cache-Control header'ı Pages garantisi değildir. Repo Pages response header/purge yönetimi sağlamaz. CDN/browser cache eski içerik gösterebilir; purge var varsayılmaz. REMOVE yasal/acil silme ihtiyacında bu sınır yayın kararına dahil edilmelidir.
Postdeploy manuel liste: root, kategori/enerji/, sitemap.xml, 404, her REMOVE route 404 + sitemap/list yokluğu, her RETRACT route 200 + uyarı + sitemap/list yokluğu, seçilmiş immutable JS ve mutable HTML SHA-256. Cache-busting query ve normal URL ayrı gözlenir; public inventory ile indirilen byte hash kıyaslanır. Bu turda canlı URL çağrılmadı.

## Kontrollü ilk yayın öncesi GitHub manuel ayarlar
1. github-pages environment required reviewers ve prevent self-review; bypass/policy kontrolü.
2. Pages source GitHub Actions; domain/DNS/TLS ve CNAME incelemesi. noindex/nofollow kararı.
3. Branch/workflow koruması; alternatif deploy writer'larını kapatma; workflow SHA pinleri ve action major sürümlerinin immutable commit pinlerine dönüşümü.
4. Approved source/builder run allowlist, durable ledger/reconciliation adapterı, latest content fences, immutable artifact retention/rollback erişimi.
5. Gerçek Node 22 CI, environment approval, iki eşzamanlı promotion, stale waiting run, canceled/timed-out deploy, rerun ve reconciliation testleri.
6. Önce build-only GitHub ortamı; ardından kullanıcı açık yayın yetkisi ve EMPTY genesis head doğrulaması. Bu turda workflow tetiklenmedi.

## Rollback A — deploy tamamlanmadan
Geçersiz bundle reddedilir; confirmed production ledger değişmez. Pending rezervasyon varsa deployment durumu reconciliation ile kanıtlanmadan serbest bırakılmaz. Mevcut production korunur.

## Rollback B — deploy tamamlandıktan sonra
Önceki doğrulanmış immutable bundle bulunur; latest REMOVE/RETRACT fences ile uyum kanıtı zorunludur. Uyumsuz eski bundle doğrudan deploy edilmez; fenced yeni doğrulanmış rollback bundle gerekir.
Yeni operation UUID, operation=ROLLBACK, mevcut expected head/hash/generation ve aynı approval/concurrency/provenance gate kullanılır. CAS append-only rollback event üretir; geçmiş silinmez. Dosyaları elle geri kopyalamak yoktur.
Aynı rollback operation replay mevcut sonucu döndürür, deploy'u tekrarlamaz. Yerel rollback modeli testlidir; gerçek Pages rollback yapılmadı.

## Runner/power-loss ve belirsizlik
Hosted runner geçicidir. Local rename ve Pages deployment ayrı atomiklik alanlarıdır. Build veya upload öncesi hata production değiştirmez.
Deployment başlangıcından sonraki timeout/runner kaybında otomatik ikinci deploy yasaktır. Deployment ID, Pages durumu, artifact hash ve URL probe ile reconciliation yapılır; confirmed durum olmadan head ilerletilmez.
Tar paketleme yerel eşdeğer testtir; gerçek upload-pages-artifact/deploy-pages davranışı bu turda kanıtlanmadı.

## Deterministik build sınırı
Next build ID kaynak dosyaları, generated publication verisi, lockfile/config ve mode/origin/basePath hashinden üretilir. Aynı toolchain ile iki temiz build tree eşitliği test edilir; farklı işletim sistemi/Node/Next toolchain için reproducibility garantisi verilmez. Publication build halen loopback origin ile sınırlıdır; production origin geçişi ayrıca reviewed policy değişikliği gerektirir.
