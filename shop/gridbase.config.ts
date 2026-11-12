// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
// DEMO: gerçek ödeme yok (kapıda ödeme) ve sipariş toplamını istemci hesaplıyor; satışa açmadan önce README'deki
// "Canlıya almadan önce" bölümüne bak.
import { defineConfig, owner, ownerWrite, publicRead, role } from '@gridbasetr/cli';

export default defineConfig({
  roles: {
    admin: 'Mağaza yöneticisi: ürün ve kategori ekler',
  },
  tables: {
    categories: { access: publicRead({ write: role('admin') }), columns: ['name', 'slug'] },
    products: {
      access: publicRead({ write: role('admin') }),
      columns: ['name', { name: 'description', type: 'Textarea' }, { name: 'price', type: 'Number' }, 'image', { name: 'categoryId', type: 'Number' }, { name: 'stock', type: 'Number' }, { name: 'active', type: 'Boolean' }],
    },
    // Kişiye özel: sepet, adresler, siparişler. Yalnız sahibi okur / yazar (ownerId'yi GridBase damgalar).
    cart_items: { access: owner(), columns: [{ name: 'productId', type: 'Number' }, { name: 'quantity', type: 'Number' }, 'ownerId'] },
    addresses: { access: owner(), columns: ['title', 'fullName', 'phone', 'city', 'district', 'line', 'ownerId'] },
    // Sipariş müşteriye özel; admin rolü bütün siparişleri görür ve durumunu değiştirir (staffRoles), sahiplik değişmez.
    // Müşteri siparişini verdikten sonra değiştiremez (durumu "Teslim edildi" yapamaz) ve silemez: update / delete Nobody.
    orders: {
      access: owner({ staffRoles: ['admin'], update: 'Nobody', delete: 'Nobody' }),
      realtime: true, // durum değişince müşterinin ekranı da güncellenir
      columns: [{ name: 'items', type: 'Textarea' }, { name: 'total', type: 'Number' }, 'status', { name: 'address', type: 'Textarea' }, 'paymentMethod', 'note', 'createdAt', 'ownerId'],
    },
    // Herkes okur, herkes yalnız kendi yorumunu düzenler (admin hepsini); ürün başına kişi başı tek yorum.
    reviews: {
      access: ownerWrite({ read: 'Public', staffRoles: ['admin'] }),
      columns: [{ name: 'productId', type: 'Number' }, { name: 'rating', type: 'Number' }, { name: 'body', type: 'Textarea' }, 'authorName', 'createdAt', 'ownerId'],
      unique: [['productId', 'ownerId']],
    },
  },
  buckets: {
    'product-images': { read: 'Public', write: 'RoleBased', writeRoles: ['admin'], maxSize: '5MB', types: ['image/png', 'image/jpeg', 'image/webp'] },
  },
  project: {
    cors: ['http://localhost:5173'],
  },
  push: {
    categories: { orders: { name: 'Siparişler', description: 'Sipariş durumu', mandatory: true } },
    rules: {
      'Sipariş durumu': {
        table: 'orders', on: 'update', watch: 'status', to: 'ownerId',
        title: 'Siparişin: {status}', body: 'Sipariş #{id} · {total} ₺', category: 'orders',
        data: { url: '/#/orders' }, collapse: 0,
      },
    },
  },
});
