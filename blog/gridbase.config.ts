// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, publicRead, role } from '@gridbasetr/cli';

export default defineConfig({
  roles: {
    editor: 'Yazı yazar, düzenler ve yayınlar',
  },
  tables: {
    // Herkes okur (girişsiz de), yalnız editor rolündekiler yazar.
    categories: { access: publicRead({ write: role('editor') }), columns: ['name', 'slug'] },
    // Yayındaki yazıyı herkes okur (girişsiz de); taslağı yalnız yazarı ve editor'ler görür. Önce taslak yalnız arayüzde
    // gizleniyordu, API'den herkes okuyabiliyordu. Yazarı GridBase damgalar (authorId), editor'ler bütün yazıları yönetir.
    posts: {
      access: {
        read: 'Public', write: role('editor'), ownerColumn: 'authorId', staffRoles: ['editor'],
        readWhen: { column: 'published', values: ['true', '*1*'] },
      },
      columns: [
        'title', 'slug', 'excerpt', { name: 'body', type: 'Textarea' }, 'coverImage',
        { name: 'categoryId', type: 'Number' }, 'authorId', 'authorName',
        { name: 'published', type: 'Boolean' }, 'publishedAt',
      ],
    },
    // Yorumu, yazıyı görebilen okur (parentAccess): yayındaki yazının yorumlarını herkes, taslağınkini yalnız yazarı ve
    // editor'ler görür; göremediği yazıya yorum yazılamaz (403). Girişli kullanıcı yazar, yalnız kendi yorumunu düzenler /
    // siler; editor hepsini yönetir. ownerId'yi GridBase damgalar. postAuthorId: bildirimin gideceği kişi (yazının yazarı).
    comments: {
      access: {
        read: 'Public', write: 'Authenticated', ownerColumn: 'ownerId', staffRoles: ['editor'],
        parentAccess: { column: 'postId', table: 'posts' },
      },
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
