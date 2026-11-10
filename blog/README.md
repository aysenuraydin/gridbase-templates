# Blog

Herkese açık yazılar, kategoriler ve yorumlar. Ziyaretçi girişsiz okur, okur girişle yorum yazar, yalnız **editor** rolündekiler yazı yazar ve yayınlar. Yazına yorum gelince tarayıcı bildirimi gelir.

**Gösterdiği:**
- **Public okuma:** tablolar girişsiz okunur (`publicRead`)
- **Rol:** yazı ve kategori yazmak `role('editor')` ister; GridBase kuralı sunucuda uygular, arayüzü atlayan istek `403` alır
- **Kova:** kapak resimleri herkese açık (süresiz link), yalnız editor yükler
- **Push kuralı:** `comments` tablosuna satır eklenince yazının yazarına bildirim (kod yazmadan, `gridbase.config.ts` › `push.rules`); 5 dakikadaki yorumlar tek özette birleşir
- **Web Push:** "Bildirimleri aç" düğmesi (`public/gridbase-sw.js`)
- **Örnek veri:** 3 kategori, 4 yazı (biri taslak), 2 yorum (`seed.json`)

<!-- kurulum:başla -->
## Kurulum

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init blog
```

Komut sırayla:
1. şablonu `blog/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları, rolleri (editor) kurar ve örnek veriyi yazar (`--no-seed` ile yazmaz),
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd blog/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init blog --url https://api.senin-alanin.com`

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
   npx @gridbasetr/cli seed                                       # örnek veri (isteğe bağlı)
   ```
   Panelden elle kurmak istersen tablo ve kolonlar `gridbase.config.ts`'te yazılı; aynı adlarla açman yeterli.
5. **Çalıştır:** `cd web && npm install && npm run dev`

Tarayıcıda "CORS" hatası görürsen: adresin projede izinli değil. `gridbase.config.ts` › `project.cors`'a ekleyip `apply` çalıştır ya da panel › Proje ayarları › İzinli adresler'den ekle. Canlıya alırken canlı adresini de ekle.
<!-- kurulum:bitir -->

## Kendine editor rolü ver

Yazı yazmak için hesabının `editor` rolünde olması gerekir. Rolü kendi uygulaman veremez (güvenlik: son kullanıcı kendine rol veremez), sen verirsin:

1. Uygulamada bir hesap aç (sağ üstte Giriş yap › Kayıt ol).
2. GridBase paneli › projen › **Kullanıcılar ve roller** › kullanıcıyı bul › Rol ver › `editor`.
3. Uygulamada çıkış yapıp yeniden gir (rol token'a girişte yazılır). Üstte **Yazılarım** ve **+ Yeni yazı** çıkar.

## Yorumları kim düzenler?

`comments` tablosu `ownerWrite({ read: 'Public', staffRoles: ['editor'] })`: herkes okur (girişsiz de), girişli kullanıcı yazar, **yalnız kendi yorumunu** düzenler / siler; `editor` rolü bütün yorumları yönetir. Kural GridBase'te: başkasının yorumunu API'den değiştirmeye çalışan `403` alır.

Taslaklar (`published: false`) API'den okunabilir; arayüz yalnız yayındakileri listeler. Hassas taslak tutacaksan ayrı bir `drafts` tablosu (`owner()`) kullan.

## Şema

| Tablo | Okuma | Yazma | Kolonlar |
| --- | --- | --- | --- |
| `categories` | Herkes | editor | `name`, `slug` |
| `posts` | Herkes | editor | `title`, `slug`, `excerpt`, `body`, `coverImage`, `categoryId`, `authorId`, `authorName`, `published`, `publishedAt` |
| `comments` | Herkes | Sahibi (editor hepsini) | `postId`, `body`, `authorName`, `postAuthorId`, `createdAt`, `ownerId` |

| Kova | Okuma | Yazma | Sınır |
| --- | --- | --- | --- |
| `covers` | Herkes | editor | 5 MB, resim |

## Kod

| Dosya | Ne yapar |
| --- | --- |
| `web/src/data.ts` | Tablolar ve tipler |
| `web/src/pages/HomePage.tsx` | Yayındaki yazılar, kategori süzgeci, sayfalama |
| `web/src/pages/PostPage.tsx` | Yazı + yorumlar |
| `web/src/pages/EditorPage.tsx` | Yazı yaz / düzenle / yayınla, kapak yükle |
| `web/src/pages/MyPostsPage.tsx` | Taslaklar dahil bütün yazılar |
| `web/src/NotifyButton.tsx` | Tarayıcı bildirimine abone ol |
