// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, owner, ownerWrite } from '@gridbasetr/cli';

export default defineConfig({
  tables: {
    profiles: { access: ownerWrite(), columns: ['displayName', 'ownerId'], unique: [['ownerId']] },
    // Her yüklenen dosyanın kaydı. Sahibi tam yetkili; sharedWith'teki kişiler görür ve indirir, değiştiremez.
    drive_files: {
      access: owner({ participantColumn: 'sharedWith' }),
      realtime: true,
      columns: ['name', 'fileName', { name: 'size', type: 'number' }, 'contentType', 'folder', 'sharedWith', 'ownerName', 'ownerId'],
    },
  },
  buckets: {
    // Row: dosyayı, bağlı olduğu satırı (drive_files) okuyabilen indirir → paylaşım dosyaya da geçer. Tür sınırı yok.
    // deleteWithRow (16 Kasım 2026): satır silinince (uygulama, panel, hesap silme) dosyası da silinir.
    drive: { read: 'Row', write: 'Authenticated', maxSize: '100MB', deleteWithRow: true },
  },
  project: {
    // Satıra davet: kişi paylaşım koduyla ya da e-postayla davet edilir, kabul edince katılımcı kolonuna eklenir.
    invites: true,
    cors: ['http://localhost:5173'],
  },
});
