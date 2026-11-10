// Sepet + ödeme (demo: yalnız kapıda ödeme). Sipariş satırları ve toplam istemcide hesaplanıp orders'a yazılır.
// GridBase'te sunucu fonksiyonu olmadığı için fiyatı sunucu doğrulamaz: gerçek satışta ödeme sağlayıcısının
// (iyzico vb.) sunucu tarafında tutarı kendi kayıtlarından hesaplaman gerekir (README › Canlıya almadan önce).
import { useEffect, useState } from 'react';
import { useAuth } from '../shared/auth';
import { errorText } from '../shared/gridbase';
import { Icon } from '../shared/icons';
import { Empty, ErrorText, GbImage, PageHead, Spinner, navigate } from '../shared/ui';
import { addresses, cart, goLogin, money, orders, products, type Address, type CartItem, type OrderLine, type Product } from '../data';

const blankAddress = { title: 'Ev', fullName: '', phone: '', city: '', district: '', line: '' };

export function CartPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [byId, setById] = useState<Map<number, Product>>(new Map());
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [addrId, setAddrId] = useState<number | 'new' | null>(null);
  const [addr, setAddr] = useState(blankAddress);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const list = await cart.list();
      const ids = [...new Set(list.map((x) => x.productId))];
      const ps = ids.length ? await products.list({ filter: `id:in:${ids.join(',')}` }) : [];
      setById(new Map(ps.map((p) => [p.id, p])));
      setItems(list);
      const a = await addresses.list();
      setAddrs(a);
      setAddrId(a[0]?.id ?? 'new');
    })().catch((e) => setError(errorText(e)));
  }, [user]);

  if (!user) return <main className="page narrow"><Empty icon="bag" title="Sepetini görmek için giriş yap" action={<button className="btn primary" onClick={goLogin}>Giriş yap</button>}>Sepetin her cihazda seninle.</Empty></main>;
  if (!items) return <Spinner />;

  const lines: OrderLine[] = items
    .filter((i) => byId.has(i.productId))
    .map((i) => ({ productId: i.productId, name: byId.get(i.productId)!.name, price: byId.get(i.productId)!.price, quantity: i.quantity }));
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  async function setQty(i: CartItem, q: number) {
    if (q <= 0) {
      await cart.delete(i.id);
      setItems((l) => l!.filter((x) => x.id !== i.id));
    } else {
      const row = await cart.update(i.id, { quantity: q });
      setItems((l) => l!.map((x) => (x.id === i.id ? row : x)));
    }
    window.dispatchEvent(new Event('cart-changed'));
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      let a: Address | undefined = addrs.find((x) => x.id === addrId);
      if (addrId === 'new') {
        if (!addr.fullName || !addr.phone || !addr.city || !addr.line) throw new Error('Adresi eksiksiz doldur.');
        a = await addresses.insert(addr);
      }
      if (!a) throw new Error('Bir adres seç.');
      await orders.insert({
        items: JSON.stringify(lines),
        total,
        status: 'Alındı',
        address: `${a.fullName} · ${a.phone}\n${a.line}\n${a.district} / ${a.city}`,
        paymentMethod: 'Kapıda ödeme',
        note: note || null,
        createdAt: new Date().toISOString(),
      });
      await Promise.all(items!.map((i) => cart.delete(i.id)));
      window.dispatchEvent(new Event('cart-changed'));
      navigate('/orders');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (!lines.length) return <main className="page narrow"><Empty icon="bag" title="Sepetin boş" action={<a className="btn primary" href="#/">Alışverişe başla</a>}>Beğendiğin ürünleri sepete ekle, burada görünsün.</Empty></main>;

  const count = lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <main className="page">
      <PageHead title="Sepet" desc={`${count} ürün`} />
      <div className="checkout">
        <div className="stack lg">
          <div className="card flush">
            <div className="list">
              {items.filter((i) => byId.has(i.productId)).map((i) => {
                const p = byId.get(i.productId)!;
                return (
                  <div key={i.id} className="list-item cart-line">
                    <a href={`#/p/${p.id}`}><GbImage name={p.image} alt="" className="thumb lg" /></a>
                    <div className="grow">
                      <a href={`#/p/${p.id}`} className="strong" style={{ color: 'var(--ink)' }}>{p.name}</a>
                      <div className="muted small">{money(p.price)}</div>
                    </div>
                    <div className="stepper sm">
                      <button onClick={() => setQty(i, i.quantity - 1)} aria-label={i.quantity === 1 ? 'Kaldır' : 'Azalt'}><Icon name={i.quantity === 1 ? 'trash' : 'minus'} size={14} /></button>
                      <span className="tabular">{i.quantity}</span>
                      <button onClick={() => setQty(i, i.quantity + 1)} aria-label="Arttır"><Icon name="plus" size={14} /></button>
                    </div>
                    <strong className="line-total tabular">{money(p.price * i.quantity)}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card stack">
            <h2 className="row sm"><Icon name="mapPin" size={18} />Teslimat adresi</h2>
            <div className="addr-grid">
              {addrs.map((a) => (
                <label key={a.id} className={`addr ${addrId === a.id ? 'on' : ''}`}>
                  <input type="radio" name="addr" checked={addrId === a.id} onChange={() => setAddrId(a.id)} />
                  <span className="stack sm" style={{ gap: 2 }}>
                    <strong>{a.title}</strong>
                    <span className="muted small">{a.fullName} · {a.phone}</span>
                    <span className="muted small">{a.line}, {a.district} / {a.city}</span>
                  </span>
                </label>
              ))}
              <label className={`addr new ${addrId === 'new' ? 'on' : ''}`}>
                <input type="radio" name="addr" checked={addrId === 'new'} onChange={() => setAddrId('new')} />
                <span className="row sm"><Icon name="plus" size={16} /><strong>Yeni adres</strong></span>
              </label>
            </div>
            {addrId === 'new' && (
              <div className="form-grid">
                {(['title', 'fullName', 'phone', 'city', 'district', 'line'] as const).map((k) => (
                  <label key={k} className={k === 'line' ? 'full' : ''}>
                    {{ title: 'Adres adı', fullName: 'Ad soyad', phone: 'Telefon', city: 'İl', district: 'İlçe', line: 'Açık adres' }[k]}
                    <input value={addr[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} placeholder={{ title: 'Ev, iş…', fullName: '', phone: '05xx xxx xx xx', city: '', district: '', line: 'Mahalle, sokak, bina, daire' }[k]} />
                  </label>
                ))}
              </div>
            )}
            <label>Sipariş notu <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kurye için not (isteğe bağlı)" /></label>
          </div>
        </div>

        <aside className="card summary stack">
          <h2>Sipariş özeti</h2>
          <div className="sum-row"><span>Ara toplam</span><span className="tabular">{money(total)}</span></div>
          <div className="sum-row"><span>Kargo</span><span className="ok-text">Ücretsiz</span></div>
          <hr />
          <div className="sum-row total"><span>Toplam</span><span className="tabular">{money(total)}</span></div>
          <div className="pay-method"><Icon name="wallet" size={18} /><div><strong className="small">Kapıda ödeme</strong><div className="faint xs">Demo: kart bilgisi istenmez, para çekilmez.</div></div></div>
          <ErrorText>{error}</ErrorText>
          <button className="btn primary lg block" disabled={busy} onClick={checkout}>{busy ? 'Sipariş veriliyor…' : 'Siparişi ver'}</button>
        </aside>
      </div>
    </main>
  );
}
