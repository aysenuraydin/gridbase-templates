// Hesabım: rollerin. Roller token'a girişte yazılır; yönetici yeni bir rol verdiyse "Rollerimi yenile"
// token'ı yeniler (gb.auth.refresh) ve yeni rol hemen görünür. (Yönetim uçları rolü her istekte yeniden okur.)
import { useState } from 'react';
import { nameOf, useAuth } from './shared/auth';
import { errorText, gb } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, PageHead } from './shared/ui';

export function MePage() {
  const { user } = useAuth();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="page narrow">
      <PageHead title="Hesabım" desc="Profilin ve bu uygulamadaki rollerin." />
      <div className="card flush">
        <div className="me-cover" />
        <div className="card-body stack lg" style={{ paddingTop: 0 }}>
          <div className="me-id">
            <Avatar name={nameOf(user)} size="xl" className="me-avatar" />
            <div className="grow me-meta">
              <h2 style={{ fontSize: '1.3rem' }}>{nameOf(user)}</h2>
              <div className="muted small">{user?.email} · <span className="mono">#{user?.id}</span></div>
            </div>
          </div>
          <hr />
          <div className="stack sm">
            <div className="section-title" style={{ margin: 0 }}>Rollerin</div>
            <div className="row sm wrap">
              {user?.roles.length ? user.roles.map((r) => <span key={r} className="badge">{r}</span>) : <span className="muted small">Henüz bir rolün yok.</span>}
            </div>
          </div>
        </div>
        <div className="card-foot">
          {msg ? (msg.ok ? <span className="hint row sm" style={{ color: 'var(--ok)' }}><Icon name="checkCircle" size={15} />{msg.text}</span> : <span className="hint error">{msg.text}</span>) : <span className="hint">Yönetici yeni rol verdiyse yenile.</span>}
          <button
            className="btn"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              gb.auth
                .refresh()
                .then(() => setMsg({ ok: true, text: 'Roller güncellendi.' }))
                .catch((e) => setMsg({ ok: false, text: errorText(e) }))
                .finally(() => setBusy(false));
            }}
          >
            <Icon name="refresh" size={15} className={busy ? 'spin' : ''} />Rollerimi yenile
          </button>
        </div>
      </div>
    </main>
  );
}
