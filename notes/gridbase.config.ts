// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, owner, ownerWrite } from '@gridbasetr/cli';

export default defineConfig({
  tables: {
    // Kişi rehberi: paylaşırken e-postadan kullanıcı id'sini bulmak için. Girişli herkes okur, herkes yalnız kendi
    // satırını yazar; ownerId = GridBase kullanıcı id'si (sunucu damgalar), kişi başına tek satır.
    profiles: { access: ownerWrite(), columns: ['displayName', 'email', 'ownerId'], unique: [['ownerId']] },
    // Not sahibine ait; sharedWith'te id'si yazanlar (virgülle) okur ama değiştiremez.
    notes: {
      access: owner({ participantColumn: 'sharedWith' }),
      realtime: true,
      columns: ['title', { name: 'body', type: 'Textarea' }, 'color', { name: 'pinned', type: 'Boolean' }, 'sharedWith', 'ownerName', 'updatedAt', 'ownerId'],
    },
  },
  project: {
    cors: ['http://localhost:5173'],
  },
});
