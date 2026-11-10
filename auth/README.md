# Kimlik tam paket

Bir uygulamanın hesap tarafında gereken her şey, çalışır hâlde. Kendi uygulamana giriş ekranını ve "Hesabım" sayfasını buradan kopyalayabilirsin.

**Gösterdiği:**
- Kayıt + **e-posta onayı** (mailden 6 haneli kod; projede zorunlu açık), kodu yeniden gönderme
- **Şifremi unuttum:** kod → yeni şifre
- **Google ile giriş** (isteğe bağlı, aşağıda)
- **Profil:** görünen ad, hakkında, fotoğraf (herkese açık `avatars` kovası)
- **Güvenlik:** şifre değiştir (diğer cihazlar kapanır), e-posta değiştir (eski adrese bilgi maili)
- **Açık oturumlar:** cihaz listesi, tek cihazı kapatma, bütün cihazlardan çıkış
- **Hesabı sil:** şifreyle yeniden doğrulama, sahibi olduğu satırlar ve dosyalar da silinir (App Store kuralı 5.1.1(v))

<!-- kurulum:başla -->
## Kurulum

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init auth
```

Komut sırayla:
1. şablonu `auth/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları kurar,
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd auth/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init auth --url https://api.senin-alanin.com`

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

## E-posta onayı ve mailler

`gridbase.config.ts`'te `emailConfirmation: true`: kayıttan sonra kullanıcıya 6 haneli kod gider, onaylamadan giriş yapamaz. Mailler GridBase'in genel hesabından gider; kendi alan adınla göndermek için panel › Proje ayarları › **Mail hesabı**'na SMTP gir (Gmail, Resend, Brevo hazır ayarları var), **Mail görünümü**'nden logo ve renk seç. Onayı istemiyorsan `emailConfirmation: false` yap ve `apply` çalıştır.

## Google ile giriş (isteğe bağlı)

1. Google Cloud Console › APIs & Services › Credentials › **OAuth client ID** › Web application. "Authorized JavaScript origins"a `http://localhost:5173` (ve canlı adresin).
2. Client id'yi iki yere yaz:
   - `web/.env.local` → `VITE_GOOGLE_CLIENT_ID=123-abc.apps.googleusercontent.com`
   - `gridbase.config.ts` → `project.googleClientIds: ['123-abc.apps.googleusercontent.com']`, sonra `npx @gridbasetr/cli apply` (ya da panel › Proje ayarları › Google ile giriş)
3. Geliştirme sunucusunu yeniden başlat: giriş ekranında Google düğmesi çıkar.

GridBase token'ı Google'a sorarak doğrular; client secret gerekmez. Aynı e-postayla açılmış hesap varsa ona girer.

## Şema

| Tablo | Erişim | Kolonlar |
| --- | --- | --- |
| `profiles` | Owner (yalnız sahibi) | `bio`, `avatar` (kovadaki dosya adı), `ownerId` |

| Kova | Okuma | Yazma | Sınır |
| --- | --- | --- | --- |
| `avatars` | Herkes | Girişli | 2 MB, resim |

Görünen ad ve e-posta tabloda değil, GridBase'in kendi kullanıcı kaydında (`gb.auth.user`).

## Kod

| Dosya | Ne yapar |
| --- | --- |
| `web/src/shared/AuthScreen.tsx` | Giriş, kayıt, onay kodu, şifremi unuttum, Google |
| `web/src/shared/auth.tsx` | Oturum durumu (`useAuth`) |
| `web/src/AccountPage.tsx` | Profil, güvenlik, oturumlar, hesabı sil |
