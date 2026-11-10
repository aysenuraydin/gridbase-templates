# Notlar

Renkli notlar: ara, sabitle, istediğin kişiyle paylaş. Paylaştığın kişi notu görür ama değiştiremez; sen değiştirdikçe onun ekranında anında güncellenir.

**Gösterdiği:**
- **Owner + katılımcı kolonu:** not sahibine ait, `sharedWith`'te id'si yazan kişiler okur (yazamaz). Kural GridBase'te: başkası API'yi çağırsa da göremez
- **Paylaşma:** e-postadan kişi bulma (kişi rehberi `profiles`), paylaşımı kaldırma
- **Realtime:** paylaşılan not güncellenince ya da paylaşım kaldırılınca karşı tarafta anında
- Arama, sabitleme, renk

<!-- kurulum:başla -->
## Kurulum

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init notes
```

Komut sırayla:
1. şablonu `notes/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları kurar,
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd notes/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init notes --url https://api.senin-alanin.com`

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

## Nasıl çalışıyor?

`notes` tablosu `owner({ participantColumn: 'sharedWith' })`: satırın sahibi `ownerId` (GridBase damgalar), okuyabilecek diğer kişiler `sharedWith` kolonunda virgülle (`"5,9"`). Paylaşmak = bu kolona id yazmak. Kişi listeden çıkarılınca realtime ona `delete` gönderir, not ekranından kalkar.

Kişi rehberi (`profiles`) `ownerWrite()`: girişli herkes okur (e-postadan id bulmak için), herkes yalnız kendi satırını yazar; `ownerId` kullanıcının GridBase id'si (sunucu damgalar, taklit edilemez), kişi başına tek satır (`unique: [['ownerId']]`). Rehber yalnız ad ve e-posta tutar.

## Şema

| Tablo | Erişim | Kolonlar |
| --- | --- | --- |
| `profiles` | Girişli okur, sahibi yazar | `displayName`, `email`, `ownerId` |
| `notes` | Owner + katılımcı `sharedWith`, realtime | `title`, `body`, `color`, `pinned`, `sharedWith`, `ownerName`, `updatedAt`, `ownerId` |

## Kod

| Dosya | Ne yapar |
| --- | --- |
| `web/src/NotesPage.tsx` | Liste, arama, düzenleyici, realtime |
| `web/src/people.tsx` | Kişi rehberi + paylaşma penceresi |
