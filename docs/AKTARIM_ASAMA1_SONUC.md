# IVMOVA Aktarım Aşama 1 Sonuç

## Kapsam

- Doğru klasör doğrulandı: `C:\Users\PC\Desktop\ivmova.github.io`.
- Git remote doğrulandı: `mustafaacelikk/ivmova.github.io`.
- `AGENTS.md` bulunmadı.
- İkinci bir `ivmova.github.io` klasörü açılmadı; uygulama repo kökünde oluşturuldu.
- Commit, push, deploy, CNAME, workflow, DNS veya yayın işlemi yapılmadı.
- Tasarım yeniden düzenlenmedi.
- Güvenli bağımlılık güncellemesi olarak yalnızca `next` paketi npm audit önerisiyle `16.2.6` sürümünden `16.3.4` sürümüne yükseltildi.

## Değişen / Eklenen Dosyalar

- `app/` altında Next.js okuyucu uygulaması oluşturuldu.
- `public/` altına referans SVG varlıkları kopyalandı.
- `package.json`, `package-lock.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `.gitignore` eklendi.
- `app/published-news.ts` yerel demo içerik adaptörü olarak eklendi.
- `app/kategori/[slug]/CategoryClient.tsx` ile `?alt=` filtresi istemci tarafına taşındı.
- `app/olay-dosyasi-template.tsx` ile konu dosyası şablonu korundu; gerçek veri olmadığı için route üretilmedi.
- Next `Link` bileşenlerinde `prefetch={false}` kullanıldı; bu değişiklik görünümü değiştirmez, statik önizlemede dinamik rota `.txt` prefetch 404 konsol hatalarını engeller.
- `package.json` ve `package-lock.json` içinde `next@16.3.4` güncellemesi yapıldı.
- `docs/AKTARIM_ASAMA1_SONUC.md` bu rapor olarak güncellendi.

## Güvenlik Denetimi

Önceki audit sonucu `next@16.2.6` için 3 paket düzeyi bulgu raporlamıştı: `next` doğrudan, `postcss` ve `sharp` Next üzerinden dolaylı. `npm audit fix` ve `npm audit fix --force` kullanılmadan yalnızca npm audit'in önerdiği aynı majör içi `next@16.3.4` güncellemesi uygulandı.

| Paket | Durum | Şiddet | Etki | Güvenli düzeltme |
| --- | --- | --- | --- | --- |
| `next@16.3.4` | Doğrudan bağımlılık | Temiz | Audit sonrası `next` için açık kalmadı. Statik çıktı `output: "export"` ve `images.unoptimized: true` ile üretilmeye devam ediyor. | Uygulandı. |
| `postcss@8.5.23` / `8.5.26` | Dolaylı; `next` ve Tailwind hattı üzerinden | Temiz | Önceki PostCSS danışmaları lockfile'da Next hattında `8.5.23`, Tailwind hattında `8.5.26` ile temizlendi. Statik çıktıda çalışan bağımsız PostCSS servisi yok. | Uygulandı. |
| `sharp@0.35.4` | Dolaylı/opsiyonel; `next` üzerinden | Temiz | Önceki libvips/libheif danışmaları lockfile'da `sharp@0.35.4` ile temizlendi. Next image optimizer kullanılmıyor. | Uygulandı. |

Son audit komutu: `npm.cmd audit --json`

Son audit sonucu: `0` info, `0` low, `0` moderate, `0` high, `0` critical, toplam `0` vulnerability.

Uygulanmayanlar: `npm audit fix` ve `npm audit fix --force` çalıştırılmadı; majör sürüm değişikliği yapılmadı. React, React DOM, Tailwind, TypeScript ve scriptlerde değişiklik yapılmadı.

## Manifest ve Lockfile Kontrolü

- PASS: `package.json` içinde yalnızca `next` sürümü `16.3.4` oldu.
- PASS: `react@19.2.6`, `react-dom@19.2.6`, `tailwindcss@4.2.1`, `@tailwindcss/postcss@4.2.1` aynı kaldı.
- PASS: `scripts` alanı aynı kaldı; beklenmeyen script eklenmedi.
- PASS: `npm.cmd explain next` çıktısında `next@16.3.4` yalnızca root project bağımlılığı olarak görünüyor.
- PASS: Lockfile kontrolünde Next hattında `postcss@8.5.23`, Tailwind hattında `postcss@8.5.26` ve `sharp@0.35.4` çözümlendi.

## Demo Haber Etiketi

- PASS: Demo haberlerde `breaking:true` bulunmadı; demo veri setinde görünür "Son dakika" etiketi kapalı.
- PASS: Etiket bileşeni korundu: `app/page.tsx` ve `app/haber/[slug]/page.tsx` içinde yalnızca gelecekteki gerçek haberlerde `item.breaking` / `current.breaking` doğru olduğunda render ediliyor.
- PASS: Demo notu kontrol edildi. Haber detayı, yazarlar, yazar profili, yazı sayfası ve footer demo/yerel önizleme uyarılarını taşımaya devam ediyor.

## Çalıştırılan Komutlar

- `git status --short`
- `node --version` → önceki doğrulamada `v24.15.0`
- `npm --version` → önceki doğrulamada `11.12.1`
- `npm.cmd install next@16.3.4 --save-exact`
- `npm.cmd explain next`
- `npm.cmd explain react tailwindcss @tailwindcss/postcss`
- `npm.cmd audit --json`
- `npm.cmd run typecheck`
- `npm.cmd run build:pages`
- `npm.cmd run build:root`
- `rg` taramaları: `/api/news`, `breaking:true`, `Son dakika`, demo notları, Next `Link` kullanımları
- Python Playwright ile 390px ve 1440px temel tarayıcı smoke testi
- `python -m http.server 4173 -d out`
- `Invoke-WebRequest http://127.0.0.1:4173/`
- `Invoke-WebRequest http://127.0.0.1:4173/haber/enerji-donusumunde-yeni-donem/`
- `Invoke-WebRequest http://127.0.0.1:4173/kategori/enerji/?alt=Depolama`
- `Invoke-WebRequest http://127.0.0.1:4173/ivmova-wordmark.svg`

