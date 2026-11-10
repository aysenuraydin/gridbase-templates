import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/styles.css';
import './app.css';
import { AuthProvider, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { setupProblem } from './shared/gridbase';
import { SetupNotice, Spinner } from './shared/ui';
import { AccountPage } from './AccountPage';

function App() {
  const { user, ready } = useAuth();
  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  if (!user)
    return (
      <AuthScreen
        title="Kimlik"
        icon="shield"
        subtitle="Uygulamanın bütün hesap akışları, baştan hazır."
        features={['Kayıt, e-posta onayı ve şifre sıfırlama kodla', 'Google ile tek tıkla giriş', 'Açık oturumları gör, istediğin cihazı kapat', 'Hesabı tek adımda sil (App Store kuralı)']}
      />
    );
  return <AccountPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
