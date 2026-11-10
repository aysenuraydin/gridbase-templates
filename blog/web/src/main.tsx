import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/styles.css';
import './app.css';
import { AuthProvider, hasRole, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { setupProblem } from './shared/gridbase';
import { Icon } from './shared/icons';
import { NavLink, SetupNotice, Spinner, TopBar, navigate, useRoute } from './shared/ui';
import { HomePage } from './pages/HomePage';
import { PostPage } from './pages/PostPage';
import { EditorPage } from './pages/EditorPage';
import { MyPostsPage } from './pages/MyPostsPage';
import { NotifyButton } from './NotifyButton';
import { goLogin } from './data';

// Adresler: #/ ana sayfa, #/c/<kategori>, #/post/<id>, #/login, #/write, #/write/<id>, #/mine
function App() {
  const route = useRoute();
  const { user, ready } = useAuth();
  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  const editor = hasRole(user, 'editor');

  if (route[0] === 'login') {
    if (user) {
      navigate(sessionStorage.getItem('blog.back') ?? '/');
      return null;
    }
    return (
      <AuthScreen
        title="Blog"
        icon="pen"
        subtitle="Okumak serbest; yorum yazmak için giriş yap."
        features={['Yazılara yorum bırak, yazar anında haberdar olsun', 'Editörler taslak hazırlar, istediği an yayınlar', 'Kapak resimleri ve kategoriler hazır']}
      />
    );
  }

  const nav = (
    <>
      <NavLink href="#/" active={!route[0] || route[0] === 'c' || route[0] === 'post'} icon="book">Yazılar</NavLink>
      {editor && <NavLink href="#/mine" active={route[0] === 'mine'} icon="fileText">Yönetim</NavLink>}
      {editor && <NavLink href="#/write" active={route[0] === 'write'} icon="pen">Yaz</NavLink>}
    </>
  );
  const right = user ? (
    <>
      {editor && <NotifyButton />}
      {editor && <a className="btn primary sm hide-sm" href="#/write"><Icon name="pen" size={15} />Yeni yazı</a>}
    </>
  ) : (
    <button className="btn sm primary" onClick={goLogin}>Giriş yap</button>
  );

  return (
    <>
      <TopBar title="Blog" icon="pen" nav={editor ? nav : undefined} right={right} />
      {route[0] === 'post' ? (
        <PostPage id={Number(route[1])} />
      ) : route[0] === 'write' ? (
        <EditorPage id={route[1] ? Number(route[1]) : null} />
      ) : route[0] === 'mine' ? (
        <MyPostsPage />
      ) : (
        <HomePage category={route[0] === 'c' ? route[1] ?? null : null} />
      )}
      {route[0] !== 'write' && (
        <footer className="site-foot">
          <div className="page" style={{ paddingTop: 28, paddingBottom: 28 }}>
            <span className="brand"><span className="brand-mark"><Icon name="pen" size={15} strokeWidth={2.2} /></span>Blog</span>
            <span className="muted small">Herkes okur, editörler yazar. GridBase ile çalışır.</span>
          </div>
        </footer>
      )}
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
