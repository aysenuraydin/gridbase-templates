// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, ownerWrite, publicRead, role } from '@gridbasetr/cli';

export default defineConfig({
  roles: {
    editor: 'Yazı yazar, düzenler ve yayınlar',
  },
  tables: {
    // Herkes okur (girişsiz de), yalnız editor rolündekiler yazar.
    categories: { access: publicRead({ write: role('editor') }), columns: ['name', 'slug'] },
    posts: {
      access: publicRead({ write: role('editor') }),
      columns: [
        'title', 'slug', 'excerpt', { name: 'body', type: 'Textarea' }, 'coverImage',
        { name: 'categoryId', type: 'Number' }, 'authorId', 'authorName',
        { name: 'published', type: 'Boolean' }, 'publishedAt',
      ],
    },
    // Herkes okur (girişsiz de), girişli kullanıcı yazar, yalnız kendi yorumunu düzenler / siler; editor hepsini
    // yönetir. ownerId'yi GridBase damgalar. postAuthorId: bildirimin gideceği kişi (yazının yazarı).
    comments: {
      access: ownerWrite({ read: 'Public', staffRoles: ['editor'] }),
      columns: [{ name: 'postId', type: 'Number' }, { name: 'body', type: 'Textarea' }, 'authorName', 'postAuthorId', 'createdAt', 'ownerId'],
    },
  },
  buckets: {
    // Kapak resimleri herkese açık (süresiz link); yalnız editor yükler.
    covers: { read: 'Public', write: 'RoleBased', writeRoles: ['editor'], maxSize: '5MB', types: ['image/png', 'image/jpeg', 'image/webp'] },
  },
  project: {
    cors: ['http://localhost:5173'],
  },
  push: {
    categories: { comments: { name: 'Yorumlar', description: 'Yazılarına gelen yorumlar' } },
    rules: {
      'Yeni yorum': {
        table: 'comments', on: 'insert', to: 'postAuthorId',
        title: '{actor.displayName} yorum yaptı', body: '{body}', category: 'comments',
        data: { url: '/#/post/{postId}' },
        collapse: '5m', summary: 'Yazılarına {count} yeni yorum',
      },
    },
  },
});
