// Sohbet verisi + tek realtime bağlantısı.
import type { EndUser, Row } from '@gridbasetr/client';
import { createRealtime } from '@gridbasetr/client/realtime';
import { nameOf } from './shared/auth';
import { gb, table } from './shared/gridbase';

export type Profile = Row<{ displayName: string | null; ownerId: number }>;
export type Conversation = Row<{ title: string | null; members: number[]; ownerId: number }>;
export type Message = Row<{ conversationId: number; body: string; members: number[]; senderName: string | null; ownerId: number }>;

export const profiles = table<Omit<Profile, 'id'>>('profiles');
export const conversations = table<Omit<Conversation, 'id'>>('conversations');
export const messages = table<Omit<Message, 'id'>>('messages');

export const rt = createRealtime(gb);

// Katılımcı kolonu sayı dizisi ([5, 8]; 19 Kasım 2026); eski "5,8" metni de okunur.
export const memberIds = (c: Pick<Conversation, 'members'>): number[] =>
  (Array.isArray(c.members) ? c.members : String(c.members ?? '').split(',')).map(Number).filter((n) => Number.isInteger(n) && n > 0);

// Rehberde kendi satırın: girişte açılır / adın değiştiyse güncellenir.
export async function ensureProfile(user: EndUser) {
  // ownerId'yi GridBase damgalar (girişli kullanıcının id'si); tabloda kişi başına tek satır (unique).
  const mine = await profiles.one({ filter: `ownerId:eq:${user.id}` });
  // 16 Kasım 2026: profilde e-posta yok (herkes okuduğu için bütün e-posta listesi açıktı; alan taklit de edilebiliyordu)
  const values = { displayName: nameOf(user) };
  if (!mine) await profiles.insert(values).catch(() => undefined); // aynı anda iki sekme: ikincisi 409, sorun değil
  else if (mine.displayName !== values.displayName) await profiles.update(mine.id, values);
  // Eski kurulum (email kolonu duruyorsa): kendi e-postanı herkese açık profilden sil. Kolonu kaldırmak: gridbase apply --prune
  const old = mine as (Profile & { email?: string | null }) | null;
  if (old?.email) await profiles.update(old.id, { email: null } as never).catch(() => undefined);
}

// Sohbetin adı: başlık yoksa diğer üyelerin adları.
export function titleOf(c: Conversation, people: Map<number, Profile>, me: number) {
  if (c.title) return c.title;
  const others = memberIds(c).filter((id) => id !== me).map((id) => people.get(id)?.displayName ?? `#${id}`);
  return others.join(', ') || 'Yalnız sen';
}
