// Yönetim: ürünler (products yazma: RoleBased admin) ve siparişler (orders: owner + staffRoles admin: admin bütün
// siparişleri görür ve durumunu değiştirir, sahiplik değişmez; müşteriye "Sipariş durumu" bildirimi gider).
// GridBase aynı kuralları sunucuda uygular: admin olmayan bu ekranı açsa bile yalnız kendi siparişini görür.
import { useEffect, useState, type FormEvent } from 'react';
import { hasRole, useAuth } from '../shared/auth';
import { errorText, gb } from '../shared/gridbase';
import { Icon } from '../shared/icons';
import { Empty, ErrorText, GbImage, Modal, PageHead, Spinner, formatShortDate } from '../shared/ui';
import { tone } from './OrdersPage';
import { STATUS, categories, money, orders, parseLines, products, type Category, type Order, type Product } from '../data';

type Draft = Omit<Product, 'id'> & { id?: number };
const blank: Draft = { name: '', description: '', price: 0, image: null, categoryId: null, stock: 0, active: true };

export function AdminPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Product[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<'orders' | 'products'>('orders');
  const [orderList, setOrderList] = useState<Order[] | null>(null);
  const load = () => products.list({ sort: 'id:desc' }).then(setList);
  const loadOrders = () => orders.list({ sort: 'id:desc' }).then(setOrderList).catch((e) => setError(errorText(e)));
  useEffect(() => {
    load();
    loadOrders();
    categories.list({ sort: 'name:asc' }).then(setCats);
  }, []);

  async function setStatus(o: Order, status: string) {
    setError(null);
    try {
      const row = await orders.update(o.id, { status }); // müşteriye bildirim: push kuralı "Sipariş durumu"
      setOrderList((l) => l?.map((x) => (x.id === row.id ? row : x)) ?? l);
    } catch (e) {
      setError(errorText(e));
    }
  }

  if (!hasRole(user, 'admin')) return <main className="page narrow"><Empty icon="lock" title="Yetkin yok">Bu sayfa mağaza yöneticisi (admin rolü) için.</Empty></main>;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const { id, ...values } = draft;
      if (id) await products.update(id, values);
      else await products.insert(values);
      setDraft(null);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file || !draft) return;
    setBusy(true);
    try {
      setDraft({ ...draft, image: await gb.storage.from('product-images').upload(file) });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const revenue = (orderList ?? []).filter((o) => o.status !== 'İptal').reduce((n, o) => n + o.total, 0);
  const waiting = (orderList ?? []).filter((o) => o.status === 'Alındı' || o.status === 'Hazırlanıyor').length;
  return (
    <main className="page">
      <PageHead
        title="Mağaza yönetimi"
        desc="Siparişleri hazırla, ürünleri düzenle. Durum değişince müşteriye bildirim gider."
        actions={tab === 'products' ? <button className="btn primary" onClick={() => setDraft({ ...blank })}><Icon name="plus" size={16} />Yeni ürün</button> : undefined}
      />
      <div className="stats">
        <div className="stat"><span className="muted small">Sipariş</span><strong className="tabular">{orderList?.length ?? '–'}</strong></div>
        <div className="stat"><span className="muted small">Bekleyen</span><strong className="tabular">{orderList ? waiting : '–'}</strong></div>
        <div className="stat"><span className="muted small">Ciro</span><strong className="tabular">{orderList ? money(revenue) : '–'}</strong></div>
        <div className="stat"><span className="muted small">Ürün</span><strong className="tabular">{list?.length ?? '–'}</strong></div>
      </div>
      <div className="seg" style={{ margin: '24px 0 16px' }}>
        <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}><Icon name="package" size={15} />Siparişler<span className="count">{orderList?.length ?? ''}</span></button>
        <button className={tab === 'products' ? 'on' : ''} onClick={() => setTab('products')}><Icon name="tag" size={15} />Ürünler<span className="count">{list?.length ?? ''}</span></button>
      </div>
      <ErrorText>{error}</ErrorText>
      {tab === 'orders' && (
        <section className="admin-orders">
          {!orderList ? (
            <Spinner />
          ) : !orderList.length ? (
            <Empty icon="package" title="Henüz sipariş yok">Müşteriler sipariş verdiğinde burada görünür.</Empty>
          ) : (
            <div className="card flush">
              <div className="list">
                {orderList.map((o) => (
                  <div key={o.id} className="list-item admin-order">
                    <span className="tile sm gray"><Icon name="package" size={16} /></span>
                    <div className="grow">
                      <div className="row sm wrap"><strong>#{o.id}</strong><span className="muted small">{formatShortDate(o.createdAt)}</span></div>
                      <div className="muted small truncate">{parseLines(o).map((l) => `${l.quantity} × ${l.name}`).join(', ')}</div>
                      <div className="faint xs truncate">{o.address.split('\n')[0]}{o.note ? ` · Not: ${o.note}` : ''}</div>
                    </div>
                    <strong className="tabular hide-sm">{money(o.total)}</strong>
                    <select className={`status-select ${tone[o.status] ?? ''}`} aria-label="Durum" value={o.status} onChange={(e) => setStatus(o, e.target.value)}>
                      {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      {tab === 'products' && (
        !list ? (
          <Spinner />
        ) : !list.length ? (
          <Empty icon="tag" title="Henüz ürün yok" action={<button className="btn primary" onClick={() => setDraft({ ...blank })}>İlk ürünü ekle</button>} />
        ) : (
          <div className="card flush">
            <div className="list">
              {list.map((p) => (
                <div key={p.id} className="list-item">
                  <GbImage name={p.image} alt="" className="thumb" />
                  <div className="grow">
                    <div className="row sm wrap"><strong className="truncate">{p.name}</strong>{!p.active && <span className="badge gray">Satışta değil</span>}</div>
                    <div className="muted small">{cats.find((c) => c.id === p.categoryId)?.name ?? 'Kategorisiz'}</div>
                  </div>
                  <span className="tabular hide-sm" style={{ width: 90, textAlign: 'right' }}>{money(p.price)}</span>
                  <span className={`badge ${!p.stock ? 'danger' : (p.stock ?? 0) <= 5 ? 'warn' : 'gray'} hide-sm`} style={{ width: 70, justifyContent: 'center' }}>{p.stock ?? 0} adet</span>
                  <button className="btn sm" onClick={() => setDraft({ ...blank, ...p })}><Icon name="pencil" size={14} /><span className="hide-sm">Düzenle</span></button>
                </div>
              ))}
            </div>
          </div>
        )
      )}
      {draft && (
        <Modal
          title={draft.id ? 'Ürünü düzenle' : 'Yeni ürün'}
          icon="tag"
          size="lg"
          onClose={() => setDraft(null)}
          footer={
            <>
              <label className="check" style={{ marginRight: 'auto' }}>
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Satışta
              </label>
              <button type="button" className="btn" onClick={() => setDraft(null)}>Vazgeç</button>
              <button className="btn primary" form="product-form" disabled={busy}>Kaydet</button>
            </>
          }
        >
          <form id="product-form" className="product-form" onSubmit={save}>
            <label className="img-pick">
              {draft.image ? <GbImage name={draft.image} alt="" className="product-img" /> : <span className="cover-empty"><Icon name="image" size={24} /><span className="small">Görsel seç</span></span>}
              <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
              {busy && <span className="img-busy"><span className="spinner" /></span>}
            </label>
            <div className="form-grid">
              <label className="full">Ad<input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
              <label>Fiyat (₺)<input type="number" min={0} step="0.01" required value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></label>
              <label>Stok<input type="number" min={0} value={draft.stock ?? 0} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} /></label>
              <label className="full">
                Kategori
                <select value={draft.categoryId ?? ''} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Kategorisiz</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="full">Açıklama<textarea value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ minHeight: 90 }} /></label>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
