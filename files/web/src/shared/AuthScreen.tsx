// ════════════════════════════════════════════════════════════════
//  Giriş ekranı (solda marka paneli, sağda form): giriş, kayıt, e-posta onay kodu, şifremi unuttum (kod → yeni şifre), Google ile giriş.
//  - Proje e-posta onayı istiyorsa (panel › Proje ayarları › Son kullanıcı e-postaları) kayıt 202 döner,
//    SDK { kind: 'confirmEmail' } verir: kod ekranına geçilir. Onaysız hesapla giriş 403 email_not_confirmed.
//  - Google düğmesi yalnız VITE_GOOGLE_CLIENT_ID verilmişse görünür; aynı client id panelde
//    Proje ayarları › Google ile giriş'e de girilmeli (sunucu token'ın kime verildiğine bakar).
// ════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GridBaseError } from '@gridbasetr/client';
import { errorText, gb, googleClientId } from './gridbase';
import { Icon, type IconName } from './icons';
import { ErrorText } from './ui';

type Mode = 'login' | 'register' | 'confirm' | 'forgot' | 'reset';

export function AuthScreen({ title, subtitle, icon, features }: { title: string; subtitle: string; icon: IconName; features?: string[] }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const go = (m: Mode, message: string | null = null) => {
    setMode(m);
    setError(null);
    setInfo(message);
    setCode('');
  };

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      if (e instanceof GridBaseError && e.code === 'email_not_confirmed') {
        await gb.auth.sendConfirmation(email).catch(() => undefined);
        go('confirm', `${email} adresine onay kodu gönderdik.`);
      } else setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'login') run(async () => void (await gb.auth.signIn({ email, password })));
    if (mode === 'register')
      run(async () => {
        const r = await gb.auth.signUp({ email, password, displayName: displayName || undefined });
        if (r.kind === 'confirmEmail') go('confirm', `${r.email} adresine 6 haneli bir kod gönderdik.`);
      });
    if (mode === 'confirm') run(async () => void (await gb.auth.confirmEmail(email, code.trim())));
    if (mode === 'forgot')
      run(async () => {
        await gb.auth.forgotPassword(email);
        go('reset', 'Hesap varsa 6 haneli bir kod gönderdik. Kodu ve yeni şifreni yaz.');
      });
    if (mode === 'reset') run(async () => void (await gb.auth.resetPassword(email, code.trim(), password)));
  };

  const heading = {
    login: 'Tekrar hoş geldin',
    register: 'Hesabını oluştur',
    confirm: 'E-postanı onayla',
    forgot: 'Şifreni sıfırla',
    reset: 'Yeni şifre belirle',
  }[mode];
  const lead = {
    login: `${title} hesabınla giriş yap.`,
    register: 'Birkaç saniye sürer, kart bilgisi istemez.',
    confirm: 'Mailine gelen 6 haneli kodu yaz.',
    forgot: 'E-postanı yaz, sıfırlama kodu gönderelim.',
    reset: 'Mailine gelen kodu ve yeni şifreni yaz.',
  }[mode];
  const action = { login: 'Giriş yap', register: 'Hesap aç', confirm: 'Onayla', forgot: 'Kod gönder', reset: 'Şifreyi değiştir' }[mode];

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand">
          <span className="brand-mark"><Icon name={icon} size={17} strokeWidth={2.2} /></span>
          {title}
        </div>
        <div className="auth-pitch">
          <h2>{subtitle}</h2>
          {!!features?.length && (
            <ul>
              {features.map((f) => (
                <li key={f}><Icon name="check" size={16} strokeWidth={2.6} />{f}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="auth-foot">GridBase ile çalışır · kimlik, veri ve dosyalar hazır.</div>
      </aside>

      <main className="auth-main">
        <div className="auth-form">
          <div className="auth-mobile-brand brand">
            <span className="brand-mark"><Icon name={icon} size={17} strokeWidth={2.2} /></span>
            {title}
          </div>
          <div>
            <h1>{heading}</h1>
            <p className="sub">{info ?? lead}</p>
          </div>

          {(mode === 'login' || mode === 'register') && googleClientId && (
            <>
              <GoogleButton onToken={(t) => run(async () => void (await gb.auth.signInWithGoogle(t)))} />
              <div className="divider">ya da e-postayla</div>
            </>
          )}

          <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
            {mode === 'register' && (
              <label>
                Adın
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" placeholder="Ad Soyad" />
              </label>
            )}
            {mode !== 'confirm' && mode !== 'reset' && (
              <label>
                E-posta
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ornek@mail.com" autoFocus />
              </label>
            )}
            {(mode === 'confirm' || mode === 'reset') && (
              <label>
                Doğrulama kodu
                <input className="code-input" inputMode="numeric" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" placeholder="000000" autoFocus />
              </label>
            )}
            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div className="field">
                <div className="label-row">
                  <span>{mode === 'reset' ? 'Yeni şifre' : 'Şifre'}</span>
                  {mode === 'login' && <button type="button" className="link small" onClick={() => go('forgot')}>Şifremi unuttum</button>}
                </div>
                <input
                  type="password"
                  required
                  minLength={mode === 'login' ? undefined : 6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? '••••••••' : 'En az 6 karakter'}
                  aria-label={mode === 'reset' ? 'Yeni şifre' : 'Şifre'}
                />
              </div>
            )}
            <ErrorText>{error}</ErrorText>
            <button className="btn primary lg block" disabled={busy}>
              {busy ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgb(255 255 255 / 0.4)', borderTopColor: 'currentColor' }} /> : action}
            </button>
          </form>

          <div className="auth-links">
            {mode === 'login' && <>Hesabın yok mu? <button className="link" onClick={() => go('register')}>Kayıt ol</button></>}
            {mode === 'register' && <>Zaten hesabın var mı? <button className="link" onClick={() => go('login')}>Giriş yap</button></>}
            {mode === 'confirm' && (
              <>
                Kod gelmedi mi?{' '}
                <button className="link" onClick={() => run(async () => { await gb.auth.sendConfirmation(email); setInfo('Yeni kod gönderildi.'); })}>
                  Yeniden gönder
                </button>
                <span className="faint">·</span>
              </>
            )}
            {mode !== 'login' && mode !== 'register' && <button className="link" onClick={() => go('login')}>Girişe dön</button>}
          </div>
        </div>
      </main>
    </div>
  );
}

// Google Identity Services: ID token (credential) verir, GridBase /auth/google doğrular.
declare global {
  interface Window {
    google?: { accounts: { id: { initialize(o: object): void; renderButton(el: HTMLElement, o: object): void } } };
  }
}

function GoogleButton({ onToken }: { onToken: (idToken: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  useEffect(() => {
    const render = () => {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: (r: { credential: string }) => cb.current(r.credential) });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: Math.min(380, ref.current.offsetWidth || 380), text: 'continue_with', shape: 'pill', locale: 'tr' });
    };
    if (window.google) return render();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, []);
  return <div ref={ref} className="google-btn" />;
}
