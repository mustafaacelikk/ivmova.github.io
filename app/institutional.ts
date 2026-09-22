export type InstitutionalSection = { title: string; paragraphs?: string[]; items?: string[]; emphasizeInitials?: boolean };
export type InstitutionalPage = { title: string; kicker: string; intro: string; updated?: string; sections: InstitutionalSection[] };

export const institutionalPages: Record<string, InstitutionalPage> = {
  hakkimizda: { title: "Hakkımızda", kicker: "IVMOVA", intro: "Enerji, enerji piyasaları, teknoloji, mobilite ve iklim alanlarını birlikte izleyen bağımsız bir dijital yayın girişimiyiz.", sections: [
    { title: "Ne yapıyoruz?", paragraphs: ["Gelişmeleri kaynaklarına sadık biçimde aktarır; analizleri ve uzman görüşlerini haberlerden ayrı alanlarda yayımlarız. Aynı konuya ilişkin gelişmeleri zaman içinde bir araya getirerek gündemin izini sürmeyi kolaylaştırırız."] },
    { title: "Manifestomuz", emphasizeInitials: true, items: ["İz — Gelişmelerin yalnızca anını değil, zaman içindeki izini süreriz.", "Veri — Haberleri doğrulanabilir bilgiye ve görünür kaynaklara dayandırırız.", "Merak — Görünenle yetinmez, doğru soruların peşinden gideriz.", "Olgu — Haberi yorumdan; analizi görüşten açık biçimde ayırırız.", "Vicdan — Tık uğruna yanıltmaz, büyütmez ve okurun zamanını boşa harcamayız.", "Anlam — Dağınık gelişmeleri bağlantılarıyla birlikte anlaşılır hâle getiririz."] },
    { title: "Yayın yaklaşımımız", items: ["Başlıkta vaat edilen bilgiyi içerikte açıkça sunmak", "Kaynağı ve önemli güncellemeleri görünür kılmak", "Haber, analiz, görüş ve ticari içeriği birbirinden ayırmak", "Hataları açık ve izlenebilir biçimde düzeltmek"] },
    { title: "Mevcut durum", paragraphs: ["IVMOVA geliştirme aşamasındadır. Sitede şu anda yayın yapısını göstermek amacıyla hazırlanmış demo içerikler kullanılmaktadır."] },
  ] },
  iletisim: { title: "İletişim", kicker: "Bize ulaşın", intro: "Haber önerileri, düzeltme talepleri, yazar başvuruları ve kurumsal iletişim için bize yazabilirsiniz.", sections: [
    { title: "E-posta", paragraphs: ["iletisim@ivmova.com"] },
    { title: "Başvurunuzda bulunması yararlı bilgiler", items: ["İlgili içeriğin bağlantısı", "Talebin kısa ve açık açıklaması", "Varsa doğrulayıcı belge veya birincil kaynak", "Yanıt için iletişim bilgisi"] },
    { title: "Not", paragraphs: ["Gönderilen içerik ve öneriler otomatik olarak yayımlanmaz. Editoryal değerlendirme ve doğrulama süreçlerinden geçirilir."] },
  ] },
  "yayin-ilkeleri": { title: "Yayın İlkeleri", kicker: "Editoryal güven", intro: "IVMOVA’nın haber, analiz ve görüş içeriklerinde uygulamayı taahhüt ettiği temel editoryal ilkeler.", updated: "31 Ağustos 2026", sections: [
    { title: "Başlık ve içerik", items: ["Başlıkta ne yazıyorsa haberde o vardır.", "Merak uyandırmak uğruna içeriği çarpıtan, eksik bırakan veya abartan başlıklar kullanmayız.", "Okurun zamanını tıklama sayısından daha değerli kabul ederiz."] },
    { title: "Doğruluk ve kaynak", items: ["Bilgileri mümkün olduğunca birincil ve güvenilir kaynaklarla doğrularız.", "Kaynağı belirsiz iddiaları kesin bilgi gibi sunmayız.", "Haberin yayımlanmasından sonra ortaya çıkan önemli gelişmeleri güncelleme bilgisiyle ekleriz."] },
    { title: "Haber, analiz ve görüş ayrımı", items: ["Haberlerde kaynaklara sadık kalır, editoryal yorumu haber metnine karıştırmayız.", "Analiz ve görüş içeriklerini açık biçimde etiketleriz.", "Yazar görüşlerinin IVMOVA’nın kurumsal görüşünü temsil etmek zorunda olmadığını belirtiriz."] },
    { title: "Düzeltme ve cevap hakkı", items: ["Kişi ve kuruluşlara yönelik ciddi iddialarda yanıt hakkını gözetiriz.", "Maddi hataları görünür ve izlenebilir biçimde düzeltiriz.", "Önemli güncellemeleri içerik üzerinde tarih bilgisiyle belirtiriz."] },
    { title: "Çıkar ilişkileri", paragraphs: ["Editoryal kararların reklam, sponsorluk veya ticari ilişkiler tarafından yönlendirilmesine izin vermeyiz. Sponsorlu içerikler açık biçimde etiketlenir."] },
  ] },
  "duzeltme-ve-cevap-hakki": { title: "Düzeltme ve Cevap Hakkı", kicker: "Şeffaflık", intro: "Yanlış veya eksik bilgilerin hızlı, görünür ve izlenebilir biçimde düzeltilmesini amaçlarız.", updated: "13 Temmuz 2026", sections: [
    { title: "Düzeltme talebi", paragraphs: ["Düzeltme taleplerini içerik bağlantısı, itiraz edilen bölüm ve doğrulayıcı kaynaklarla birlikte iletisim@ivmova.com adresine gönderebilirsiniz."] },
    { title: "Değerlendirme", items: ["Başvuruyu içerik ve kaynaklarıyla birlikte inceleriz.", "Maddi hata varsa içeriği düzeltir ve önemli değişikliklerde güncelleme notu yayımlarız.", "Ciddi iddialardan etkilenen kişi ve kuruluşların makul cevap hakkını gözetiriz."] },
    { title: "Kayıt", paragraphs: ["Başlık, anlam veya sonuç üzerinde etkili düzeltmeler içerik üzerinde görünür biçimde belirtilir. Yazım düzeltmeleri gibi anlamı değiştirmeyen küçük değişiklikler ayrıca listelenmeyebilir."] },
  ] },
  gizlilik: { title: "Gizlilik ve Çerez Politikası", kicker: "Kişisel veriler", intro: "Bu metin IVMOVA’nın ziyaretçi verileri ve çerezlere ilişkin temel yaklaşımını açıklar. Kullanılan teknik hizmetler kesinleştiğinde ayrıntılar güncellenecektir.", updated: "13 Temmuz 2026", sections: [
    { title: "Toplanabilecek veriler", items: ["Site güvenliği ve hata kayıtları için teknik günlük verileri", "İletişim formu veya e-posta yoluyla sizin ilettiğiniz bilgiler", "Açık rıza verilirse ölçümleme ve tercih çerezleri"] },
    { title: "Kullanım amaçları", paragraphs: ["Veriler siteyi güvenli biçimde işletmek, taleplere yanıt vermek, performansı ölçmek ve hukuki yükümlülükleri yerine getirmek amacıyla kullanılabilir."] },
    { title: "Çerezler", paragraphs: ["Zorunlu çerezler hizmetin çalışması ve güvenliği için kullanılabilir. Zorunlu olmayan ölçümleme veya reklam çerezleri devreye alınmadan önce uygun onay mekanizması kurulacaktır."] },
    { title: "Hak ve talepler", paragraphs: ["Kişisel verilerinizle ilgili taleplerinizi iletisim@ivmova.com adresine iletebilirsiniz. Veri sorumlusu ve saklama süreleri, yayın sahibi tüzel yapı kesinleştiğinde bu sayfada ayrıntılandırılacaktır."] },
  ] },
  "kullanim-kosullari": { title: "Kullanım Koşulları", kicker: "Site kullanımı", intro: "IVMOVA’yı kullanarak bu sayfada belirtilen temel koşulları kabul etmiş olursunuz.", updated: "13 Temmuz 2026", sections: [
    { title: "İçeriklerin niteliği", paragraphs: ["İçerikler genel bilgilendirme amacı taşır. Hukuki, mali, teknik veya yatırım danışmanlığı yerine geçmez."] },
    { title: "Fikrî haklar", paragraphs: ["Aksi belirtilmedikçe IVMOVA’ya ait özgün metin ve tasarımlar izin alınmadan ticari amaçla çoğaltılamaz. Haberlerin kısa alıntılarla, kaynak ve bağlantı verilerek paylaşılması mümkündür."] },
    { title: "Dış bağlantılar", paragraphs: ["Başka sitelere verilen bağlantılar bilgilendirme amaçlıdır. Bu sitelerin içerik ve güvenliğinden IVMOVA sorumlu değildir."] },
    { title: "Değişiklikler", paragraphs: ["Koşullar hizmet ve mevzuat değişikliklerine göre güncellenebilir. Güncel metin ve tarih bu sayfada yayımlanır."] },
  ] },
  kunye: { title: "Künye", kicker: "Yayın bilgileri", intro: "IVMOVA’nın yayın ve iletişim bilgileri. Tüzel yapı kesinleştiğinde zorunlu bilgiler yayın öncesinde tamamlanacaktır.", sections: [
    { title: "Yayın", items: ["Yayın adı: IVMOVA", "Yayın türü: Dijital süreli yayın — yayın öncesi teyit edilecek", "İnternet adresi: ivmova.com", "İletişim: iletisim@ivmova.com"] },
    { title: "Sorumlular", items: ["Yayın sahibi: Yayın öncesinde eklenecek", "Sorumlu yazı işleri müdürü: Yayın öncesinde eklenecek", "Genel yayın yönetmeni: Yayın öncesinde eklenecek", "Yönetim yeri ve adres: Yayın öncesinde eklenecek"] },
    { title: "Teknik ve hukuki bilgiler", paragraphs: ["Barındırma sağlayıcısı, yer sağlayıcı bilgileri ve gerekli resmî bildirimler yayın altyapısı kesinleştiğinde bu alana eklenecektir."] },
  ] },
};

export const institutionalLinks = [
  ["Hakkımızda", "hakkimizda"], ["İletişim", "iletisim"], ["Yayın İlkeleri", "yayin-ilkeleri"], ["Düzeltme ve Cevap Hakkı", "duzeltme-ve-cevap-hakki"], ["Gizlilik ve Çerez", "gizlilik"], ["Kullanım Koşulları", "kullanim-kosullari"], ["Künye", "kunye"],
] as const;
