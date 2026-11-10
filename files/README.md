# Dosyalar

Google Drive gibi bir dosya alanı: klasörler, sürükle-bırak yükleme, resim ve PDF önizleme, indirme, kişiyle paylaşma. Her tür dosya (zip, dwg, skp, pdf…) yüklenir.

**Gösterdiği:**
- **"Row" kovası:** dosyayı, bağlı olduğu satırı okuyabilen indirir. Satırı paylaşınca dosya da paylaşılmış olur, ayrı izin gerekmez
- **Owner + katılımcı kolonu:** dosyanın sahibi tam yetkili; `sharedWith`'teki kişiler görür ve indirir, silemez / değiştiremez
- **İmzalı link:** indirme adresi 5 dakika geçerli, paylaşılmamış dosyaya başkası ulaşamaz
- **Klasörler:** ayrı tablo yok, satırdaki `folder` yolu (`Projeler/2026`)
- **Realtime:** biri seninle dosya paylaşınca "Benimle paylaşılan"a anında düşer

<!-- kurulum:başla -->
## Kurulum

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init files
```

Komut sırayla:
1. şablonu `files/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları kurar,
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd files/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init files --url https://api.senin-alanin.com`

### Yol 2: elle

1. **Proje aç:** GridBase paneli › Projelerim › Yeni proje.
2. **Anon key al:** projede API anahtarları › Yeni anahtar › **Anon**. Anahtar bir kez gösterilir, kopyala.
3. **Uygulamaya gir:** `web/.env.example`'ı `web/.env.local` olarak kopyala ve doldur:
   ```bash
   VITE_GRIDBASE_URL=https://api.gridbasetr.com     # sonunda /api/gridbase yok
   VITE_GRIDBASE_ANON_KEY=gb_pk_…                   # 2. adımdaki anon key
   ```
4. **Şemayı kur** (bu klasörün kökünde, `gridbase.config.ts`'in yanında):
   ```bash
   npx @gridbasetr/cli login --url https://api.gridbasetr.com   # tarayıcıda onay
   npx @gridbasetr/cli link                                       # 1. adımdaki projeyi seç
   npx @gridbasetr/cli apply                                      # tabloları, kuralları, kovaları kurar
   ```
   Panelden elle kurmak istersen tablo ve kolonlar `gridbase.config.ts`'te yazılı; aynı adlarla açman yeterli.
5. **Çalıştır:** `cd web && npm install && npm run dev`

Tarayıcıda "CORS" hatası görürsen: adresin projede izinli değil. `gridbase.config.ts` › `project.cors`'a ekleyip `apply` çalıştır ya da panel › Proje ayarları › İzinli adresler'den ekle. Canlıya alırken canlı adresini de ekle.
<!-- kurulum:bitir -->

## Sınırlar ve güvenlik

- Dosya başına en çok 100 MB (`gridbase.config.ts` › `buckets.drive.maxSize`; GridBase'in istek başına sınırı da 100 MB). Hesabının planı da sınır koyar: ücretsiz planda tek dosya 10 MB, toplam 100 MB; aşınca yükleme `402` döner.
- Tür sınırı yok. Riskli türler (HTML, SVG, bilinmeyen) GridBase'te her zaman indirme olarak sunulur, tarayıcıda çalıştırılmaz.
- Silmede önce dosya, sonra satır silinir. Hesabını silen kullanıcının dosyaları ve satırları da gider.

## Şema

| Tablo | Erişim | Kolonlar |
| --- | --- | --- |
| `profiles` | Girişli okur, sahibi yazar | `displayName`, `email`, `ownerId` |
| `drive_files` | Owner + katılımcı `sharedWith`, realtime | `name`, `fileName`, `size`, `contentType`, `folder`, `sharedWith`, `ownerName`, `createdAt`, `ownerId` |

| Kova | Okuma | Yazma | Sınır |
| --- | --- | --- | --- |
| `drive` | Row (satırı okuyabilen) | Girişli | 100 MB, her tür |

## Kod

| Dosya | Ne yapar |
| --- | --- |
| `web/src/DrivePage.tsx` | Klasörler, yükleme, önizleme, indirme, silme, realtime |
| `web/src/people.tsx` | Kişi rehberi + paylaşma penceresi |

> Tablonun adı neden `files` değil? `/api/gridbase/files` GridBase'in dosya deposu ucu; aynı adlı tablo bu uçla çakışır. `tables`, `buckets`, `auth`, `push`, `roles`, `endusers`, `emails` de aynı sebeple tablo adı olmamalı.
