# Notlar

Renkli notlar: ara, sabitle, istediğin kişiyle paylaş. Paylaştığın kişi notu görür ama değiştiremez; sen değiştirdikçe onun ekranında anında güncellenir.

**Gösterdiği:**
- **Owner + katılımcı kolonu:** not sahibine ait, `sharedWith`'te id'si yazan kişiler okur (yazamaz). Kural GridBase'te: başkası API'yi çağırsa da göremez
- **Paylaşma:** e-postadan kişi bulma (kişi rehberi `profiles`), paylaşımı kaldırma
- **Realtime:** paylaşılan not güncellenince ya da paylaşım kaldırılınca karşı tarafta anında
- Arama, sabitleme, renk

<!-- kurulum:başla -->
## Kurulum

**Gereksinimler:** Node.js 18 ya da üstü ve bir GridBase hesabı ([panel.gridbasetr.com](https://panel.gridbasetr.com), ücretsiz).

Kurulumun sonunda GridBase'te bu şablonun tabloları kurulmuş bir proje olur, `web/.env.local` dosyasında da o projenin **anon key**'i yazar. Bunu iki yoldan yapabilirsin.

> **Hangi anahtar nereye?** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; kim neyi okur / yazar, tabloların kuralları belirler. `web/.env.local`'a bu yazılır.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** yazılmaz. Bu şablonda hiç gerekmez: şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init notes
```

Komut şunları yapar:
1. Şablonu `notes/` klasörüne indirir.
2. Giriş yapmadıysan tarayıcıda GridBase panelini açar. Ekrandaki kodu onaylarsın; şifren terminale yazılmaz.
3. Panelde **yeni bir proje** açar. Var olan bir projeyi kullanmak için: `--project <id ya da ad>`.
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları kurar.
5. Projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra uygulamayı çalıştır:

```bash
cd notes/web
npm install
npm run dev        # http://localhost:5173
```

Kendi GridBase sunucunu kullanıyorsan: `npx @gridbasetr/cli init notes --url https://api.senin-alanin.com`

### Yol 2: elle

1. **Şablonu indir:** [GitHub'dan](https://github.com/aysenuraydin/gridbase-templates) depoyu indir, `notes` klasörünü al.
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

## Nasıl çalışıyor?

`notes` tablosu `owner({ participantColumn: 'sharedWith' })`: satırın sahibi `ownerId` (GridBase damgalar), okuyabilecek diğer kişiler `sharedWith` kolonunda virgülle (`"5,9"`). Paylaşmak = bu kolona id yazmak. Kişi listeden çıkarılınca realtime ona `delete` gönderir, not ekranından kalkar.

Kişi rehberi (`profiles`) `ownerWrite()`: girişli herkes okur (e-postadan id bulmak için), herkes yalnız kendi satırını yazar; `ownerId` kullanıcının GridBase id'si (sunucu damgalar, taklit edilemez), kişi başına tek satır (`unique: [['ownerId']]`). Rehber yalnız ad ve e-posta tutar.

## Şema

| Tablo | Erişim | Kolonlar |
| --- | --- | --- |
| `profiles` | Girişli okur, sahibi yazar | `displayName`, `email`, `ownerId` |
| `notes` | Owner + katılımcı `sharedWith`, realtime | `title`, `body`, `color`, `pinned`, `sharedWith`, `ownerName`, `updatedAt`, `ownerId` |

## Kod

| Dosya | Ne yapar |
| --- | --- |
| `web/src/NotesPage.tsx` | Liste, arama, düzenleyici, realtime |
| `web/src/people.tsx` | Kişi rehberi + paylaşma penceresi |
