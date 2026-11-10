// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, owner, ownerWrite } from '@gridbasetr/cli';

export default defineConfig({
  tables: {
    profiles: { access: ownerWrite(), columns: ['displayName', 'email', 'ownerId'], unique: [['ownerId']] },
    // Her yüklenen dosyanın kaydı. Sahibi tam yetkili; sharedWith'teki kişiler görür ve indirir, değiştiremez.
    drive_files: {
      access: owner({ participantColumn: 'sharedWith' }),
      realtime: true,
      columns: ['name', 'fileName', { name: 'size', type: 'Number' }, 'contentType', 'folder', 'sharedWith', 'ownerName', 'createdAt', 'ownerId'],
    },
  },
  buckets: {
    // Row: dosyayı, bağlı olduğu satırı (drive_files) okuyabilen indirir → paylaşım dosyaya da geçer. Tür sınırı yok.
    drive: { read: 'Row', write: 'Authenticated', maxSize: '100MB' },
  },
  project: {
    cors: ['http://localhost:5173'],
  },
});
