// ════════════════════════════════════════════════════════════════
//  Hesabım: profil, güvenlik, oturumlar, hesabı sil. Hepsi SDK'nın gb.auth'u + tek tablo (profiles).
//    gb.auth.updateProfile({ displayName })    görünen ad (GridBase'in kullanıcı kaydı)
//    gb.from('profiles')                        bio + avatar (uygulamaya özel; Owner erişimi)
//    gb.auth.changePassword / changeEmail       mevcut şifreyi ister, yeni token döner
//    gb.auth.sessions / revokeSession           açık cihazlar; kapatılan cihaz hemen düşer
//    gb.auth.signOutEverywhere                  bütün cihazlardan çık
//    gb.auth.deleteAccount({ password })        hesabı ve sahibi olduğu satırları siler (App Store 5.1.1(v))
// ════════════════════════════════════════════════════════════════
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { DeviceSession } from '@gridbasetr/client';
import { nameOf, useAuth } from './shared/auth';
import { errorText, gb, table } from './shared/gridbase';
import { Icon, type IconName } from './shared/icons';
import { Avatar, ErrorText, Modal, PageHead, Skeleton, TopBar, navigate, timeAgo, useRoute } from './shared/ui';

type Profile = { id: number; bio: string | null; avatar: string | null };
const profiles = table<Omit<Profile, 'id'>>('profiles');

const TABS: { id: string; label: string; desc: string; icon: IconName }[] = [
  { id: 'profile', label: 'Profil', desc: 'Ad, fotoğraf, hakkında', icon: 'user' },
  { id: 'security', label: 'Güvenlik', desc: 'Şifre ve e-posta', icon: 'key' },
  { id: 'sessions', label: 'Oturumlar', desc: 'Açık cihazlar', icon: 'monitor' },
  { id: 'delete', label: 'Hesabı sil', desc: 'Kalıcı olarak', icon: 'trash' },
];

export function AccountPage() {
  const [tab = 'profile'] = useRoute();
  const current = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  return (
    <>
      <TopBar title="Kimlik" icon="shield" />
      <main className="page medium">
        <PageHead title="Hesap ayarları" desc="Profilini, güvenliğini ve açık oturumlarını buradan yönet." />
        <div className="settings">
          <nav className="settings-nav">
            {TABS.map((t) => (
              <a key={t.id} href={`#/${t.id}`} className={`${current.id === t.id ? 'on' : ''} ${t.id === 'delete' ? 'danger' : ''}`}>
                <Icon name={t.icon} size={17} />
                <span className="grow">
                  <span className="label">{t.label}</span>
                  <span className="desc">{t.desc}</span>
                </span>
              </a>
            ))}
          </nav>
          <section className="stack lg">
            {current.id === 'profile' && <ProfileTab />}
            {current.id === 'security' && <SecurityTab />}
            {current.id === 'sessions' && <SessionsTab />}
            {current.id === 'delete' && <DeleteTab />}
          </section>
        </div>
      </main>
    </>
  );
}

// Ayar kartı: başlık + açıklama, gövde, isteğe bağlı alt çubuk (kaydet düğmesi sağda).
function Box({ title, desc, children, foot, tone }: { title: string; desc?: string; children: ReactNode; foot?: ReactNode; tone?: 'danger' }) {
  return (
    <div className={`card flush ${tone === 'danger' ? 'danger-card' : ''}`}>
      <div className="card-body stack lg">
        <div>
          <h2 style={{ fontSize: '1.02rem' }}>{title}</h2>
          {desc && <p className="muted small" style={{ marginTop: 4 }}>{desc}</p>}
        </div>
        {children}
      </div>
      {foot && <div className="card-foot">{foot}</div>}
    </div>
  );
}

// Küçük form yardımcısı: meşgul / hata / başarı mesajı.
function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    setMsg(null);
    try {
      const text = await fn();
      if (text) setMsg({ ok: true, text });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  };
  const view = msg && (msg.ok ? <span className="saved"><Icon name="checkCircle" size={15} />{msg.text}</span> : <ErrorText>{msg.text}</ErrorText>);
  return { busy, run, view };
}

