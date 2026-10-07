# IVMOVA — Aşama 6C-2 Yerel Site Consumer Doğrulama Raporu

Tarih: 7 Ekim 2026 (Europe/Istanbul). Sonuç: **6C-3 kontrollü staging/recovery aşamasına hazır; production deploy için hazır değil.** Bu tur yalnız yerel/sentetik uygulama ve doğrulama içerir.

## Başlangıç durumu ve koruma

İki repo main üzerinde temizdi ve HEAD yerel origin/main ile eşitti. Editorial HEAD 335e006a411941c9f6b52e0b8a813b3b2fc6ded8, etiketi checkpoint-public-site-analysis-v1; site HEAD 219da079f319ecedb94f7af45f6e1b115cceeaff. Remote’lar sırasıyla mustafaacelikk/ivmova-editorial ve mustafaacelikk/ivmova.github.io olarak doğrulandı. Site teknik spesifikasyonu tracked ve korunmuştur. Fetch yapılmadı; remote-tracking eşitliği uzak anlık GitHub doğrulaması değildir.

Editorial repo salt okunur sözleşme kaynağı olarak kullanıldı. Canlı inbox/state SHA-256 değerleri:

- Inbox: `3FE3A8A52EE2351DCD8A8764932E7B5E30F9F15E3BF907871877C577B8BC98D4`
- State: `54FC38C69746CE3C4F36DE2D0DAB950CE21B9C6C88FD3A633FD4F6651765FFD1`

## Oluşturulan ve dar güncellenen dosyalar

- contracts/publication-v2/: Story v1, input/manifest/receipt/REMOVE proof v2 şemaları ve contract-manifest.json.
- scripts/publication-contract.mjs: pinned kapalı validator, canonical byte/content hash ve güvenli JSON parsing.
- scripts/publication-consumer.mjs: importer, immutable local release state, action reducer ve rollback alt komutu.
- scripts/publication-build.mjs ve .d.mts: build/typecheck öncesi explicit mod hazırlığı.
- scripts/publication-fixtures.mjs; tests/fixtures/publication/: FULL, INCREMENTAL, rollback sonrası yeni INCREMENTAL, RETRACT, REMOVE ve boş sentetik paketler.
- scripts/test-publication-consumer.mjs, test-publication-builds.mjs, publication-no-network.mjs: assertion ve izole build/çıktı testleri.
- app/site-news.ts, app/sitemap.ts, public/publication-placeholder.svg.
- Dar güncellemeler: app/data.ts, app/published-news.ts, app/page.tsx, app/components/SiteChrome.tsx, app/haber/[slug]/page.tsx, app/kategori/[slug]/CategoryClient.tsx, app/not-found.tsx, next.config.ts, package.json ve .gitignore.
- docs/PUBLICATION_SITE_CONSUMER.md ve bu rapor.

Workflow, CNAME, dependency sürümleri/package-lock ve mevcut demo haber içeriği değiştirilmedi. Source out/.next ve diğer önceki ignored yerel çıktılar kullanılmadı veya temizlenmedi; bu turun build’leri bağımsız TEMP kopyalarında yapıldı.

## Contract pin ve bağımsızlık

Şemalar editorial checkpoint’inden byte olarak kopyalandı; site build’i editorial klasörüne bağımlı değildir. Kaynak commit ve beş dosyanın ayrı SHA-256 değerleri contract-manifest.json içinde bulunur. Validator hem bu beş şema byte’ını hem contract manifest byte’ını embedded pin ile doğrular. Manifest SHA-256: `6c896f7fd0c1921555eee4a06a2ce8bcccbe5e01530308034639a4297d2cd473`.

Export schemaVersion=2, public Story schemaVersion=1, receipt/proof contractVersion=2 açık ayrıdır. Bilinmeyen sürüm/ref/format/validator keyword fail-closed reddedilir. Validator genel Draft 2020-12 motoru değil, pinned sözleşmelerin incelenmiş kapalı alt kümesidir.

## Import ve integrity mimarisi

Input root yalnız tek manifest ve UPSERT/RETRACT Story dosyalarından oluşur; optional detached receipt.json varsa exact doğrulanır. Generator receipt’i ayrı disk dosyası yazmadığından, sidecar yoksa doğrulanmış byte’lardan eşdeğer internal receipt türetilir. Bu işlem gerçek deploy alındısı üretmez. Public output’a receipt, audit veya internal release state kopyalanmaz.

