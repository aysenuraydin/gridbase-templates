import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/styles.css';
import './app.css';
import { AuthProvider, hasRole, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { setupProblem } from './shared/gridbase';
import { MenuItem, NavLink, SetupNotice, Spinner, TopBar, useRoute } from './shared/ui';
import { ADMIN_ROLE } from './admin';
import { UsersPage } from './UsersPage';
import { AnnouncementsPage } from './AnnouncementsPage';
import { MePage } from './MePage';

// Adresler: #/ duyurular, #/users (yalnız admin), #/me
function App() {
  const { user, ready } = useAuth();
  const [page] = useRoute();
  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  if (!user)
    return (
      <AuthScreen
        title="Topluluk"
        icon="users"
        subtitle="Roller ve uygulama içi yönetim, kutudan çıktığı gibi."
        features={['Yöneticiler kullanıcıları arar, rol verir, engeller', 'Moderatörler duyuru yayınlar, herkes anında görür', 'Yetkiler sunucuda denetlenir, istemciye güvenilmez']}
      />
    );
  const admin = hasRole(user, ADMIN_ROLE);
  const nav = (
    <>
      <NavLink href="#/" active={!page} icon="megaphone">Duyurular</NavLink>
      {admin && <NavLink href="#/users" active={page === 'users'} icon="users">Kullanıcılar</NavLink>}
      <NavLink href="#/me" active={page === 'me'} icon="user">Hesabım</NavLink>
    </>
  );
  return (
    <>
      <TopBar
        title="Topluluk"
        icon="users"
        nav={nav}
        right={admin ? <span className="badge dot hide-sm">Yönetici</span> : null}
        menu={<MenuItem icon="user" href="#/me">Hesabım</MenuItem>}
      />
      {page === 'users' ? <UsersPage /> : page === 'me' ? <MePage /> : <AnnouncementsPage />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