function ProfileTab() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bio, setBio] = useState('');
  const [copied, setCopied] = useState(false);
  const save = useAction();
  const upload = useAction();

  useEffect(() => {
    // Owner tabloda one() yalnız kendi satırını görür; ilk girişte yoktur, açılır.
    profiles.one().then(async (p) => {
      const row = p ?? (await profiles.insert({ bio: '', avatar: null }));
      setProfile(row);
      setBio(row.bio ?? '');
    });
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.run(async () => {
      if ((displayName || null) !== (user?.displayName || null)) await gb.auth.updateProfile({ displayName: displayName.trim() || null });
      if (profile) setProfile(await profiles.update(profile.id, { bio }));
      return 'Kaydedildi';
    });
  };

  const changeAvatar = (file: File | undefined) =>
    file &&
    profile &&
    upload.run(async () => {
      const name = await gb.storage.from('avatars').upload(file, { table: 'profiles', rowId: profile.id });
      const old = profile.avatar;
      setProfile(await profiles.update(profile.id, { avatar: name }));
      if (old) await gb.storage.remove(old).catch(() => undefined);
      return 'Fotoğraf güncellendi';
    });

  if (!profile)
    return (
      <div className="card stack lg">
        <div className="row"><Skeleton h={72} w={72} r={99} /><div className="grow stack sm"><Skeleton h={16} w="40%" /><Skeleton h={12} w="60%" /></div></div>
        <Skeleton h={40} /><Skeleton h={110} />
      </div>
    );
  const dirty = displayName !== (user?.displayName ?? '') || bio !== (profile.bio ?? '');
  return (
    <>
      <form onSubmit={submit}>
        <Box
          title="Profil"
          desc="Görünen adın GridBase'in kullanıcı kaydında; hakkında yazısı ve fotoğraf bu uygulamanın profiles tablosunda."
          foot={<>{save.view ?? <span className="hint">Değişiklikler kaydedilene kadar uygulanmaz.</span>}<button className="btn primary" disabled={save.busy || !dirty}>Kaydet</button></>}
        >
          <div className="row" style={{ gap: 18 }}>
            <label className="avatar-edit" title="Fotoğrafı değiştir">
              <Avatar name={nameOf(user)} image={profile.avatar} size="lg" />
              <span className="avatar-edit-btn">{upload.busy ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Icon name="image" size={14} />}</span>
              <input type="file" accept="image/*" hidden onChange={(e) => changeAvatar(e.target.files?.[0])} />
            </label>
            <div className="grow stack sm">
              <div className="row sm wrap">
                <strong style={{ fontSize: '1.05rem' }}>{nameOf(user)}</strong>
                {user?.emailConfirmed ? <span className="badge ok dot">Onaylı</span> : <span className="badge warn dot">Onaysız</span>}
              </div>
              <span className="muted small truncate">{user?.email}</span>
              {upload.view && <div>{upload.view}</div>}
            </div>
          </div>
          <div className="form-grid">
            <label className="full">
              Görünen ad
              <input value={displayName} maxLength={100} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ad Soyad" />
            </label>
            <label className="full">
              <span>Hakkında <span className="hint">· isteğe bağlı</span></span>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendinden kısaca bahset" />
            </label>
          </div>
        </Box>
      </form>
      <Box title="Hesap bilgisi">
        <dl className="kv">
          <dt>Kullanıcı id</dt>
          <dd className="row sm">
            <code>{user?.id}</code>
            <button type="button" className="icon-btn sm" title="Kopyala" onClick={() => navigator.clipboard?.writeText(String(user?.id)).then(() => setCopied(true))}>
              <Icon name={copied ? 'check' : 'copy'} size={14} />
            </button>
          </dd>
          <dt>Roller</dt>
          <dd className="row sm wrap">{user?.roles.length ? user.roles.map((r) => <span key={r} className="badge gray">{r}</span>) : <span className="muted">Rol yok</span>}</dd>
          <dt>E-posta</dt>
          <dd>{user?.email}</dd>
        </dl>
      </Box>
    </>
  );
}

function SecurityTab() {
  const pass = useAction();
  const mail = useAction();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [mailPass, setMailPass] = useState('');
  const [newEmail, setNewEmail] = useState('');
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pass.run(async () => {
            await gb.auth.changePassword(current, next);
            setCurrent('');
            setNext('');
            return 'Şifren değişti';
          });
        }}
      >
        <Box
          title="Şifre"
          desc="Şifreni değiştirince diğer cihazlardaki oturumlar kapanır, bu cihaz açık kalır."
          foot={<>{pass.view ?? <span className="hint">En az 6 karakter.</span>}<button className="btn primary" disabled={pass.busy || !current || next.length < 6}>Şifreyi değiştir</button></>}
        >
          <div className="form-grid">
            <label>Mevcut şifre<input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></label>
            <label>Yeni şifre<input type="password" required minLength={6} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></label>
          </div>
        </Box>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mail.run(async () => {
            await gb.auth.changeEmail(mailPass, newEmail);
            setMailPass('');
            return 'E-postan değişti';
          });
        }}
      >
        <Box
          title="E-posta adresi"
          desc="Giriş için kullandığın adres. Değiştirince eski adrese bilgi maili gider."
          foot={<>{mail.view ?? <span className="hint">Güvenlik için şifreni soruyoruz.</span>}<button className="btn primary" disabled={mail.busy || !newEmail || !mailPass}>E-postayı değiştir</button></>}
        >
          <div className="form-grid">
            <label>Yeni e-posta<input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="yeni@mail.com" /></label>
            <label>Şifren<input type="password" required value={mailPass} onChange={(e) => setMailPass(e.target.value)} autoComplete="current-password" /></label>
          </div>
        </Box>
      </form>
    </>
  );
}

