// Kişi rehberi + paylaşma penceresi (Notlar ve Dosyalar şablonları).
// profiles tablosu: girişte herkes kendi satırını yazar (yalnız görünen ad). Paylaşırken kişi adıyla ya da paylaşım koduyla
// (GridBase kullanıcı id'si, "#48") seçilir. 16 Kasım 2026: profilde e-posta YOK. Önce vardı: giriş yapan herkes bütün
// profilleri okuduğu için uygulamanın bütün e-posta listesi açıktı; alanı kullanıcı yazdığı için başkasının e-postası da
// yazılabiliyordu (paylaşım yanlış kişiye gidebilirdi). E-postayla güvenli arama GridBase'te uç olarak gelince eklenecek.
// Paylaşım = satırın sharedWith kolonuna id yazmak; GridBase o kişiye okuma izni verir (katılımcı kolonu).
import { useEffect, useState } from 'react';
import type { EndUser, Row } from '@gridbasetr/client';
import { nameOf } from './shared/auth';
import { errorText, table } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, ErrorText, Modal } from './shared/ui';

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

type ShareProps = { title: string; sharedWith: string | null; people: Map<string, Profile>; me: string; onSave: (ids: string[]) => Promise<void>; onClose: () => void };

export function ShareDialog({ title, sharedWith, people, me, onSave, onClose }: ShareProps) {
  const [ids, setIds] = useState(splitIds(sharedWith));
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Paylaşım kodu ("#48" ya da "48") kesin; ad yalnız tek kişiyle eşleşirse kabul edilir (adı kullanıcı yazar, aynı ad olabilir)
  function add() {
    const q = query.trim();
    const code = q.replace(/^#/, '').split(/\s/).pop() ?? '';
    const others = [...people.values()].filter((x) => x.ownerId !== me);
    let p = /^\d+$/.test(code) ? people.get(code) : undefined;
    if (!p) {
      const byName = others.filter((x) => (x.displayName ?? '').toLocaleLowerCase('tr-TR') === q.toLocaleLowerCase('tr-TR'));
      if (byName.length > 1) return setError('Bu adla birden çok kişi var: paylaşım kodunu yaz (ör. #48).');
      p = byName[0];
    }
    if (!p) return setError('Böyle biri yok. Kişiden paylaşım kodunu iste (uygulamaya en az bir kez giriş yapmış olmalı).');
    if (p.ownerId === me) return setError('Kendinle paylaşamazsın.');
    setIds((l) => (l.includes(p!.ownerId) ? l : [...l, p!.ownerId]));
    setQuery('');
    setError(null);
  }

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
      desc={<>“{title}” · paylaştığın kişiler görür, değiştiremez.</>}
      icon="users"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Vazgeç</button>
          <button className="btn primary" disabled={busy} onClick={save}>Kaydet</button>
        </>
      }
    >
      <div className="row">
        <div className="input-icon grow">
          <Icon name="users" size={16} />
          <input placeholder="Ad ya da paylaşım kodu (#48)" value={query} list="people-names" onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} autoFocus />
        </div>
        <datalist id="people-names">{[...people.values()].filter((p) => p.ownerId !== me).map((p) => <option key={p.id} value={`${p.displayName ?? ''} #${p.ownerId}`} />)}</datalist>
        <button className="btn" onClick={add} disabled={!query.trim()}><Icon name="userPlus" size={16} />Ekle</button>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="muted xs">Senin paylaşım kodun: <b>#{me}</b> (seninle paylaşmak isteyene bunu ver)</div>
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
                <Avatar name={people.get(id)?.displayName ?? `#${id}`} size="sm" />
                <div className="grow">
                  <div className="strong small truncate">{people.get(id)?.displayName ?? `#${id}`}</div>
                  <div className="muted xs truncate">#{id}</div>
                </div>
                <span className="muted xs hide-sm">Görüntüleyebilir</span>
                <button className="icon-btn sm danger" title="Paylaşımı kaldır" onClick={() => setIds((l) => l.filter((x) => x !== id))}><Icon name="x" size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
