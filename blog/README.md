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

**Gereksinimler:** Node.js 18 ya da üstü ve bir GridBase hesabı ([panel.gridbasetr.com](https://panel.gridbasetr.com), ücretsiz).

Kurulumun sonunda GridBase'te bu şablonun tabloları kurulmuş bir proje olur, `web/.env.local` dosyasında da o projenin **anon key**'i yazar. Bunu iki yoldan yapabilirsin.

> **Hangi anahtar nereye?** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; kim neyi okur / yazar, tabloların kuralları belirler. `web/.env.local`'a bu yazılır.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** yazılmaz. Bu şablonda hiç gerekmez: şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init blog
```

Komut şunları yapar:
1. Şablonu `blog/` klasörüne indirir.
2. Giriş yapmadıysan tarayıcıda GridBase panelini açar. Ekrandaki kodu onaylarsın; şifren terminale yazılmaz.
3. Panelde **yeni bir proje** açar. Var olan bir projeyi kullanmak için: `--project <id ya da ad>`.
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları, rolleri (editor) kurar ve örnek veriyi yazar (`--no-seed` ile yazmaz).
5. Projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra uygulamayı çalıştır:

```bash
cd blog/web
npm install
npm run dev        # http://localhost:5173
```

Kendi GridBase sunucunu kullanıyorsan: `npx @gridbasetr/cli init blog --url https://api.senin-alanin.com`

### Yol 2: elle

1. **Şablonu indir:** [GitHub'dan](https://github.com/aysenuraydin/gridbase-templates) depoyu indir, `blog` klasörünü al.
2. **Proje aç:** GridBase paneli › Projelerim › **Yeni proje**.
3. **Anon key al:** projede **API anahtarları** › Yeni anahtar › **Anon**. Anahtar yalnız bir kez gösterilir; kopyala.
4. **Anahtarı uygulamaya yaz:** `web/.env.example` dosyasını `web/.env.local` adıyla kopyala ve doldur:
   ```bash
   VITE_GRIDBASE_URL=https://api.gridbasetr.com     # sonunda /api/gridbase yok
   VITE_GRIDBASE_ANON_KEY=gb_pk_…                   # 3. adımda kopyaladığın anahtar
   ```
5. **Tabloları kur:** bu klasörün kökünde (`gridbase.config.ts`'in yanında) çalıştır:
   ```bash
   npx @gridbasetr/cli login --url https://api.gridbasetr.com   # tarayıcıda onay
   npx @gridbasetr/cli link                                       # 2. adımda açtığın projeyi seç
   npx @gridbasetr/cli apply                                      # tabloları, kuralları, kovaları kurar
   npx @gridbasetr/cli seed                                       # örnek veri (isteğe bağlı)
   ```
   İstersen tabloları panelden elle de açabilirsin: tablo ve kolon adları `gridbase.config.ts`'te yazılı.
6. **Çalıştır:** `cd web && npm install && npm run dev`, sonra http://localhost:5173

### Sık karşılaşılanlar

| Belirti | Sebep ve çözüm |
| --- | --- |
| Açılışta "Kurulum eksik" ekranı | `web/.env.local` yok ya da boş. 4. adımı yap, `npm run dev`'i yeniden başlat. |
| Tarayıcı konsolunda **CORS** hatası | Uygulamanın adresi projede izinli değil. `gridbase.config.ts` › `project.cors`'a ekleyip `apply` çalıştır ya da panel › Proje ayarları › İzinli adresler'den ekle. Canlıya alırken canlı adresini de ekle. |
| `400 project_required` ya da her istekte `401` | Anon key yanlış ya da başka projenin. Panelden yeni bir anon key üret, `.env.local`'a yaz. |
| `400 … Bu tabloda böyle bir kolon yok` | Şema kurulmamış. 5. adımı (`apply`) çalıştır. |
| 5173 portu dolu | Başka bir uygulama kullanıyor. Kapat ya da `web/vite.config.ts`'te portu değiştir (o zaman yeni adresi CORS'a da ekle). |

Şemayı sonradan değiştirmek: `gridbase.config.ts`'i düzenle, kökte `npx @gridbasetr/cli apply` çalıştır. Komut önce planı gösterir ve onay ister; `--prune` vermezsen hiçbir şey silmez.
<!-- kurulum:bitir -->

## Kendine editor rolü ver

Yazı yazmak için hesabının `editor` rolünde olması gerekir. Rolü kendi uygulaman veremez (güvenlik: son kullanıcı kendine rol veremez), sen verirsin:

1. Uygulamada bir hesap aç (sağ üstte Giriş yap › Kayıt ol).
2. GridBase paneli › projen › **Kullanıcılar ve roller** › kullanıcıyı bul › Rol ver › `editor`.
3. Uygulamada çıkış yapıp yeniden gir (rol token'a girişte yazılır). Üstte **Yazılarım** ve **+ Yeni yazı** çıkar.

## Yorumları kim düzenler?

`comments` tablosunda girişli kullanıcı yazar, **yalnız kendi yorumunu** düzenler / siler; `editor` rolü bütün yorumları yönetir. Yorumu, yazıyı görebilen okur (`parentAccess: { column: 'postId', table: 'posts' }`): yayındaki yazının yorumlarını herkes (girişsiz de) görür, taslağınkileri yalnız yazarı ve editor'ler; göremediği yazıya yorum yazmaya çalışan `403` alır. Kural GridBase'te: başkasının yorumunu API'den değiştirmeye çalışan da `403` alır.

## Taslaklar kimde?

`posts` sahipli bir tablo (`ownerColumn: 'authorId'`, yazarı GridBase damgalar) ve `readWhen: { column: 'published', values: ['true', '*1*'] }`: yayındaki yazıyı herkes okur, **taslağı yalnız yazarı ve `editor` rolü** görür. API'yi doğrudan çağıran da taslağı göremez (`404`). Editor'ler bütün yazıları düzenler (`staffRoles: ['editor']`), düzenleyince yazar değişmez. GridBase'in 12 Kasım 2026 sürümünü ve CLI 0.2.3'ü ister.

## Şema

| Tablo | Okuma | Yazma | Kolonlar |
| --- | --- | --- | --- |
| `categories` | Herkes | editor | `name`, `slug` |
| `posts` | Yayındaki: herkes · taslak: yazarı ve editor | editor | `title`, `slug`, `excerpt`, `body`, `coverImage`, `categoryId`, `authorId`, `authorName`, `published`, `publishedAt` |
| `comments` | Yazıyı görebilen | Sahibi (editor hepsini) | `postId`, `body`, `authorName`, `postAuthorId`, `createdAt`, `ownerId` |

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
