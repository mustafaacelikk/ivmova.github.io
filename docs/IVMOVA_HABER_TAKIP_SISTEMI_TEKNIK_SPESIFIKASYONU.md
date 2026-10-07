IVMOVA Haber Takip Sistemi
Bu doküman hedef mimariyi tanımlar. Mevcut çalışan kodu topluca değiştirme veya majör refactor talimatı değildir. Özellikler fazlar hâlinde ve her faz ayrıca onaylanarak uygulanır.
Teknik Gereksinim ve Uygulama Spesifikasyonu
1. Amaç
Bu dokümanın amacı IVMOVA haber portalının:
•	haber kaynaklarını toplaması,
•	haber adaylarını sınıflandırması,
•	aynı olaya ait içerikleri gruplayabilmesi,
•	haberleri doğrulayabilmesi,
•	editöre sınırlı sayıda değerli içerik sunabilmesi,
•	yayımlanan haberleri takip etmeye devam etmesi,
•	yeni gelişmeleri mevcut haberlerle ilişkilendirmesi,
•	haber geçmişini ve değişiklik izini koruması
için gerekli teknik yapıyı tanımlamaktır.
Sistem klasik bir haber agregatörü olarak tasarlanmamalıdır.
Temel model:
Source → Signal → Event → Verification → Story → Publication → Tracking → Update → Timeline
olmalıdır.
________________________________________
2. Temel Kavramlar
2.1 Source
Bilginin alındığı kaynak.
Örnek:
•	RSS
•	Atom
•	şirket basın sayfası
•	resmi kurum
•	yatırımcı ilişkileri
•	sektörel medya
•	bağımsız haber sitesi
•	API
________________________________________
2.2 Signal
Bir kaynaktan gelen ham içerik.
Örnek:
InsideEVs RSS akışında görülen yeni bir haber.
Signal henüz IVMOVA haberi değildir.
________________________________________
2.3 Event
Gerçek dünyadaki gelişmenin sistemdeki temsili.
Örnek:
“ABC Energy Türkiye’de 1 GWh batarya fabrikası kuracak.”
Aynı olay hakkında:
•	şirket basın açıklaması,
•	üç farklı haber sitesi,
•	yatırımcı sunumu
ayrı Signal oluşturabilir ancak tek bir Event altında toplanabilir.
________________________________________
2.4 Story
IVMOVA’da yayımlanan haber.
Bir Event hiçbir zaman yayımlanmayabilir.
Bir Story ise mutlaka bir veya daha fazla Event/Source ilişkisine dayanmalıdır.
________________________________________
2.5 Story Update
Yayımlanmış Story üzerinde sonradan yapılan anlamlı güncelleme.
________________________________________
3. Temel Kimlik Yapısı
Sistem aşağıdaki kimlikleri kullanmalıdır:
source_id
Kaynak kimliği.
Örnek:
src_insideevs
signal_id
Ham kaynak içeriği kimliği.
Örnek:
sig_20260923_insideevs_00421
event_id
Gerçek dünya olayının kimliği.
Örnek:
evt_byd_battery_turkey_2026
story_id
IVMOVA haber kimliği.
Örnek:
story_000128
update_id
Haber güncellemesi kimliği.
Örnek:
upd_story_000128_003
Kimlikler URL slug’larından bağımsız olmalıdır.
________________________________________
4. Source Veri Modeli
Her kaynak için minimum:
source_id
name
domain
country
language
source_type
source_role
feed_url
homepage_url
status
priority
trust_score
license_type
commercial_use
republish_allowed
derivative_allowed
attribution_required
active_link_required
notes
last_checked_at
________________________________________
5. Source Type Enum
RSS
ATOM
API
WEB
PRESS_ROOM
INVESTOR_RELATIONS
OFFICIAL_DATA
MANUAL
________________________________________
6. Source Role Enum
Bir kaynak birden fazla role sahip olabilir.
DISCOVERY
PRIMARY
VERIFICATION
REPUBLISH
Örnek:
Şirket basın odası:
PRIMARY
InsideEVs:
DISCOVERY
VERIFICATION
Açık lisanslı kaynak:
DISCOVERY
REPUBLISH
________________________________________
7. Source Status Enum
ACTIVE
CANDIDATE
DISABLED
BLOCKED
ERROR
________________________________________
8. Signal Veri Modeli
Her toplanan içerik:
signal_id
source_id
external_id
url
canonical_url
title
summary
content
author
published_at
collected_at
language
image_url
raw_payload
content_hash
status
________________________________________
9. Signal Status Enum
NEW
FILTERED
DUPLICATE
MATCHED
REJECTED
PROCESSED
________________________________________
10. Duplicate Kontrolü
Duplicate tespiti birkaç aşamalı yapılmalıdır.
Aşama 1
Canonical URL kontrolü.
Aşama 2
Normalized title hash.
Aşama 3
Content hash.
Aşama 4
Semantik benzerlik.
Amaç:
aynı haberin 10 farklı RSS kaynağından gelmesi durumunda editöre 10 haber göstermemektir.
________________________________________
11. Event Veri Modeli
event_id
event_type
title
summary
status
importance_score
confidence_score
risk_level
first_seen_at
last_activity_at
primary_entity_id
country
region
sector
created_at
updated_at
________________________________________
12. Event Type Örnekleri
INVESTMENT
PRODUCT_LAUNCH
TECHNOLOGY
REGULATION
PARTNERSHIP
ACQUISITION
FUNDING
INFRASTRUCTURE
ENERGY_PROJECT
EV_LAUNCH
BATTERY
AI_PRODUCT
ROBOTICS
MARKET_DATA
CORPORATE
OTHER
________________________________________
13. Event Status Enum
OPEN
WATCHING
ACTIVE
RESOLVED
CLOSED
________________________________________
14. Entity Sistemi
Event eşleştirmesinin sağlıklı çalışması için ayrı entity yapısı önerilir.
Entity Type
COMPANY
ORGANIZATION
PERSON
PROJECT
PRODUCT
TECHNOLOGY
LOCATION
REGULATION
Entity:
entity_id
entity_type
canonical_name
aliases
country
website
metadata
Örnek:
canonical_name: BYD
aliases:
- BYD Auto
- Build Your Dreams
________________________________________
15. Signal → Event Eşleştirme
Yeni Signal geldiğinde sistem şu sırayla değerlendirme yapmalıdır:
1.	Entity eşleşmesi
2.	Başlık benzerliği
3.	Anahtar kelime benzerliği
4.	Tarih yakınlığı
5.	Lokasyon
6.	Event type
7.	Semantik embedding benzerliği
Sonuç:
NEW_EVENT
EXISTING_EVENT
POSSIBLE_MATCH
DUPLICATE
________________________________________
16. Eşleştirme Güven Skoru
0–100 arasında skor önerilir.
Örnek:
90–100  güçlü eşleşme
75–89   muhtemel eşleşme
50–74   manuel kontrol
0–49    yeni event adayı
Kesin eşikler testlerle belirlenmelidir.
________________________________________
17. Event ↔ Signal İlişki Tablosu
event_signal
------------
event_id
signal_id
relation_type
confidence
created_at
Relation type:
PRIMARY
SUPPORTING
DISCOVERY
CONTRADICTING
DUPLICATE
________________________________________
18. Verification Motoru
Her Event için sistem olguları çıkarmalıdır.
Örnek:
company = ABC Energy
investment_value = 750000000
currency = USD
capacity = 1 GWh
location = Türkiye
start_date = 2027
Her fact için:
fact_id
event_id
fact_type
value
unit
source_id
signal_id
confidence
verified
________________________________________
19. Fact Doğrulama
Bir fact:
VERIFIED
Primary source tarafından doğrulanmışsa.
veya
iki güvenilir bağımsız kaynak aynı bilgiyi bildiriyorsa.
SINGLE_SOURCE
Tek kaynak varsa.
CONFLICT
Kaynaklar farklı değer veriyorsa.
UNKNOWN
Doğrulanamıyorsa.
________________________________________
20. Çelişki Kontrolü
Örnek:
Kaynak A:
500 milyon USD
Kaynak B:
750 milyon USD
Sistem bunu sessizce çözmemelidir.
Durum:
CONFLICT
olarak işaretlenmeli.
Editör paneline:
“Kaynaklar yatırım tutarında çelişiyor.”
uyarısı düşmelidir.
________________________________________
21. Haber Değeri Skoru
Önerilen birleşik skor:
news_score =
importance
+ relevance
+ novelty
+ source_quality
+ verification
+ follow_up_potential
Her bileşen ayrı tutulmalıdır.
________________________________________
22. Önerilen Skor Alanları
ivmova_relevance_score
importance_score
novelty_score
source_quality_score
verification_score
follow_up_score
risk_score
0–100 ölçeği kullanılabilir.
________________________________________
23. Yayın Kararı
AI otomatik olarak şu önerilerden birini üretir:
PUBLISH
WATCH
REJECT
MANUAL_REVIEW
Sistem doğrudan yayın yapmak yerine editöre öneri sunmalıdır.
________________________________________
24. Story Veri Modeli
story_id
event_id
slug
title
subtitle
lead
body
category
subcategory
status
risk_level
published_at
updated_at
first_published_at
tracking_status
featured
seo_title
meta_description
canonical_url
created_at
________________________________________
25. Story Status Enum
DRAFT
EDITOR_REVIEW
PUBLISHED
UPDATED
RETRACTED
ARCHIVED
________________________________________
26. Tracking Status Enum
NOT_TRACKED
ACTIVE_TRACKING
WATCHING
RESOLVED
CLOSED
________________________________________
27. Story Kaynakları
Ayrı tablo kullanılmalıdır.
story_source
------------
story_id
source_id
signal_id
source_role
used_for
visible_to_user
created_at
________________________________________
28. Story Üretim Kuralı
AI mümkün olduğunca yalnızca doğrulanmış fact setinden haber oluşturmalıdır.
AI’ya ham makale:
Rewrite this article
şeklinde verilmemelidir.
Tercih edilen yapı:
Verified facts:
...

