// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, owner, ownerWrite, publicRead, role } from '@gridbasetr/cli';

export default defineConfig({
  roles: { admin: 'İşletme: hizmetleri düzenler' },
  tables: {
    services: {
      access: publicRead({ write: role('admin') }),
      columns: ['name', { name: 'description', type: 'Textarea' }, { name: 'durationMin', type: 'Number' }, { name: 'price', type: 'Number' }],
    },
    // Randevu kişiye özel; admin rolü (işletme) bütün randevuları görür, onaylar / iptal eder → müşteriye bildirim.
    // Müşteri randevusunu değiştiremez (kendi kendine "Onaylandı" yapamaz: update Nobody), yalnız iptal edip silebilir.
    bookings: {
      access: owner({ staffRoles: ['admin'], update: 'Nobody' }),
      realtime: true,
      columns: [{ name: 'serviceId', type: 'Number' }, 'serviceName', 'date', 'time', 'note', 'status', 'createdAt', 'ownerId'],
    },
    // Dolu saatler: kimin aldığı yazmaz, yalnız gün + saat. Girişli herkes görür (boş saatleri göstermek için),
    // yalnız alan kişi (ve admin) siler. Aynı saate ikinci kayıt sunucuda reddedilir (unique) → çifte randevu olmaz.
    busy_slots: {
      access: ownerWrite({ staffRoles: ['admin'] }),
      realtime: true,
      columns: ['date', 'time', 'ownerId'],
      unique: [['date', 'time']],
    },
  },
  project: {
    cors: ['http://localhost:5173'],
  },
  push: {
    categories: { bookings: { name: 'Randevular', mandatory: true } },
    rules: {
      'Randevu durumu': {
        table: 'bookings', on: 'update', watch: 'status', to: 'ownerId',
        title: 'Randevun: {status}', body: '{serviceName} · {date} {time}', category: 'bookings',
        data: { url: '/#/mine' }, collapse: 0,
      },
    },
  },
});
