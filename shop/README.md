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

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init shop
```

Komut sırayla:
1. şablonu `shop/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları, rolleri (admin) kurar ve örnek veriyi yazar (`--no-seed` ile yazmaz),
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd shop/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init shop --url https://api.senin-alanin.com`

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
