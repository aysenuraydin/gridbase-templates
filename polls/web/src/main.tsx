// ════════════════════════════════════════════════════════════════
//  Anket: #/ liste, #/p/<id> anket (paylaşılan bağlantı, girişsiz açılır), #/new, #/login.
//  Oylar ayrı tabloda (votes); sonuç = o anketin oylarının sayımı, realtime ile anında güncellenir.
// ════════════════════════════════════════════════════════════════
import { StrictMode, useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type { Row } from '@gridbasetr/client';
import { createRealtime } from '@gridbasetr/client/realtime';
import './shared/styles.css';
import './app.css';
import { AuthProvider, nameOf, useAuth } from './shared/auth';
import { AuthScreen } from './shared/AuthScreen';
import { errorText, gb, setupProblem, table } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, Back, Empty, ErrorText, PageHead, SetupNotice, Skeleton, Spinner, TopBar, formatDate, formatShortDate, navigate, timeAgo, useRoute } from './shared/ui';

type Poll = Row<{ question: string; options: string; authorName: string | null; endsAt: string | null; closed: boolean; createdAt: string | null; ownerId: string | null }>;
type Vote = Row<{ pollId: number; option: number; createdAt: string | null; ownerId: string | null }>; // ownerId = oy veren (GridBase damgalar)
const polls = table<Omit<Poll, 'id'>>('polls');
const votes = table<Omit<Vote, 'id'>>('votes');
const rt = createRealtime(gb);

