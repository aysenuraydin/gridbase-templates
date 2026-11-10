# Kullanıcı yönetimi

Uygulamanın kendi içinde bir yönetici paneli: kullanıcıları ara, rol ver / al, engelle. Secret key gerekmez: `admin` rolündeki kullanıcı kendi oturumuyla yönetir, sınırları GridBase koyar. Yanında rolün işe yaradığını gösteren küçük bir ekran var: duyuruları yalnız `moderator` rolü yazar.

**Gösterdiği:**
- **Uygulama içi yöneticiler** (`project.adminRoles: ['admin']`): yönetici, uygulamadan kullanıcıları listeler ve arar, yönetici olmayan rolleri verir / alır, yönetici olmayanları engeller
- **Rol tanımları** dosyada (`roles`): `admin`, `moderator`, `premium`
- **Role göre yetki:** `announcements` girişli herkese okunur, yalnız `moderator` yazar; rol verilince hem ekran hem sunucu yetkisi açılır
- **Realtime:** yeni duyuru herkesin ekranına anında düşer

<!-- kurulum:başla -->
## Kurulum

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init users
```

Komut sırayla:
1. şablonu `users/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları, rolleri (admin, moderator, premium) kurar,
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd users/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init users --url https://api.senin-alanin.com`

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

## İlk yöneticiyi sen atarsın

Yönetici rolünü (`admin`) hiçbir kullanıcı uygulamadan veremez ya da alamaz; uygulama içinde yetki merdiveni oluşmasın diye. İlk yöneticiyi sen verirsin:

1. Uygulamada bir hesap aç.
2. GridBase paneli › projen › **Kullanıcılar ve roller** › kullanıcıyı bul › Rol ver › `admin`.
3. Uygulamada **Hesabım › Rollerimi yenile** (ya da çıkış yapıp gir). Üstte **Kullanıcılar** sekmesi çıkar.

## Uygulama içi yöneticiler: kurallar

| İşlem | Panel / secret key | Uygulamadaki yönetici |
| --- | --- | --- |
| Kullanıcıları listele, ara; rolleri gör | ✅ | ✅ |
| Rol ver / al | ✅ | ✅ yönetici olmayan roller; `admin` verilemez / alınamaz (`403`) |
| Engelle / engeli kaldır | ✅ | ✅ yönetici olmayanlar; kendini ve başka yöneticiyi engelleyemez (`403`) |
| Rol aç / düzenle / sil, hesap sil | ✅ | ❌ `403` |

Kural sunucuda: arayüzde düğmeyi gizlemek yalnız kolaylık, biri API'yi doğrudan çağırsa da aynı yanıtı alır. Yetki her istekte kullanıcının o anki rollerinden okunur: rolü alınan ya da engellenen yönetici token'ı yenilemeden hemen `403` alır. Engellenen kullanıcı giriş yapamaz ve oturumları kapanır.

Rolü verilen kullanıcının **tablo yetkisi** (ör. duyuru yazmak) token'ındaki rollerden gelir: yeni rol, token yenilenince (en geç 1 saat, ya da **Rollerimi yenile**) geçerli olur.

Ayarı panelden de değiştirebilirsin: Proje ayarları › Kimlik doğrulama › **Uygulama içi yöneticiler**.

## Şema

| Tablo | Okuma | Yazma | Kolonlar |
| --- | --- | --- | --- |
| `announcements` | Girişli | moderator | `title`, `body`, `authorName`, `createdAt` |

Roller: `admin` (uygulama içi yönetici), `moderator`, `premium` (örnek: kendi ücretli özelliklerin için).

## Kod

| Dosya | Ne yapar |
| --- | --- |
| `web/src/admin.ts` | Yönetim uçları (`/endusers`, `/roles`) ve kuralları |
| `web/src/UsersPage.tsx` | Kullanıcı listesi, arama, sayfalama, rol ver / al, engelle |
| `web/src/AnnouncementsPage.tsx` | Role göre açılan yazma kutusu + realtime liste |
| `web/src/MePage.tsx` | Rollerin, token yenileme |
