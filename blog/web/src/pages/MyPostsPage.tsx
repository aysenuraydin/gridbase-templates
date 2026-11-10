// Editör paneli: taslaklar dahil bütün yazılar.
import { useEffect, useState } from 'react';
import { CARD_FIELDS, posts, type Post } from '../data';
import { hasRole, useAuth } from '../shared/auth';
import { Icon } from '../shared/icons';
import { Empty, GbImage, PageHead, Skeleton, formatDate } from '../shared/ui';

export function MyPostsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Post[] | null>(null);
  useEffect(() => {
    posts.list({ sort: 'id:desc', select: CARD_FIELDS }).then(setList);
  }, []);
  if (!hasRole(user, 'editor')) return <main className="page narrow"><Empty icon="lock" title="Yetkin yok">Bu sayfa editörler için.</Empty></main>;
  const published = list?.filter((p) => p.published).length ?? 0;
  return (
    <main className="page medium">
      <PageHead
        title="Yazılar"
        desc={list ? `${list.length} yazı · ${published} yayında · ${list.length - published} taslak` : ' '}
        actions={<a className="btn primary" href="#/write"><Icon name="pen" size={15} />Yeni yazı</a>}
      />
      {!list ? (
        <div className="card flush">{[0, 1, 2].map((i) => <div key={i} className="list-item"><Skeleton h={48} w={80} r={8} /><div className="grow stack sm"><Skeleton h={14} w="50%" /><Skeleton h={12} w="25%" /></div></div>)}</div>
      ) : !list.length ? (
        <Empty icon="pen" title="Henüz yazı yok" action={<a className="btn primary" href="#/write">İlk yazını yaz</a>}>Taslak olarak başla, hazır olunca yayınla.</Empty>
      ) : (
        <div className="card flush">
          <div className="list">
            {list.map((p) => (
              <div key={p.id} className="list-item">
                <GbImage name={p.coverImage} alt="" className="mine-thumb" />
                <div className="grow">
                  <a href={`#/post/${p.id}`} className="strong truncate" style={{ display: 'block', color: 'var(--ink)' }}>{p.title}</a>
                  <div className="muted small">{p.published ? formatDate(p.publishedAt) : 'Henüz yayınlanmadı'}</div>
                </div>
                <span className={`badge dot ${p.published ? 'ok' : 'warn'}`}>{p.published ? 'Yayında' : 'Taslak'}</span>
                <a className="btn sm" href={`#/write/${p.id}`}><Icon name="pencil" size={14} /><span className="hide-sm">Düzenle</span></a>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
