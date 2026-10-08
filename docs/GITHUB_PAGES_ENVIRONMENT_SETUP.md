# GitHub Pages environment ayarı — kullanıcı rehberi
Bu turda hiçbir GitHub ayarı değiştirilmedi. Aşağıdaki adımlar production öncesi kullanıcı tarafından yapılır; bu dosya deploy onayı değildir.

1. GitHub'da mustafaacelikk/ivmova.github.io deposunu açın. Settings → Environments → github-pages yolunu izleyin. Yoksa New environment ile tam olarak github-pages oluşturun.
2. Deployment branches and tags bölümünde Selected branches and tags seçin. Yalnız **Branch: main** kuralını ekleyin. Tag veya * kuralı eklemeyin. Protected branches seçeneği birden çok branch'e izin verebildiği için bu taslakta kullanılmaz.
3. Kabul edilen tek operatör modeli: Required reviewers yalnız **User: mustafaacelikk**, **Prevent self-review: kapalı (false)**. Operatör kendi run'ını açıkça onaylayabilir; environment approval zorunlu kalır. Admin bypass seçeneği görünüyorsa bypass'ı kapatın. Environment secrets ve variables boş kalır; ikinci reviewer gerekmiyor.
4. Environment secrets bölümüne hiçbir secret/anahtar eklemeyin. Supabase/JWT/service-role, PAT veya özel deployment credential gerekmiyor. Workflow otomatik GitHub token'ını ve Pages'in kendi izin akışını kullanır.
5. Settings → Pages → Build and deployment → Source: GitHub Actions olmalı. Custom domain/TLS kararını ayrıca doğrulayın; bu turda domain, DNS veya canlı site kontrolü yapılmadı.
6. Settings → Actions → General → Workflow permissions varsayılanı read-only tutun. Production deploy job'u açıkça yalnız contents:read/pages:write/id-token:write ister; validate job'u contents/actions/pages read-only kullanır. Pull request oluşturma/contents write yetkisi gerekmiyor.
7. Main ruleset'inde PR, conversation resolution, güncel branch ve force push/delete yasağını koruyun. Mevcut **staging** check'ine ek olarak GitHub Actions status check **ledger** zorunlu olmalı. Workflow başlığı **Publication ledger append-only check**, job/check adı **ledger** (Actions görünümü: **Publication ledger append-only check / ledger**). Bootstrap workflow'u ilk kez kullanılmadan reviewed main'e PR üzerinden alınır. İzinli Pages yazarları normal publication promotion ve yalnız bir kere kullanılacak demo bootstrap'tır; ikisi aynı concurrency grubunu kullanır. Diğer Pages yazarlarını kapatın.
8. Workflow action major tag'lerinin immutable SHA pinlerini production öncesi review edin. Bu turda action sürümleri GitHub'da çalıştırılmadı.

## Menü/approval seçeneği yoksa
Repository görünürlüğü ve GitHub planı availability'yi etkiler. GitHub Free/Pro/Team'de required reviewers public repos için sunulur; private repo için plan kısıtları olabilir. Settings yetkiniz yoksa da bölüm görünmeyebilir. [GitHub environment belgeleri](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
Runtime policy yalnız mustafaacelikk reviewer'ını, prevent_self_review=false ve tek Branch main kuralını arar; özellik/API erişimi yoksa fail-closed olur. Approval yokken workflow'u korumalı kabul etmeyin.

## İnceleme için paylaşılabilecek ekranlar
Environment adı, deployment branch/tag kuralları, reviewer/self-review/bypass seçenekleri, Pages Source ve Actions Workflow permissions ekranları yeterlidir. Plan/görünürlük bilgisi eklenebilir. Kişi adlarını ve hesap bilgilerini gerektiğinde bulanıklaştırın.
Secret değerleri, token/JWT/anahtarlar veya credential ekranını paylaşmayın. Bu turda ekran görüntüsü talep edilmedi veya ayar okunmadı.

## Önce build-only
publication-build-only.yml pilot branch push veya workflow_dispatch kabul eder. Yalnız contents:read, environment yok, Pages artifact/deploy action yok. Manuel dispatch'in Dashboard'da görünmesi default branch'teki workflow kaydına bağlı olabilir; bu turda main merge veya workflow trigger yapılmadı.
Linux build-only kontrolü daha önce başarılı oldu; sebepsiz tekrar çalıştırılmaz. İlk demo infrastructure yayını için PUBLICATION_PRODUCTION_RELEASE_RUNBOOK.md içindeki tek kullanımlık bootstrap sözleşmesini izleyin. Normal publication yolu PREPARED release gerektirmeye devam eder.
