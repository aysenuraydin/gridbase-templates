# Todo

Kişiye özel yapılacaklar listesi. GridBase'e yeni başlıyorsan buradan başla: en az kodla kimlik, kurallı tablo, dosya ve realtime.

**Gösterdiği:**
- E-posta ile kayıt / giriş, e-posta onay kodu, şifremi unuttum
- **Owner** erişimi: her kullanıcı yalnız kendi görevlerini görür ve değiştirir (sahip kolonu `ownerId`'yi GridBase damgalar)
- **Realtime:** aynı hesapla iki sekme aç, birinde eklediğin görev diğerinde anında görünür
- **Özel kova:** göreve resim; resmi yalnız yükleyen görür (5 dk geçerli imzalı link)

<!-- kurulum:başla -->
## Kurulum

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init todo
```

Komut sırayla:
1. şablonu `todo/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları kurar,
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd todo/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init todo --url https://api.senin-alanin.com`

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

## Şema

| Tablo | Erişim | Kolonlar |
| --- | --- | --- |
| `todos` | Owner (yalnız sahibi), realtime | `title`, `done` (Boolean), `image` (kovadaki dosya adı), `createdAt`, `ownerId` |

| Kova | Okuma | Yazma | Sınır |
| --- | --- | --- | --- |
| `todo-images` | Owner | Girişli | 5 MB, resim |

## Kod

| Dosya | Ne yapar |
| --- | --- |
| `gridbase.config.ts` | Şema: tablo, erişim, kova, CORS |
| `web/src/shared/gridbase.ts` | GridBase istemcisi (`.env.local`'dan) |
| `web/src/shared/AuthScreen.tsx` | Giriş, kayıt, onay kodu, şifremi unuttum, Google |
| `web/src/TodoPage.tsx` | Liste, ekle, işaretle, sil, resim, realtime |

Yeni bir alan eklemek için: `gridbase.config.ts`'te kolona ekle → `npx @gridbasetr/cli apply` → kodda kullan. GridBase'te son kullanıcı kolon açamaz; tanımsız alan `400` döner.
