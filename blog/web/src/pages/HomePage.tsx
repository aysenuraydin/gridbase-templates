// Ana sayfa: girişsiz de çalışır (tablolar Public okumalı). Yalnız yayındaki yazılar, kategoriye göre süzülür.
import { useEffect, useState } from 'react';
import { CARD_FIELDS, categories, posts, type Category, type Post } from '../data';
import { errorText } from '../shared/gridbase';
import { Icon } from '../shared/icons';
import { Avatar, Empty, ErrorText, GbImage, Skeleton, formatDate } from '../shared/ui';

export function HomePage({ category }: { category: string | null }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [list, setList] = useState<Post[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categories.list({ sort: 'name:asc' }).then(setCats).catch(() => undefined);
  }, []);

  const current = cats.find((c) => c.slug === category) ?? null;

  useEffect(() => {
    if (category && !current) return; // kategoriler yüklenince
    setList(null);
    const filter = ['published:eq:true'];
    if (current) filter.push(`categoryId:eq:${current.id}`);
    posts
      .paged({ filter, sort: 'publishedAt:desc', select: CARD_FIELDS, page, size: 9 })
      .then((r) => {
        setList(r.data);
        setPages(r.totalPages || 1);
      })
      .catch((e) => setError(errorText(e)));
  }, [category, current, page]);

  const catName = (id: number | null) => cats.find((c) => c.id === id)?.name;
  const featured = !current && page === 1 && list && list.length > 2 ? list[0] : null;
  const rest = featured ? list!.slice(1) : list ?? [];

  return (
    <main className="page">
      <header className="blog-hero">
        <span className="eyebrow">{current ? 'Kategori' : 'Blog'}</span>
        <h1>{current ? current.name : 'Fikirler, notlar ve hikâyeler'}</h1>
        <p>{current ? `${current.name} kategorisindeki yazılar.` : 'Herkes okur, editörler yazar. Yorum için giriş yapman yeter.'}</p>
      </header>
      <nav className="pills blog-cats" aria-label="Kategoriler">
        <a href="#/" className={`pill ${current ? '' : 'on'}`} onClick={() => setPage(1)}>Hepsi</a>
        {cats.map((c) => (
          <a key={c.id} href={`#/c/${c.slug}`} className={`pill ${current?.id === c.id ? 'on' : ''}`} onClick={() => setPage(1)}>{c.name}</a>
        ))}
      </nav>
      <ErrorText>{error}</ErrorText>
      {!list ? (
        <div className="post-grid">{[0, 1, 2].map((i) => <div key={i} className="stack"><Skeleton h={190} r={14} /><Skeleton h={12} w="30%" /><Skeleton h={20} w="80%" /><Skeleton h={12} /></div>)}</div>
      ) : !list.length ? (
        <Empty icon="book" title="Henüz yazı yok">{current ? 'Bu kategoride yayında yazı yok.' : 'Editörler yazı yayınlayınca burada görünür.'}</Empty>
      ) : (
        <>
          {featured && (
            <a href={`#/post/${featured.id}`} className="post-card featured">
              <GbImage name={featured.coverImage} alt="" className="cover" />
              <div className="post-meta-wrap">
                {catName(featured.categoryId) && <span className="eyebrow">{catName(featured.categoryId)}</span>}
                <h2>{featured.title}</h2>
                {featured.excerpt && <p className="excerpt">{featured.excerpt}</p>}
                <Byline name={featured.authorName} date={featured.publishedAt} />
              </div>
            </a>
          )}
          <div className="post-grid">
            {rest.map((p) => (
              <a key={p.id} href={`#/post/${p.id}`} className="post-card">
                <GbImage name={p.coverImage} alt="" className="cover" />
                <div className="post-meta-wrap">
                  {catName(p.categoryId) && <span className="eyebrow">{catName(p.categoryId)}</span>}
                  <h3>{p.title}</h3>
                  {p.excerpt && <p className="excerpt clamp-2">{p.excerpt}</p>}
                  <Byline name={p.authorName} date={p.publishedAt} />
                </div>
              </a>
            ))}
          </div>
        </>
      )}
      {pages > 1 && (
        <div className="pager">
          <button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon name="chevronLeft" size={15} />Önceki</button>
          <span className="info">{page} / {pages}</span>
          <button className="btn sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sonraki<Icon name="chevronRight" size={15} /></button>
        </div>
      )}
    </main>
  );
}

export const Byline = ({ name, date }: { name: string | null; date: string | null }) => (
  <div className="byline">
    <Avatar name={name} size="xs" />
    <span className="strong">{name}</span>
    <span className="faint">·</span>
    <span>{formatDate(date)}</span>
  </div>
);
