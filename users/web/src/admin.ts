// ════════════════════════════════════════════════════════════════
//  Son kullanıcı yönetimi uçları (/api/gridbase/endusers, /roles). Normalde yalnız panel ve secret key içindir;
//  gridbase.config.ts › project.adminRoles'teki roldeki kullanıcı (burada admin) kendi oturumuyla çağırabilir.
//  Sunucunun kuralları (istemci ne gönderirse göndersin):
//    - yönetici rolünü (admin) kimse uygulamadan veremez / alamaz → 403
//    - yönetici kendini ya da başka bir yöneticiyi engelleyemez → 403
//    - rol açma / silme ve hesap silme yalnız panelde → 403
//  Yetki her istekte kullanıcının o anki rollerinden okunur: rolü alınan yönetici hemen 403 alır.
// ════════════════════════════════════════════════════════════════
import { gb } from './shared/gridbase';

export type AppUser = {
  id: number;
  email: string;
  displayName: string | null;
  emailConfirmed: boolean;
  isBlocked: boolean;
  roles: string[]; // rol adları
  createdAt: string;
};
export type AppRole = { id: number; name: string; description: string | null; userCount: number };
export type UserPage = { items: AppUser[]; total: number; page: number; pageSize: number };

export const ADMIN_ROLE = 'admin';

export const adminApi = {
  users: (page: number, pageSize: number, search?: string) =>
    gb.http.json<UserPage>('/endusers', { query: { page, pageSize, search: search || undefined } }),
  roles: () => gb.http.json<AppRole[]>('/roles'),
  addRole: (userId: number, roleId: number) => gb.http.json<void>(`/endusers/${userId}/roles`, { method: 'POST', body: { roleId } }),
  removeRole: (userId: number, roleId: number) => gb.http.json<void>(`/endusers/${userId}/roles/${roleId}`, { method: 'DELETE' }),
  setBlocked: (userId: number, blocked: boolean) => gb.http.json<void>(`/endusers/${userId}/blocked`, { method: 'PUT', body: { blocked } }),
};
