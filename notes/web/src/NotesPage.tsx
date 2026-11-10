// ════════════════════════════════════════════════════════════════
//  Notlar: kendi notların + seninle paylaşılanlar tek listede (GridBase owner + katılımcı kuralı ikisini de verir).
//  Paylaşılan notu yalnız sahibi değiştirir; sende salt okunur açılır. Değişiklikler realtime ile anında.
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import type { Row } from '@gridbasetr/client';
import { createRealtime } from '@gridbasetr/client/realtime';
import { nameOf, useAuth } from './shared/auth';
import { errorText, gb, table } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, Empty, ErrorText, PageHead, Skeleton, TopBar, timeAgo, useConfirm } from './shared/ui';
import { ShareDialog, ensureProfile, splitIds, usePeople } from './people';

type Note = Row<{ title: string; body: string; color: string | null; pinned: boolean; sharedWith: string | null; ownerName: string | null; updatedAt: string | null; ownerId: string }>;
const notes = table<Omit<Note, 'id'>>('notes');
const rt = createRealtime(gb);
// Renkler satıra hex olarak yazılır (eski kayıtlarla uyumlu); ekranda her birinin açık / koyu tema tonu app.css'te.
const COLORS = ['#ffffff', '#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3', '#ede9fe'];
const COLOR_NAMES: Record<string, string> = { '#ffffff': 'Varsayılan', '#fef3c7': 'Sarı', '#dcfce7': 'Yeşil', '#dbeafe': 'Mavi', '#fce7f3': 'Pembe', '#ede9fe': 'Mor' };
const tone = (c: string | null | undefined) => `tone-${Math.max(0, COLORS.indexOf((c ?? '').toLowerCase()))}`;

export function NotesPage() {
  const { user } = useAuth();
  const me = String(user!.id);
  const people = usePeople();
  const [list, setList] = useState<Note[] | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Note | 'new' | null>(null);
  const [sharing, setSharing] = useState<Note | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(() => notes.list({ sort: 'id:desc' }).then(setList).catch((e) => setError(errorText(e))), []);

  useEffect(() => {
    ensureProfile(user!).catch(() => undefined);
    load();
    const off = rt.subscribe<Note>('notes', (c) =>
      setList((l) => {
        if (!l) return l;
        if (c.type === 'delete') return l.filter((x) => x.id !== c.id); // paylaşım kaldırılınca da delete gelir
        return l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c.row! : x)) : [c.row!, ...l];
      }),
    );
    const offRe = rt.onReconnect(load);
    return () => {
      off();
      offRe();
    };
  }, [user, load]);

  async function save(n: Partial<Note> & { id?: number }) {
    const values = { title: n.title ?? '', body: n.body ?? '', color: n.color ?? COLORS[0], pinned: !!n.pinned, updatedAt: new Date().toISOString() };
    const row = n.id ? await notes.update(n.id, values) : await notes.insert({ ...values, sharedWith: '', ownerName: nameOf(user) });
    setList((l) => (l?.some((x) => x.id === row.id) ? l.map((x) => (x.id === row.id ? row : x)) : [row, ...(l ?? [])]));
  }

  async function remove(n: Note) {
    setList((l) => l?.filter((x) => x.id !== n.id) ?? l);
    await notes.delete(n.id).catch((e) => {
      setError(errorText(e));
      load();
    });
  }

  const needle = q.toLocaleLowerCase('tr-TR');
  const matched = (list ?? []).filter((n) => !needle || `${n.title} ${n.body}`.toLocaleLowerCase('tr-TR').includes(needle));
  const pinned = matched.filter((n) => n.pinned);
  const others = matched.filter((n) => !n.pinned);

  const card = (n: Note) => {
    const mine = n.ownerId === me;
    const shareIds = splitIds(n.sharedWith);
    return (
      <article key={n.id} className={`note note-card ${tone(n.color)}`} onClick={() => setEditing(n)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEditing(n)}>
        {n.pinned && <span className="note-pin" title="Sabit"><Icon name="pin" size={14} /></span>}
        {n.title && <h3>{n.title}</h3>}
        {n.body ? <p className="note-body">{n.body}</p> : !n.title && <p className="note-body faint">Boş not</p>}
        <footer onClick={(e) => e.stopPropagation()}>
          {mine ? (
            <>
              {shareIds.length > 0 ? (
                <span className="avatar-stack" title={`${shareIds.length} kişiyle paylaşıldı`}>
                  {shareIds.slice(0, 3).map((id) => <Avatar key={id} name={people.get(id)?.displayName ?? `#${id}`} size="xs" />)}
                </span>
              ) : (
                <span className="note-date">{timeAgo(n.updatedAt)}</span>
              )}
              <span className="grow" />
              <span className="note-actions">
                <button className="icon-btn sm" title="Paylaş" onClick={() => setSharing(n)}><Icon name="userPlus" size={15} /></button>
                <button className="icon-btn sm danger" title="Sil" onClick={() => askRemove(n)}><Icon name="trash" size={15} /></button>
              </span>
            </>
          ) : (
            <span className="row sm"><Avatar name={n.ownerName} size="xs" /><span className="note-date">{n.ownerName} paylaştı</span></span>
          )}
        </footer>
      </article>
    );
  };

  async function askRemove(n: Note) {
    if (await confirm.ask({ title: 'Not silinsin mi?', body: `“${n.title || 'Başlıksız not'}” kalıcı olarak silinecek.`, ok: 'Sil', danger: true })) remove(n);
  }

  return (
    <>
      <TopBar title="Notlar" icon="note" />
      <main className="page">
        <PageHead
          title="Notlar"
          desc={list?.length ? `${list.length} not${list.some((n) => n.ownerId !== me) ? ' · seninle paylaşılanlar dahil' : ''}` : ' '}
          actions={
            <>
              <div className="input-icon" style={{ width: 260, maxWidth: '100%' }}>
                <Icon name="search" size={16} />
                <input placeholder="Notlarda ara" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" size={16} />Yeni not</button>
            </>
          }
        />
        <ErrorText>{error}</ErrorText>
        {!list ? (
          <div className="notes-grid">{[120, 180, 140, 200].map((h, i) => <Skeleton key={i} h={h} r={16} />)}</div>
        ) : !matched.length ? (
          list.length ? (
            <Empty icon="search" title="Sonuç yok">“{q}” için not bulunamadı.</Empty>
          ) : (
            <Empty icon="note" title="Henüz not yok" action={<button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" size={16} />İlk notunu yaz</button>}>
              Aklına gelen her şeyi yaz; renklendir, sabitle, istediğinle paylaş.
            </Empty>
          )
        ) : (
          <div className="stack xl">
            {pinned.length > 0 && (
              <section>
                <div className="section-title"><Icon name="pin" size={13} />Sabitlenenler</div>
                <div className="notes-grid">{pinned.map(card)}</div>
              </section>
            )}
            {others.length > 0 && (
              <section>
                {pinned.length > 0 && <div className="section-title">Diğer notlar</div>}
                <div className="notes-grid">{others.map(card)}</div>
              </section>
            )}
          </div>
        )}
      </main>
      {editing && <NoteEditor note={editing === 'new' ? null : editing} readOnly={editing !== 'new' && editing.ownerId !== me} onSave={save} onClose={() => setEditing(null)} />}
      {sharing && (
        <ShareDialog
          title={sharing.title || 'Not'}
          sharedWith={sharing.sharedWith}
          people={people}
          me={me}
          onClose={() => setSharing(null)}
          onSave={async (ids) => {
            const row = await notes.update(sharing.id, { sharedWith: ids.join(',') });
            setList((l) => l?.map((x) => (x.id === row.id ? row : x)) ?? l);
          }}
        />
      )}
      {confirm.view}
    </>
  );
}

