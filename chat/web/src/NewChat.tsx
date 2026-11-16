// Yeni sohbet (16 Kasım 2026): sohbeti açarsın, kişileri PAYLAŞIM KODUYLA ("K7M2-QX9P") ya da e-postayla davet edersin.
// Kişi daveti kabul edince GridBase id'sini sohbetin members'ına kendisi yazar; sohbet ona düşer (realtime).
// Önce rehberden "#48" seçilip doğrudan members'a yazılıyordu: kişinin haberi olmadan sohbete ekleniyordu.
// Davet cevabı her durumda aynıdır: kabul edilmediyse kişiden kodunu tekrar iste.
import { useState } from 'react';
import { errorText } from './shared/gridbase';
import { Icon } from './shared/icons';
import { ErrorText, Modal } from './shared/ui';
import { MyShareCode } from './invites';

type Props = { onClose: () => void; onCreate: (invitees: string[], title: string) => Promise<void> };

export function NewChat({ onClose, onCreate }: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add() {
    const v = value.trim();
    if (!v) return;
    setPicked((l) => (l.includes(v) ? l : [...l, v]));
    setValue('');
  }

  async function start() {
    setBusy(true);
    try {
      await onCreate(value.trim() ? [...new Set([...picked, value.trim()])] : picked, title.trim());
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Yeni sohbet"
      desc="Kişiyi paylaşım koduyla ya da e-postasıyla davet et; kabul edince sohbete katılır."
      icon="pen"
      onClose={onClose}
      footer={
        <>
          <span className="faint small" style={{ marginRight: 'auto' }}>{picked.length ? `${picked.length} davet` : ''}</span>
          <button className="btn" onClick={onClose}>Vazgeç</button>
          <button className="btn primary" disabled={(!picked.length && !value.trim()) || busy} onClick={start}>Başlat ve davet et</button>
        </>
      }
    >
      <div className="row">
        <div className="input-icon grow">
          <Icon name="userPlus" size={16} />
          <input placeholder="Paylaşım kodu (K7M2-QX9P) ya da e-posta" value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} autoFocus />
        </div>
        <button className="btn" onClick={add} disabled={!value.trim()}><Icon name="plus" size={16} />Ekle</button>
      </div>
      {picked.length > 0 && (
        <div className="row sm wrap">
          {picked.map((v) => (
            <span key={v} className="chip gray" style={{ height: 28 }}>
              {v}
              <button onClick={() => setPicked((l) => l.filter((x) => x !== v))} aria-label="Çıkar"><Icon name="x" size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <label>Sohbet adı <span className="hint">· isteğe bağlı</span><input placeholder="Örn. Proje ekibi" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <MyShareCode />
      <div className="muted xs">Davet kabul edilmediyse kişiden kodunu tekrar iste (yanlış yazılan kod da davet gönderilmiş gibi görünür).</div>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}
