# E-ticaret (demo)

> **Demo mağaza.** Gerçek ödeme yok, siparişler "kapıda ödeme". Sipariş toplamını tarayıcı hesaplıyor (GridBase'te sunucu fonksiyonu yok). Satışa açmadan önce aşağıdaki **Canlıya almadan önce** bölümünü oku.

Ürün kataloğu, sepet, adres, sipariş ve yorumlar. Ziyaretçi girişsiz gezer, müşteri girişle sipariş verir, **admin** rolündeki kullanıcı ürün ekler. Sipariş durumu değişince müşteriye bildirim gider.

**Gösterdiği:**
- **Public katalog:** ürünler ve kategoriler girişsiz okunur, arama (`search`), kategori süzgeci
- **Owner tabloları:** sepet, adresler ve siparişler kişiye özel; başkası API'yi çağırsa da göremez
- **Yönetici rolü sahiplik kuralını aşar** (`owner({ staffRoles: ['admin'] })`): admin bütün siparişleri uygulamanın içinden görür ve durumunu değiştirir, sipariş müşteride kalır
- **Rol:** ürün / kategori yazmak `role('admin')` ister; ürün görselleri yalnız admin yükler
- **Push kuralı:** `orders.status` değişince sipariş sahibine bildirim (`push.rules`), "Bildirimleri aç" ile tarayıcıya
- **Realtime:** durum değişince "Siparişlerim" ekranı kendiliğinden güncellenir
- **Örnek veri:** 3 kategori, 8 ürün, 2 yorum

<!-- kurulum:başla -->
## Kurulum

**Gereksinimler:** Node.js 18 ya da üstü ve bir GridBase hesabı ([panel.gridbasetr.com](https://panel.gridbasetr.com), ücretsiz).

Kurulumun sonunda GridBase'te bu şablonun tabloları kurulmuş bir proje olur, `web/.env.local` dosyasında da o projenin **anon key**'i yazar. Bunu iki yoldan yapabilirsin.

> **Hangi anahtar nereye?** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; kim neyi okur / yazar, tabloların kuralları belirler. `web/.env.local`'a bu yazılır.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** yazılmaz. Bu şablonda hiç gerekmez: şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init shop
```

Komut şunları yapar:
1. Şablonu `shop/` klasörüne indirir.
2. Giriş yapmadıysan tarayıcıda GridBase panelini açar. Ekrandaki kodu onaylarsın; şifren terminale yazılmaz.
3. Panelde **yeni bir proje** açar. Var olan bir projeyi kullanmak için: `--project <id ya da ad>`.
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları, rolleri (admin) kurar ve örnek veriyi yazar (`--no-seed` ile yazmaz).
5. Projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra uygulamayı çalıştır:

```bash
cd shop/web
npm install
npm run dev        # http://localhost:5173
```

Kendi GridBase sunucunu kullanıyorsan: `npx @gridbasetr/cli init shop --url https://api.senin-alanin.com`

### Yol 2: elle

1. **Şablonu indir:** [GitHub'dan](https://github.com/aysenuraydin/gridbase-templates) depoyu indir, `shop` klasörünü al.
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

## Mağaza yöneticisi (admin) ve siparişler

1. Uygulamada hesap aç; GridBase paneli › Kullanıcılar ve roller › kendine `admin` rolünü ver; uygulamada çıkış yapıp gir. Üstte **Yönetim** çıkar: ürün ekle / düzenle, görsel yükle, satıştan kaldır.
2. **Siparişler:** Yönetim › Siparişler'de bütün siparişler; durumu değiştir (`Alındı` → `Hazırlanıyor` → `Kargoda` → `Teslim edildi`), müşteriye bildirim gider, ekranı anında güncellenir. `orders` müşteriye özel bir tablo ama `staffRoles: ['admin']` admin rolüne bütün satırları açar; admin olmayan biri ekranı açsa da yalnız kendi siparişini görür.

## Canlıya almadan önce

Bu şablon akışı göstermek için; gerçek satış için eksikleri bilerek bırakıldı:

- **Fiyatı sunucu doğrulamıyor.** Sipariş satırları ve toplam tarayıcıda hesaplanıp `orders`'a yazılıyor; kullanıcı API'yi doğrudan çağırarak farklı bir toplam yazabilir. Kapıda ödemede teslimatta düzeltilir, kartla ödemede olmaz: ödeme sağlayıcısının (iyzico vb.) sunucu tarafında tutarı ürün tablosundan kendin hesaplayan küçük bir servis gerekir.
- **Stok düşmüyor.** Müşteri `products`'a yazamaz (yalnız admin). Stoku siparişten sonra panelden ya da kendi servisinden düşür.
- **Yorumlar** artık güvenli: `ownerWrite({ read: 'Public', staffRoles: ['admin'] })` (herkes okur, yalnız yazan düzenler) ve ürün başına kişi başı tek yorum (`unique: [['productId', 'ownerId']]`, ikincisi `409`).
- Mesafeli satış sözleşmesi, ön bilgilendirme formu, fatura: senin işin.

## Şema

| Tablo | Okuma | Yazma | Kolonlar |
| --- | --- | --- | --- |
| `categories` | Herkes | admin | `name`, `slug` |
| `products` | Herkes | admin | `name`, `description`, `price`, `image`, `categoryId`, `stock`, `active` |
| `cart_items` | Sahibi | Sahibi | `productId`, `quantity`, `ownerId` |
| `addresses` | Sahibi | Sahibi | `title`, `fullName`, `phone`, `city`, `district`, `line`, `ownerId` |
| `orders` | Sahibi + admin | Sahibi + admin | `items` (JSON), `total`, `status`, `address`, `paymentMethod`, `note`, `createdAt`, `ownerId` |
| `reviews` | Herkes | Sahibi (admin hepsini); tekil `productId + ownerId` | `productId`, `rating`, `body`, `authorName`, `createdAt`, `ownerId` |

| Kova | Okuma | Yazma | Sınır |
| --- | --- | --- | --- |
| `product-images` | Herkes | admin | 5 MB, resim |

## Kod

| Dosya | Ne yapar |
| --- | --- |
| `web/src/data.ts` | Tablolar, tipler, sepete ekle |
| `web/src/pages/ShopPage.tsx` | Katalog, kategori, arama |
| `web/src/pages/ProductPage.tsx` | Ürün + yorumlar |
| `web/src/pages/CartPage.tsx` | Sepet, adres, sipariş |
| `web/src/pages/OrdersPage.tsx` | Siparişlerim (realtime) |
| `web/src/pages/AdminPage.tsx` | Ürün yönetimi |
