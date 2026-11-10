// Yeni sohbet: rehberden bir ya da birden çok kişi seç (birden çoksa grup, başlık verilebilir).
import { useState } from 'react';
import { errorText } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, Empty, ErrorText, Modal } from './shared/ui';
import type { Profile } from './data';

type Props = { people: Profile[]; onClose: () => void; onCreate: (ids: string[], title: string) => Promise<void> };

export function NewChat({ people, onClose, onCreate }: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = people.filter((p) => `${p.displayName} ${p.email}`.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')));
  const toggle = (id: string) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  async function start() {
    setBusy(true);
    try {
      await onCreate(picked, title.trim());
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Yeni sohbet"
      desc="Bir kişi seç ya da birden çok kişiyle grup kur."
      icon="pen"
      onClose={onClose}
      footer={
        <>
          <span className="faint small" style={{ marginRight: 'auto' }}>{picked.length ? `${picked.length} kişi seçildi` : ''}</span>
          <button className="btn" onClick={onClose}>Vazgeç</button>
          <button className="btn primary" disabled={!picked.length || busy} onClick={start}>
            {picked.length > 1 ? 'Grubu başlat' : 'Sohbet başlat'}
          </button>
        </>
      }
    >
      <div className="input-icon">
        <Icon name="search" size={16} />
        <input placeholder="Ad ya da e-posta ara" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      {picked.length > 0 && (
        <div className="row sm wrap">
          {picked.map((id) => {
            const p = people.find((x) => x.ownerId === id);
            return (
              <span key={id} className="chip gray" style={{ height: 28, paddingLeft: 3 }}>
                <Avatar name={p?.displayName} size="xs" />{p?.displayName}
                <button onClick={() => toggle(id)} aria-label="Çıkar"><Icon name="x" size={12} /></button>
              </span>
            );
          })}
        </div>
      )}
      <div className="card flush" style={{ boxShadow: 'none', maxHeight: 320, overflowY: 'auto' }}>
        {!shown.length ? (
          <Empty icon="users" title="Rehberde kimse yok" plain>Arkadaşın uygulamaya bir kez giriş yapınca burada görünür.</Empty>
        ) : (
          <div className="list">
            {shown.map((p) => (
              <label key={p.id} className="list-item check person-pick">
                <input type="checkbox" checked={picked.includes(p.ownerId)} onChange={() => toggle(p.ownerId)} />
                <Avatar name={p.displayName} size="sm" />
                <div className="grow">
                  <div className="strong small truncate">{p.displayName}</div>
                  <div className="muted xs truncate">{p.email}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
      {picked.length > 1 && (
        <label>Grup adı <span className="hint">· isteğe bağlı</span><input placeholder="Örn. Proje ekibi" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      )}
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}
