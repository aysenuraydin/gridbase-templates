// Duyurular: girişli herkes okur, yalnız moderator rolü yazar (announcements: authenticated + write role('moderator')).
// Yönetici birine moderator rolünü verince o kişi yenilediğinde yazma kutusu açılır; sunucu da yazmaya izin verir.
import { useEffect, useState, type FormEvent } from 'react';
import type { Row } from '@gridbasetr/client';
import { createRealtime } from '@gridbasetr/client/realtime';
import { hasRole, nameOf, useAuth } from './shared/auth';
import { errorText, gb, table } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, Empty, ErrorText, PageHead, Skeleton, formatDate, timeAgo } from './shared/ui';

type Announcement = Row<{ title: string; body: string; authorName: string | null; createdAt: string | null }>;
const announcements = table<Omit<Announcement, 'id'>>('announcements');
const rt = createRealtime(gb);

export function AnnouncementsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Announcement[] | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canWrite = hasRole(user, 'moderator');

  useEffect(() => {
    announcements.list({ sort: 'id:desc' }).then(setList).catch((e) => setError(errorText(e)));
    return rt.subscribe<Announcement>('announcements', (c) =>
      setList((l) => {
        if (!l) return l;
        if (c.type === 'delete') return l.filter((x) => x.id !== c.id);
        return l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c.row! : x)) : [c.row!, ...l];
      }),
    );
  }, []);

  async function post(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const a = await announcements.insert({ title, body, authorName: nameOf(user), createdAt: new Date().toISOString() });
      setList((l) => (l?.some((x) => x.id === a.id) ? l : [a, ...(l ?? [])]));
      setTitle('');
      setBody('');
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <main className="page narrow">
      <PageHead title="Duyurular" desc="Topluluktan haberler. Yeni duyurular sayfayı yenilemeden gelir." />
      {canWrite ? (
        <form className="card flush composer" onSubmit={post}>
          <div className="card-body stack">
            <div className="row">
              <Avatar name={nameOf(user)} size="sm" />
              <input className="composer-title" placeholder="Başlık" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <textarea className="composer-body" placeholder="Ne duyurmak istiyorsun?" required value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="card-foot">
            <span className="hint row sm"><span className="badge">moderator</span> rolünle yazıyorsun</span>
            <button className="btn primary" disabled={!title.trim() || !body.trim()}><Icon name="send" size={15} />Yayınla</button>
          </div>
        </form>
      ) : (
        <div className="callout brand">
          <Icon name="info" size={16} />
          <span>Duyuru yazmak <strong>moderator</strong> rolü ister. Bir yönetici sana bu rolü verebilir.</span>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="stack" style={{ marginTop: 20 }}>
        {!list ? (
          [0, 1].map((i) => <div key={i} className="card stack"><div className="row"><Skeleton h={36} w={36} r={99} /><Skeleton h={14} w="30%" /></div><Skeleton h={16} w="70%" /><Skeleton h={12} /></div>)
        ) : !list.length ? (
          <Empty icon="megaphone" title="Henüz duyuru yok">Moderatörler duyuru yayınladığında burada görünür.</Empty>
        ) : (
          list.map((a) => (
            <article key={a.id} className="card announcement">
              <header className="row">
                <Avatar name={a.authorName} />
                <div className="grow">
                  <div className="strong small">{a.authorName}</div>
                  <div className="faint xs" title={formatDate(a.createdAt)}>{timeAgo(a.createdAt)}</div>
                </div>
              </header>
              <h3>{a.title}</h3>
              <p>{a.body}</p>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
