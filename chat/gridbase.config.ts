// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, owner, ownerWrite } from '@gridbasetr/cli';

export default defineConfig({
  tables: {
    // Kişi rehberi: girişli herkes görür (kiminle sohbet başlatacağını seçmek için), herkes yalnız kendi satırını yazar.
    // ownerId = GridBase kullanıcı id'si (sunucu damgalar); kişi başına tek satır (unique).
    profiles: { access: ownerWrite(), columns: ['displayName', 'email', 'ownerId'], unique: [['ownerId']] },
    // Sohbeti açan sahibi (ownerId); members'ta id'si yazan herkes okur (katılımcı kolonu). Virgülle: "5,7,9".
    conversations: {
      access: owner({ participantColumn: 'members' }),
      realtime: true,
      columns: ['title', 'members', 'createdAt', 'ownerId'],
    },
    // Her mesajın sahibi yazanı. Okuma sohbetten gelir (parentAccess): sohbeti görebilen (sahibi + members) mesajlarını da
    // görür; sohbetten çıkarılan artık göremez. Yalnız üyesi olduğun sohbete mesaj yazılır, başkasının sohbet id'siyle 403.
    // members yalnız bildirim kuralı için kopyalanır (okuma iznini o vermez).
    messages: {
      access: owner({ parentAccess: { column: 'conversationId', table: 'conversations' } }),
      realtime: true,
      columns: [{ name: 'conversationId', type: 'Number' }, { name: 'body', type: 'Textarea' }, 'members', 'senderName', 'createdAt', 'ownerId'],
    },
  },
  project: {
    cors: ['http://localhost:5173'],
  },
  push: {
    categories: { messages: { name: 'Mesajlar' } },
    rules: {
      'Yeni mesaj': {
        table: 'messages', on: 'insert', to: 'members', excludeActor: true,
        title: '{senderName}', body: '{body}', category: 'messages',
        data: { url: '/#/c/{conversationId}' },
        collapse: '1m', summary: '{count} yeni mesaj',
      },
    },
  },
});
