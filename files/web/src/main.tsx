import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/styles.css';
import './app.css';
import { AuthProvider, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { setupProblem } from './shared/gridbase';
import { SetupNotice, Spinner } from './shared/ui';
import { DrivePage } from './DrivePage';

function App() {
  const { user, ready } = useAuth();
  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  if (!user)
    return (
      <AuthScreen
        title="Dosyalar"
        icon="folder"
        subtitle="Dosyaların tek yerde, her cihazdan elinin altında."
        features={['Her tür dosya: PDF, resim, zip, DWG…', 'Klasörlerle düzenle, sürükleyip bırakarak yükle', 'İstediğin kişiyle paylaş, yalnız o görsün']}
      />
    );
  return <DrivePage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
