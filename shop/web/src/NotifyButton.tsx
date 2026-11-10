// Tarayıcı bildirimi (Web Push): sipariş durumu değişince GridBase'in push kuralı ("Sipariş durumu") gönderir.
// public/gridbase-sw.js service worker'ı gerekir (SDK paketinden kopyalandı). İzin yalnız düğmeye basınca istenir.
import { useState } from 'react';
import { isWebPushSupported, WebPushError } from '@gridbasetr/client';
import { gb } from './shared/gridbase';
import { Icon } from './shared/icons';

export function NotifyButton() {
  const [state, setState] = useState(() => (isWebPushSupported() ? gb.push.webPermission() : 'unsupported'));
  if (state === 'unsupported') return null;
  if (state === 'granted') return <span className="icon-btn hide-sm notify-on" title="Sipariş durumu değişince bildirim alırsın (bildirimler açık)" aria-label="Bildirimler açık"><Icon name="bell" size={17} /></span>;
  if (state === 'denied') return <span className="icon-btn hide-sm" title="Bildirimler kapalı: tarayıcı ayarlarından izin ver" aria-label="Bildirimler kapalı"><Icon name="bellOff" size={17} /></span>;
  return (
    <button
      className="btn sm"
      onClick={async () => {
        try {
          await gb.push.subscribeWeb();
          setState('granted');
        } catch (e) {
          setState(e instanceof WebPushError && e.code === 'denied' ? 'denied' : gb.push.webPermission());
        }
      }}
    >
      <Icon name="bell" size={15} />
      <span className="hide-sm">Bildirimleri aç</span>
    </button>
  );
}
