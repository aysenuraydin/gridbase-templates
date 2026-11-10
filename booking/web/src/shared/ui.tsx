// Ortak parçalar: kurulum uyarısı, üst çubuk + kullanıcı menüsü, sayfa başlığı, avatar, pencere, onay penceresi,
// boş durum, resim, basit adres yönlendirme ve biçimlendiriciler.
// Bu dosya _shared'den kopyalanır (scripts/sync-shared.mjs); değiştireceksen _shared'deki asıl dosyayı değiştir.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { fileUrl, gb, setupProblem } from './gridbase';
import { nameOf, useAuth } from './auth';
import { Icon, type IconName } from './icons';

// .env.local eksikse uygulama bunun yerine açılır.
export function SetupNotice() {
  return (
    <div className="setup">
      <div className="card stack lg">
        <div className="row">
          <span className="tile" style={{ background: 'color-mix(in srgb, var(--warn) 14%, var(--surface))', color: 'var(--warn)' }}>
            <Icon name="alert" />
          </span>
          <div>
            <h1 style={{ fontSize: '1.3rem' }}>Kurulum eksik</h1>
            <p className="muted small" style={{ marginTop: 2 }}>{setupProblem}</p>
          </div>
        </div>
        <p>
          <code>web/.env.local</code> dosyasını oluştur ve geliştirme sunucusunu yeniden başlat:
        </p>
        <pre>{`VITE_GRIDBASE_URL=https://api.gridbasetr.com
VITE_GRIDBASE_ANON_KEY=gb_pk_…`}</pre>
        <div className="callout brand">
          <Icon name="zap" size={16} />
          <span>
            En kolayı: şablonu <code>npx @gridbasetr/cli init</code> ile kur, bu dosyayı o yazar. Elle kurulum adımları README'de.
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Üst çubuk ───────────────────────────────────────────────
// nav: <NavLink>'ler (telefonda alt çubuğa iner). menu: kullanıcı menüsüne eklenecek satırlar.
export function TopBar({ title, icon, nav, right, menu, wide }: { title: string; icon: IconName; nav?: ReactNode; right?: ReactNode; menu?: ReactNode; wide?: boolean }) {
  const { user } = useAuth();
  useEffect(() => {
    document.body.classList.toggle('has-bottom-nav', !!nav);
    return () => document.body.classList.remove('has-bottom-nav');
  }, [nav]);
  return (
    <header className={`topbar ${wide ? 'wide' : ''}`}>
      <div className="topbar-in">
        <a className="brand" href="#/">
          <span className="brand-mark"><Icon name={icon} size={17} strokeWidth={2.2} /></span>
          {title}
        </a>
        {nav && <nav className="topnav">{nav}</nav>}
        <div className="topbar-right">
          {right}
          {user && <UserMenu>{menu}</UserMenu>}
        </div>
      </div>
    </header>
  );
}

export const NavLink = ({ href, active, icon, children }: { href: string; active?: boolean; icon: IconName; children: ReactNode }) => (
  <a href={href} className={active ? 'active' : ''}>
    <Icon name={icon} size={20} />
    {children}
  </a>
);

function UserMenu({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  if (!user) return null;
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="user-btn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={nameOf(user)} size="sm" />
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="menu" role="menu" onClick={() => setOpen(false)}>
          <div className="menu-head">
            <Avatar name={nameOf(user)} />
            <div className="grow">
              <div className="strong truncate">{nameOf(user)}</div>
              <div className="muted xs truncate">{user.email}</div>
            </div>
          </div>
          {children}
          <button className="menu-item danger" onClick={() => gb.auth.signOut()}>
            <Icon name="logout" size={16} /> Çıkış yap
          </button>
        </div>
      )}
    </div>
  );
}

export const MenuItem = ({ icon, href, onClick, children }: { icon: IconName; href?: string; onClick?: () => void; children: ReactNode }) =>
  href ? (
    <a className="menu-item" href={href}><Icon name={icon} size={16} />{children}</a>
  ) : (
    <button className="menu-item" onClick={onClick}><Icon name={icon} size={16} />{children}</button>
  );

// ── Sayfa başlığı ───────────────────────────────────────────
export function PageHead({ title, desc, eyebrow, actions }: { title: ReactNode; desc?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="titles">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export const Back = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} className="back"><Icon name="arrowLeft" size={15} />{children}</a>
);

