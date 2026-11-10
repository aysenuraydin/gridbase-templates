import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/styles.css';
import './app.css';
import { AuthProvider, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { setupProblem } from './shared/gridbase';
import { SetupNotice, Spinner } from './shared/ui';
import { TodoPage } from './TodoPage';

function App() {
  const { user, ready } = useAuth();
  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  if (!user)
    return (
      <AuthScreen
        title="Todo"
        icon="listChecks"
        subtitle="Yapılacakların her cihazında, anında güncel."
        features={['Telefonda eklediğin görev bilgisayarda hemen görünür', 'Görevlere resim ekle', 'Yalnız sen görürsün: veriler hesabına özel']}
      />
    );
  return <TodoPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
