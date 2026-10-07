# Publication Site Staging ve Recovery — 6C-3

Bu katman tek host üzerindeki güvenilir, işbirliği yapan yerel writer process’leri içindir. Production transfer, Supabase erişimi veya Pages deploy’u yapmaz. Consumer’ın contract/hash kontrolleri, FULL omission fence’leri, RETRACT notice’ları ve REMOVE tombstone’ları korunur.

## Lock ve fencing

scripts/publication-transaction.mjs import.lock dosyasını exclusive wx ile oluşturur; içerik yalnız operationId, processId, startedAt ve generation metadata’sıdır. İki writer aynı store’a yazamaz. Lock sahibi PID yaşadığı sürece recovery reddedilir; PID yeniden kullanımında güvenli tercih reddetmektir. Yaş/lease süresi tek başına lock silme yetkisi değildir. Lock başarılı veya yakalanan başarısız işlem sonunda ownership doğrulanarak kaldırılır; process ölümünde kalır.

Her writer/rollback/recovery için append-only generations kayıtları ve generation-head.json checksum head’i vardır. Kesintisiz sıra, önceki kayıt hash’i ve head eşleşmesi doğrulanır; current pointer generation’ı ledger’dan ileride olamaz. Bozuk/geriye alınmış counter fail-closed olur. Replay writer lock’u alıp generation tüketebilir, fakat release veya current pointer değiştirmez. Recovery/unlock da generation tüketir. Swap hemen öncesinde operationId/PID/generation ownership, ledger head’i ve beklenen base pointer yeniden doğrulanır.

Bu mekanizma distributed fencing veya kötü niyetli OS kullanıcısına karşı bir güvenlik sınırı değildir. Store’a yalnız yetkili yerel kullanıcı yazmalıdır. Journal/ledger/head yazımı arasındaki torn metadata veya gerçek güç kesintisi otomatik tamir edilmez; belirsizlik forensic inceleme gerektirir. Dosyalarda fsync/readback uygulanır; Windows dizin fsync’i ve disk güç kaybı garantisi bu testlerin kanıtı değildir.

## Durable journal

operation.json yalnız operation/generation, phase, release hash kimliği, stage adı ve base/next pointer metadata’sı taşır. Haber metni, receipt veya credential içermez. Aşamalar prepared → staged → verified → swap_started → committed; rollback başlangıcı rollback_started, terminali rolled_back. Immutable release state/record dosyaları fsync ve byte/hash readback ile doğrulanmadan current pointer değişmez. Receipt internal immutable record içinde swap öncesinde zaten tamamdır.

Pre-swap crash son doğrulanmış current’ı korur. Post-swap crash current’ın journal next pointer’ına eşitliğiyle anlaşılır; committed işlem ikinci kez uygulanmaz. Recovery sırasında da yeni generation ve journal update kullanılır. Partial stage yalnız bilinen state.json/record.json dosyalarıyla temizlenebilir; yabancı dosya veya symlink reddedilir. Immutable orphan release güvenli retry/denetim için tutulabilir; public pakete girmez.

## Açık CLI

Komutlar varsayılan private .publication-local store’u kullanır:

- npm run publication:state: doğrulanmış state metadata’sı.
- npm run publication:lock: lock/PID/journal metadata’sı; salt okunur.
- npm run publication:recovery-plan: dry-run, decision, izinli actions ve planHash.
- npm run publication:recover -- resume <planHash>: verified pending release’i devam ettir veya zaten swap olmuş işlemi yalnız tamamla.
- npm run publication:recover -- abort <planHash>: pre-swap işlemi iptal et, doğrulanmış base/current’ı koru. Bu recovery rollback kararının karşılığıdır; committed işlemi geriye almaz.
- npm run publication:recover -- unlock <planHash>: journalsız, PID’si doğrulanmış ölü stale lock için açık recovery.
- npm run publication:rollback: previous state’e mevcut safety fences’i uygular; yeni generation, immutable release ve journal ile yayınlar.

recover mutation’dan önce hedefi ve mevcut planı yazdırır; verilen planHash tam eşleşmelidir. Plan değişmişse yeniden inceleme gerekir. Aktif writer, belirsiz pointer, operation.json.next veya bozuk metadata için otomatik mutation yoktur. Recovery’yi başarılı operation sırasında çağırmayın. Import/rollback/recovery işlemleri tek store içinde serileşir; bağımsız build’ler ayrı TEMP checkout/output kullanmalıdır. Build ilk okuduğu doğrulanmış immutable snapshot’ı normalize eder; build boyunca production promotion yetkisi yoktur.

## Replay ve retry

Aynı runId + aynı doğrulanmış manifest SHA-256 replay=true döner; yeni release üretilmez, geri alınmış eski release yeniden uygulanmaz. Aynı runId + farklı geçerli payload RUN_CONFLICT olur. Timestamp, contract/schema/hash, revision ve tombstone kontrolleri korunur. Replay geçmişi ve immutable IMPORT kayıtları rollback’te kaybolmaz.