// ── Avatar: adın baş harfi, renk addan (her kişi hep aynı renk) ─
const HUES = ['#6366f1', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#64748b'];
export const colorOf = (s: string) => HUES[[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % HUES.length]!;
export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toLocaleUpperCase('tr-TR');
};

export function Avatar({ name, image, size, className }: { name: string | null | undefined; image?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const n = name || '?';
  const cls = `avatar ${size ?? ''} ${className ?? ''}`;
  if (image) return <GbImage name={image} alt={n} className={cls} />;
  const c = colorOf(n);
  return (
    <span className={cls} aria-hidden="true" style={{ background: `color-mix(in srgb, ${c} 15%, var(--surface))`, color: `color-mix(in srgb, ${c} 78%, var(--ink))` }}>
      {initials(n)}
    </span>
  );
}

// ── Boş durum, yükleniyor ───────────────────────────────────
export function Empty({ icon = 'inbox', title, children, action, plain }: { icon?: IconName; title?: ReactNode; children?: ReactNode; action?: ReactNode; plain?: boolean }) {
  return (
    <div className={`empty ${plain ? 'plain' : ''}`}>
      <span className="tile"><Icon name={icon} size={22} /></span>
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export const Spinner = ({ full }: { full?: boolean }) => (
  <div className={`loader ${full ? 'full' : ''}`}>
    <div className="spinner" aria-label="Yükleniyor" />
  </div>
);

export const Skeleton = ({ h = 16, w = '100%', r }: { h?: number | string; w?: number | string; r?: number }) => (
  <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />
);

export const ErrorText = ({ children }: { children: ReactNode }) =>
  children ? <p className="error"><Icon name="alert" size={16} style={{ marginTop: 2 }} /><span>{children}</span></p> : null;

// ── Pencere ─────────────────────────────────────────────────
export function Modal({ title, desc, icon, onClose, children, footer, size }: { title: ReactNode; desc?: ReactNode; icon?: IconName; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'lg' | 'xl' }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ?? ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          {icon && <span className="tile sm"><Icon name={icon} size={17} /></span>}
          <div className="grow">
            <h2>{title}</h2>
            {desc && <p>{desc}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Onay penceresi (tarayıcının confirm()'ü yerine): const confirm = useConfirm(); if (!(await confirm.ask({...}))) return;  ·  {confirm.view}
type ConfirmOpts = { title: string; body?: ReactNode; ok?: string; danger?: boolean };
export function useConfirm() {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const done = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const view = state && (
    <Modal
      title={state.title}
      icon={state.danger ? 'alert' : 'info'}
      onClose={() => done(false)}
      footer={
        <>
          <button className="btn" onClick={() => done(false)}>Vazgeç</button>
          <button className={`btn ${state.danger ? 'danger solid' : 'primary'}`} onClick={() => done(true)} autoFocus>{state.ok ?? 'Tamam'}</button>
        </>
      }
    >
      {state.body && <p className="muted">{state.body}</p>}
    </Modal>
  );
  return { ask, view };
}

// Kovadaki dosya adı ya da http adresi → <img>.
export function GbImage({ name, alt, className }: { name: string | null | undefined; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    fileUrl(name).then((u) => alive && setSrc(u)).catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [name]);
  if (!src) return <div className={`img-ph ${className ?? ''}`} aria-label={alt} />;
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}

// "#/posts/12" → ['posts', '12']. Kütüphanesiz, yeterince basit.
export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const navigate = (path: string) => {
  window.location.hash = path;
};

// ── Biçimlendiriciler ───────────────────────────────────────
const toDate = (v: unknown) => {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (v: unknown) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : v ? String(v) : '';
};

export const formatShortDate = (v: unknown) => {
  const d = toDate(v);
  if (!d) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
};

export const formatTime = (v: unknown) => {
  const d = toDate(v);
  return d ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
};

// "az önce", "5 dk önce", "dün", sonra tarih.
const rtf = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' });
export const timeAgo = (v: unknown) => {
  const d = toDate(v);
  if (!d) return '';
  const s = Math.round((d.getTime() - Date.now()) / 1000);
  const a = Math.abs(s);
  if (a < 45) return 'az önce';
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 7) return rtf.format(Math.round(s / 86400), 'day');
  return formatShortDate(d);
};

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(0)} KB` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`;
