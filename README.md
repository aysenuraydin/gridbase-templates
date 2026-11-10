# GridBase şablonları

[GridBase](https://panel.gridbasetr.com) ile çalışan, hazır örnek uygulamalar. Her biri GridBase'in başka bir özelliğini gösterir. Birini seç, tek komutla kendi GridBase projende ayağa kaldır, üstüne kendi ürününü kur. Backend kodu yazmazsın: kimlik, tablolar, erişim kuralları, dosyalar, realtime ve bildirimler GridBase'te.

## Şablonlar

| Şablon | Ne | Gösterdiği |
| --- | --- | --- |
| [`todo`](todo) | Yapılacaklar listesi | Kişiye özel veri, realtime, özel dosya kovası |
| [`auth`](auth) | Kimlik tam paket | E-posta onayı, şifremi unuttum, Google ile giriş, profil + fotoğraf, açık oturumlar, hesap silme |
| [`blog`](blog) | Blog | Girişsiz okuma, editor rolü, yorumlar, yeni yoruma bildirim, örnek veri |
| [`chat`](chat) | Sohbet | Birebir ve grup, realtime, "yazıyor…", çevrimiçi göstergesi, mesaj bildirimi |
| [`shop`](shop) | E-ticaret (demo) | Ürün kataloğu, sepet, sipariş (kapıda ödeme), yönetici paneli, sipariş durumu bildirimi |
| [`users`](users) | Kullanıcı yönetimi | Uygulama içi yönetici: kullanıcıları ara, rol ver / al, engelle |
| [`notes`](notes) | Notlar | Kişiyle paylaşma (salt okunur), realtime |
| [`files`](files) | Dosyalar | Drive gibi: klasörler, her tür dosya, önizleme, kişiyle paylaşma |
| [`polls`](polls) | Anket | Bağlantıyla paylaşılan anket, kişi başına tek oy, canlı sonuç |
| [`booking`](booking) | Rezervasyon | Hizmet ve boş saat seçimi, çifte randevu engeli, işletme ekranı, onay bildirimi |

Hepsi React + Vite + TypeScript ve [`@gridbasetr/client`](https://www.npmjs.com/package/@gridbasetr/client) ile yazıldı. Tasarım hazır, telefona uyumlu, açık ve koyu modu var.

## Hızlı başlangıç

**Gereksinimler:** Node.js 18 ya da üstü ve bir GridBase hesabı ([panel.gridbasetr.com](https://panel.gridbasetr.com), ücretsiz).

```bash
npx @gridbasetr/cli init blog     # ya da yalnız "init": listeden seç
cd blog/web
npm install
npm run dev                       # http://localhost:5173
```

`init` sırayla şunları yapar:

1. Şablonu `blog/` klasörüne indirir.
2. Tarayıcıda GridBase panelini açar, girişini onaylarsın (şifren terminale yazılmaz).
3. Panelde yeni bir proje açar.
4. Tabloları, erişim kurallarını, dosya kovalarını, rolleri ve (varsa) örnek veriyi kurar.
5. Projenin **anon key**'ini üretip `web/.env.local`'a yazar.

Elle kurmak, var olan bir projeye kurmak ya da kendi GridBase sunucunu kullanmak istersen: her şablonun README'sinde **Kurulum** bölümü adım adım anlatıyor.

## Anahtarlar

GridBase'te her projenin iki tür anahtarı var:

- **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; kim neyi okur ve yazar, tabloların erişim kuralları belirler. Şablonlarda `web/.env.local` dosyasındaki `VITE_GRIDBASE_ANON_KEY`.
- **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env` dosyalarına ya da git'e **asla** yazılmaz. Şablonlar onu hiç kullanmaz; şemayı panel hesabınla kurarsın.

Bu depoda hiçbir anahtar yok: `.env.local` kurulumda senin bilgisayarında oluşur ve git'e girmez (`.gitignore`).

## Bir şablonun içi

```
blog/
  template.json        ad, açıklama, gösterdikleri
  gridbase.config.ts   şema: tablolar, kolonlar, erişim kuralları, kovalar, roller, CORS, bildirim kuralları
  seed.json            örnek veri (varsa)
  README.md            kurulum, şema, kurallar
  web/                 uygulama
    .env.example       .env.local'ın örneği (GridBase adresi + anon key)
    src/shared/        GridBase istemcisi, giriş ekranı, ortak arayüz
    src/               şablona özel ekranlar
```

**Şemayı değiştirmek:** `gridbase.config.ts`'i düzenle, şablonun kökünde `npx @gridbasetr/cli apply` çalıştır. Komut önce ne değişeceğini gösterir, onay ister; `--prune` vermezsen hiçbir şey silmez. Son kullanıcı yeni kolon açamaz: uygulamaya yeni bir alan eklemeden önce kolonu bu dosyaya ekleyip `apply` çalıştır.

**Canlıya alırken:** `web/` klasöründe `npm run build`, çıkan `dist/` klasörünü herhangi bir statik barındırmaya (Cloudflare Pages, Netlify, Vercel, kendi sunucun) koy. Canlı adresini `gridbase.config.ts` › `project.cors`'a ekleyip `apply` çalıştır.

## Bu depoda geliştirme

Ortak parçalar `_shared/` klasöründe (GridBase istemcisi, giriş ekranı, stil, simgeler, README'lerin kurulum bölümü). Her şablon tek başına indirilebilsin diye kopyaları şablonların içinde durur. Ortak bir şeyi değiştirince şablonlara dağıt:

```bash
node scripts/sync-shared.mjs
```

Yeni şablon eklemek için: bir klasör, içinde `template.json`, `gridbase.config.ts`, `web/` ve README'de `<!-- kurulum:başla -->` `<!-- kurulum:bitir -->` işaretleri. `sync-shared` ortak dosyaları ve kurulum bölümünü doldurur. Yerel bir GridBase'e karşı denemek: `npx @gridbasetr/cli init <şablon> --from . --url http://localhost:5179`.

## Lisans

MIT. Şablonları kendi projelerinde, ticari olanlar dahil, serbestçe kullanabilir ve değiştirebilirsin.