Primary source:
...

Supporting sources:
...

Known uncertainties:
...

Write an original IVMOVA news story.
________________________________________
29. AI Prompt Güvenlik Kuralları
AI:
•	kaynakta olmayan bilgi eklememeli,
•	tahmin üretmemeli,
•	kişilerin niyetlerini yorumlamamalı,
•	suçlayıcı ifade üretmemeli,
•	kesin olmayan bilgiyi kesinleştirmemeli,
•	finansal rakamları yuvarlayarak değiştirmemeli,
•	doğrudan alıntıları uydurmamalıdır.
________________________________________
30. Risk Sınıfı
LOW
MEDIUM
HIGH
CRITICAL
________________________________________
31. Risk Motoru
HIGH veya CRITICAL tetikleyicileri:
•	suçlama,
•	dava,
•	soruşturma,
•	ölüm,
•	yaralanma,
•	kaza,
•	siyasi ihtilaf,
•	ciddi finansal iddia,
•	dolandırıcılık,
•	güvenlik problemi,
•	anonim kaynak,
•	teyitsiz açıklama.
Bu içerikler otomatik yayımlanamaz.
________________________________________
32. Editör Kuyruğu
Admin paneli ana ekranında üç ana kuyruk bulunmalıdır.
NEW STORIES
Yeni olay adayları.
UPDATES
Mevcut Story güncelleme adayları.
REVIEW
Kaynak/çelişki/risk problemi bulunanlar.
________________________________________
33. Editör Kartı
Her kart minimum:
title
event_type
importance
confidence
risk
source_count
primary_source_exists
existing_story_match
why_it_matters
göstermelidir.
Butonlar:
Publish
Edit
Watch
Reject
Open Sources
________________________________________
34. Günlük Hedef
Sistem günlük yüzlerce Signal işleyebilir.
Ancak editöre:
yaklaşık 10–20 kaliteli aday
sunmalıdır.
Bunların içinden:
yaklaşık 6–10 yeni haber
yayımlanabilir.
Bu zorunlu kota değildir.
Değerli haber yoksa yayın sayısı düşük kalabilir.
________________________________________
35. Story Tracking Sistemi
Story yayımlandığında otomatik olarak tracking profile oluşturulmalıdır.
tracking_id
story_id
event_id
entities
keywords
aliases
source_ids
priority
check_frequency
status
last_checked
________________________________________
36. Tracking Keywords
AI otomatik üretir.
Örnek:
Story:
BYD Türkiye batarya yatırımı
Tracking:
BYD
BYD Turkey
BYD Türkiye
battery plant
battery investment
batarya fabrikası
batarya yatırımı
________________________________________
37. Yeni Signal Geldiğinde Tracking Kontrolü
Yeni Signal:
önce duplicate kontrolüne,
sonra aktif Event/Story eşleşmesine gönderilir.
Eğer aktif story ile ilişkiliyse:
UPDATE_CANDIDATE
oluşturulur.
________________________________________
38. Story Update Veri Modeli
update_id
story_id
event_id
update_type
summary
new_information
previous_information
source_ids
importance
created_at
approved_at
published_at
________________________________________
39. Update Type Enum
MAJOR
MINOR
CORRECTION
CLARIFICATION
STATUS_CHANGE
________________________________________
40. Major Update Örnekleri
•	yatırım tutarı değişti,
•	proje onaylandı,
•	tesis açıldı,
•	proje iptal edildi,
•	şirket satın alındı,
•	düzenleme yürürlüğe girdi.
________________________________________
41. Minor Update Örnekleri
•	ek teknik özellik,
•	tarih netleşmesi,
•	yeni yönetici açıklaması,
•	küçük kapasite detayı.
________________________________________
42. No Update
Aynı bilginin farklı kaynak tarafından tekrar yayınlanması:
güncelleme sayılmamalıdır.
________________________________________
43. Story Versioning
Her yayın veya anlamlı değişiklikte snapshot alınmalıdır.
story_version
-------------
version_id
story_id
version_number
title
lead
body
changed_fields
created_at
Bu yapı geçmiş metnin kaybolmasını önler.
________________________________________
44. Public Update Timeline
Kullanıcıya sade versiyon gösterilebilir.
Örnek:
17 Kasım 2026
Üretim başlangıç tarihi açıklandı.

