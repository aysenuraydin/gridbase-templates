import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/styles.css';
import './app.css';
import { AuthProvider, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { setupProblem } from './shared/gridbase';
import { SetupNotice, Spinner } from './shared/ui';
import { NotesPage } from './NotesPage';

function App() {
  const { user, ready } = useAuth();
  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  if (!user)
    return (
      <AuthScreen
        title="Notlar"
        icon="note"
        subtitle="Aklına geleni yaz, her cihazda yanında olsun."
        features={['Renkli notlar, önemlileri sabitle', 'Bir notu e-postayla paylaş, karşı taraf anında görsün', 'Değişiklikler bütün açık sekmelerde canlı']}
      />
    );
  return <NotesPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
