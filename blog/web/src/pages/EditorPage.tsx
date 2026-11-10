// Yazı düzenleyici: yalnız editor rolü. GridBase de aynı kuralı uygular (posts yazma: RoleBased editor):
// rolü olmayan biri bu sayfayı açsa bile kayıt 403 döner.
import { useEffect, useState, type FormEvent } from 'react';
import { categories, posts, slugify, type Category, type Post } from '../data';
import { hasRole, nameOf, useAuth } from '../shared/auth';
import { errorText, gb } from '../shared/gridbase';
import { Icon } from '../shared/icons';
import { Empty, ErrorText, GbImage, Spinner, navigate, useConfirm } from '../shared/ui';

type Draft = Omit<Post, 'id'>;
const blank: Draft = {
  title: '', slug: '', excerpt: '', body: '', coverImage: null, categoryId: null,
  authorId: null, authorName: null, published: false, publishedAt: null,
};

export function EditorPage({ id }: { id: number | null }) {
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft | null>(id ? null : blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    categories.list({ sort: 'name:asc' }).then(setCats);
    if (id) posts.get(id).then((p) => setDraft(p ? { ...blank, ...p } : blank));
  }, [id]);

  if (!hasRole(user, 'editor')) {
    return (
      <main className="page narrow">
        <Empty icon="lock" title="Editor rolü gerekiyor">
          Panel › Kullanıcılar ve roller › kullanıcıya editor rolünü ver, sonra çıkış yapıp yeniden gir.
        </Empty>
      </main>
    );
  }
  if (!draft) return <Spinner />;
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      set({ coverImage: await gb.storage.from('covers').upload(file) });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent, publish?: boolean) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const published = publish ?? draft!.published;
      const values: Draft = {
        ...draft!,
        slug: draft!.slug || slugify(draft!.title),
        published,
        publishedAt: published ? draft!.publishedAt ?? new Date().toISOString() : draft!.publishedAt,
        authorId: draft!.authorId ?? String(user!.id),
        authorName: draft!.authorName ?? nameOf(user),
      };
      const saved = id ? await posts.update(id, values) : await posts.insert(values);
      navigate(`/post/${saved.id}`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id || !(await confirm.ask({ title: 'Yazı silinsin mi?', body: 'Yazı ve yorumları kalıcı olarak silinir.', ok: 'Sil', danger: true }))) return;
    await posts.delete(id).then(() => navigate('/mine')).catch((e) => setError(errorText(e)));
  }

  const words = (draft.body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return (
    <main className="editor">
      <div className="editor-bar">
        <a href={id ? `#/post/${id}` : '#/mine'} className="icon-btn" aria-label="Geri"><Icon name="arrowLeft" size={18} /></a>
        <span className={`badge dot ${draft.published ? 'ok' : 'warn'}`}>{draft.published ? 'Yayında' : 'Taslak'}</span>
        <span className="faint small hide-sm">{words} kelime</span>
        <span className="spacer" />
        {id && <button type="button" className="btn sm ghost danger" onClick={remove}><Icon name="trash" size={14} /><span className="hide-sm">Sil</span></button>}
        <button type="button" className="btn sm" disabled={busy} onClick={(e) => save(e, false)}>{draft.published ? 'Taslağa al' : 'Taslak kaydet'}</button>
        <button type="button" className="btn sm primary" disabled={busy || !draft.title.trim()} onClick={(e) => save(e, true)}>{draft.published ? 'Güncelle' : 'Yayınla'}</button>
      </div>
      <form className="editor-grid" onSubmit={(e) => save(e)}>
        <div className="editor-doc">
          {error && <ErrorText>{error}</ErrorText>}
          <textarea
            className="editor-title"
            rows={1}
            placeholder="Başlık"
            required
            value={draft.title}
            onChange={(e) => {
              set({ title: e.target.value });
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
          <input className="editor-excerpt" placeholder="Kısa bir özet (listede ve yazının başında görünür)" value={draft.excerpt ?? ''} onChange={(e) => set({ excerpt: e.target.value })} />
          <textarea className="editor-body" placeholder={'Yazmaya başla…\n\nBoş satır yeni paragraf, "## " ile başlayan satır ara başlık olur.'} value={draft.body ?? ''} onChange={(e) => set({ body: e.target.value })} />
        </div>
        <aside className="editor-side">
          <div className="card stack">
            <div className="section-title" style={{ margin: 0 }}>Kapak</div>
            <label className="cover-pick">
              {draft.coverImage ? <GbImage name={draft.coverImage} alt="" className="cover-prev" /> : <span className="cover-empty"><Icon name="image" size={22} /><span className="small">Resim seç</span></span>}
              <input type="file" accept="image/*" hidden onChange={(e) => uploadCover(e.target.files?.[0])} />
              {busy && <span className="cover-busy"><span className="spinner" /></span>}
            </label>
            {draft.coverImage && <button type="button" className="btn sm ghost" onClick={() => set({ coverImage: null })}>Kapağı kaldır</button>}
          </div>
          <div className="card stack">
            <div className="section-title" style={{ margin: 0 }}>Ayarlar</div>
            <label>
              Kategori
              <select value={draft.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Kategorisiz</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              Kısa adres
              <div className="input-icon">
                <Icon name="link" size={15} />
                <input placeholder={slugify(draft.title) || 'otomatik'} value={draft.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} />
              </div>
            </label>
          </div>
        </aside>
      </form>
      {confirm.view}
    </main>
  );
}