## Kabul Testleri

- PASS: `npm.cmd run typecheck`.
- PASS: `npm.cmd run build:pages`; Next `16.3.4` ile `/ivmova.github.io` basePath altında 32 statik sayfa üretildi.
- PASS: `npm.cmd run build:root`; Next `16.3.4` ile 32 statik sayfa üretildi.
- PASS: `npm.cmd audit --json`; toplam `0` vulnerability.
- PASS: Son `out/` klasörü root önizleme modunda bırakıldı.
- PASS: Çıktıda `/api/news` isteği yok.
- PASS: Demo göreli zamanları mutlak demo tarihlerine çevrildi.
- PASS: 6 ana kategori ve 28 alt kategori korundu.
- PASS: 9 demo haber, 3 demo yazar, 3 demo yazı, 7 kurumsal sayfa mevcut.
- PASS: Demo içerikte görünür "Son dakika" etiketi yok; bileşen gelecekteki gerçek haberler için korunuyor.
- PASS: Yerel HTTP kontrollerinde root modda ana sayfa, haber detayı, filtre URL'si ve logo varlığı 200 döndü.
- PASS: Yerel önizlemede `noindex, nofollow` metadata var.
- PASS: Yönetim paneli, kullanıcı, taslak, API anahtarı, veritabanı, Cloudflare veya kimlik doğrulama bağımlılığı eklenmedi.

## Tarayıcı Smoke Testi

Güncellemeden sonra Python Playwright ile 390px ve 1440px genişlikte temel smoke testi yapıldı.

- PASS: Ana sayfa açıldı; "Son dakika" etiketi demo içerikte görünmedi.
- PASS: Mobil menü 390px genişlikte açıldı.
- PASS: Slider nokta kontrolüyle manşet değiştirdi.
- PASS: Haber detayı açıldı.
- PASS: Kategori/alt kategori filtresi çalıştı; `Depolama` seçildikten ve sayfa yenilendikten sonra URL'de `alt=Depolama` korundu.
- PASS: 390px ve 1440px kontrollerinde yatay taşma raporlanmadı.
- PASS: Uygulama kaynaklı tarayıcı hatası `0`.
- UYARI: Dış `images.unsplash.com` görselleri bu ortamda Chromium tarafından `net::ERR_NETWORK_ACCESS_DENIED` ile engellendi; smoke testinde `54` Unsplash kaynaklı ağ olayı uygulama hatalarından ayrı raporlandı.

## BasePath Sonucu

- Kök mod: `npm.cmd run build:root` başarılı; son `out/` klasörü bu modla üretildi ve localhost kök önizlemesine uygun bırakıldı.
- GitHub proje yolu modu: `npm.cmd run build:pages` başarılı; `/ivmova.github.io` adresleri Playwright ile prefix eşlemeli yerel sunucuda test edildi.
- Basit `python -m http.server -d out` doğrudan `/ivmova.github.io/` prefix'ini dosya köküne eşlemez; bu yüzden pages modu ayrı prefix eşlemeli sunucuyla doğrulandı.