Ancestor/entry symlink, unsafe relative artifact path, absolute/URL/backslash/traversal, extra/missing dosya ve alan, duplicate JSON key, BOM/bozuk UTF-8, duplicate Story ID/slug/path, unknown action/dil/kategori reddedilir. Input sınırı 1002 dosya/16 MiB; directory depth/entry sınırı da vardır. Current state için 1000 Story/2000 fence/10000 run kaydı üst sınırı uygulanır.

Item/action sayaçları, Story identity/path/action, güvenli retraction, source cardinality/benzersizlik, timestamps, canonical JSON, artifact SHA-256/byte length, Revision contentHash ve REMOVE proof/hash doğrulanır. Revision hash Story dosya byte hash’i yerine kullanılmaz; manifest kendi hash’ini içermez. Canonical JSON UTF-8/BOM’suz, compact, alfabetik object key ve tek LF ile yazılır.

Output güvenilir private .publication-local deposudur; test store yalnız OS TEMP altındadır. Exclusive local lock, immutable stage, fsync/readback ve tek current.json pointer’ının atomik replace’i kullanılır. Başarısız import/swap current’ı değiştirmez. Swap öncesi tamamlanmış orphan release aynı byte/hash ile doğrulanırsa güvenli retry ile yeniden kullanılabilir. Generated/internal klasörler .gitignore kapsamındadır.

## Alan, kategori ve route eşlemesi

| Export | Site kararı |
| --- | --- |
| storyId / slug | stable public id; /haber/<slug>/ |
| headline / standfirst | title / summary; null spot boş görünüm |
| bodyMarkdown | mevcut güvenli ArticleBody için satır dizisi; ham HTML text olarak escape edilir |
| language | yalnız tr; en ve diğerleri açık reddedilir |
| primaryCategory | Enerji/enerji, Enerji Piyasaları/piyasalar, Teknoloji/teknoloji, Mobilite/mobilite, İklim/iklim, Analiz/analiz allowlist’i |
| publishedAt / updatedAt | ISO alanları ve LocalDateTime; kategori/detay ISO timestamp sıralaması |
| sources | kaynak adı, başlık, URL, tarih ve rol korunur/gösterilir |
| image / byline / subcategory / priority yokluğu | lisanslı kendi nötr SVG, boş byline/alt kategori, priority=0 ve breaking=false; kişi/önem/görsel uydurulmaz |

Liste, header, kategori, detay, static params ve sitemap ortak normalize consumer üzerinden gelir. Demo dizisi korunur. Demo varsayılan açık moddur; publication modu seçildiğinde missing/tampered current state demo fallback yapmaz, build durur. Publication origin yalnız açık loopback staging origin’i olabilir; Supabase/worker credential gerekmez.

## FULL / INCREMENTAL ve action davranışları

FULL tam current set beyanı olarak yeniden kurar. Önceki aktif Story FULL’de yoksa internal omission fence/implicitRemovals kaydı tutulur; producer REMOVE proof’u gibi sunulmaz. Eski REMOVE/RETRACT fences korunur. Parsiyel liste FULL diye verilmemelidir. INCREMENTAL doğrulanmış base current state gerektirir; generatedAt yüksek su işaretinden yeni olmalı, run replay/slug kimlik çakışması ve eski/çelişkili revision reddedilir.

UPSERT liste/detay/static params’a girer. RETRACT güvenli notice route’unu tutar, yayımlanan liste/header/sitemap’te yer almaz. REMOVE Story üretmez, route/liste/kategori/sitemap/static params’tan çıkar; internal tombstone kalır. Pilot REMOVE/RETRACT sonrası UPSERT yeniden yayımlamasını fail-closed reddeder.

Boş yayın listesi güvenli render edilir. Kurulu Next 16.3.4 static export kodu boş generateStaticParams dizisini reddettiğinden yalnız __ivmova_empty__ reserved notFound kontrol parametresi kullanılır. Bu değer public Story slug şemasında geçersizdir; sahte Story/demo veri yaratılmaz, normalize route data ve sitemap boş kalır.

## Rollback ve release kaydı

Her import runId, contractVersion, generatedAt, manifest SHA-256/byte length, previous release, action sayaçları ve internal receipt kaydı tutar. Immutable previous release korunur; current state/record digest’leri pointer’a bağlanır. Yerel publication:rollback komutu previous snapshot’a current fences’i yeniden uygular ve atomik pointer değiştirir. High watermark/replay geçmişi geriye düşmez.

