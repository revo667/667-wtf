# Animasyon Planı — 667.wtf

## Hedef

Sitenin mevcut dark/minimal görünümünü bozmadan, 667 yazısı ve alt bağlantıya ince, hissedilir ama abartısız animasyonlar eklemek.

## Yapılacaklar

1. **Giriş animasyonu**
   - Sayfa yüklendiğinde 667 başlığı ve `discord.gg/667` linki yukarıdan hafifçe kayarak belirir.
   - Opacity 0 -> 1, translateY 1rem -> 0, süre ~0.8s, ease-out.

2. **667 yazısında parıldama**
   - Çok yavaş bir text-shadow pulse (~4s loop): glow hafifçe güçlenip tekrar azalır.
   - Mevcut `glow-text` utility'e CSS keyframe ile katkı, mor renk korunur.

3. **Hover animasyonu — 667 yazısı**
   - Üzerine gelindiğinde glow hafifçe artar, yazı %2 kadar büyür (`scale(1.02)`).
   - Transition 0.3s ease-out.

4. **Hover animasyonu — discord.gg/667 linki**
   - Altından ortadan dışa doğru açılan underline animasyonu.
   - Renk `muted-foreground` -> `primary` geçişi.

## Teknik detaylar

- Tailwind v4: animasyonlar `@utility` veya `@keyframes` ile `src/styles.css` içinde tanımlanır.
- `src/routes/index.tsx`de 667 yazısı ve link için yeni className'ler eklenir.
- Mevcut `glow-text` utility korunur, yeni `.glow-pulse` utility veya `animate-glow` eklenebilir.
- Bağımlılık eklenmez; sadece CSS + React/Tailwind className değişikliği.
