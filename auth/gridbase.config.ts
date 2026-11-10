// GridBase şeması: `npx @gridbasetr/cli apply` sunucuyu bu dosyaya getirir (tekrar çalıştırmak güvenli).
import { defineConfig, owner } from '@gridbasetr/cli';

export default defineConfig({
  tables: {
    // Profilin uygulamaya özel kısmı (görünen ad ve e-posta GridBase'in kendi kullanıcı kaydında).
    profiles: { access: owner(), columns: ['bio', 'avatar', 'ownerId'] },
  },
  buckets: {
    // Avatarlar herkese açık (süresiz link), yükleme girişli kullanıcıya; en çok 2 MB resim.
    avatars: { read: 'Public', write: 'Authenticated', maxSize: '2MB', types: ['image/png', 'image/jpeg', 'image/webp'] },
  },
  project: {
    // Kayıttan sonra mailden 6 haneli kodla onay. Kapatırsan kayıt hemen giriş yapar.
    emailConfirmation: true,
    emailFromName: 'Kimlik Örneği',
    // Google ile giriş: Google Cloud'daki Web client id'n (web/.env.local'daki VITE_GOOGLE_CLIENT_ID ile aynı).
    // googleClientIds: ['123-abc.apps.googleusercontent.com'],
    cors: ['http://localhost:5173'],
  },
});
