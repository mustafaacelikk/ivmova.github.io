# Aşama 6C-3 — Yerel Staging ve Recovery Doğrulama Raporu

Tarih: 2026-10-07. Karar: 6C-4 kontrollü production readiness incelemesine koşullu hazır; production merge/deploy için hazır değil.

## Başlangıç kanıtları

Site repo ivmova.github.io, origin GitHub mustafaacelikk/ivmova.github.io; branch pilot/6c2-site-consumer. Temiz çalışma ağacı; HEAD ve origin/pilot/6c2-site-consumer aynı d064a64ffcdc554da221c6319335e2be970eb80d. Mevcut 6C-2 commit başlığı Publication artifact site consumer pilotunu ekle. Main checkout/merge yapılmadı.

Editorial repo ivmova-editorial, origin GitHub mustafaacelikk/ivmova-editorial.git; main temiz. HEAD = origin/main = 335e006a411941c9f6b52e0b8a813b3b2fc6ded8. Editorial yalnız salt okunur incelendi. Başlangıç ve son canlı SHA-256 değerleri:

- data/inbox/candidates.json: 3FE3A8A52EE2351DCD8A8764932E7B5E30F9F15E3BF907871877C577B8BC98D4
- data/state/seen-items.json: 54FC38C69746CE3C4F36DE2D0DAB950CE21B9C6C88FD3A633FD4F6651765FFD1

## Uygulanan değişiklikler

Yeni scripts/publication-transaction.mjs lock/fencing/journal/recovery/retry katmanıdır. Mevcut scripts/publication-consumer.mjs contract, revision, artifact hash, FULL omission ve tombstone davranışları korunarak bu katmana bağlandı; inspection/recovery CLI ve idempotent replay eklendi. package.json yalnız yerel inspection/recovery/test script’leri için güncellendi; bağımlılık ve package-lock değişmedi.

Yeni scripts/test-publication-recovery.mjs gerçek çoklu process suite’idir; scripts/test-publication-writer.mjs yalnız owned TEMP altında fault interception yapan child harness’tır. Consumer production env/CLI fault switch içermez. scripts/test-publication-consumer.mjs replay kabulü ve explicit pending recovery için dar güncellendi. scripts/test-publication-builds.mjs izole build sonrası gerçek localhost HTTP kontrollerini ekler; yeni scripts/publication-static-staging.mjs yalnız TEMP output’u loopback’te sunar.

Yeni PUBLICATION_SITE_STAGING_RECOVERY.md kullanım ve production sınırlarını açıklar; mevcut PUBLICATION_SITE_CONSUMER.md yalnız replay/recovery/test durumu için güncellendi. Bu rapor ikinci yeni belgedir. Toplam 5 mevcut dosya değişti, 6 dosya oluştu. Site içerik/UI, schema/fixture sözleşmeleri, CNAME, production deploy workflow, lockfile ve kullanıcı teknik spesifikasyonu değiştirilmedi.

## Lock, fencing ve journal sonucu

Exclusive wx lock yalnız operationId/processId/startedAt/generation taşır. Aktif process’in lock’u temizlenmez. Process ölümünden kalan lock otomatik silinmez; ölü PID, unchanged planHash ve explicit action gerekir. Success/caught failure sonunda ownership ile unlock yapılır. Recovery planı hedef/karar gösterilmeden mutation yapmaz.

Append-only checksum zincirli generation ledger ve bağımsız head, pointer generation ile doğrulanır. Writer, rollback ve recovery yeni monotonic generation alır. Swap öncesi lock ownership/generation/base pointer tekrar kontrol edilir. Eski token yeni writer aktifken reddedildi; counter corruption/truncation fail-closed doğrulandı.

Metadata-only journal prepared/staged/verified/swap_started/committed ve rollback_started/rolled_back aşamalarını taşır. Story içeriği ve receipt journal’da yoktur. Immutable state/record swap öncesinde byte/hash doğrulanır. Pre-swap crash current hash’ini korur; verified pending işlem açık resume/abort alır. Post-swap recovery journal/current eşitliğini doğrular, release’i ikinci kez uygulamaz. Recovery swap’ında ikinci crash de toparlandı. Abort pre-swap base’i korur; normal rollback latest REMOVE/RETRACT fence’lerini uygular.

operation.json.next gibi torn/ambiguous metadata otomatik tamir edilmez. Gerçek storage power-loss, Windows directory fsync ve hostile OS writer dayanıklılığı kanıtlanmadı; fail-closed forensic sınırı rehberde açıklandı.

## Retry ve idempotency

Aynı runId/manifest hash replay yeni immutable release veya current değişimi üretmez; rollback sonrası eski payload tekrar uygulanmaz. Aynı runId/farklı geçerli manifest RUN_CONFLICT olur. High watermark/replay ve fence geçmişi korunur.

EBUSY/EAGAIN/EMFILE/ENFILE yalnız üç denemeye kadar 10/20 ms bounded deterministic retry alır. EACCES ve schema/semantic hatalar retry edilmez. Gerçek pointer rename’de transient success ve retry exhaustion test edildi; exhausted swap önceki state SHA-256’sını korudu, explicit recovery ile tamamlandı.

## Çalıştırılan doğrulamalar

