// Davet parçaları (Sohbet, Notlar, Dosyalar şablonları), 16 Kasım 2026.
// Paylaşım GridBase'in davet akışıyla: kaydın sahibi kişiyi PAYLAŞIM KODUYLA ("K7M2-QX9P", kişinin `gb.auth.shareCode()`'u)
// ya da e-postasıyla davet eder; kişi kabul edince GridBase id'sini katılımcı kolonuna (sharedWith / members) kendisi yazar.
// Kimse başkasını onun haberi olmadan bir kayda ekleyemez; e-posta listesi ya da id'ler hiçbir yerde görünmez.
// Davet ucu cevabı her durumda aynıdır (yanlış kod, kendisi, zaten üye): yanlış yazılan kodlu davet de "bekliyor" görünür.
// Bu yüzden: davet kabul edilmediyse kişiden kodunu tekrar iste.
// Projede davetler açık olmalı (gridbase.config.ts › project.invites: true; panel › Proje ayarları › Davetler).
import { useCallback, useEffect, useState } from 'react';
import type { PendingInvite, RowInvite } from '@gridbasetr/client';
import { errorText, gb } from './shared/gridbase';
import { Icon } from './shared/icons';
import { ErrorText } from './shared/ui';

// Kendi paylaşım kodun: seninle paylaşmak isteyene bunu ver. Yenile: eski kod hemen geçersiz olur.
export function MyShareCode() {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    gb.auth.shareCode().then((c) => setCode(c.code)).catch((e) => setError(errorText(e)));
  }, []);
  async function copy() {
    if (!code) return;
    await navigator.clipboard.writeText(code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function rotate() {
    if (!confirm('Yeni kod üretilsin mi? Eski kodun hemen geçersiz olur.')) return;
    try { setCode((await gb.auth.rotateShareCode()).code); } catch (e) { setError(errorText(e)); }
  }
  return (
    <div className="row sm wrap" style={{ alignItems: 'center' }}>
      <span className="muted xs">Senin paylaşım kodun:</span>
      <b style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', letterSpacing: 1 }}>{code ?? '…'}</b>
      <button className="icon-btn sm" title="Kopyala" onClick={copy} disabled={!code}><Icon name={copied ? 'check' : 'link'} size={14} /></button>
      <button className="icon-btn sm" title="Yeni kod üret (eskisi geçersiz olur)" onClick={rotate}><Icon name="refresh" size={14} /></button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

// Kaydın sahibi: koda ya da e-postaya davet + bekleyen davetler (iptal edilebilir).
export function InviteBox({ table, rowId, label }: { table: string; rowId: number; label: string }) {
  const [value, setValue] = useState('');
  const [list, setList] = useState<RowInvite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const load = useCallback(() => gb.from(table).invites(rowId).then((l) => setList(l.filter((i) => i.status === 'pending'))).catch(() => undefined), [table, rowId]);
  useEffect(() => { load(); }, [load]);

  async function send() {
    const v = value.trim();
    if (!v) return;
    setBusy(true); setError(null); setSent(false);
    try {
      if (v.includes('@')) await gb.from(table).invite(rowId, v, { label });
      else await gb.from(table).inviteByCode(rowId, v, { label });
      setValue(''); setSent(true);
      load();
    } catch (e) { setError(errorText(e)); }
    setBusy(false);
  }

  return (
    <div className="stack sm">
      <div className="row">
        <div className="input-icon grow">
          <Icon name="userPlus" size={16} />
          <input placeholder="Paylaşım kodu (K7M2-QX9P) ya da e-posta" value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), send())} autoFocus />
        </div>
        <button className="btn" onClick={send} disabled={!value.trim() || busy}><Icon name="send" size={16} />Davet et</button>
      </div>
      <ErrorText>{error}</ErrorText>
      {sent && <div className="muted xs">Davet gönderildi. Kişi kabul edince erişimi olanlara eklenir.</div>}
      {list.length > 0 && (
        <div className="stack sm">
          <div className="section-title">Bekleyen davetler · {list.length}</div>
          {list.map((i) => (
            <div key={i.id} className="row sm" style={{ alignItems: 'center' }}>
              <Icon name="clock" size={14} />
              <span className="small grow truncate">{i.email ?? i.shareCode}</span>
              <span className="chip warn">bekliyor</span>
              <button className="icon-btn sm danger" title="Daveti iptal et" onClick={() => gb.from(table).cancelInvite(rowId, i.id).then(load)}><Icon name="x" size={14} /></button>
            </div>
          ))}
          <div className="muted xs">Davet kabul edilmediyse kişiden kodunu tekrar iste (yanlış yazılan kod da “bekliyor” görünür).</div>
        </div>
      )}
    </div>
  );
}

// Bana gelen davetler: kabul / reddet. Kabul edince kayıt listene düşer (onAccepted ile yenile).
// E-postayla gelen davetler yalnız e-postan onaylıysa görünür; kodla gelenler her zaman.
export function IncomingInvites({ onAccepted }: { onAccepted?: () => void }) {
  const [list, setList] = useState<PendingInvite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => gb.auth.invites().then(setList).catch(() => undefined), []);
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    window.addEventListener('focus', load);
    return () => { clearInterval(t); window.removeEventListener('focus', load); };
  }, [load]);
  if (!list.length) return null;

  async function act(i: PendingInvite, accept: boolean) {
    setError(null);
    try {
      if (accept) await gb.auth.acceptInvite(i.id);
      else await gb.auth.declineInvite(i.id);
      setList((l) => l.filter((x) => x.id !== i.id));
      if (accept) onAccepted?.();
    } catch (e) { setError(errorText(e)); }
  }

  return (
    <div className="card stack sm" style={{ marginBottom: 16 }}>
      <div className="section-title"><Icon name="mail" size={14} /> Sana gelen davetler · {list.length}</div>
      {list.map((i) => (
        <div key={i.id} className="row sm wrap" style={{ alignItems: 'center' }}>
          <span className="small grow"><b>{i.from ?? 'Bir kullanıcı'}</b> seni {i.label ? <>“{i.label}”</> : 'bir kayda'} davet etti.</span>
          <button className="btn sm" onClick={() => act(i, false)}>Reddet</button>
          <button className="btn sm primary" onClick={() => act(i, true)}><Icon name="check" size={14} />Kabul et</button>
        </div>
      ))}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
