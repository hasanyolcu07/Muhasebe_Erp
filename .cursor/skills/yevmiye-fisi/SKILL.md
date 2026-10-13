---
name: yevmiye-fisi
description: Yevmiye fişi üretme, doğrulama ve ters kayıt işlemleri. Fatura, kasa, banka, bordro gibi kaynaklardan muhasebe fişi oluştururken kullan.
---
# Yevmiye Fişi Üretimi

1. Kaynak belgeyi belirle (fatura, bordro, kasa vb.) ve tarihini al.
2. Dönem açık mı kontrol et; kapalıysa dur.
3. Satırları THP hesap koduyla oluştur (borç / alacak, 2 haneli Decimal).
4. Toplam borç = toplam alacak değilse hata ver.
5. Fiş numarasını sıralı ve boşluksuz ver (yıl + şirket).
6. Tek transaction içinde kaydet ve denetim satırı yaz.
7. Düzeltme gerekirse: aynı tutarın ters fişini aç, yeni doğru fişi ayrıca kaydet.
8. Test: dengesiz fiş, kapalı dönem, ters kayıt, ardışık numara.

Örnek (alış faturası): 153 Ticari Mallar (B) + 191 İndirilecek KDV (B) / 320 Satıcılar (A).
Örnek (satış faturası): 120 Alıcılar (B) / 600 Yurtiçi Satışlar (A) + 391 Hesaplanan KDV (A).
