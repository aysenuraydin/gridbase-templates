# Anket

Anket aç, bağlantısını paylaş, oylar geldikçe sonuç çubukları canlı dolsun. Bağlantıyı açan herkes sonucu görür; oy vermek için giriş yeter.

**Gösterdiği:**
- **Public okuma:** paylaşılan anket bağlantısı girişsiz açılır, sonuçlar da görünür
- **Realtime + süzgeç:** yalnız o anketin oylarına abone olunur (`filter: { pollId }`), sayım anında güncellenir
- **Kişi başına bir oy sunucuda** (tekil kolon grubu), oyunu değiştirebilirsin; bitiş tarihi, anketi kapatma
- **Örnek veri:** 2 anket, 3 oy

<!-- kurulum:başla -->
## Kurulum

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init polls
```

Komut sırayla:
1. şablonu `polls/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları kurar ve örnek veriyi yazar (`--no-seed` ile yazmaz),
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd polls/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init polls --url https://api.senin-alanin.com`

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

## Kurallar sunucuda

- **Kişi başına bir oy:** `votes` tablosunda `unique: [['pollId', 'ownerId']]`; aynı ankete ikinci oy `409` döner (arayüz oyu değiştirir, yenisini yazmaz).
- **Herkes yalnız kendi oyunu / anketini değiştirir:** `ownerWrite({ read: 'Public' })`; sonuçlar herkese açık, başkasının oyunu API'den değiştirmeye çalışan `403` alır. `ownerId`'yi GridBase damgalar, istemci yazamaz.

## Şema

| Tablo | Okuma | Yazma | Kolonlar |
| --- | --- | --- | --- |
| `polls` | Herkes | Sahibi | `question`, `options` (JSON), `authorName`, `endsAt`, `closed`, `createdAt`, `ownerId` |
| `votes` | Herkes | Sahibi; tekil `pollId + ownerId` | `pollId`, `option` (seçenek sırası), `createdAt`, `ownerId` |

## Kod

`web/src/main.tsx`: liste, anket sayfası (oy + canlı sonuç), yeni anket formu.
