// Sohbet verisi + tek realtime bağlantısı.
import type { EndUser, Row } from '@gridbasetr/client';
import { createRealtime } from '@gridbasetr/client/realtime';
import { nameOf } from './shared/auth';
import { gb, table } from './shared/gridbase';

export type Profile = Row<{ displayName: string | null; email: string | null; ownerId: string }>;
export type Conversation = Row<{ title: string | null; members: string; createdAt: string | null; ownerId: string }>;
export type Message = Row<{ conversationId: number; body: string; members: string; senderName: string | null; createdAt: string | null; ownerId: string }>;

export const profiles = table<Omit<Profile, 'id'>>('profiles');
export const conversations = table<Omit<Conversation, 'id'>>('conversations');
export const messages = table<Omit<Message, 'id'>>('messages');

export const rt = createRealtime(gb);

export const memberIds = (c: Pick<Conversation, 'members'>) => c.members.split(',').map((s) => s.trim()).filter(Boolean);

// Rehberde kendi satırın: girişte açılır / adın değiştiyse güncellenir.
export async function ensureProfile(user: EndUser) {
  // ownerId'yi GridBase damgalar (girişli kullanıcının id'si); tabloda kişi başına tek satır (unique).
  const mine = await profiles.one({ filter: `ownerId:eq:${user.id}` });
  const values = { displayName: nameOf(user), email: user.email };
  if (!mine) await profiles.insert(values).catch(() => undefined); // aynı anda iki sekme: ikincisi 409, sorun değil
  else if (mine.displayName !== values.displayName || mine.email !== values.email) await profiles.update(mine.id, values);
}

// Sohbetin adı: başlık yoksa diğer üyelerin adları.
export function titleOf(c: Conversation, people: Map<string, Profile>, me: string) {
  if (c.title) return c.title;
  const others = memberIds(c).filter((id) => id !== me).map((id) => people.get(id)?.displayName ?? `#${id}`);
  return others.join(', ') || 'Yalnız sen';
}
