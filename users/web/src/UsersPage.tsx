// Yönetici paneli: kullanıcıları ara, rol ver / al, engelle. Yalnız admin rolüne görünür; sunucu da aynı
// kuralı uygular (admin olmayan biri bu ekranı açsa bile liste 403 döner).
import { useCallback, useEffect, useState } from 'react';
import { hasRole, useAuth } from './shared/auth';
import { errorText } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, Empty, ErrorText, PageHead, Skeleton, formatShortDate } from './shared/ui';
import { ADMIN_ROLE, adminApi, type AppRole, type AppUser } from './admin';

const PAGE_SIZE = 10;

export function UsersPage() {
  const { user: me } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [data, setData] = useState<{ items: AppUser[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      adminApi
        .users(page, PAGE_SIZE, query)
        .then((r) => setData({ items: r.items, total: r.total }))
        .catch((e) => setError(errorText(e))),
    [page, query],
  );

  useEffect(() => {
    adminApi.roles().then(setRoles).catch((e) => setError(errorText(e)));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  // Yazmayı bitirince ara (her tuşta istek gitmesin).
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  if (!hasRole(me, ADMIN_ROLE)) return <main className="page narrow"><Empty icon="lock" title="Yetkin yok">Bu sayfa yalnız yöneticiler için.</Empty></main>;

  async function act(userId: number, fn: () => Promise<void>) {
    setBusy(userId);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const roleId = (name: string) => roles.find((r) => r.name.toLowerCase() === name.toLowerCase())?.id;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const grantable = roles.filter((r) => r.name.toLowerCase() !== ADMIN_ROLE);

  return (
    <main className="page">
      <PageHead
        title="Kullanıcılar"
        desc={<>{data ? `${data.total} kullanıcı` : 'Yükleniyor…'} · Yönetici rolünü yalnız geliştirici (panel) verir.</>}
        actions={
          <div className="input-icon" style={{ width: 300, maxWidth: '100%' }}>
            <Icon name="search" size={16} />
            <input placeholder="Ad ya da e-posta ara" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      />
      <ErrorText>{error}</ErrorText>
      {!data ? (
        <div className="card flush">{[0, 1, 2].map((i) => <div key={i} className="list-item"><Skeleton h={36} w={36} r={99} /><div className="grow stack sm"><Skeleton h={14} w="30%" /><Skeleton h={12} w="45%" /></div></div>)}</div>
      ) : !data.items.length ? (
        <Empty icon="search" title="Kullanıcı bulunamadı">{query ? `“${query}” ile eşleşen kimse yok.` : 'Henüz kayıtlı kullanıcı yok.'}</Empty>
      ) : (
        <div className="card flush">
          <div className="users-head">
            <span className="grow">Kullanıcı</span>
            <span className="col-roles">Roller</span>
            <span className="col-date">Katıldı</span>
            <span className="col-act" />
          </div>
          <div className="list">
            {data.items.map((u) => {
              const isAdmin = u.roles.some((r) => r.toLowerCase() === ADMIN_ROLE);
              const self = u.id === me!.id;
              const options = grantable.filter((r) => !u.roles.some((x) => x.toLowerCase() === r.name.toLowerCase()));
              return (
                <div key={u.id} className={`list-item user-row ${u.isBlocked ? 'blocked' : ''}`}>
                  <div className="grow row" style={{ minWidth: 0 }}>
                    <Avatar name={u.displayName || u.email} />
                    <div className="grow">
                      <div className="row sm wrap">
                        <strong className="truncate">{u.displayName || u.email.split('@')[0]}</strong>
                        {self && <span className="badge gray">sen</span>}
                        {u.isBlocked && <span className="badge danger dot">engelli</span>}
                      </div>
                      <div className="muted small truncate">{u.email}</div>
                    </div>
                  </div>
                  <div className="col-roles row sm wrap">
                    {u.roles.map((r) => {
                      const locked = r.toLowerCase() === ADMIN_ROLE;
                      return (
                        <span key={r} className={`chip ${locked ? '' : 'gray'}`}>
                          {locked && <Icon name="shield" size={11} />}
                          {r}
                          {!locked && (
                            <button title="Rolü al" disabled={busy === u.id} onClick={() => act(u.id, () => adminApi.removeRole(u.id, roleId(r)!))}>
                              <Icon name="x" size={11} strokeWidth={2.6} />
                            </button>
                          )}
                        </span>
                      );
                    })}
                    {options.length > 0 && (
                      <label className="role-add" title="Rol ver">
                        <Icon name="plus" size={12} strokeWidth={2.4} />
                        <span>Rol</span>
                        <select
                          aria-label="Rol ver"
                          value=""
                          disabled={busy === u.id}
                          onChange={(e) => e.target.value && act(u.id, () => adminApi.addRole(u.id, Number(e.target.value)))}
                        >
                          <option value="">Rol ver…</option>
                          {options.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                  <span className="col-date muted small">{formatShortDate(u.createdAt)}</span>
                  <div className="col-act">
                    <button
                      className={`btn sm ${u.isBlocked ? '' : 'danger'}`}
                      disabled={busy === u.id || isAdmin || self}
                      title={isAdmin || self ? 'Yönetici engellenemez' : undefined}
                      onClick={() => act(u.id, () => adminApi.setBlocked(u.id, !u.isBlocked))}
                    >
                      <Icon name={u.isBlocked ? 'check' : 'ban'} size={14} />
                      {u.isBlocked ? 'Engeli kaldır' : 'Engelle'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
