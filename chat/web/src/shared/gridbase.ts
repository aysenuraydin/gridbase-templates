// ════════════════════════════════════════════════════════════════
//  GridBase istemcisi: uygulamanın tek bağlantısı.
//  Değerler web/.env.local'dan gelir (gridbase init yazar; elle kurulumda README'ye bak):
//    VITE_GRIDBASE_URL       GridBase sunucusu, ör. https://api.gridbasetr.com
//    VITE_GRIDBASE_ANON_KEY  projenin anon key'i (gb_pk_…): uygulamaya gömülür, herkese açıktır
//  Secret key (gb_sk_…) buraya ASLA konmaz: Vite VITE_ ile başlayan her değeri tarayıcıya gömer.
//  Bu dosya _shared'den kopyalanır (scripts/sync-shared.mjs); değiştireceksen _shared'deki asıl dosyayı değiştir.
// ════════════════════════════════════════════════════════════════
import { createClient, GridBaseError, type GenericRow, type TableApi } from '@gridbasetr/client';

const url = (import.meta.env.VITE_GRIDBASE_URL as string | undefined)?.trim() ?? '';
const anonKey = (import.meta.env.VITE_GRIDBASE_ANON_KEY as string | undefined)?.trim() ?? '';

// Kurulum eksikse uygulama çökmek yerine SetupNotice gösterir.
export const setupProblem: string | null = !url
  ? 'VITE_GRIDBASE_URL boş.'
  : !anonKey
    ? 'VITE_GRIDBASE_ANON_KEY boş.'
    : anonKey.startsWith('gb_sk_')
      ? 'VITE_GRIDBASE_ANON_KEY bir SECRET key! Oraya anon key (gb_pk_…) koy ve secret key\'i yenile (panel › API anahtarları).'
      : null;

export const gb = createClient({
  url: url || 'http://localhost',
  anonKey: anonKey || 'gb_pk_missing',
  storage: window.localStorage,
});

// Tiplenmiş tablo: table<{ title: string }>('todos'). Satırlara id eklenir (Row<T>).
// (Bütün şema için `npx @gridbasetr/cli types` gridbase.types.ts üretir; createClient<Database>() ile de olur.)
export const table = <T extends GenericRow>(name: string) => gb.from(name) as unknown as TableApi<T>;

export const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || null;

// Kullanıcıya gösterilecek hata metni.
export function errorText(e: unknown): string {
  if (e instanceof GridBaseError) {
    if (e.status === 0) return 'Sunucuya ulaşılamadı. İnternet bağlantını ve VITE_GRIDBASE_URL\'yi kontrol et.';
    if (e.errors?.length) return e.errors.join(' ');
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

// Dosya adını görüntülenebilir adrese çevirir (http ya da / ile başlıyorsa olduğu gibi: uygulamanın kendi dosyası). Özel kovada link 5 dk geçerli,
// o yüzden kısa süre önbellekte tutulur.
const urlCache = new Map<string, { url: string; until: number }>();
export async function fileUrl(name: string | null | undefined): Promise<string | null> {
  if (!name) return null;
  if (/^(https?:\/\/|\/)/.test(name)) return name;
  const hit = urlCache.get(name);
  if (hit && hit.until > Date.now()) return hit.url;
  const { url: u, expiresAt } = await gb.storage.getUrl(name);
  urlCache.set(name, { url: u, until: expiresAt ? new Date(expiresAt).getTime() - 30_000 : Date.now() + 3_600_000 });
  return u;
}
