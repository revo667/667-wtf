# Yüklenen müziği siteye bağlama

Yüklediğin `667667.wav` (~43 MB) dosyasını site müziği olarak ekleyeceğim.

## Yapılacaklar

1. Dosyayı Lovable CDN'e yükleyip `src/assets/667667.wav.asset.json` işaretçisini oluştur (43 MB binary repoya girmez, yükleme hızlı ve global cache'li olur).
2. `src/routes/index.tsx` içindeki `MusicToggle` çağrısına bu asset'in URL'ini `src` olarak ver.
3. `public/music/README.txt` yer tutucusunu ve boş `public/music` klasörünü kaldır (artık gereksiz).
4. Önizlemede ses öğesinin yüklendiğini ve çal/durdur + ses düzeyi kontrolünün çalıştığını doğrula.

## Notlar

- Buton davranışı aynı kalır: çal/durdur, ses düzeyi kaydırıcısı, loop, ilk tıklamada otomatik başlatma.
- WAV sıkıştırmasız olduğu için ilk yükleme biraz veri harcar; istersen sonradan MP3'e çevirip boyutu ~10 kat düşürebilirim.