5 Ekim 2026
Yatırım tutarı kesinleşti.

23 Eylül 2026
İlk haber yayımlandı.
________________________________________
45. Story Sayfasında Gösterilecek Metadata
İlk yayın
Son güncelleme
Takip durumu
Kaynak sayısı
Son güncellemede ne değişti?
Opsiyonel:
Bu haber takip edilmektedir.
________________________________________
46. Correction Mekanizması
Yanlış bilgi düzeltilirse sessizce değiştirilmemelidir.
Update type:
CORRECTION
olmalı.
Public timeline:
Düzeltme:
Önceki sürümde yatırım tutarı yanlış belirtilmişti.
Doğru tutar ...
şeklinde gösterilebilir.
________________________________________
47. Retraction
Ciddi şekilde yanlış bir haber geri çekilirse:
RETRACTED
statüsü kullanılmalıdır.
URL mümkünse silinmemelidir.
Sayfada açıklama bırakılmalıdır.
________________________________________
48. Kaynak Güven Skoru
Her Source için zamanla dinamik skor tutulabilir.
Örnek faktörler:
historical_accuracy
primary_source_ratio
correction_frequency
content_quality
license_clarity
availability
technical_stability
________________________________________
49. Sistem Kaynak Performansı
Periyodik olarak:
•	kaç signal geldi,
•	kaçı kullanıldı,
•	kaçı duplicate çıktı,
•	kaç yanlış eşleşme oldu,
•	kaç haber üretildi,
•	doğruluk problemi oldu mu
raporlanmalıdır.
________________________________________
50. AI Kullanımı
AI tek model sağlayıcısına bağımlı tasarlanmamalıdır.
Provider abstraction önerilir.
AIProvider
---------
generate()
classify()
extractFacts()
compare()
embed()
Böylece ileride:
•	OpenAI
•	Anthropic
•	Gemini
arasında görev bazlı seçim yapılabilir.
________________________________________
51. AI Görev Ayrımı
Ucuz/hızlı model:
•	sınıflandırma,
•	duplicate,
•	tagging.
Daha güçlü model:
•	fact comparison,
•	contradiction,
•	news drafting,
•	update analysis.
Bu yapı maliyet kontrolü sağlar.
________________________________________
52. Manuel İçerik
Editör manuel olarak da Signal/Event oluşturabilmelidir.
Örneğin:
New Manual Event
veya
Add Source to Event
________________________________________
53. Admin Arama
Admin paneli:
•	story,
•	event,
•	source,
•	company,
•	project
üzerinden arama yapabilmelidir.
________________________________________
54. Event Sayfası
Editör için her Event’in ayrı ekranı olmalıdır.
Gösterilecek:
Event title
Status
Entities
All signals
Verified facts
Conflicts
Related stories
Timeline
Tracking status
Bu ekran IVMOVA’nın editoryal hafızasıdır.
________________________________________
55. Story–Event İlişkisi
İlk sürümde:
1 Event → 0 veya 1 ana Story
modeli yeterlidir.
İleride:
1 Event → multiple Stories
desteklenebilir.
________________________________________
56. Kategori Sistemi
Kategori Event'ten bağımsız tutulmalıdır.
Örnek:
ENERGY
MOBILITY
AI
ROBOTICS
TECHNOLOGY
MARKETS
Alt kategori:
BATTERY
EV
CHARGING
SOLAR
WIND
HYDROGEN
DATA_CENTER
GENERATIVE_AI
HUMANOID_ROBOT
________________________________________
57. Audit Log
Önemli tüm işlemler kaydedilmelidir.
audit_log
---------
action
entity_type
entity_id
actor
old_value
new_value
timestamp
________________________________________
58. Actor
SYSTEM
AI
EDITOR
________________________________________
59. Minimum Güvenlik İlkesi
AI hiçbir içeriği fiziksel olarak silmemelidir.
AI:
•	önerir,
•	işaretler,
•	taslak oluşturur.
Kritik silme veya geri çekme:
editör aksiyonuyla yapılmalıdır.
________________________________________
60. Fazlı Uygulama Planı
Faz 1 — Source + Signal
Önce yalnız:
•	kaynak kayıtları,
•	RSS collector,
•	Signal,
•	duplicate kontrolü
stabil hale getirilmelidir.
________________________________________
Faz 2 — Event Engine
•	event tablosu,
•	entity yapısı,
•	signal → event matching,
•	event clustering.
________________________________________
Faz 3 — Verification
•	fact extraction,
•	source roles,
•	contradiction detection,
•	confidence.
________________________________________
Faz 4 — Story Pipeline
•	draft,
•	editor review,
•	publish,
•	source references.
________________________________________
Faz 5 — Tracking
•	tracking profiles,
•	new signal → existing story match,
•	update candidate.
________________________________________
Faz 6 — Versioning
•	story updates,
•	version history,
•	correction log,
•	public timeline.
________________________________________
Faz 7 — Advanced Automation
•	AI prioritization,
•	multi-model routing,
•	source performance,
•	advanced scoring.
________________________________________
61. MVP İçin Zorunlu Özellikler
İlk çalışan sürümde mutlaka:
•	Source
•	Signal
•	duplicate detection
•	Event
•	Signal → Event matching
•	Story
•	Story source relation
•	editor approval
•	publish
•	tracking
•	Story Update
•	update history
olmalıdır.
________________________________________
62. MVP Dışında Tutulabilecekler
İlk etapta ertelenebilir:
•	çok gelişmiş embeddings,
•	kullanıcı bildirimleri,
•	kişisel takip listeleri,
•	çoklu editör rolleri,
•	gelişmiş AI provider routing,
•	otomatik sosyal medya,
•	kompleks analytics.
________________________________________
63. Kabul Kriterleri
Sistem başarılı kabul edilmeden önce minimum şu testler geçmelidir:
Test 1
Aynı haber 5 kaynaktan geldiğinde 5 ayrı aday oluşmamalıdır.
Test 2
Yeni bilgi mevcut Event ile eşleşebilmelidir.
Test 3
Mevcut Story ile ilişkili gelişme yeni haber yerine Update Candidate oluşturabilmelidir.
Test 4
Kaynaklar arasında rakamsal çelişki editöre gösterilmelidir.
Test 5
Primary Source varsa görünür olmalıdır.
Test 6
Story güncellendiğinde eski sürüm kaybolmamalıdır.
Test 7
Correction geçmişte görünür olmalıdır.
Test 8
High Risk içerik otomatik yayımlanamamalıdır.
Test 9
Rejected Signal tekrar tekrar aday kuyruğuna düşmemelidir.
Test 10
Kaynağın lisans/rol bilgisi korunmalıdır.
________________________________________
64. Ana Mimari İlkesi
Sistemin temel veri zinciri:
SOURCE
   ↓
