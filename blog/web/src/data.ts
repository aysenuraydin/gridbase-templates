// Blog verisi: tablolar ve tipler tek yerde.
import type { Row } from '@gridbasetr/client';
import { table } from './shared/gridbase';
import { navigate } from './shared/ui';

export type Category = Row<{ name: string; slug: string }>;
export type Post = Row<{
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  coverImage: string | null; // kovadaki dosya adı ya da http adresi
  categoryId: number | null;
  authorId: string | null;
  authorName: string | null;
  published: boolean;
  publishedAt: string | null;
}>;
export type Comment = Row<{
  postId: number;
  body: string;
  authorName: string | null;
  postAuthorId: string | null;
  createdAt: string | null;
  ownerId: string | null; // GridBase damgalar: yorumu yazan
}>;

export const categories = table<Omit<Category, 'id'>>('categories');
export const posts = table<Omit<Post, 'id'>>('posts');
export const comments = table<Omit<Comment, 'id'>>('comments');

// Liste ekranlarında gövde gerekmez: select ile yalnız gereken kolonlar gelir.
export const CARD_FIELDS = ['title', 'slug', 'excerpt', 'coverImage', 'categoryId', 'authorName', 'published', 'publishedAt'];

export const slugify = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Girişten sonra bulunduğun sayfaya dön.
export function goLogin() {
  sessionStorage.setItem('blog.back', window.location.hash.replace(/^#/, '') || '/');
  navigate('/login');
}