Yeni güvenlik kararı yoksa rollback sonrası raw state SHA-256 ve public normalize byte/state eşitliği doğrulandı. Daha yeni RETRACT/REMOVE/FULL omission varsa önceki unsafe içerik geri gelmez; bu durumda farklı state hash’i bilinçli güvenlik sonucudur. Rollback kaydı operation/target ile ayrıdır; saklanan export receipt yeni deploy/export receipt’i diye gösterilmez.

## Gerçek yerel doğrulama sonuçları

Node v24.15.0; Next 16.3.4. Tüm input’lar sentetiktir.

| Kontrol | Gerçek sonuç |
| --- | --- |
| Consumer negatif/pozitif testleri | 71 assertion, PASS |
| İzole Next build + public output taraması | 8010 assertion, PASS |
| Başarılı production build’leri | demo, full, incremental, rollback, retract, remove, safety-rollback, empty |
| Beklenen build reddi | missing-input ve tampered-input; 2 |
| TypeScript | İzole tsc --noEmit --incremental false PASS; final Next build’leri de TypeScript aşamasından geçti |
| MJS syntax | Consumer/contract/build ve test scriptlerinde node --check PASS |
| Offline npm audit | 0 bulgu bildirildi; boş izole cache/harici advisory yok, güncel güvenlik kanıtı değildir |
| Dış ağ koruması | External request/fetch/TCP engeli açık; Next compiler loopback IPC’si açık; external deny marker gözlenmedi |

Consumer testleri FULL/INCREMENTAL, RETRACT/REMOVE, replay/tombstone/FULL omission, boş state, unknown/extra/missing/hash/byte/duplicate/path/symlink, missing Story, receipt mismatch, UTF-8/BOM, sınırlar, deterministic output, failure preservation, swap failure/retry ve rollback SHA/state eşitliğini kapsadı.

Build’lerde gerçek HTML/static routes/sitemap ve tüm public çıktı dosyaları tarandı. Fixture script metni HTML’de escape edilerek gösterildi; JS/RSC veri string’i yürütülebilir HTML ile karıştırılmadı. Receipt/hash/audit/tombstone kayıt alanları public output’ta bulunmadı. REMOVE hedef route’unun işlem öncesi varlığı, işlem sonrası yokluğu ve safety rollback ile geri gelmemesi ayrıca doğrulandı.

İlk izolasyon denemesinde Turbopack dependency junction’ı reddetti; runner fiziksel yerel dependency kopyasına geçirildi. Sitemap force-static ve boş route export kısıtı yerel paket kanıtıyla çözüldü. Son final seri exit 0 ile tamamlandı; bunlar kalan ürün hatası değildir.

## Temizlik ve kalan production riskleri

Runner her başarı/hata sonunda yalnız kendisine ait, absolute boundary doğrulanmış TEMP site/build/store/fixture çıktısını temizledi; final TEMP_BUILD_CLEANUP_OK doğrulandı. Kaynak out/.next/node_modules ve eski yerel çıktılar korundu. Staging kopyasında production CNAME çıkarıldı; kaynak public/CNAME ve workflow değişmedi.

Production worker issuance/lifecycle, distributed expected-base/fencing/concurrency, süreç ölümü/stale lock/power-loss recovery, gerçek Pages/CDN cache/404/retention, yetkili transfer provenance ve kontrollü release promotion ayrı 6C-3/production çalışmasıdır. Build ve import bu pilotta seri yürütülür; active build sırasında current değiştirme orchestration’ı doğrulanmadı. CI Node 20 ile gerçek Actions çalıştırması yapılmadı. TR dışı dil, lisanslı gerçek görsel/byline/editoryal sıralama ve hosted staging ayrı onaylı kapsama alınmalıdır.

Supabase/SQL, gerçek worker login/JWT, gerçek publication export/artifact, GitHub Actions tetikleme, canlı site/DNS değişikliği, commit/push/tag/deploy yapılmadı. Editorial repo değiştirilmedi.

Karar: **6C-3 staging/recovery doğrulaması için hazır.** Hazır olan sınır sentetik yerel consumer + Next statik build + güvenli rollback’tir; production yayın yetkisi değildir. Son Git/hash/diff ve belge hassas değer taraması sonucu kısa final yanıtta verilir.