const optionsOf = (p: Poll): string[] => {
  try {
    return JSON.parse(p.options) as string[];
  } catch {
    return [];
  }
};
const isOpen = (p: Poll) => !p.closed && (!p.endsAt || new Date(p.endsAt) > new Date());
const goLogin = () => {
  sessionStorage.setItem('polls.back', window.location.hash.replace(/^#/, '') || '/');
  navigate('/login');
};

function App() {
  const route = useRoute();
  const { user, ready } = useAuth();
  if (setupProblem) return <SetupNotice />;
  if (!ready) return <Spinner full />;
  if (route[0] === 'login') {
    if (user) {
      navigate(sessionStorage.getItem('polls.back') ?? '/');
      return null;
    }
    return (
      <AuthScreen
        title="Anket"
        icon="chart"
        subtitle="Soru sor, bağlantıyı paylaş, sonuçları canlı izle."
        features={['Oylar sayfa yenilenmeden anında görünür', 'Kişi başına tek oy, sunucu da denetler', 'Bitiş tarihi koy ya da istediğin an kapat']}
      />
    );
  }
  const right = user ? <a className="btn primary sm" href="#/new"><Icon name="plus" size={15} />Yeni anket</a> : <button className="btn sm primary" onClick={goLogin}>Giriş yap</button>;
  return (
    <>
      <TopBar title="Anket" icon="chart" right={right} />
      {route[0] === 'p' ? <PollPage id={Number(route[1])} /> : route[0] === 'new' ? <NewPoll /> : <PollList />}
    </>
  );
}

function PollList() {
  const [list, setList] = useState<Poll[] | null>(null);
  useEffect(() => {
    polls.list({ sort: 'id:desc', select: ['question', 'authorName', 'endsAt', 'closed', 'createdAt'] }).then(setList);
  }, []);
  const { user } = useAuth();
  const openCount = list?.filter(isOpen).length ?? 0;
  return (
    <main className="page narrow">
      <PageHead title="Anketler" desc={list ? `${list.length} anket · ${openCount} tanesi oylamaya açık` : ' '} />
      {!list ? (
        <div className="stack">{[0, 1, 2].map((i) => <div key={i} className="card row"><Skeleton h={40} w={40} r={11} /><div className="grow stack sm"><Skeleton h={16} w="60%" /><Skeleton h={12} w="35%" /></div></div>)}</div>
      ) : !list.length ? (
        <Empty icon="chart" title="Henüz anket yok" action={user ? <a className="btn primary" href="#/new">İlk anketi aç</a> : <button className="btn primary" onClick={goLogin}>Giriş yap ve anket aç</button>}>
          Bir soru sor, bağlantıyı paylaş, sonuçları canlı izle.
        </Empty>
      ) : (
        <div className="stack">
          {list.map((p) => (
            <a key={p.id} href={`#/p/${p.id}`} className="card hover poll-row list-item">
              <span className={`tile ${isOpen(p) ? '' : 'gray'}`}><Icon name="chart" size={19} /></span>
              <div className="grow">
                <div className="strong poll-q">{p.question}</div>
                <div className="row sm muted small wrap">
                  <Avatar name={p.authorName} size="xs" />
                  <span>{p.authorName}</span>
                  <span className="faint">·</span>
                  <span>{timeAgo(p.createdAt)}</span>
                  {p.endsAt && isOpen(p) && <><span className="faint">·</span><span>bitiş {formatShortDate(p.endsAt)}</span></>}
                </div>
              </div>
              <span className={`badge dot ${isOpen(p) ? 'ok' : 'gray'}`}>{isOpen(p) ? 'Açık' : 'Kapandı'}</span>
              <Icon name="chevronRight" size={18} className="faint hide-sm" />
            </a>
          ))}
        </div>
      )}
    </main>
  );
}

function PollPage({ id }: { id: number }) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null | undefined>(undefined);
  const [list, setList] = useState<Vote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    polls.get(id).then(setPoll).catch(() => setPoll(null));
    votes.list({ filter: `pollId:eq:${id}`, select: ['pollId', 'option', 'ownerId'] }).then(setList);
    const offV = rt.subscribe<Vote>('votes', (c) => {
      if (c.type === 'delete') return setList((l) => l.filter((x) => x.id !== c.id));
      setList((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c.row! : x)) : [...l, c.row!]));
    }, { filter: { pollId: String(id) } });
    const offP = rt.subscribe<Poll>('polls', (c) => c.id === id && c.row && setPoll(c.row));
    return () => {
      offV();
      offP();
    };
  }, [id]);

  if (poll === undefined) return <Spinner />;
  if (!poll) return <main className="page narrow"><Empty icon="chart" title="Anket bulunamadı" action={<a className="btn" href="#/">Anketlere dön</a>}>Bağlantı yanlış ya da anket silinmiş olabilir.</Empty></main>;
  const opts = optionsOf(poll);
  const mine = user ? list.find((v) => v.ownerId === String(user.id)) : undefined;
  const counts = opts.map((_, i) => list.filter((v) => v.option === i).length);
  const total = list.length;
  const open = isOpen(poll);

  async function vote(i: number) {
    if (!user) return goLogin();
    setError(null);
    try {
      // Kişi başına bir oy: varsa değiştir. Sunucu da zorlar (unique pollId + ownerId): ikinci oy 409.
      if (mine) await votes.update(mine.id, { option: i });
      else await votes.insert({ pollId: poll!.id, option: i, createdAt: new Date().toISOString() });
    } catch (e) {
      setError(errorText(e));
    }
  }

  const lead = Math.max(0, ...counts);
  return (
    <main className="page narrow">
      <Back href="#/">Anketler</Back>
      <div className="card flush poll-card">
        <div className="card-body stack lg">
          <div className="stack sm">
            <div className="row sm wrap">
              <span className={`badge dot ${open ? 'ok' : 'gray'}`}>{open ? 'Oylama açık' : 'Oylama kapandı'}</span>
              {poll.endsAt && <span className="faint small">{open ? 'Bitiş' : 'Bitti'}: {formatDate(poll.endsAt)}</span>}
            </div>
            <h1 className="poll-title">{poll.question}</h1>
            <div className="row sm muted small"><Avatar name={poll.authorName} size="xs" />{poll.authorName} · {timeAgo(poll.createdAt)}</div>
          </div>
          <div className="stack sm" role="group" aria-label="Seçenekler">
            {opts.map((o, i) => {
              const pct = total ? Math.round((counts[i]! / total) * 100) : 0;
              const picked = mine?.option === i;
              const winner = !open && total > 0 && counts[i] === lead;
              return (
                <button key={i} className={`option ${picked ? 'picked' : ''} ${winner ? 'winner' : ''}`} disabled={!open} onClick={() => vote(i)}>
                  <span className="bar" style={{ width: `${pct}%` }} />
                  <span className="mark">{picked ? <Icon name="check" size={13} strokeWidth={3} /> : null}</span>
                  <span className="label">{o}</span>
                  <span className="pct"><strong>%{pct}</strong> <span className="faint">{counts[i]}</span></span>
                </button>
              );
            })}
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="row between wrap small muted">
            <span className="tabular"><strong className="strong">{total}</strong> oy{mine ? ' · oyunu verdin, istersen değiştir' : ''}</span>
            {!user && open && <span>Oy vermek için <button className="link" onClick={goLogin}>giriş yap</button></span>}
          </div>
        </div>
        <div className="card-foot">
          <span className="hint row sm"><span className="live on">Canlı</span></span>
          {user && poll.ownerId === String(user.id) && open && (
            <button className="btn sm danger" onClick={() => polls.update(poll.id, { closed: true }).then(setPoll)}><Icon name="lock" size={14} />Anketi kapat</button>
          )}
          <button className="btn sm" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true))}>
            <Icon name={copied ? 'check' : 'link'} size={14} />{copied ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
          </button>
        </div>
      </div>
    </main>
  );
}