Yalnız EBUSY/EAGAIN/EMFILE/ENFILE I/O hataları en fazla üç denemede, 10 ve 20 ms deterministik beklemeyle retry edilir. EACCES, schema/hash/semantic hatalar retry edilmez. Bütün hata türleri transient sayılmaz; errno listesini genişletmek ayrı karar gerektirir. Exhausted swap current’ı korur, journal explicit recovery ister. Fallback veya sınırsız retry yoktur.

## Yerel staging

npm run test:publication-consumer ve npm run test:publication-recovery consumer/safety regresyonlarını sentetik TEMP girdilerle çalıştırır. Recovery suite gerçek ayrı Node process’leriyle lock/concurrency/crash test eder. Fault injection yalnız test-publication-writer.mjs ve test process içindeki fs interception’dır; production consumer’da env switch veya fault CLI seçeneği yoktur. Test writer yalnız özel ivmova-recovery-test TEMP root kabul eder.

npm run test:publication-builds kaynak ve yerel bağımlılıkları fiziksel bağımsız TEMP reader’a kopyalar. Kullanıcının out/.next çıktıları korunur. TEMP kopyadan production CNAME çıkarılır; origin açık localhost’tur. Dış HTTP/HTTPS/fetch/TCP ağ girişimleri engellenir; yalnız loopback compiler ve staging açıktır. Synthetic FULL recovery → INCREMENTAL → rollback → RETRACT → REMOVE → safety rollback ve empty export build’leri doğrulanır.

publication-static-staging.mjs yalnız owned build TEMP out’u 127.0.0.1 üzerinde ephemeral port’ta sunar. HTTP ana sayfa/kategori/detay, notice, REMOVE 404, sitemap, asset ve static data yolları kontrol edilir. Sunucu test sonunda kapanır. Public paket tüm HTML/JS/JSON/XML/TXT dosyalarında internal metadata/credential ve demo slug sızıntısı için taranır. Next’ın statik data payload’ı her sürümde .json olmayabilir; mevcut sürümde .txt/RSC dosyası da gerçek HTTP ile doğrulanır.

## Pages, cache ve retention sınırı

Mevcut output:export, trailingSlash ve boş basePath custom-domain kök URL yapısına uygundur. Bu yalnız yerel çıktı kanıtıdır; DNS/Pages ayarı veya canlı CDN davranışı doğrulanmadı. Her build temiz, yeni TEMP out üretir; önceki REMOVE Story dosyası yeni pakete taşınmaz. Production CNAME ve deploy workflow değiştirilmez/çalıştırılmaz.

Hash adlandırılmış /_next/static asset’leri immutable uzun cache için uygundur. HTML, sitemap, route data ve varsa public release pointer/manifest mutable’dır; kısa TTL/revalidation ve release sonrasında REMOVE/RETRACT route’ları ile listeler/sitemap için kontrollü purge gerekir. Yerel staging immutable asset / no-cache HTML header ayrımını test eder; bu header’lar GitHub Pages tarafından aynen sunulacak bir konfigürasyon değildir. Pages’te custom Cache-Control ve purge imkanları ayrıca kanıtlanmalıdır; Service Worker/edge/browser cache eski haber gösterebilir.

Tek local current pointer rename’i end-to-end Pages deploy atomikliği anlamına gelmez. CDN propagation ve açık browser tab’ları arasında eski/yeni HTML/asset karışımı mümkündür. 6C-4 için signed/verifiable release provenance, fresh output inventory, post-promotion route probes ve cache/404 acceptance kapısı gereklidir; production workflow bu turda etkinleştirilmez.

Öneri: current ve last-known-good tam statik paket, normalized snapshot, immutable state/record, manifest/receipt hash kayıtları, build toolchain/lockfile checksum’ları, route inventory, generation/recovery metadata ve approval kaydını en az 30 gün ve en az son 3 doğrulanmış release için saklayın. REMOVE/RETRACT fences retention dışına çıkarılmamalı. Eski rollback paketi güvenli lifecycle kararlarını geri getirebilir; promotion öncesi latest fences ile yeniden güvenli paket oluşturulmalı. Bu süre politika önerisidir, uygulanan production retention değildir; gerçek silme/retention otomasyonu yoktur.

## 6C-4 kapısı

Yerel güvenlik pilotu production readiness incelemesine adaydır. Production transfer/issuance, expected-base delta contract, distributed writer modeli, gerçek Pages cache/404 davranışı, Node 20 CI eşdeğerliği, approval/promotion/provenance ve güç kesintisi/storage garantileri tamamlanmadan deploy hazır sayılmaz. Kontrollü readiness analizi yapılabilir; main merge veya deploy bu komutlarla otomatik yetkilendirilmez.
