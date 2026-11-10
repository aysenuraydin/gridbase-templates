// ════════════════════════════════════════════════════════════════
//  Todo ekranı. GridBase'te:
//    gb.from('todos').list / insert / update / delete   → satırlar (yalnız kendi satırların: Owner erişimi)
//    gb.storage.from('todo-images').upload(file, …)      → resim (dosya adı satıra yazılır)
//    rt.subscribe('todos', …)                             → başka sekmedeki değişiklik anında
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Row } from '@gridbasetr/client';
import { createRealtime } from '@gridbasetr/client/realtime';
import { errorText, gb, table } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Empty, ErrorText, GbImage, Modal, PageHead, Skeleton, TopBar, timeAgo } from './shared/ui';

type Todo = Row<{ title: string; done: boolean; image: string | null; createdAt: string | null }>;
type Filter = 'all' | 'open' | 'done';

const todos = table<Omit<Todo, 'id'>>('todos');
const rt = createRealtime(gb); // ilk abonelikte bağlanır, giriş / çıkışta yeniden

export function TodoPage() {
  const [items, setItems] = useState<Todo[] | null>(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [viewing, setViewing] = useState<Todo | null>(null);

  const load = useCallback(() => todos.list({ sort: 'id:desc' }).then(setItems).catch((e) => setError(errorText(e))), []);

  useEffect(() => {
    load();
    // Olay yalnız okuyabildiğin satırlar için gelir (REST'le aynı kural). Kopup bağlanınca bir kez tazele.
    const stop = rt.subscribe<Todo>('todos', (c) => {
      setItems((list) => {
        if (!list) return list;
        if (c.type === 'delete') return list.filter((t) => t.id !== c.id);
        const row = c.row!;
        return list.some((t) => t.id === row.id) ? list.map((t) => (t.id === row.id ? row : t)) : [row, ...list];
      });
    });
    const offReconnect = rt.onReconnect(load);
    const offStatus = rt.onStatus(setLive);
    return () => {
      stop();
      offReconnect();
      offStatus();
    };
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const row = await todos.insert({ title: title.trim(), done: false, createdAt: new Date().toISOString() });
      if (file) {
        // Önce satır, sonra dosya: dosya satıra bağlanır (table + rowId), adı satıra yazılır.
        const name = await gb.storage.from('todo-images').upload(file, { table: 'todos', rowId: row.id });
        Object.assign(row, await todos.update(row.id, { image: name }));
      }
      setItems((list) => (list?.some((t) => t.id === row.id) ? list.map((t) => (t.id === row.id ? row : t)) : [row, ...(list ?? [])]));
      setTitle('');
      setFile(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(t: Todo) {
    setItems((list) => list?.map((x) => (x.id === t.id ? { ...x, done: !t.done } : x)) ?? null); // iyimser
    await todos.update(t.id, { done: !t.done }).catch((e) => {
      setError(errorText(e));
      load();
    });
  }

  async function remove(t: Todo) {
    setItems((list) => list?.filter((x) => x.id !== t.id) ?? null);
    try {
      await todos.delete(t.id);
      if (t.image) await gb.storage.remove(t.image).catch(() => undefined);
    } catch (e) {
      setError(errorText(e));
      load();
    }
  }

  const all = items ?? [];
  const shown = all.filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done));
  const openCount = all.filter((t) => !t.done).length;
  const doneCount = all.length - openCount;
  const pct = all.length ? Math.round((doneCount / all.length) * 100) : 0;
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <TopBar title="Todo" icon="listChecks" right={<span className={`live ${live ? 'on' : ''}`}>{live ? 'Canlı' : 'Bağlanıyor'}</span>} />
      <main className="page narrow">
        <PageHead
          eyebrow={today}
          title="Görevlerim"
          desc={all.length ? `${openCount} açık görev · ${doneCount} tamamlandı` : 'Bugün ne yapmak istiyorsun?'}
        />

        {all.length > 0 && (
          <div className="todo-progress">
            <div className="progress grow"><span style={{ width: `${pct}%` }} /></div>
            <span className="small muted tabular">%{pct}</span>
          </div>
        )}

        <form className="card todo-composer" onSubmit={add}>
          <span className="todo-check ghost" aria-hidden="true" />
          <input className="grow" placeholder="Yeni görev ekle…" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Görev" />
          <label className="icon-btn" title={file ? 'Resmi değiştir' : 'Resim ekle'}>
            <Icon name="paperclip" size={17} />
            <input key={file ? file.name : 'empty'} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button className="btn primary" disabled={busy || !title.trim()}>
            {busy ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Icon name="plus" size={16} />}
            <span className="hide-sm">Ekle</span>
          </button>
        </form>
        {file && (
          <div className="todo-file">
            <Icon name="image" size={15} />
            <span className="truncate">{file.name}</span>
            <button type="button" className="icon-btn sm" onClick={() => setFile(null)} aria-label="Resmi kaldır"><Icon name="x" size={14} /></button>
          </div>
        )}
        <ErrorText>{error}</ErrorText>

        <div className="row between wrap" style={{ margin: '24px 0 12px' }}>
          <div className="seg" role="tablist">
            {(['all', 'open', 'done'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}>
                {{ all: 'Hepsi', open: 'Açık', done: 'Bitti' }[f]}
                <span className="count">{{ all: all.length, open: openCount, done: doneCount }[f]}</span>
              </button>
            ))}
          </div>
        </div>

        {!items ? (
          <div className="card flush">
            {[0, 1, 2].map((i) => (
              <div key={i} className="list-item"><Skeleton h={20} w={20} r={99} /><Skeleton h={14} w={`${60 - i * 12}%`} /></div>
            ))}
          </div>
        ) : !shown.length ? (
          <Empty icon={items.length ? 'checkCircle' : 'listChecks'} title={items.length ? 'Burada görev yok' : 'Henüz görev yok'}>
            {items.length ? (filter === 'open' ? 'Hepsini bitirmişsin, tebrikler.' : 'Bu süzgeçte gösterilecek görev yok.') : 'İlk görevini yukarıdaki kutudan ekle.'}
          </Empty>
        ) : (
          <div className="card flush">
            <div className="list">
              {shown.map((t) => (
                <div key={t.id} className={`list-item todo-item ${t.done ? 'done' : ''}`}>
                  <button className={`todo-check ${t.done ? 'on' : ''}`} onClick={() => toggle(t)} aria-label={t.done ? 'Açık yap' : 'Bitti'} aria-pressed={t.done}>
                    {t.done && <Icon name="check" size={13} strokeWidth={3} />}
                  </button>
                  <div className="grow">
                    <div className="todo-title">{t.title}</div>
                    {t.createdAt && <div className="faint xs">{timeAgo(t.createdAt)}</div>}
                  </div>
                  {t.image && (
                    <button className="todo-thumb" onClick={() => setViewing(t)} aria-label="Resmi aç">
                      <GbImage name={t.image} alt="" className="thumb sm" />
                    </button>
                  )}
                  <button className="icon-btn danger hover-reveal" title="Sil" onClick={() => remove(t)}><Icon name="trash" size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="callout" style={{ marginTop: 20 }}>
          <Icon name="zap" size={16} />
          <span>Aynı hesapla ikinci bir sekme aç: birinde yaptığın değişiklik diğerinde anında görünür.</span>
        </p>
      </main>
      {viewing?.image && (
        <Modal title={viewing.title} icon="image" onClose={() => setViewing(null)} size="lg">
          <GbImage name={viewing.image} alt={viewing.title} className="todo-full" />
        </Modal>
      )}
    </>
  );
}
