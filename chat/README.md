# Sohbet

Birebir ve grup sohbeti: mesajlar anında gelir, karşı taraf yazarken "yazıyor…" görünür, kim çevrimiçi belli olur. Yeni mesajda tarayıcı bildirimi.

**Gösterdiği:**
- **Katılımcı kolonu:** her mesajın sahibi yazanı, `members`'ta id'si yazan herkes okur. Başka sohbetin mesajı kimseye gitmez; API'yi doğrudan çağıran da göremez
- **Realtime:** `conversations` ve `messages` aboneliği; olay yalnız okuyabildiğin satır için gelir
- **Odalar:** "yazıyor…" (broadcast) ve çevrimiçi (presence); tabloya yazılmaz, yalnız sohbetin üyeleri girer
- **Push kuralı:** `messages`'a satır eklenince yazan hariç üyelere bildirim, 1 dakikadakiler tek özette
- **Kişi rehberi:** girişli herkes okur, herkes yalnız kendi satırını yazar (`ownerWrite`)

<!-- kurulum:başla -->
## Kurulum

İki yol var. İkisinde de sonuç aynı: GridBase'te bir proje, içinde bu şablonun tabloları, ve `web/.env.local` dosyasında o projenin **anon key**'i.

> **Anahtarlar kısaca:** GridBase'te her projenin iki tür anahtarı var.
> - **Anon key** (`gb_pk_…`): uygulamaya gömülür, herkese açıktır. Tek başına bir şey açmaz; tabloların erişim kuralları (kim okur, kim yazar) yine geçerlidir. `web/.env.local`'a bu girer.
> - **Secret key** (`gb_sk_…`): bütün kuralları atlar. Uygulamaya, `.env.local`'a ya da git'e **asla** konmaz. Bu şablonda hiç gerekmez; şemayı panel hesabınla kurarsın.

### Yol 1: tek komut (önerilen)

```bash
npx @gridbasetr/cli init chat
```

Komut sırayla:
1. şablonu `chat/` klasörüne indirir,
2. giriş yapmadıysan tarayıcıda GridBase panelini açar (kodu onaylarsın; şifre terminale girmez),
3. panelde **yeni bir proje** açar (var olanı kullanmak için `--project <id ya da ad>`),
4. `gridbase.config.ts`'teki tabloları, erişim kurallarını, kovaları kurar,
5. projeye bir anon key üretir ve `web/.env.local`'a yazar.

Sonra:

```bash
cd chat/web
npm install
npm run dev        # http://localhost:5173
```

Kendi sunucunu kullanıyorsan: `npx @gridbasetr/cli init chat --url https://api.senin-alanin.com`

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

## Nasıl çalışıyor?

- Sohbet aç: rehberden kişi seç (birden çoksa grup). `conversations` satırı açılır, `members` = `"5,7,9"` (sen dahil).
- Mesaj: `messages` satırı; `members` sohbetten kopyalanır, okuyabilecekleri o belirler. `ownerId`'yi GridBase damgalar.
- Ekranda son 50 mesaj (`/paged`, `id:desc`). Daha eskisini yüklemek için sayfa numarasını artır.
- Oda: `rt.room(members)`; kendi id'n listede olmalı (GridBase denetler), 2–50 üye.
- Kişi uygulamaya bir kez giriş yapınca rehbere düşer (`profiles`, kişi başına tek satır).

## Şema

| Tablo | Erişim | Kolonlar |
| --- | --- | --- |
| `profiles` | Girişli okur, sahibi yazar; tekil `ownerId` | `displayName`, `email`, `ownerId` |
| `conversations` | Owner + katılımcı `members`, realtime | `title`, `members`, `createdAt`, `ownerId` |
| `messages` | Owner + katılımcı `members`, realtime | `conversationId`, `body`, `members`, `senderName`, `createdAt`, `ownerId` |

## Kod

| Dosya | Ne yapar |
| --- | --- |
| `web/src/data.ts` | Tablolar, realtime bağlantısı, rehber |
| `web/src/ChatApp.tsx` | Sohbet listesi, okunmamış sayısı, abonelikler |
| `web/src/ChatView.tsx` | Mesajlar, "yazıyor…", çevrimiçi |
| `web/src/NewChat.tsx` | Kişi seç, sohbet / grup başlat |
