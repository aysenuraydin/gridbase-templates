// Siparişlerim: yalnız kendi siparişlerin (Owner). Durum panelden değişince realtime ile güncellenir,
// "Sipariş durumu" push kuralı da bildirim gönderir (Bildirimleri aç).
import { useEffect, useState } from 'react';
import { createRealtime } from '@gridbasetr/client/realtime';
import { gb, errorText } from '../shared/gridbase';
import { useAuth } from '../shared/auth';
import { Icon } from '../shared/icons';
import { Empty, ErrorText, PageHead, Spinner, formatDate } from '../shared/ui';
import { money, orders, parseLines, type Order } from '../data';
import { NotifyButton } from '../NotifyButton';

const rt = createRealtime(gb);
export const tone: Record<string, string> = { 'Alındı': 'info', 'Hazırlanıyor': 'warn', 'Kargoda': '', 'Teslim edildi': 'ok', 'İptal': 'gray' };
const STEPS = ['Alındı', 'Hazırlanıyor', 'Kargoda', 'Teslim edildi'];
const STEP_ICON = ['checkCircle', 'package', 'truck', 'home'] as const;

export function OrdersPage() {
  const [list, setList] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const me = String(user?.id ?? '');
  useEffect(() => {
    // Yalnız kendi siparişlerin: admin rolü (staffRoles) bütün siparişleri okuyabildiği için süzgeç şart.
    // Bütün siparişler Yönetim › Siparişler'de.
    if (!me) return; // çıkış yaparken istek atma
    orders.list({ sort: 'id:desc', filter: `ownerId:eq:${me}` }).then(setList).catch((e) => setError(errorText(e)));
    return rt.subscribe<Order>('orders', (c) =>
      setList((l) => {
        if (!l) return l;
        if (c.type === 'delete') return l.filter((x) => x.id !== c.id);
        return l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c.row! : x)) : [c.row!, ...l];
      }),
      { filter: { ownerId: me } },
    );
  }, [me]);
  return (
    <main className="page medium">
      <PageHead title="Siparişlerim" desc="Durum değişince burada anında güncellenir." actions={<NotifyButton />} />
      <ErrorText>{error}</ErrorText>
      {!list ? (
        <Spinner />
      ) : !list.length ? (
        <Empty icon="package" title="Henüz siparişin yok" action={<a className="btn primary" href="#/">Alışverişe başla</a>}>Verdiğin siparişler ve kargo durumları burada görünür.</Empty>
      ) : (
        <div className="stack lg">
          {list.map((o) => {
            const step = STEPS.indexOf(o.status);
            return (
              <article key={o.id} className="card flush order">
                <header className="order-head">
                  <div>
                    <div className="strong">Sipariş #{o.id}</div>
                    <div className="muted small">{formatDate(o.createdAt)} · {o.paymentMethod}</div>
                  </div>
                  <span className={`badge dot ${tone[o.status] ?? ''}`}>{o.status}</span>
                </header>
                {o.status !== 'İptal' && (
                  <ol className="tracker">
                    {STEPS.map((s, i) => (
                      <li key={s} className={i <= step ? 'done' : ''}>
                        <span className="dot"><Icon name={STEP_ICON[i]!} size={14} /></span>
                        <span className="label">{s}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="order-body">
                  <div className="stack sm grow">
                    {parseLines(o).map((l) => (
                      <div key={l.productId} className="row between small">
                        <span><span className="muted tabular">{l.quantity} ×</span> {l.name}</span>
                        <span className="tabular">{money(l.price * l.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <footer className="order-foot">
                  <span className="row sm top muted small grow" style={{ whiteSpace: 'pre-wrap' }}><Icon name="mapPin" size={15} style={{ marginTop: 2 }} />{o.address}</span>
                  <span className="order-total">{money(o.total)}</span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
