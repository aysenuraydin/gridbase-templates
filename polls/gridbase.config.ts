// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, ownerWrite } from '@gridbasetr/cli';

export default defineConfig({
  tables: {
    // Herkes görür (paylaşılan bağlantı girişsiz açılır), girişli kullanıcı anket açar, yalnız sahibi kapatır.
    polls: {
      access: ownerWrite({ read: 'Public' }),
      realtime: true,
      columns: ['question', { name: 'options', type: 'Textarea' }, 'authorName', 'endsAt', { name: 'closed', type: 'Boolean' }, 'createdAt', 'ownerId'],
    },
    // Oylar herkese açık sayılır (sonuç için), herkes yalnız kendi oyunu değiştirir. Kişi başına bir oy sunucuda:
    // aynı ankete ikinci oy 409 (unique pollId + ownerId; ownerId'yi GridBase damgalar).
    votes: {
      access: ownerWrite({ read: 'Public' }),
      realtime: true,
      columns: [{ name: 'pollId', type: 'Number' }, { name: 'option', type: 'Number' }, 'createdAt', 'ownerId'],
      unique: [['pollId', 'ownerId']],
    },
  },
  project: {
    cors: ['http://localhost:5173'],
  },
});
