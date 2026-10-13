# v2.1 Düzeltme

Bu pakette 4 kural dosyası var. v2'deki aynı adlı dosyaların üzerine yazın:
- .cursor/rules/10-muhasebe.mdc
- .cursor/rules/20-sgk-bordro.mdc
- .cursor/rules/50-menu-moduller.mdc
- .cursor/rules/60-mevzuat-parametre.mdc

Sebep: v2'deki `globs` yolları projenin gerçek klasör yapısıyla (src/server/routes, src/server/services, src/modules/...) eşleşmiyordu; kurallar bu dosyalarda otomatik devreye girmeyebilirdi. İçerik aynı, yalnız `globs` satırı değişti.

Diğer v2 dosyaları değişmeden kalır.
