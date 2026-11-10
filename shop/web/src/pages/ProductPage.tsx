// Ürün + yorumlar. Yorum yazmak girişli kullanıcıya açık.
import { useEffect, useState, type FormEvent } from 'react';
import { nameOf, useAuth } from '../shared/auth';
import { GridBaseError } from '@gridbasetr/client';
import { errorText } from '../shared/gridbase';
import { Icon } from '../shared/icons';
import { Avatar, Back, Empty, ErrorText, GbImage, Spinner, formatDate } from '../shared/ui';
import { addToCart, goLogin, money, products, reviews, type Product, type Review } from '../data';

const Stars = ({ n, size = 15 }: { n: number; size?: number }) => (
  <span className="stars" aria-label={`5 üzerinden ${n.toFixed(1)}`}>
    {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} fill={i <= Math.round(n)} className={i <= Math.round(n) ? 'on' : ''} />)}
  </span>
);

export function ProductPage({ id }: { id: number }) {
  const { user } = useAuth();
  const [p, setP] = useState<Product | null | undefined>(undefined);
  const [list, setList] = useState<Review[]>([]);
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    products.get(id).then(setP).catch(() => setP(null));
    reviews.list({ filter: `productId:eq:${id}`, sort: 'id:desc' }).then(setList).catch(() => undefined);
  }, [id]);

  if (p === undefined) return <Spinner />;
  if (!p || !p.active) return <main className="page narrow"><Empty icon="package" title="Ürün bulunamadı" action={<a className="btn" href="#/">Alışverişe dön</a>}>Satıştan kalkmış olabilir.</Empty></main>;
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const mine = user ? list.some((r) => r.ownerId === String(user.id)) : false;

  async function review(e: FormEvent) {
    e.preventDefault();
    setReviewError(null);
    try {
      const r = await reviews.insert({ productId: id, rating, body, authorName: nameOf(user), createdAt: new Date().toISOString() });
      setList((l) => [r, ...l]);
      setBody('');
    } catch (err) {
      // Ürün başına kişi başı tek yorum (sunucu 409 verir)
      setReviewError(err instanceof GridBaseError && err.status === 409 ? 'Bu ürüne zaten yorum yaptın.' : errorText(err));
    }
  }

  return (
    <main className="page">
      <Back href="#/">Bütün ürünler</Back>
      <div className="product-detail">
        <div className="product-gallery"><GbImage name={p.image} alt={p.name} className="product-img" /></div>
        <div className="product-buy">
          <h1>{p.name}</h1>
          {list.length > 0 && (
            <a href="#reviews" className="row sm rating-link" onClick={(e) => { e.preventDefault(); document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <Stars n={avg} /><span className="small muted">{avg.toFixed(1)} · {list.length} yorum</span>
            </a>
          )}
          <div className="price lg">{money(p.price)}</div>
          {p.description && <p className="product-desc">{p.description}</p>}
          <div className={`stock ${p.stock ? (p.stock <= 5 ? 'low' : 'ok') : 'out'}`}>
            {p.stock ? (p.stock <= 5 ? `Son ${p.stock} adet` : 'Stokta var') : 'Tükendi'}
          </div>
          <div className="buy-row">
            <div className="stepper">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Azalt" disabled={qty <= 1}><Icon name="minus" size={15} /></button>
              <input type="number" min={1} max={p.stock ?? 99} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} aria-label="Adet" />
              <button type="button" onClick={() => setQty(Math.min(p.stock ?? 99, qty + 1))} aria-label="Arttır"><Icon name="plus" size={15} /></button>
            </div>
            <button
              className="btn primary lg grow"
              disabled={!p.stock}
              onClick={() => (user ? addToCart(p.id, qty).then(() => setMsg('Sepete eklendi.')).catch((e) => setMsg(errorText(e))) : goLogin())}
            >
              <Icon name="bag" size={18} />Sepete ekle
            </button>
          </div>
          {msg && (
            <div className="callout ok row between">
              <span className="row sm"><Icon name="checkCircle" size={16} />{msg}</span>
              <a href="#/cart" className="strong small">Sepete git →</a>
            </div>
          )}
          <ul className="perks">
            <li><Icon name="truck" size={17} />Ücretsiz kargo, 2–4 iş günü</li>
            <li><Icon name="wallet" size={17} />Kapıda ödeme</li>
            <li><Icon name="refresh" size={17} />14 gün içinde ücretsiz iade</li>
          </ul>
        </div>
      </div>

      <section className="reviews" id="reviews">
        <div className="reviews-summary">
          <h2>Yorumlar</h2>
          {list.length ? (
            <div className="row">
              <span className="big-rating">{avg.toFixed(1)}</span>
              <div className="stack sm"><Stars n={avg} size={17} /><span className="muted small">{list.length} değerlendirme</span></div>
            </div>
          ) : (
            <p className="muted small">Henüz yorum yok.</p>
          )}
          {!user ? (
            <button className="btn" onClick={goLogin}>Yorum için giriş yap</button>
          ) : mine ? (
            <p className="faint small">Bu ürüne yorum yaptın, teşekkürler.</p>
          ) : (
            <form className="card stack" onSubmit={review}>
              <div className="field">
                <span>Puanın</span>
                <div className="star-input" onMouseLeave={() => setHover(0)} role="radiogroup">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} yıldız`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
                      <Icon name="star" size={24} fill={n <= (hover || rating)} className={n <= (hover || rating) ? 'on' : ''} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea required placeholder="Ürün hakkında düşüncen" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 90 }} />
              <ErrorText>{reviewError}</ErrorText>
              <button className="btn primary">Yorumu gönder</button>
            </form>
          )}
        </div>
        <div className="review-list">
          {list.map((r) => (
            <div key={r.id} className="review">
              <div className="row">
                <Avatar name={r.authorName} size="sm" />
                <div className="grow">
                  <div className="strong small">{r.authorName}</div>
                  <div className="faint xs">{formatDate(r.createdAt)}</div>
                </div>
                <Stars n={r.rating} size={14} />
              </div>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
