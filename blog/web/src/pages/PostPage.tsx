// Yazı + yorumlar. Yorum yazmak girişli kullanıcıya açık; postAuthorId yazının yazarına bildirim için
// (GridBase'in "Yeni yorum" push kuralı bu kolondaki kişiye gönderir; yorumu yazan kendine bildirim almaz).
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { comments, goLogin, posts, type Comment, type Post } from '../data';
import { hasRole, nameOf, useAuth } from '../shared/auth';
import { errorText } from '../shared/gridbase';
import { Icon } from '../shared/icons';
import { Avatar, Back, Empty, ErrorText, GbImage, Spinner, formatDate, timeAgo } from '../shared/ui';

export function PostPage({ id }: { id: number }) {
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [list, setList] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    posts.get(id).then(setPost).catch(() => setPost(null));
    comments.list({ filter: `postId:eq:${id}`, sort: 'id:asc' }).then(setList).catch(() => undefined);
  }, [id]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !user || !post) return;
    setBusy(true);
    setError(null);
    try {
      const c = await comments.insert({
        postId: post.id,
        body: body.trim(),
        authorName: nameOf(user),
        postAuthorId: post.authorId,
        createdAt: new Date().toISOString(),
      });
      setList((l) => [...l, c]);
      setBody('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Comment) {
    await comments.delete(c.id).then(() => setList((l) => l.filter((x) => x.id !== c.id))).catch((e) => setError(errorText(e)));
  }

  if (post === undefined) return <Spinner />;
  if (!post || (!post.published && !hasRole(user, 'editor')))
    return <main className="page narrow"><Empty icon="book" title="Yazı bulunamadı" action={<a className="btn" href="#/">Yazılara dön</a>}>Kaldırılmış ya da henüz yayınlanmamış olabilir.</Empty></main>;
  const minutes = Math.max(1, Math.round((post.body ?? '').split(/\s+/).length / 200));

  return (
    <main className="page article-page">
      <Back href="#/">Bütün yazılar</Back>
      <article className="article">
        <header className="article-head">
          <div className="row sm wrap">
            {!post.published && <span className="badge warn dot">Taslak</span>}
            <span className="faint small">{minutes} dk okuma</span>
          </div>
          <h1>{post.title}</h1>
          {post.excerpt && <p className="lede">{post.excerpt}</p>}
          <div className="row between wrap">
            <div className="row">
              <Avatar name={post.authorName} size="md" />
              <div>
                <div className="strong">{post.authorName}</div>
                <div className="muted small">{formatDate(post.publishedAt) || 'Yayında değil'}</div>
              </div>
            </div>
            {hasRole(user, 'editor') && <a className="btn sm" href={`#/write/${post.id}`}><Icon name="pencil" size={14} />Düzenle</a>}
          </div>
        </header>
        {post.coverImage && <GbImage name={post.coverImage} alt="" className="article-cover" />}
        <Body text={post.body ?? ''} />
      </article>

      <section className="comments" id="yorumlar">
        <h2>Yorumlar <span className="faint">{list.length}</span></h2>
        {user ? (
          <form className="comment-form" onSubmit={send}>
            <Avatar name={nameOf(user)} size="sm" />
            <div className="grow stack sm">
              <textarea placeholder="Düşüncelerini paylaş…" value={body} onChange={(e) => setBody(e.target.value)} />
              <ErrorText>{error}</ErrorText>
              <div className="row between">
                <span className="faint xs">Yazar yorumundan haberdar olur.</span>
                <button className="btn primary sm" disabled={busy || !body.trim()}><Icon name="send" size={14} />Gönder</button>
              </div>
            </div>
          </form>
        ) : (
          <div className="callout brand row between wrap">
            <span className="row sm"><Icon name="message" size={16} />Yorum yazmak için giriş yap.</span>
            <button className="btn primary sm" onClick={goLogin}>Giriş yap</button>
          </div>
        )}
        {!list.length && <p className="muted small" style={{ padding: '8px 0' }}>Henüz yorum yok. İlk yorumu sen yaz.</p>}
        <div className="comment-list">
          {list.map((c) => (
            <div key={c.id} className="comment">
              <Avatar name={c.authorName} size="sm" />
              <div className="grow">
                <div className="row sm">
                  <strong className="small">{c.authorName}</strong>
                  {c.ownerId && c.ownerId === post.authorId && <span className="badge">Yazar</span>}
                  <span className="faint xs" title={formatDate(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                </div>
                <p>{c.body}</p>
              </div>
              {user && (c.ownerId === String(user.id) || hasRole(user, 'editor')) && (
                <button className="icon-btn sm danger hover-reveal" title="Sil" onClick={() => remove(c)}><Icon name="trash" size={14} /></button>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// Basit metin: boş satır paragraf, "## " başlık. (Markdown kütüphanesi istersen buraya.)
function Body({ text }: { text: string }) {
  const blocks: ReactNode[] = text.split(/\n{2,}/).map((b, i) =>
    b.startsWith('## ') ? <h2 key={i}>{b.slice(3)}</h2> : <p key={i}>{b}</p>,
  );
  return <div className="prose">{blocks}</div>;
}
