# Rezervasyon

Hizmet seç, boş saati gör, randevu al. Kuaför, klinik, danışman, stüdyo gibi saatle çalışan işler için. İşletme (admin rolü) randevuları uygulamanın içinden onaylar, müşteriye bildirim gider.

**Gösterdiği:**
- **Public hizmet listesi:** girişsiz görünür, yalnız `admin` rolü düzenler
- **Kişisel bilgi sızdırmadan doluluk:** `busy_slots` yalnız gün + saat tutar; randevunun kendisi (kim, not) `owner()` tabloda, yalnız sahibine görünür
- **Realtime:** başkası bir saati alınca senin ekranında da anında dolu olur; randevu durumu değişince "Randevularım" güncellenir
- **Push kuralı:** `bookings.status` değişince randevu sahibine bildirim
- **Çifte randevu sunucuda engellenir:** `busy_slots`'ta `unique: [['date', 'time']]`; aynı anda iki kişi aynı saate basarsa ikincisi `409` alır
- **İşletme ekranı:** `bookings` müşteriye özel ama `staffRoles: ['admin']` işletmeye bütün randevuları açar (onayla / iptal et)
- Süreye göre ardışık dilim (90 dk = 3 dilim), geçmiş saatler kapalı, pazar kapalı
- **Örnek veri:** 4 hizmet

<!-- kurulum:başla -->
## Kurulum

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init booking
```

Komut sırayla:
1. şablonu `booking/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları, rolleri (admin) kurar ve örnek veriyi yazar (`--no-seed` ile yazmaz),
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd booking/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init booking --url https://api.senin-alanin.com`

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

## Çalışma saatleri ve onay

- Saatler `web/src/main.tsx` › `HOURS` (başlangıç, bitiş, dilim, kaç gün ileri, kapalı günler).
- Kendine `admin` rolünü ver (panel › Kullanıcılar ve roller), çıkış yapıp gir: üstte **İşletme** çıkar. Randevular "Onay bekliyor" ile açılır; İşletme'den `Onaylandı` ya da `İptal` yap, müşteriye bildirim gider. İptal saatleri yeniden boşaltır.

## Bilinen sınırlar

- Hatırlatma bildirimi (randevudan 1 saat önce) yok: zamanlı bildirim secret key ya da gönderici rolü ister, tarayıcıdaki uygulama gönderemez.

## Şema

| Tablo | Okuma | Yazma | Kolonlar |
| --- | --- | --- | --- |
| `services` | Herkes | admin | `name`, `description`, `durationMin`, `price` |
| `bookings` | Sahibi + admin | Sahibi + admin | `serviceId`, `serviceName`, `date`, `time`, `note`, `status`, `createdAt`, `ownerId` |
| `busy_slots` | Girişli | Sahibi + admin; tekil `date + time` | `date`, `time`, `ownerId` |

## Kod

`web/src/main.tsx`: hizmetler, gün + saat seçimi, randevularım (iptal).
