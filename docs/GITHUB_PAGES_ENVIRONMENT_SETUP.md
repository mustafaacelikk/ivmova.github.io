# GitHub Pages environment ayarı — kullanıcı rehberi
Bu turda hiçbir GitHub ayarı değiştirilmedi. Aşağıdaki adımlar production öncesi kullanıcı tarafından yapılır; bu dosya deploy onayı değildir.

1. GitHub'da mustafaacelikk/ivmova.github.io deposunu açın. Settings → Environments → github-pages yolunu izleyin. Yoksa New environment ile tam olarak github-pages oluşturun.
2. Deployment branches and tags bölümünde Selected branches and tags seçin. Yalnız **Branch: main** kuralını ekleyin. Tag veya * kuralı eklemeyin. Protected branches seçeneği birden çok branch'e izin verebildiği için bu taslakta kullanılmaz.
3. Deployment protection rules içinde Required reviewers varsa bir başka yetkili kişi/ekibi seçin. Prevent self-review etkin olsun. Admin bypass seçeneği görünüyorsa bypass'ı kapatın. Workflow'u başlatan kişi kendi yayınına onay veremez; yalnız bir kullanıcı varsa ikinci reviewer sağlanmadan yayına geçmeyin.
4. Environment secrets bölümüne hiçbir secret/anahtar eklemeyin. Supabase/JWT/service-role, PAT veya özel deployment credential gerekmiyor. Workflow otomatik GitHub token'ını ve Pages'in kendi izin akışını kullanır.
5. Settings → Pages → Build and deployment → Source: GitHub Actions olmalı. Custom domain/TLS kararını ayrıca doğrulayın; bu turda domain, DNS veya canlı site kontrolü yapılmadı.
6. Settings → Actions → General → Workflow permissions varsayılanı read-only tutun. Production deploy job'u açıkça yalnız contents:read/pages:write/id-token:write ister; validate job'u contents/actions/pages read-only kullanır. Pull request oluşturma/contents write yetkisi gerekmiyor.
7. Main için branch protection/ruleset hazırlayın: PR ve review zorunlu; force push/delete kapalı; Publication ledger append-only check gerekli status check; en yeni main'e göre check güncellenmeli. Tüm alternatif Pages deploy workflow/yazarlarını kapatın veya aynı ledger ve concurrency kurallarına alın.
8. Workflow action major tag'lerinin immutable SHA pinlerini production öncesi review edin. Bu turda action sürümleri GitHub'da çalıştırılmadı.

## Menü/approval seçeneği yoksa
Repository görünürlüğü ve GitHub planı availability'yi etkiler. GitHub Free/Pro/Team'de required reviewers public repos için sunulur; private repo için plan kısıtları olabilir. Settings yetkiniz yoksa da bölüm görünmeyebilir. [GitHub environment belgeleri](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
Bu taslağın runtime environment policy'si required reviewer, prevent self-review ve tek Branch main kuralını arar; özellik/API erişimi yoksa fail-closed olur. Approval yokken workflow'u korumalı kabul etmeyin. Plan/policy kararı verilmeden gate gevşetilmez.

## İnceleme için paylaşılabilecek ekranlar
Environment adı, deployment branch/tag kuralları, reviewer/self-review/bypass seçenekleri, Pages Source ve Actions Workflow permissions ekranları yeterlidir. Plan/görünürlük bilgisi eklenebilir. Kişi adlarını ve hesap bilgilerini gerektiğinde bulanıklaştırın.
Secret değerleri, token/JWT/anahtarlar veya credential ekranını paylaşmayın. Bu turda ekran görüntüsü talep edilmedi veya ayar okunmadı.

## Önce build-only
publication-build-only.yml pilot branch push veya workflow_dispatch kabul eder. Yalnız contents:read, environment yok, Pages artifact/deploy action yok. Manuel dispatch'in Dashboard'da görünmesi default branch'teki workflow kaydına bağlı olabilir; bu turda main merge veya workflow trigger yapılmadı.
Kontrollü pilot push/build-only çalıştırma bir sonraki açık kullanıcı yetkisiyle yapılmalıdır. Build-only başarılı olmadan ilk production yayınına geçmeyin.