| Kontrol | Gerçek sonuç |
| --- | --- |
| 6C-2 consumer regresyonu | 71 assertion, PASS |
| Recovery/concurrency suite | 198 assertion, 17 ayrı child process, PASS |
| Zorunlu crash noktaları | staging write, verified, before swap, atomic rename sonrası during-swap sınırı, committed sonrası cleanup öncesi, rollback başlangıcı: 6/6 |
| Ek crash senaryoları | explicit verified abort, recovery seed/recovery swap crash, tombstone rollback crash; toplam 10 crash execution |
| Final build/HTTP suite | 17.476 assertion, PASS |
| Başarılı build’ler | demo, recovery-full, incremental, rollback, retract, remove, safety-rollback, empty: 8 |
| Beklenen build reddi | missing-input ve tampered-input: 2 |
| Yerel HTTP | 63 request/check; 7 loopback server exit 0 ile kapandı |
| Toplam final suite assertion | 17.745 |
| Syntax | 11 MJS dosyası node --check PASS |
| Typecheck | TEMP reader’da tsc --noEmit --incremental false PASS |
| Git whitespace | git diff --check PASS |

Crash injection child process’te immediate process.exit ile olur; normal finally cleanup çalışmaz. Atomic filesystem rename içini parçalamak yerine rename öncesi/sonrası process kesintisi sınırları test edildi. Bu gerçek OS/disk power failure simülasyonu değildir.

İlk build test koşusunda Windows SIGTERM sonrasında exitCode assertion’ı başarısız oldu. HTTP içerik kontrolleri geçmişti; harness IPC graceful shutdown ile düzeltildi. Final tam seri 8 build ve 7 server closure ile yeniden geçti; başarısız ilk koşu final PASS sayılarına katılmadı.

Offline npm audit ağ engelleyici ile denendi. Koruma dış bağlantı girişimini bloke etti; çıkan boş/0 raporu güncel advisory doğrulaması sayılmadı. Audit güvenlik kararı için kullanılmadı; dış ağ isteği gerçekleştirilmedi. Paket kurulumu/güncellemesi yapılmadı.

## Yerel public çıktı kanıtları

Ana sayfa ve enerji kategorisi HTTP 200; FULL/INCREMENTAL UPSERT detayları 200. RETRACT detayında güvenli uyarı görüldü ve sitemap/listelerden dışlandı. REMOVE detay route’u HTTP 404, sitemap ve yeni output inventory’de yok. Safety rollback REMOVE veya eski RETRACT içeriğini diriltmedi. Empty publication güvenli boş durum gösterdi. Nötr SVG, JS asset ve gerçek Next static data payload yolu HTTP ile okundu.

Public HTML/JS/JSON/XML/TXT inventory internal journal/lock/receipt hash metadata, private/secret örüntüleri ve demo slug için tarandı. Publication paketlerinde demo içerik sızıntısı bulunmadı. Local staging root path/trailing slash yapısı doğrulandı. Immutable asset / mutable HTML header ayrımı yalnız staging sunucusu davranışıdır; Pages cache politikası kanıtı değildir.

## Temizlik ve değişmeyen sınırlar

Consumer ve recovery testleri owned TEMP store’larını sildi; başarılı/recovered store’larda lock, journal, journal/head .next, stage ve pointer temporary dosya kalmadığı assert edildi. Build suite fiziksel TEMP reader/node_modules/out/.next kopyalarını sildi; localhost server’lar kapandı. Author payload, lab/typecheck ve audit cache de final kontrol sonrasında silindi. Immutable release/generation kayıtları yalnız test store içinde tutuldu ve store cleanup ile kaldırıldı; production retention cleanup çalışmadı.

Mevcut site out/.next dosya inventory/size/mtime kontrolü write öncesi ve sonrasında aynı kaldı. Production workflow, CNAME, package-lock ve kullanıcı teknik spesifikasyonu byte SHA-256 kontrolü değişmedi. Editorial temiz kaldı; canlı hash’ler korunuyor.

Supabase/SQL/JWT/gerçek publication export, collector, canlı ivmova.com, GitHub/DNS yazımı, main merge, commit/push/tag/deploy çalıştırılmadı. Yalnız synthetic fixture, private TEMP ve loopback HTTP kullanıldı.

## Kalan riskler ve 6C-4 kararı

6C-4 kontrollü readiness analizi için koşullu hazır. Production deploy onayı değildir. Zorunlu eksikler: release provenance/approval ve güvenli artifact transfer, production worker issuance/lifecycle, distributed expected-base/fencing, Node 20 CI eşdeğerliği, gerçek Pages cache/purge/404 davranışı, production retry/observability/retention politikası ve storage power-loss garantileridir.

Pages deploy’u local pointer atomic rename’ine denk bir uçtan uca atomiklik garantisi değildir. CDN/browser cache eski REMOVE/RETRACT görünümü bırakabilir; fresh full package inventory, immutable asset/mutable HTML ayrımı ve post-promotion probes gerekir. Önerilen retention en az 30 gün ve son 3 doğrulanmış full pakettir; safety fences daha uzun korunur. Rollback paketi latest fences uygulanmadan promotion almamalıdır.

Son Git durumu: editorial main...origin/main temiz. Site pilot/6c2-site-consumer...origin/pilot/6c2-site-consumer; yukarıdaki 5 tracked değişiklik ve 6 untracked yeni dosya mevcut. HEAD/origin değişmedi, stage/commit yapılmadı.