function NoteEditor({ note, readOnly, onSave, onClose }: { note: Note | null; readOnly: boolean; onSave: (n: Partial<Note>) => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [color, setColor] = useState(note?.color ?? COLORS[0]);
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    setBusy(true);
    onSave({ id: note?.id, title, body, color, pinned })
      .then(onClose)
      .catch((e) => {
        setError(errorText(e));
        setBusy(false);
      });
  };

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal note-editor ${tone(color)}`} role="dialog" aria-modal="true">
        {readOnly && (
          <div className="note-readonly"><Icon name="eye" size={14} />Salt okunur · {note?.ownerName} paylaştı</div>
        )}
        <input className="note-title-input" placeholder="Başlık" value={title} readOnly={readOnly} onChange={(e) => setTitle(e.target.value)} autoFocus={!readOnly && !note} />
        <textarea className="note-body-input" placeholder="Bir şeyler yaz…" value={body} readOnly={readOnly} onChange={(e) => setBody(e.target.value)} autoFocus={!readOnly && !!note} />
        {error && <div style={{ padding: '0 20px' }}><ErrorText>{error}</ErrorText></div>}
        <div className="note-toolbar">
          {!readOnly && (
            <>
              <div className="note-swatches" role="radiogroup" aria-label="Renk">
                {COLORS.map((c, i) => (
                  <button key={c} type="button" role="radio" aria-checked={c === color} title={COLOR_NAMES[c]} className={`swatch tone-${i} ${c === color ? 'on' : ''}`} onClick={() => setColor(c)} />
                ))}
              </div>
              <button type="button" className={`icon-btn ${pinned ? 'pinned' : ''}`} title={pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'} onClick={() => setPinned(!pinned)} aria-pressed={pinned}>
                <Icon name="pin" size={17} />
              </button>
            </>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>{readOnly ? 'Kapat' : 'Vazgeç'}</button>
          {!readOnly && <button className="btn primary" disabled={busy} onClick={submit}>Kaydet</button>}
        </div>
      </div>
    </div>
  );
}
