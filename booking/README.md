# Rezervasyon

Hizmet seç, boş saati gör, randevu al. Kuaför, klinik, danışman, stüdyo gibi saatle çalışan işler için. İşletme (admin rolü) randevuları uygulamanın içinden onaylar, müşteriye bildirim gider.

**Gösterdiği:**
- **Public hizmet listesi:** girişsiz görünür, yalnız `admin` rolü düzenler
- **Kişisel bilgi sızdırmadan doluluk:** `busy_slots` yalnız gün + saat tutar; randevunun kendisi (kim, not) `owner()` tabloda, yalnız sahibine görünür
- **Realtime:** başkası bir saati alınca senin ekranında da anında dolu olur; randevu durumu değişince "Randevularım" güncellenir
- **Push kuralı:** `bookings.status` değişince randevu sahibine bildirim
- **Çifte randevu sunucuda engellenir:** `busy_slots`'ta `unique: [['date', 'time']]`; aynı anda iki kişi aynı saate basarsa ikincisi `409` alır
- **İşletme ekranı:** `bookings` müşteriye özel ama `staffRoles: ['admin']` işletmeye bütün randevuları açar (onayla / iptal et)
- **Müşteri kendi randevusunu onaylayamaz** (`update: 'Nobody'`): durumu yalnız işletme değiştirir; müşteri API'den "Onaylandı" yazmaya çalışırsa `403`, randevusunu iptal edip silebilir
- Süreye göre ardışık dilim (90 dk = 3 dilim), geçmiş saatler kapalı, pazar kapalı
- **Örnek veri:** 4 hizmet

<!-- kurulum:başla -->
## Kurulum

**Gereksinimler:** Node.js 18 ya da üstü ve bir GridBase hesabı ([panel.gridbasetr.com](https://panel.gridbasetr.com), ücretsiz).

Kurulumun sonunda GridBase'te bu şablonun tabloları kurulmuş bir proje olur, `web/.env.local` dosyasında da o projenin **anon key**'i yazar. Bunu iki yoldan yapabilirsin.

> **Hangi anahtar nereye?** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; kim neyi okur / yazar, tabloların kuralları belirler. `web/.env.local`'a bu yazılır.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** yazılmaz. Bu şablonda hiç gerekmez: şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init booking
```

Komut şunları yapar:
1. Şablonu `booking/` klasörüne indirir.
2. Giriş yapmadıysan tarayıcıda GridBase panelini açar. Ekrandaki kodu onaylarsın; şifren terminale yazılmaz.
3. Panelde **yeni bir proje** açar. Var olan bir projeyi kullanmak için: `--project <id ya da ad>`.
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları, rolleri (admin) kurar ve örnek veriyi yazar (`--no-seed` ile yazmaz).
5. Projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra uygulamayı çalıştır:

```bash
cd booking/web
npm install
npm run dev        # http://localhost:5173
```

Kendi GridBase sunucunu kullanıyorsan: `npx @gridbasetr/cli init booking --url https://api.senin-alanin.com`

### Yol 2: elle

1. **Şablonu indir:** [GitHub'dan](https://github.com/aysenuraydin/gridbase-templates) depoyu indir, `booking` klasörünü al.
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

## Çalışma saatleri ve onay

- Saatler `web/src/main.tsx` › `HOURS` (başlangıç, bitiş, dilim, kaç gün ileri, kapalı günler).
- Kendine `admin` rolünü ver (panel › Kullanıcılar ve roller), çıkış yapıp gir: üstte **İşletme** çıkar. Randevular "Onay bekliyor" ile açılır; İşletme'den `Onaylandı` ya da `İptal` yap, müşteriye bildirim gider. İptal saatleri yeniden boşaltır.

## Bilinen sınırlar

- Hatırlatma bildirimi (randevudan 1 saat önce) yok: zamanlı bildirim secret key ya da gönderici rolü ister, tarayıcıdaki uygulama gönderemez.

## Şema

| Tablo | Okuma | Yazma | Kolonlar |
| --- | --- | --- | --- |
| `services` | Herkes | admin | `name`, `description`, `durationMin`, `price` |
| `bookings` | Sahibi + admin | Müşteri alır ve siler; durumu yalnız admin değiştirir | `serviceId`, `serviceName`, `date`, `time`, `note`, `status`, `createdAt`, `ownerId` |
| `busy_slots` | Girişli | Sahibi + admin; tekil `date + time` | `date`, `time`, `ownerId` |

## Kod

`web/src/main.tsx`: hizmetler, gün + saat seçimi, randevularım (iptal).