SIGNAL
   ↓
EVENT
   ↓
VERIFIED FACTS
   ↓
STORY
   ↓
TRACKING
   ↓
UPDATE
   ↓
VERSION HISTORY
şeklinde olmalıdır.
________________________________________
65. Kritik Mimari Kural
Mevcut IVMOVA kod tabanı çalışıyorsa bu spesifikasyon:
majör refactor talimatı olarak yorumlanmamalıdır.
Önce mevcut yapı analiz edilmelidir.
Var olan:
•	collector,
•	source config,
•	schemas,
•	validation,
•	inbox,
•	state,
•	tests
korunmalıdır.
Yeni yapı mevcut mimariye kademeli olarak eklenmelidir.
Çalışan fonksiyonlar gereksiz yere yeniden yazılmamalıdır.
________________________________________
66. Geliştiriciye Uygulama Talimatı
Uygulamaya başlamadan önce:
1.	mevcut repository yapısını incele,
2.	mevcut collector akışını belgele,
3.	mevcut source şemasını çıkar,
4.	inbox item yapısını incele,
5.	mevcut duplicate mantığını belirle,
6.	mevcut testlerin tamamını çalıştır,
7.	bu dokümanla mevcut yapı arasındaki farkları çıkar,
8.	doğrudan kod değişikliği yapmadan önce faz planı oluştur.
Daha sonra yalnızca onaylanan faz uygulanmalıdır.
________________________________________
67. Nihai Hedef
IVMOVA'nın otomasyonu:
“AI kendi kendine mümkün olduğunca çok haber yayımlasın.”
değildir.
Hedef:
“Sistem yüzlerce gelişmeyi izlesin, bunları olay bazında organize etsin, doğrulasın, en değerli birkaç haberi editöre hazırlasın ve yayımlanmış haberlerin gelişimini takip etmeye devam etsin.”
olmalıdır.
Editörün görevi haber aramak değil:
karar vermek ve kaliteyi korumaktır.

