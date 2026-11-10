// ════════════════════════════════════════════════════════════════
//  Rezervasyon: #/ hizmetler, #/book/<hizmet id> gün + saat seç, #/mine randevularım, #/admin işletme, #/login.
//  Çalışma saatleri aşağıda (HOURS); işletmene göre değiştir.
//  Dolu saat: busy_slots'a yalnız gün + saat yazılır (kimin aldığı değil); randevunun kendisi Owner tabloda.
//  Çifte randevu sunucuda engellenir: busy_slots'ta (date, time) tekil, ikinci kayıt 409. Bu yüzden önce saatler
//  yazılır, hepsi tutarsa randevu açılır. İşletme (admin rolü) bütün randevuları görür (bookings: staffRoles).
// ════════════════════════════════════════════════════════════════
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Row } from '@gridbasetr/client';
import { createRealtime } from '@gridbasetr/client/realtime';
import './shared/styles.css';
import './app.css';
import { AuthProvider, hasRole, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { GridBaseError } from '@gridbasetr/client';
import { errorText, gb, setupProblem, table } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Back, Empty, ErrorText, NavLink, PageHead, SetupNotice, Skeleton, Spinner, TopBar, formatDate, navigate, useRoute } from './shared/ui';
import { NotifyButton } from './NotifyButton';

type Service = Row<{ name: string; description: string | null; durationMin: number; price: number }>;
type Booking = Row<{ serviceId: number; serviceName: string; date: string; time: string; note: string | null; status: string; createdAt: string; ownerId: string }>;
type Busy = Row<{ date: string; time: string; ownerId: string | null }>;
const services = table<Omit<Service, 'id'>>('services');
const bookings = table<Omit<Booking, 'id'>>('bookings');
const busy = table<Omit<Busy, 'id'>>('busy_slots');
const rt = createRealtime(gb);

