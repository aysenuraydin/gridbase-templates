import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/styles.css';
import './app.css';
import { AuthProvider, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { setupProblem } from './shared/gridbase';
import { SetupNotice, Spinner } from './shared/ui';
import { ChatApp } from './ChatApp';

function App() {
  const { user, ready } = useAuth();
  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  if (!user)
    return (
      <AuthScreen
        title="Sohbet"
        icon="messages"
        subtitle="Birebir ve grup sohbetleri, gerçek zamanlı."
        features={['Mesajlar anında, sayfa yenilemeden', 'Kim çevrimiçi, kim yazıyor: hepsi canlı', 'Yeni mesajda tarayıcı bildirimi']}
      />
    );
  return <ChatApp key={user.id} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