function NewPoll() {
  const { user, ready } = useAuth();
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!ready) return <Spinner />;
  if (!user) {
    goLogin();
    return null;
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    const clean = opts.map((o) => o.trim()).filter(Boolean);
    if (clean.length < 2) return setError('En az iki seçenek gir.');
    try {
      const p = await polls.insert({
        question: question.trim(), options: JSON.stringify(clean), authorName: nameOf(user),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null, closed: false, createdAt: new Date().toISOString(),
      });
      navigate(`/p/${p.id}`);
    } catch (err) {
      setError(errorText(err));
    }
  }
  return (
    <main className="page narrow">
      <Back href="#/">Anketler</Back>
      <PageHead title="Yeni anket" desc="Sorunu yaz, seçenekleri ekle. Bağlantıyı paylaşınca herkes oy verebilir." />
      <form className="card flush" onSubmit={create}>
        <div className="card-body stack lg">
          <label>Soru<input required value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Örn. Ekip yemeği nerede olsun?" autoFocus /></label>
          <div className="field">
            <span>Seçenekler <span className="hint">· en az 2, en çok 10</span></span>
            <div className="stack sm">
              {opts.map((o, i) => (
                <div key={i} className="opt-input">
                  <span className="opt-num">{i + 1}</span>
                  <input placeholder={`Seçenek ${i + 1}`} value={o} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} />
                  {opts.length > 2 && <button type="button" className="icon-btn sm danger" onClick={() => setOpts(opts.filter((_, j) => j !== i))} aria-label="Seçeneği kaldır"><Icon name="x" size={15} /></button>}
                </div>
              ))}
              {opts.length < 10 && <button type="button" className="add-opt" onClick={() => setOpts([...opts, ''])}><Icon name="plus" size={15} />Seçenek ekle</button>}
            </div>
          </div>
          <label>
            <span>Bitiş <span className="hint">· isteğe bağlı</span></span>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
          <ErrorText>{error}</ErrorText>
        </div>
        <div className="card-foot">
          <a className="btn ghost" href="#/">Vazgeç</a>
          <button className="btn primary">Anketi aç</button>
        </div>
      </form>
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
