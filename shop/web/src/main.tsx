import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/styles.css';
import './app.css';
import { AuthProvider, hasRole, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { setupProblem } from './shared/gridbase';
import { Icon } from './shared/icons';
import { MenuItem, NavLink, SetupNotice, Spinner, TopBar, navigate, useRoute } from './shared/ui';
import { cart, goLogin } from './data';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { AdminPage } from './pages/AdminPage';

// Adresler: #/ katalog, #/c/<kategori>, #/p/<id>, #/cart, #/orders, #/admin, #/login
function App() {
  const route = useRoute();
  const { user, ready } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return setCount(0);
    const load = () => cart.list().then((l) => setCount(l.reduce((s, x) => s + x.quantity, 0))).catch(() => undefined);
    load();
    window.addEventListener('cart-changed', load);
    return () => window.removeEventListener('cart-changed', load);
  }, [user]);

  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  if (route[0] === 'login') {
    if (user) {
      navigate(sessionStorage.getItem('shop.back') ?? '/');
      return null;
    }
    return (
      <AuthScreen
        title="Mağaza"
        icon="bag"
        subtitle="Sepetin, siparişlerin ve adreslerin tek hesapta."
        features={['Sepet her cihazda aynı', 'Sipariş durumu değişince anında bildirim', 'Kayıtlı adreslerle hızlı ödeme']}
      />
    );
  }
  const admin = hasRole(user, 'admin');
  const nav = (
    <>
      <NavLink href="#/" active={!route[0] || route[0] === 'c' || route[0] === 'p'} icon="store">Ürünler</NavLink>
      {user && <NavLink href="#/orders" active={route[0] === 'orders'} icon="package">Siparişlerim</NavLink>}
      {admin && <NavLink href="#/admin" active={route[0] === 'admin'} icon="grid">Yönetim</NavLink>}
    </>
  );
  const right = (
    <>
      <a href="#/cart" className={`cart-btn ${route[0] === 'cart' ? 'on' : ''}`} aria-label={`Sepet, ${count} ürün`}>
        <Icon name="bag" size={19} />
        {count > 0 && <span className="cart-count">{count}</span>}
      </a>
      {!user && <button className="btn sm primary" onClick={goLogin}>Giriş yap</button>}
    </>
  );
  return (
    <>
      <div className="demo-bar"><Icon name="info" size={13} />Demo mağaza · gerçek ödeme alınmaz, siparişler kapıda ödeme</div>
      <TopBar title="Mağaza" icon="bag" nav={user ? nav : undefined} right={right} menu={user ? <MenuItem icon="package" href="#/orders">Siparişlerim</MenuItem> : undefined} />
      {route[0] === 'p' ? (
        <ProductPage id={Number(route[1])} />
      ) : route[0] === 'cart' ? (
        <CartPage />
      ) : route[0] === 'orders' ? (
        <OrdersPage />
      ) : route[0] === 'admin' ? (
        <AdminPage />
      ) : (
        <ShopPage category={route[0] === 'c' ? route[1] ?? null : null} />
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
