/** Dosyayı `data:<mime>;base64,...` biçimine çevirir (backend görselleri bu biçimde alır). */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Dosya okunamadı"));
    reader.readAsDataURL(file);
  });
}

/** Tür ve boyut kontrolü; sorun varsa kullanıcıya gösterilecek mesajı döner. */
export function checkFile(file: File, types: string[], maxKb: number): string | null {
  if (!types.includes(file.type))
    return `Desteklenen türler: ${types.map((t) => t.replace("image/", "")).join(", ")}`;
  if (file.size > maxKb * 1024) return `Dosya en fazla ${maxKb} KB olabilir`;
  return null;
}
