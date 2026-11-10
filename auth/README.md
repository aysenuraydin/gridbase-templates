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

**Gereksinimler:** Node.js 18 ya da üstü ve bir GridBase hesabı ([panel.gridbasetr.com](https://panel.gridbasetr.com), ücretsiz).

Kurulumun sonunda GridBase'te bu şablonun tabloları kurulmuş bir proje olur, `web/.env.local` dosyasında da o projenin **anon key**'i yazar. Bunu iki yoldan yapabilirsin.

> **Hangi anahtar nereye?** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; kim neyi okur / yazar, tabloların kuralları belirler. `web/.env.local`'a bu yazılır.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** yazılmaz. Bu şablonda hiç gerekmez: şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init auth
```

Komut şunları yapar:
1. Şablonu `auth/` klasörüne indirir.
2. Giriş yapmadıysan tarayıcıda GridBase panelini açar. Ekrandaki kodu onaylarsın; şifren terminale yazılmaz.
3. Panelde **yeni bir proje** açar. Var olan bir projeyi kullanmak için: `--project <id ya da ad>`.
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları kurar.
5. Projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra uygulamayı çalıştır:

```bash
cd auth/web
npm install
npm run dev        # http://localhost:5173
```

Kendi GridBase sunucunu kullanıyorsan: `npx @gridbasetr/cli init auth --url https://api.senin-alanin.com`

### Yol 2: elle

1. **Şablonu indir:** [GitHub'dan](https://github.com/aysenuraydin/gridbase-templates) depoyu indir, `auth` klasörünü al.
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