## Eksikler ve Notlar

- Canlı haber veritabanı, R2/görsel nesneleri ve konu dosyası verisi pakette yok; uydurma veri eklenmedi.
- Konu dosyası sayfa sözleşmesi `app/olay-dosyasi-template.tsx` içinde korundu, ancak gerçek veri gelmeden görünür rota/link üretilmedi.
- Haber görsellerinin mevcut harici Unsplash URL'leri korundu; bu ortamda dış ağ engeli nedeniyle tarayıcıda yüklenemedi.
- Künye ve hukuki metinlerde yayın öncesi tamamlanması gereken alanlar mevcut.
- `next@16.3.4` aynı majör içinde güvenli güncelleme olarak uygulandı.

## Yerel Önizleme

Statik çıktıyı root modda görüntülemek için:

```bash
python -m http.server 4173 -d out
```

Ardından:

```text
http://localhost:4173/
```

Test sırasında bu komutla yerel önizleme açıldı ve HTTP kontrollerinden sonra kapatıldı.

## 2026-09-22 Güvenlik Doğrulama Güncellemesi

Bu turda önce yalnızca istenen dosyalar ve repo durumu incelendi:

- `git status --short`: çalışma ağacı commitlenmemiş aktarım çıktısı olarak tamamen untracked dosyalardan oluşuyor.
- `git remote -v`: `https://github.com/mustafaacelikk/ivmova.github.io`.
- `package.json`, `package-lock.json`, `next.config.ts`, `IVMOVA_AKTARIM/ONCE_OKU.md`, `IVMOVA_AKTARIM/CODEX_ILK_ADIM.md` ve bu rapor okundu.
- `next` zaten `16.3.4` olduğu için `npm install`, `npm audit fix` veya `npm audit fix --force` çalıştırılmadı; paket sürümü değiştirilmedi.

### Sürüm ve Audit

- Önceki hedef sürüm: `next@16.3.4`.
- Mevcut doğrulanan sürüm: `next@16.3.4`.
- `npm.cmd list next --depth=0`: root projede `next@16.3.4`.
- `npm.cmd explain next`: `next@16.3.4` yalnızca root project bağımlılığı.
- İlk `npm.cmd audit --json` registry audit endpoint hatasıyla döndü; aynı komut ağ erişimiyle tekrarlandı.
- Son `npm.cmd audit --json`: `0` info, `0` low, `0` moderate, `0` high, `0` critical, toplam `0` vulnerability.

### Paket Farkı Kontrolü

- PASS: `package.json` içinde `next`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, TypeScript ve script alanlarında bu turda değişiklik yapılmadı.
- PASS: `package-lock.json` içinde root bağımlılıkları `package.json` ile uyumlu; `node_modules/next` kaydı `16.3.4`.
- PASS: Beklenmeyen paket, script veya yapılandırma değişikliği yapılmadı.

### Çalıştırılan Komutlar

- `git status --short`
- `git remote -v`
- `npm.cmd list next --depth=0`
- `npm.cmd explain next`
- `npm.cmd audit --json`
- `npm.cmd run typecheck`
- `npm.cmd run build:pages`
- `npm.cmd run build:root`
- `python -m http.server 4173 -d out`
- Python Playwright ile 390px ve 1440px smoke testi

### Test Sonuçları

- PASS: `npm.cmd run typecheck`.
- PASS: `npm.cmd run build:pages`; Next `16.3.4` ile `/ivmova.github.io` basePath altında 32 statik sayfa üretildi.
- PASS: `npm.cmd run build:root`; Next `16.3.4` ile 32 statik sayfa üretildi.
- PASS: Son `out/` klasörü `build:root` çıktısıyla localhost kök önizlemesine uygun bırakıldı.
- PASS: `npm.cmd audit --json`; toplam `0` vulnerability.
- PASS: 390px Playwright smoke: ana sayfa, mobil menü, slider, haber detayı, kategori/alt kategori filtresi ve yenileme.
- PASS: 1440px Playwright smoke: ana sayfa, slider, haber detayı, kategori/alt kategori filtresi ve yenileme.
- TEST EDİLMEDİ: 1440px mobil menü; desktop viewportta mobil menü görünmediği için kapsam dışı bırakıldı.
- PASS: 390px ve 1440px smoke sırasında yatay taşma görülmedi.
- PASS: Uygulama kaynaklı `pageerror`, konsol hatası veya dahili request failure görülmedi.
- UYARI: Her viewportta `images.unsplash.com` kaynaklı 9 dış ağ hatası görüldü; bunlar uygulama hatalarından ayrı raporlandı.

