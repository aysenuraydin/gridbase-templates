// Kişi rehberi + paylaşma penceresi (Notlar ve Dosyalar şablonları).
// profiles tablosu: girişte herkes kendi satırını yazar (yalnız görünen ad, e-posta yok): paylaşılan kişilerin adını göstermek için.
// Paylaşmak = DAVET (16 Kasım 2026): kişinin paylaşım kodu ("K7M2-QX9P") ya da e-postasıyla davet edilir, kişi kabul edince GridBase
// id'sini sharedWith'e (katılımcı kolonu) kendisi yazar. Önce "#48" (veritabanı id'si) ile doğrudan sharedWith'e yazılıyordu:
// kişinin haberi olmadan ekleniyordu ve id tahmin edilebiliyordu. Erişimi kaldırmak: sahip sharedWith'ten id'yi siler.
import { useEffect, useState } from 'react';
import type { EndUser, Row } from '@gridbasetr/client';
import { nameOf } from './shared/auth';
import { errorText, table } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, ErrorText, Modal } from './shared/ui';
import { InviteBox, MyShareCode } from './invites';

export type Profile = Row<{ displayName: string | null; ownerId: string }>;
export const profiles = table<Omit<Profile, 'id'>>('profiles');

export async function ensureProfile(user: EndUser) {
  // ownerId'yi GridBase damgalar (girişli kullanıcının id'si); tabloda kişi başına tek satır (unique).
  const mine = await profiles.one({ filter: `ownerId:eq:${user.id}` });
  const values = { displayName: nameOf(user) };
  if (!mine) await profiles.insert(values).catch(() => undefined); // aynı anda iki sekme: ikincisi 409, sorun değil
  else if (mine.displayName !== values.displayName) await profiles.update(mine.id, values);
  // Eski kurulum (email kolonu duruyorsa): kendi e-postanı herkese açık profilden sil. Kolonu tamamen kaldırmak: gridbase apply --prune
  const old = mine as (Profile & { email?: string | null }) | null;
  if (old?.email) await profiles.update(old.id, { email: null } as never).catch(() => undefined);
}

export const splitIds = (v: string | null | undefined) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function usePeople() {
  const [people, setPeople] = useState<Map<string, Profile>>(new Map());
  useEffect(() => {
    profiles.list().then((rows) => setPeople(new Map(rows.map((p) => [p.ownerId, p])))).catch(() => undefined);
  }, []);
  return people;
}

type ShareProps = { table: string; rowId: number; title: string; sharedWith: string | null; people: Map<string, Profile>; me: string; onSave: (ids: string[]) => Promise<void>; onClose: () => void };

export function ShareDialog({ table: tableName, rowId, title, sharedWith, people, me, onSave, onClose }: ShareProps) {
  const [ids, setIds] = useState(splitIds(sharedWith));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const changed = ids.join(',') !== splitIds(sharedWith).join(',');

  async function save() {
    setBusy(true);
    try {
      await onSave(ids);
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Paylaş"
      desc={<>“{title}” · davet ettiğin kişi kabul edince görür, değiştiremez.</>}
      icon="users"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Kapat</button>
          {changed && <button className="btn primary" disabled={busy} onClick={save}>Erişimi kaldır</button>}
        </>
      }
    >
      <InviteBox table={tableName} rowId={rowId} label={title} />
      <MyShareCode />
      <ErrorText>{error}</ErrorText>
      <div>
        <div className="section-title">Erişimi olanlar · {ids.length + 1}</div>
        <div className="card flush" style={{ boxShadow: 'none' }}>
          <div className="list">
            <div className="list-item">
              <Avatar name={people.get(me)?.displayName ?? 'Sen'} size="sm" />
              <div className="grow">
                <div className="strong small">{people.get(me)?.displayName ?? 'Sen'} <span className="muted">(sen)</span></div>
              </div>
              <span className="muted xs">Sahibi</span>
            </div>
            {ids.map((id) => (
              <div key={id} className="list-item">
                <Avatar name={people.get(id)?.displayName ?? 'Kullanıcı'} size="sm" />
                <div className="grow">
                  <div className="strong small truncate">{people.get(id)?.displayName ?? 'Kullanıcı'}</div>
                </div>
                <span className="muted xs hide-sm">Görüntüleyebilir</span>
                <button className="icon-btn sm danger" title="Erişimi kaldır" onClick={() => setIds((l) => l.filter((x) => x !== id))}><Icon name="x" size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
