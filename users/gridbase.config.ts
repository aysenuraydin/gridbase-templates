// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { authenticated, defineConfig, role } from '@gridbasetr/cli';

export default defineConfig({
  roles: {
    admin: 'Uygulama içi yönetici: kullanıcıları yönetir',
    moderator: 'Duyuru yazar',
    premium: 'Ücretli üye (örnek rol)',
  },
  tables: {
    // Girişli herkes okur, yalnız moderator rolü yazar: rol verilince ekran da yetki de açılır.
    announcements: {
      access: authenticated({ write: role('moderator') }),
      realtime: true,
      columns: ['title', { name: 'body', type: 'Textarea' }, 'authorName', 'createdAt'],
    },
  },
  project: {
    // Bu roldeki son kullanıcılar uygulamanın içinden (secret key olmadan) kullanıcıları yönetir: listeler,
    // yönetici olmayan rolleri verir / alır, yönetici olmayanları engeller. Yönetici rolünü yalnız sen verirsin (panel).
    adminRoles: ['admin'],
    cors: ['http://localhost:5173'],
  },
});