### Kalan Riskler

- Türkçe karakter şüphesi 2026-09-22 tarihli ek teşhisle yeniden incelendi. Kaynak dosyalarda ve üretilen HTML'de gerçek mojibake bulunmadı; önceki gözlem terminal/çıktı kodlaması kaynaklı yanlış alarm olarak sınıflandırıldı.
- Haber görselleri mevcut Unsplash URL'leriyle korunuyor; dış ağ engeli olan ortamlarda yüklenmeyebilir.
- Commit, push, deploy, GitHub Pages, CNAME veya domain işlemi yapılmadı.

## 2026-09-22 Türkçe Karakter Teşhisi

### Kök Neden

- Kaynak dosyalarda gerçek mojibake bulunmadı. `app/kategori/[slug]/CategoryClient.tsx` dahil uygulama kaynakları UTF-8 olarak geçerli decode edildi.
- `Get-Content` ve bazı Python/PowerShell terminal çıktılarında Türkçe metinlerin bozuk görünmesi dosya içeriğinden değil, terminal/stdout kod sayfası görüntülemesinden kaynaklandı.
- `out/index.html` ve `out/kategori/enerji/index.html` UTF-8 olarak decode edildi ve `<meta charSet="utf-8"/>` içerdiği doğrulandı.
- `python -m http.server` yanıt başlığı `Content-Type: text/html` döndürüyor; charset parametresi eklemiyor. Buna rağmen HTML içindeki UTF-8 meta mevcut ve Chromium metinleri doğru Unicode kodlarıyla render ediyor.

### Değişen Dosyalar

- Sadece `docs/AKTARIM_ASAMA1_SONUC.md` güncellendi.
- Uygulama kaynakları, paket sürümleri, referans klasörü, tasarım ve kategori yapısı değiştirilmedi.

### Düzeltilen Metinler

- Kaynak dosyada bozuk görünür Türkçe metin bulunmadığı için uygulama metni düzeltilmedi.
- `CategoryClient.tsx` içinde şu metinlerin doğru UTF-8 olduğu doğrulandı: `Tüm`, `henüz`, `içerik`, `göster`, `Dönüşümden diğer başlıklar`, `Ana sayfa →`, `·`, `Bilgilendirme`, `bölümdeki`, `danışmanlığı`, `alım-satım önerisi`, ay adları.

### Çalıştırılan Kontroller

- PASS: Kaynak UTF-8 taraması; invalid UTF-8 dosya yok, BOM yok.
- PASS: Mojibake kalıpları taraması; U+00C3, U+00C4, U+00C5, U+FFFD ve sık görülen bozuk UTF-8 dizileri uygulama kaynaklarında bulunmadı.
- PASS: U+00E2 karakteri ayrı incelendi; `zekâ`, `Rüzgâr`, `hâle` gibi doğru Türkçe kullanımlardan kaynaklanan yanlış pozitifler olduğu doğrulandı.
- PASS: `out/index.html` ve `out/kategori/enerji/index.html` UTF-8 decode edildi, HTML charset meta bulundu, mojibake kalıbı bulunmadı.
- PASS: `npm.cmd run typecheck`.
- PASS: `npm.cmd run build:pages`; 32 statik sayfa.
- PASS: `npm.cmd run build:root`; 32 statik sayfa ve son `out/` root önizleme modunda bırakıldı.
- PASS: Yerel HTTP kontrolünde ana sayfa ve `/kategori/enerji/?alt=Depolama` 200 döndü; header `Content-Type: text/html`, HTML meta `charSet="utf-8"`.
- PASS: Playwright 390px ve 1440px doğrudan URL kontrollerinde ana sayfa ve kategori/alt kategori sayfasında Türkçe metinler doğru Unicode kodlarıyla görüldü.
- PASS: Playwright kontrollerinde uygulama kaynaklı `pageerror`, konsol hatası veya dahili request failure görülmedi.
- UYARI: Unsplash görselleri dış ağ kısıtı nedeniyle bazı kontrollerde yüklenemedi; Türkçe karakter teşhisinden ayrı tutuldu.
- YANLIŞ POZİTİF: `out/_next/static/chunks/0cz1d0mv5g_q7.js` içinde bir `U+FFFD` bulundu; bağlamı Next/runtime URL decode fallback kodu, görünür IVMOVA metni değil.
