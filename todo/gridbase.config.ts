// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, owner } from '@gridbasetr/cli';

export default defineConfig({
  tables: {
    // Owner: her kullanıcı yalnız kendi satırlarını okur ve yazar. ownerId'yi GridBase damgalar, uygulama göndermez.
    todos: {
      access: owner(),
      realtime: true, // başka sekmede / cihazda yapılan değişiklik anında gelir
      columns: ['title', { name: 'done', type: 'Boolean' }, 'image', 'createdAt', 'ownerId'],
    },
  },
  buckets: {
    // Resmi yalnız yükleyen görür (imzalı link, 5 dk), en çok 5 MB.
    'todo-images': { read: 'Owner', write: 'Authenticated', maxSize: '5MB', types: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] },
  },
  project: {
    cors: ['http://localhost:5173'], // tarayıcıdan erişen adresler; canlı adresini de ekle
  },
});