const DEVICE_ICON: Record<DeviceSession['deviceType'], IconName> = { desktop: 'monitor', phone: 'phone', tablet: 'tablet', unknown: 'plug' };

function SessionsTab() {
  const [list, setList] = useState<DeviceSession[] | null>(null);
  const act = useAction();
  const load = () => gb.auth.sessions().then(setList).catch(() => setList([]));
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="card flush">
      <div className="card-body" style={{ paddingBottom: 12 }}>
        <h2 style={{ fontSize: '1.02rem' }}>Açık oturumlar</h2>
        <p className="muted small" style={{ marginTop: 4 }}>Hesabının açık olduğu cihazlar. Tanımadığın bir cihaz görürsen kapat ve şifreni değiştir.</p>
      </div>
      {!list ? (
        <div className="list">{[0, 1].map((i) => <div key={i} className="list-item"><Skeleton h={40} w={40} r={10} /><div className="grow stack sm"><Skeleton h={14} w="40%" /><Skeleton h={12} w="55%" /></div></div>)}</div>
      ) : (
        <div className="list" style={{ borderTop: '1px solid var(--line)' }}>
          {list.map((s) => (
            <div key={s.id} className="list-item">
              <span className={`tile ${s.current ? '' : 'gray'}`}><Icon name={DEVICE_ICON[s.deviceType]} size={19} /></span>
              <div className="grow">
                <div className="row sm wrap">
                  <strong className="truncate">{s.device}</strong>
                  {s.current && <span className="badge ok dot">Bu cihaz</span>}
                </div>
                <div className="muted small">{s.ip ?? 'IP yok'} · son kullanım {timeAgo(s.lastUsedAt)}</div>
              </div>
              <button className="btn sm danger" disabled={act.busy} onClick={() => act.run(async () => { await gb.auth.revokeSession(s.id); await load(); })}>
                {s.current ? 'Çıkış yap' : 'Kapat'}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="card-foot">
        {act.view ?? <span className="hint">{list ? `${list.length} cihaz` : ''}</span>}
        <button className="btn danger" onClick={() => act.run(() => gb.auth.signOutEverywhere())}>
          <Icon name="logout" size={16} /> Bütün cihazlardan çık
        </button>
      </div>
    </div>
  );
}

function DeleteTab() {
  const act = useAction();
  const [password, setPassword] = useState('');
  const [sure, setSure] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Box
        tone="danger"
        title="Hesabı sil"
        desc="Hesabın, bu projede sahibi olduğun bütün kayıtlar ve yüklediğin dosyalar kalıcı olarak silinir."
        foot={<button className="btn danger solid" onClick={() => setOpen(true)}><Icon name="trash" size={16} /> Hesabımı sil</button>}
      >
        <div className="callout danger">
          <Icon name="alert" size={16} />
          <span>Bu işlem <strong>geri alınamaz</strong>. Aynı e-postayla daha sonra yeniden kayıt olabilirsin, ama eski verilerin gelmez.</span>
        </div>
        <p className="muted small">
          Google ile açılmış hesapta şifre yoktur: silmek için Google ile yeniden doğrulama gerekir (<code>deleteAccount({'{ googleIdToken }'})</code>).
        </p>
      </Box>
      {open && (
        <Modal title="Hesabını silmek üzeresin" desc="Devam etmek için şifreni yaz." icon="alert" onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setOpen(false)}>Vazgeç</button>
              <button className="btn danger solid" form="delete-form" disabled={!sure || !password || act.busy}>Hesabımı kalıcı olarak sil</button>
            </>
          }
        >
          <form
            id="delete-form"
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              act.run(async () => {
                await gb.auth.deleteAccount({ password });
                navigate('/');
              });
            }}
          >
            <label>Şifren<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus /></label>
            <label className="check">
              <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} /> Hesabımın ve verilerimin kalıcı olarak silineceğini anladım.
            </label>
            {act.view}
          </form>
        </Modal>
      )}
    </>
  );
}

