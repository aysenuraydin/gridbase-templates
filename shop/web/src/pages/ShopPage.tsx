// Katalog: girişsiz de çalışır. Yalnız aktif ürünler; kategori ve arama (GridBase'in search parametresi).
import { useEffect, useState } from 'react';
import { useAuth } from '../shared/auth';
import { errorText } from '../shared/gridbase';
import { Icon } from '../shared/icons';
import { Empty, ErrorText, GbImage, Skeleton } from '../shared/ui';
import { addToCart, categories, goLogin, money, products, type Category, type Product } from '../data';

export function ShopPage({ category }: { category: string | null }) {
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [list, setList] = useState<Product[] | null>(null);
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = cats.find((c) => c.slug === category) ?? null;

  useEffect(() => {
    categories.list({ sort: 'name:asc' }).then(setCats).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (category && !current) return;
    const filter = ['active:eq:true'];
    if (current) filter.push(`categoryId:eq:${current.id}`);
    const t = setTimeout(() => {
      products
        .list({ filter, sort: 'id:asc', search: q.trim() || undefined, searchFields: q.trim() ? ['name', 'description'] : undefined })
        .then(setList)
        .catch((e) => setError(errorText(e)));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [category, current, q]);

  async function add(p: Product) {
    if (!user) return goLogin();
    try {
      await addToCart(p.id);
      setAdded(p.id);
      setTimeout(() => setAdded(null), 1500);
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <main className="page">
      {!current && !q && (
        <section className="shop-hero">
          <div>
            <span className="eyebrow">Yeni sezon</span>
            <h1>Günlük hayat için<br />iyi tasarlanmış şeyler.</h1>
            <p>Ücretsiz kargo, kapıda ödeme ve 14 gün içinde kolay iade.</p>
          </div>
          <div className="shop-perks">
            <span><Icon name="truck" size={18} />Ücretsiz kargo</span>
            <span><Icon name="wallet" size={18} />Kapıda ödeme</span>
            <span><Icon name="refresh" size={18} />14 gün iade</span>
          </div>
        </section>
      )}
      <div className="shop-bar">
        <nav className="pills" aria-label="Kategoriler">
          <a href="#/" className={`pill ${current ? '' : 'on'}`}>Hepsi</a>
          {cats.map((c) => <a key={c.id} href={`#/c/${c.slug}`} className={`pill ${current?.id === c.id ? 'on' : ''}`}>{c.name}</a>)}
        </nav>
        <div className="input-icon shop-search">
          <Icon name="search" size={16} />
          <input placeholder="Ürün ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {current && <h1 style={{ marginBottom: 20 }}>{current.name}</h1>}
      <ErrorText>{error}</ErrorText>
      {!list ? (
        <div className="products">{[0, 1, 2, 3].map((i) => <div key={i} className="stack sm"><div className="skeleton" style={{ aspectRatio: '1', borderRadius: 16 }} /><Skeleton h={14} w="70%" /><Skeleton h={14} w="30%" /></div>)}</div>
      ) : !list.length ? (
        <Empty icon="search" title="Ürün bulunamadı">{q ? `“${q}” için sonuç yok. Başka bir şey dene.` : 'Bu kategoride henüz ürün yok.'}</Empty>
      ) : (
        <div className="products">
          {list.map((p) => (
            <div key={p.id} className="product">
              <a href={`#/p/${p.id}`} className="product-media">
                <GbImage name={p.image} alt={p.name} className="product-img" />
                {!p.stock && <span className="product-flag">Tükendi</span>}
                {!!p.stock && p.stock <= 5 && <span className="product-flag warn">Son {p.stock} ürün</span>}
              </a>
              <div className="product-info">
                <a href={`#/p/${p.id}`} className="product-name">{p.name}</a>
                <div className="row between">
                  <span className="price">{money(p.price)}</span>
                  <button className={`btn sm ${added === p.id ? 'soft' : 'primary'} product-add`} disabled={!p.stock} onClick={() => add(p)} aria-label="Sepete ekle">
                    <Icon name={added === p.id ? 'check' : 'plus'} size={15} strokeWidth={2.4} />
                    <span>{added === p.id ? 'Eklendi' : p.stock ? 'Sepete ekle' : 'Tükendi'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
