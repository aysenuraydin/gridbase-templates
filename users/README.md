# Kullanıcı yönetimi

Uygulamanın kendi içinde bir yönetici paneli: kullanıcıları ara, rol ver / al, engelle. Secret key gerekmez: `admin` rolündeki kullanıcı kendi oturumuyla yönetir, sınırları GridBase koyar. Yanında rolün işe yaradığını gösteren küçük bir ekran var: duyuruları yalnız `moderator` rolü yazar.

**Gösterdiği:**
- **Uygulama içi yöneticiler** (`project.adminRoles: ['admin']`): yönetici, uygulamadan kullanıcıları listeler ve arar, yönetici olmayan rolleri verir / alır, yönetici olmayanları engeller
- **Rol tanımları** dosyada (`roles`): `admin`, `moderator`, `premium`
- **Role göre yetki:** `announcements` girişli herkese okunur, yalnız `moderator` yazar; rol verilince hem ekran hem sunucu yetkisi açılır
- **Realtime:** yeni duyuru herkesin ekranına anında düşer

<!-- kurulum:başla -->
## Kurulum

**Gereksinimler:** Node.js 18 ya da üstü ve bir GridBase hesabı ([panel.gridbasetr.com](https://panel.gridbasetr.com), ücretsiz).

Kurulumun sonunda GridBase'te bu şablonun tabloları kurulmuş bir proje olur, `web/.env.local` dosyasında da o projenin **anon key**'i yazar. Bunu iki yoldan yapabilirsin.

> **Hangi anahtar nereye?** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; kim neyi okur / yazar, tabloların kuralları belirler. `web/.env.local`'a bu yazılır.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** yazılmaz. Bu şablonda hiç gerekmez: şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init users
```

Komut şunları yapar:
1. Şablonu `users/` klasörüne indirir.
2. Giriş yapmadıysan tarayıcıda GridBase panelini açar. Ekrandaki kodu onaylarsın; şifren terminale yazılmaz.
3. Panelde **yeni bir proje** açar. Var olan bir projeyi kullanmak için: `--project <id ya da ad>`.
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları, rolleri (admin, moderator, premium) kurar.
5. Projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra uygulamayı çalıştır:

```bash
cd users/web
npm install
npm run dev        # http://localhost:5173
```

Kendi GridBase sunucunu kullanıyorsan: `npx @gridbasetr/cli init users --url https://api.senin-alanin.com`

### Yol 2: elle

1. **Şablonu indir:** [GitHub'dan](https://github.com/aysenuraydin/gridbase-templates) depoyu indir, `users` klasörünü al.
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
