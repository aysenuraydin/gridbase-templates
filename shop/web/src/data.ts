// Mağaza verisi, tipler ve sepet yardımcıları.
import type { Row } from '@gridbasetr/client';
import { table } from './shared/gridbase';
import { navigate } from './shared/ui';

export type Category = Row<{ name: string; slug: string }>;
export type Product = Row<{ name: string; description: string | null; price: number; image: string | null; categoryId: number | null; stock: number | null; active: boolean }>;
export type CartItem = Row<{ productId: number; quantity: number }>;
export type Address = Row<{ title: string; fullName: string; phone: string; city: string; district: string; line: string }>;
export type OrderLine = { productId: number; name: string; price: number; quantity: number };
export type Order = Row<{ items: string; total: number; status: string; address: string; paymentMethod: string; note: string | null; createdAt: string; ownerId: string }>;
export type Review = Row<{ productId: number; rating: number; body: string; authorName: string | null; createdAt: string | null; ownerId: string | null }>; // ownerId: yazan (GridBase damgalar)

export const categories = table<Omit<Category, 'id'>>('categories');
export const products = table<Omit<Product, 'id'>>('products');
export const cart = table<Omit<CartItem, 'id'>>('cart_items');
export const addresses = table<Omit<Address, 'id'>>('addresses');
export const orders = table<Omit<Order, 'id'>>('orders');
export const reviews = table<Omit<Review, 'id'>>('reviews');

// Sipariş durumları: müşteri "Alındı" ile açar, sonrasını admin rolü Yönetim › Siparişler'den değiştirir (staffRoles).
export const STATUS = ['Alındı', 'Hazırlanıyor', 'Kargoda', 'Teslim edildi', 'İptal'] as const;

export const money = (n: number) => `${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
export const parseLines = (o: Pick<Order, 'items'>): OrderLine[] => {
  try {
    return JSON.parse(o.items) as OrderLine[];
  } catch {
    return [];
  }
};

// Sepete ekle: aynı ürün varsa adet artar. Sepet değişince üst çubuktaki sayı tazelensin diye olay yayınlanır.
export async function addToCart(productId: number, quantity = 1) {
  const existing = await cart.one({ filter: `productId:eq:${productId}` });
  if (existing) await cart.update(existing.id, { quantity: existing.quantity + quantity });
  else await cart.insert({ productId, quantity });
  window.dispatchEvent(new Event('cart-changed'));
}

export function goLogin() {
  sessionStorage.setItem('shop.back', window.location.hash.replace(/^#/, '') || '/');
  navigate('/login');
}
