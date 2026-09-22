export type Writer = { slug: string; name: string; initials: string; role: string; expertise: string; bio: string };
export type Column = { slug: string; writerSlug: string; title: string; summary: string; published: string; body: string[] };

export const writers: Writer[] = [
  { slug: "selin-erdem", name: "Selin Erdem", initials: "SE", role: "Enerji sistemleri yazarı", expertise: "Elektrik piyasaları · Şebeke · Depolama", bio: "Enerji sistemleri, esneklik ve elektrik piyasalarının dönüşümü üzerine açıklayıcı yazılar kaleme alır." },
  { slug: "kaan-yildiz", name: "Kaan Yıldız", initials: "KY", role: "Teknoloji ve mobilite yazarı", expertise: "Yapay zekâ · Robotik · Elektrikli mobilite", bio: "Yeni teknolojilerin enerji, üretim ve ulaşım sektörlerindeki gerçek kullanım alanlarını değerlendirir." },
  { slug: "deniz-oral", name: "Deniz Oral", initials: "DO", role: "İklim politikaları yazarı", expertise: "Karbon düzenlemeleri · Sürdürülebilirlik", bio: "İklim politikalarının şirketler, ticaret ve enerji dönüşümü üzerindeki etkilerini inceler." },
];

export const columns: Column[] = [
  { slug: "depolama-yeni-sebeke-refleksi", writerSlug: "selin-erdem", title: "Depolama neden şebekenin yeni refleksi oluyor?", summary: "Yenilenebilir üretim arttıkça sistemin yalnızca daha fazla kapasiteye değil, daha hızlı tepki verebilen araçlara ihtiyacı var.", published: "13 Temmuz 2026, 10:30", body: ["Elektrik sisteminin dönüşümü yalnızca üretim kaynaklarının değişmesi anlamına gelmiyor. Üretim ile tüketim arasındaki dengenin daha kısa zaman aralıklarında kurulması gerekiyor.", "Depolama bu nedenle tek başına bir üretim yatırımı gibi değil, şebekenin esneklik araçlarından biri olarak ele alınmalı. Teknoloji seçimi kadar bağlantı noktası ve kullanım amacı da sonucu belirliyor.", "Bu yazı genel değerlendirme niteliğindedir; belirli bir proje veya yatırım için yönlendirme içermez."] },
  { slug: "yapay-zeka-sahaya-indiginde", writerSlug: "kaan-yildiz", title: "Yapay zekâ sahaya indiğinde ne değişiyor?", summary: "Algoritmanın değeri, gösterişli bir ekrandan çok doğru veriye ve çalışanların karar süreçlerine ne kadar iyi yerleştiğiyle ölçülüyor.", published: "12 Temmuz 2026, 16:15", body: ["Yapay zekâ projelerinin başarısı çoğu zaman modelin büyüklüğüyle değil, çözdüğü problemin ne kadar iyi tanımlandığıyla belirleniyor.", "Enerji ve üretim sahalarında kestirimci bakım, görüntü analizi ve talep tahmini öne çıkıyor. Ancak güvenilir veri, insan denetimi ve açık sorumluluklar olmadan pilot projeler kalıcı değere dönüşmüyor."] },
  { slug: "karbon-verisi-yeni-ticaret-dili", writerSlug: "deniz-oral", title: "Karbon verisi neden yeni ticaret diline dönüşüyor?", summary: "Emisyon verisi artık yalnızca sürdürülebilirlik raporlarının değil, tedarik ilişkilerinin de parçası.", published: "11 Temmuz 2026, 09:40", body: ["Karbon düzenlemeleri şirketlerden yalnızca bir toplam emisyon rakamı istemiyor. Verinin nasıl üretildiği, doğrulandığı ve ürünlere nasıl dağıtıldığı giderek önem kazanıyor.", "Bu değişim, sürdürülebilirlik ekipleriyle satın alma, üretim ve finans birimlerinin aynı veri düzeninde çalışmasını gerektiriyor."] },
];

export const writerBySlug = (slug: string) => writers.find((writer) => writer.slug === slug);
export const columnBySlug = (slug: string) => columns.find((column) => column.slug === slug);