// Çalışma saatleri: pazartesi–cumartesi 09:00–18:00, 30 dk aralık; 14 gün ileriye randevu.
const HOURS = { start: 9, end: 18, step: 30, days: 14, closed: [0] /* pazar */ };
const SLOTS = Array.from({ length: ((HOURS.end - HOURS.start) * 60) / HOURS.step }, (_, i) => {
  const m = HOURS.start * 60 + i * HOURS.step;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const money = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;
// Hizmet süresi kadar ardışık dilim gerekir (90 dk = 3 dilim).
const need = (s: Service) => Math.max(1, Math.ceil(s.durationMin / HOURS.step));

const goLogin = () => {
  sessionStorage.setItem('booking.back', window.location.hash.replace(/^#/, '') || '/');
  navigate('/login');
};

function App() {
  const route = useRoute();
  const { user, ready } = useAuth();
  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  if (route[0] === 'login') {
    if (user) {
      navigate(sessionStorage.getItem('booking.back') ?? '/');
      return null;
    }
    return (
      <AuthScreen
        title="Randevu"
        icon="calendarCheck"
        subtitle="Uygun saati gör, randevunu saniyeler içinde al."
        features={['Boş saatler canlı: başkası alınca anında dolu görünür', 'Aynı saate iki randevu verilmez', 'İşletme onaylayınca bildirim gelir']}
      />
    );
  }
  const admin = hasRole(user, 'admin');
  const nav = user ? (
    <>
      <NavLink href="#/" active={!route[0] || route[0] === 'book'} icon="grid">Hizmetler</NavLink>
      <NavLink href="#/mine" active={route[0] === 'mine'} icon="calendar">Randevularım</NavLink>
      {admin && <NavLink href="#/admin" active={route[0] === 'admin'} icon="store">İşletme</NavLink>}
    </>
  ) : undefined;
  return (
    <>
      <TopBar title="Randevu" icon="calendarCheck" nav={nav} right={user ? <NotifyButton /> : <button className="btn sm primary" onClick={goLogin}>Giriş yap</button>} />
      {route[0] === 'book' ? <BookPage id={Number(route[1])} /> : route[0] === 'mine' ? <MinePage /> : route[0] === 'admin' ? <AdminPage /> : <ServicesPage />}
    </>
  );
}

function ServicesPage() {
  const [list, setList] = useState<Service[] | null>(null);
  useEffect(() => {
    services.list({ sort: 'id:asc' }).then(setList);
  }, []);
  return (
    <main className="page">
      <section className="bk-hero">
        <span className="eyebrow">Online randevu</span>
        <h1>Sana uygun saati seç,<br />gerisini biz halledelim.</h1>
        <div className="bk-facts">
          <span><Icon name="clock" size={16} />Pzt–Cmt 09:00–18:00</span>
          <span><Icon name="calendar" size={16} />14 gün ileriye</span>
          <span><Icon name="bell" size={16} />Onayda bildirim</span>
        </div>
      </section>
      <div className="section-title">Hizmetler</div>
      {!list ? (
        <div className="grid">{[0, 1, 2].map((i) => <div key={i} className="card stack"><Skeleton h={40} w={40} r={11} /><Skeleton h={18} w="60%" /><Skeleton h={12} /><Skeleton h={12} w="80%" /></div>)}</div>
      ) : !list.length ? (
        <Empty icon="calendar" title="Henüz hizmet yok">İşletme hizmet ekleyince burada görünür.</Empty>
      ) : (
        <div className="grid">
          {list.map((s, i) => (
            <a key={s.id} href={`#/book/${s.id}`} className="card hover service">
              <span className={`tile svc-${i % 4}`}><Icon name={(['sparkles', 'zap', 'star', 'calendarCheck'] as const)[i % 4]!} size={19} /></span>
              <h3>{s.name}</h3>
              <p className="muted small grow">{s.description}</p>
              <div className="service-foot">
                <span className="row sm muted small"><Icon name="clock" size={15} />{s.durationMin} dk</span>
                <span className="price">{money(s.price)}</span>
              </div>
              <span className="btn primary block">Randevu al<Icon name="arrowRight" size={15} /></span>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}

function BookPage({ id }: { id: number }) {
  const { user, ready } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const days = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; out.length < HOURS.days && i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      // Kapanıştan sonra bugünü gösterme (seçilecek saat kalmadı)
      if (i === 0 && d.getHours() * 60 + d.getMinutes() >= HOURS.end * 60 - HOURS.step) continue;
      if (!HOURS.closed.includes(d.getDay())) out.push(d);
    }
    return out;
  }, []);
  const [day, setDay] = useState(ymd(days[0]!));
  const [taken, setTaken] = useState<Set<string> | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyBtn, setBusyBtn] = useState(false);

  useEffect(() => {
    services.get(id).then(setService);
  }, [id]);
  useEffect(() => {
    if (!user) return;
    setTaken(null);
    setTime(null);
    busy.list({ filter: `date:eq:${day}`, select: ['date', 'time'] }).then((l) => setTaken(new Set(l.map((x) => x.time))));
    // Başkası o gün saat alırsa anında dolu görünsün
    return rt.subscribe<Busy>('busy_slots', (c) => {
      if (c.type === 'insert' && c.row?.date === day) setTaken((t) => new Set([...(t ?? []), c.row!.time]));
      if (c.type === 'delete') busy.list({ filter: `date:eq:${day}` }).then((l) => setTaken(new Set(l.map((x) => x.time))));
    }, { filter: { date: day } });
  }, [day, user]);

  if (!ready) return <Spinner />;
  if (!user) {
    goLogin();
    return null;
  }
  if (!service) return <Spinner />;
  const n = need(service);
  const now = new Date();
  const free = (i: number) => {
    for (let k = 0; k < n; k++) {
      const s = SLOTS[i + k];
      if (!s || taken?.has(s)) return false;
    }
    return !(day === ymd(now) && SLOTS[i]! <= `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  async function book() {
    if (!time) return;
    setBusyBtn(true);
    setError(null);
    const start = SLOTS.indexOf(time);
    const taken: Busy[] = [];
    try {
      // Önce saatler: aynı anda başkası aynı saate basarsa sunucu ikincisine 409 verir (unique date + time).
      for (const s of SLOTS.slice(start, start + n)) taken.push(await busy.insert({ date: day, time: s }));
      await bookings.insert({ serviceId: service!.id, serviceName: service!.name, date: day, time, note: note || null, status: 'Onay bekliyor', createdAt: new Date().toISOString() });
      navigate('/mine');
    } catch (e) {
      for (const b of taken) await busy.delete(b.id).catch(() => undefined); // yarım kalanı geri al
      setError(e instanceof GridBaseError && e.status === 409 ? 'Bu saat az önce doldu, başka bir saat seç.' : errorText(e));
    } finally {
      setBusyBtn(false);
    }
  }

  const half = (s: string) => (s < '12:00' ? 'Sabah' : s < '15:00' ? 'Öğle' : 'Öğleden sonra');
  const groups = ['Sabah', 'Öğle', 'Öğleden sonra'].map((g) => ({ g, items: SLOTS.map((s, i) => ({ s, i })).filter((x) => half(x.s) === g) }));
  const freeCount = taken ? SLOTS.filter((_, i) => free(i)).length : 0;
  const dayDate = days.find((d) => ymd(d) === day);
  return (
    <main className="page">
      <Back href="#/">Hizmetler</Back>
      <div className="bk-layout">
        <div className="stack lg">
          <div>
            <h1>{service.name}</h1>
            <p className="muted" style={{ marginTop: 6 }}>{service.description}</p>
          </div>
          <div>
            <div className="section-title">1 · Gün seç</div>
            <div className="days">
              {days.map((d) => (
                <button key={ymd(d)} className={`day ${ymd(d) === day ? 'on' : ''}`} onClick={() => setDay(ymd(d))}>
                  <span className="wd">{d.toLocaleDateString('tr-TR', { weekday: 'short' })}</span>
                  <span className="dn">{d.getDate()}</span>
                  <span className="mo">{d.toLocaleDateString('tr-TR', { month: 'short' })}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="section-title row between"><span>2 · Saat seç</span>{taken && <span className="faint" style={{ textTransform: 'none', letterSpacing: 0 }}>{freeCount} boş saat</span>}</div>
            {!taken ? (
              <Spinner />
            ) : freeCount === 0 ? (
              <Empty icon="calendar" title="Bu günde boş saat yok">Başka bir gün seç.</Empty>
            ) : (
              <div className="stack">
                {groups.map(({ g, items }) => (
                  <div key={g} className="slot-group">
                    <span className="slot-label">{g}</span>
                    <div className="slots">
                      {items.map(({ s, i }) => (
                        <button key={s} className={`slot ${time === s ? 'on' : ''}`} disabled={!free(i)} onClick={() => setTime(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <aside className="card bk-summary stack">
          <div className="row">
            <span className="tile"><Icon name="calendarCheck" size={19} /></span>
            <div className="grow"><div className="strong">{service.name}</div><div className="muted small">{service.durationMin} dk</div></div>
          </div>
          <hr />
          <dl className="kv bk-kv">
            <dt>Gün</dt><dd>{dayDate ? dayDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) : formatDate(day)}</dd>
            <dt>Saat</dt><dd>{time ? <strong>{time}</strong> : <span className="faint">Seçilmedi</span>}</dd>
            <dt>Ücret</dt><dd className="strong">{money(service.price)}</dd>
          </dl>
          <label>Not <input placeholder="İsteğe bağlı" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <ErrorText>{error}</ErrorText>
          <button className="btn primary lg block" disabled={!time || busyBtn} onClick={book}>{busyBtn ? 'Kaydediliyor…' : time ? 'Randevuyu onayla' : 'Bir saat seç'}</button>
          <p className="faint xs center">Ödeme işletmede yapılır. İstediğin zaman iptal edebilirsin.</p>
        </aside>
      </div>
    </main>
  );
}

// Randevunun tuttuğu saatleri boşalt (müşteri kendi kayıtlarını, admin herkesinkini silebilir).
async function freeSlots(b: Booking) {
  const s = await services.get(b.serviceId);
  const start = SLOTS.indexOf(b.time);
  const slots = SLOTS.slice(start, start + (s ? need(s) : 1));
  const rows = await busy.list({ filter: `date:eq:${b.date}` });
  for (const r of rows.filter((x) => slots.includes(x.time))) await busy.delete(r.id).catch(() => undefined);
}

function MinePage() {
  const [list, setList] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    bookings.list({ sort: 'date:asc' }).then(setList).catch((e) => setError(errorText(e)));
    return rt.subscribe<Booking>('bookings', (c) =>
      setList((l) => (!l ? l : c.type === 'delete' ? l.filter((x) => x.id !== c.id) : l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c.row! : x)) : [...l, c.row!])),
    );
  }, []);

  async function cancel(b: Booking) {
    try {
      await freeSlots(b);
      await bookings.delete(b.id);
      setList((l) => l?.filter((x) => x.id !== b.id) ?? l);
    } catch (e) {
      setError(errorText(e));
    }
  }

  const { user } = useAuth();
  const today = ymd(new Date());
  // Yönetici (staffRoles) herkesin randevusunu okur; "Randevularım" yalnız kendi kayıtları.
  const mine = list?.filter((b) => !user || b.ownerId === String(user.id)) ?? null;
  const upcoming = mine?.filter((b) => b.date >= today && b.status !== 'İptal') ?? [];
  const past = mine?.filter((b) => b.date < today || b.status === 'İptal') ?? [];
  const row = (b: Booking, canCancel: boolean) => (
    <div key={b.id} className="list-item booking">
      <DateBlock date={b.date} />
      <div className="grow">
        <div className="strong">{b.serviceName}</div>
        <div className="muted small row sm"><Icon name="clock" size={14} />{b.time}{b.note ? <span className="truncate">· {b.note}</span> : null}</div>
      </div>
      <span className={`badge dot ${tone(b.status)}`}>{b.status}</span>
      {canCancel && <button className="btn sm ghost danger" onClick={() => cancel(b)}>İptal et</button>}
    </div>
  );
  return (
    <main className="page narrow">
      <PageHead title="Randevularım" desc="İşletme onaylayınca bildirim gelir; durum burada anında güncellenir." actions={<a className="btn primary" href="#/"><Icon name="plus" size={16} />Yeni randevu</a>} />
      <ErrorText>{error}</ErrorText>
      {!mine ? (
        <Spinner />
      ) : !mine.length ? (
        <Empty icon="calendar" title="Randevun yok" action={<a className="btn primary" href="#/">Hizmet seç</a>}>Bir hizmet seçip uygun saate randevu al.</Empty>
      ) : (
        <div className="stack lg">
          {upcoming.length > 0 && <section><div className="section-title">Yaklaşan</div><div className="card flush"><div className="list">{upcoming.map((b) => row(b, true))}</div></div></section>}
          {past.length > 0 && <section><div className="section-title">Geçmiş ve iptal</div><div className="card flush past"><div className="list">{past.map((b) => row(b, false))}</div></div></section>}
        </div>
      )}
    </main>
  );
}

const tone = (s: string) => (s === 'Onaylandı' ? 'ok' : s === 'İptal' ? 'gray' : 'warn');
const DateBlock = ({ date }: { date: string }) => {
  const d = new Date(`${date}T00:00:00`);
  return (
    <span className="date-block">
      <span className="mo">{d.toLocaleDateString('tr-TR', { month: 'short' })}</span>
      <span className="dn">{d.getDate()}</span>
    </span>
  );
};

// İşletme: bütün randevular (bookings: owner + staffRoles admin). Onayla / iptal et → müşteriye bildirim.
function AdminPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    bookings.list({ sort: 'date:asc' }).then(setList).catch((e) => setError(errorText(e)));
    return rt.subscribe<Booking>('bookings', (c) =>
      setList((l) => (!l ? l : c.type === 'delete' ? l.filter((x) => x.id !== c.id) : l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c.row! : x)) : [...l, c.row!])),
    );
  }, []);
  if (!hasRole(user, 'admin')) return <main className="page narrow"><Empty icon="lock" title="Yetkin yok">Bu sayfa işletme (admin rolü) için.</Empty></main>;

  async function setStatus(b: Booking, status: string) {
    setError(null);
    try {
      if (status === 'İptal') await freeSlots(b); // saat yeniden boşa çıksın
      const row = await bookings.update(b.id, { status }); // sahibine bildirim: push kuralı "Randevu durumu"
      setList((l) => l?.map((x) => (x.id === row.id ? row : x)) ?? l);
    } catch (e) {
      setError(errorText(e));
    }
  }

  const today = ymd(new Date());
  const pending = list?.filter((b) => b.status !== 'Onaylandı' && b.status !== 'İptal').length ?? 0;
  const todays = list?.filter((b) => b.date === today && b.status !== 'İptal').length ?? 0;
  return (
    <main className="page medium">
      <PageHead title="İşletme" desc="Gelen randevuları onayla ya da iptal et; müşteriye bildirim gider." />
      <div className="bk-stats">
        <div className="stat"><span className="muted small">Bugün</span><strong>{list ? todays : '–'}</strong></div>
        <div className="stat"><span className="muted small">Onay bekleyen</span><strong>{list ? pending : '–'}</strong></div>
        <div className="stat"><span className="muted small">Toplam</span><strong>{list?.length ?? '–'}</strong></div>
      </div>
      <ErrorText>{error}</ErrorText>
      {!list ? (
        <Spinner />
      ) : !list.length ? (
        <Empty icon="calendar" title="Randevu yok">Müşteriler randevu aldığında burada görünür.</Empty>
      ) : (
        <div className="card flush admin-bookings" style={{ marginTop: 20 }}>
          <div className="list">
            {list.map((b) => (
              <div key={b.id} className={`list-item admin-booking ${b.status === 'İptal' ? 'canceled' : ''}`}>
                <DateBlock date={b.date} />
                <div className="grow">
                  <div className="row sm wrap"><strong>{b.serviceName}</strong><span className="muted small">{b.time}</span></div>
                  {b.note && <div className="muted small truncate">“{b.note}”</div>}
                </div>
                <span className={`badge dot ${tone(b.status)}`}>{b.status}</span>
                <div className="actions" style={{ gap: 6 }}>
                  {b.status !== 'Onaylandı' && b.status !== 'İptal' && <button className="btn sm primary" onClick={() => setStatus(b, 'Onaylandı')}><Icon name="check" size={14} />Onayla</button>}
                  {b.status !== 'İptal' && <button className="btn sm danger" onClick={() => setStatus(b, 'İptal')}>İptal</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
