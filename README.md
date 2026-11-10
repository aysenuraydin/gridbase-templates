# GridBase şablonları

[GridBase](https://panel.gridbasetr.com) için çalışır hâlde örnek uygulamalar. Her biri GridBase'in başka bir özelliğini gösterir; birini seç, tek komutla kendi projende ayağa kaldır, üstüne kendi ürününü kur.

```bash
npx @gridbasetr/cli init            # listeden seç
npx @gridbasetr/cli init blog       # doğrudan
```

`init` şablonu indirir, GridBase'te yeni bir proje açar, tabloları / kuralları / kovaları / rolleri kurar, örnek veriyi yazar ve projenin **anon key**'ini `web/.env.local`'a koyar. Sonra `cd <şablon>/web && npm install && npm run dev`. Elle kurmak istersen her şablonun README'sinde adım adım anlatılıyor.

| Şablon | Ne | Gösterdiği |
| --- | --- | --- |
| [`todo`](todo) | Yapılacaklar | Owner erişimi, realtime, özel kova |
| [`auth`](auth) | Kimlik tam paket | E-posta onayı, şifremi unuttum, Google, profil + avatar, açık oturumlar, hesap silme |
| [`blog`](blog) | Blog | Public okuma, editor rolü, yorumlar, yeni yoruma push kuralı, örnek veri |
| [`chat`](chat) | Sohbet | Katılımcı kolonu, realtime, "yazıyor…" ve çevrimiçi (odalar), mesaj bildirimi |
| [`shop`](shop) | E-ticaret (demo) | Public katalog, kişiye özel sepet / sipariş, admin rolü, sipariş durumu bildirimi |
| [`users`](users) | Kullanıcı yönetimi | Uygulama içi yöneticiler (`adminRoles`), rol ver / al, engelle |
| [`notes`](notes) | Notlar | Kişiyle paylaşma (salt okunur), realtime |
| [`files`](files) | Dosyalar | Drive gibi: klasör, her tür dosya, "Row" kovasıyla paylaşma, önizleme |
| [`polls`](polls) | Anket | Girişsiz sonuç, süzgeçli realtime |
| [`booking`](booking) | Rezervasyon | Hizmet + boş saat, kişisel bilgi sızdırmadan doluluk, onay bildirimi |

## Her şablonda

```
<şablon>/
  template.json        ad, açıklama, gösterdikleri
  gridbase.config.ts   şema: tablolar, erişim, kovalar, roller, CORS, push kuralları (gridbase apply)
  seed.json            örnek veri (varsa; gridbase seed)
  README.md            kurulum (otomatik / elle), şema, bilinen sınırlar
  web/                 React + Vite + TypeScript, @gridbasetr/client
```

Şemayı değiştirmek: `gridbase.config.ts`'i düzenle → kökte `npx @gridbasetr/cli apply` (önce planı gösterir; `--prune` olmadan hiçbir şey silmez).

**Anahtarlar:** uygulamaya yalnız **anon key** (`gb_pk_…`) girer; herkese açıktır, kuralları tablolar koyar. **Secret key** (`gb_sk_…`) bütün kuralları atlar: uygulamaya, `.env` dosyasına ya da git'e konmaz. Şablonlar onu hiç kullanmaz; şemayı panel hesabınla (`gridbase login`) kurarsın.

## Bu depoda geliştirme

Ortak parçalar `_shared/`'de (GridBase istemcisi, giriş ekranı, stil, kurulum bölümü). Her şablon tek başına indirilebilsin diye kopyaları şablonların içinde durur; ortak bir şeyi değiştirince:

```bash
node scripts/sync-shared.mjs
```

Yeni şablon: klasör + `template.json` + `gridbase.config.ts` + `web/` + README'de `<!-- kurulum:başla -->` `<!-- kurulum:bitir -->` işaretleri; `sync-shared` geri kalanını doldurur. Yerelde denemek: `npx @gridbasetr/cli init <şablon> --from . --url http://localhost:5179`.

MIT lisanslı.
