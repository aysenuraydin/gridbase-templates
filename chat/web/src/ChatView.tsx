// Açık sohbet: mesajlar (tablo + realtime) ve oda (presence = kim çevrimiçi, broadcast = "yazıyor…").
// Oda sinyalleri tabloya yazılmaz; GridBase yalnız üyeleri odaya alır (kendi id'n listede olmalı).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Room } from '@gridbasetr/client/realtime';
import { errorText } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, ErrorText, Spinner, colorOf, formatTime } from './shared/ui';
import { memberIds, messages, rt, titleOf, type Conversation, type Message, type Profile } from './data';
import type { MessageListener } from './ChatApp';

type Props = { conversation: Conversation; people: Map<string, Profile>; me: string; subscribe: (fn: MessageListener) => () => void };

export function ChatView({ conversation: c, people, me, subscribe }: Props) {
  const [list, setList] = useState<Message[] | null>(null);
  const [text, setText] = useState('');
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const room = useRef<Room | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const lastTyping = useRef(0);
  const members = memberIds(c);

  useEffect(() => {
    // Son 50 mesaj (en yeniden geriye), ekranda eskiden yeniye.
    messages
      .paged({ filter: `conversationId:eq:${c.id}`, sort: 'id:desc', size: 50 })
      .then((r) => setList(r.data.reverse()))
      .catch((e) => setError(errorText(e)));
    const off = subscribe((m, type) => {
      if (type === 'delete') return setList((l) => l?.filter((x) => x.id !== m.id) ?? l);
      if (m.conversationId !== c.id) return;
      setList((l) => (!l || l.some((x) => x.id === m.id) ? l : [...l, m]));
      setTyping((t) => ({ ...t, [m.ownerId]: 0 }));
    });
    let r: Room | null = null;
    if (members.length >= 2 && members.includes(me)) {
      r = rt.room(members, { onError: (e) => console.warn(e.message) });
      r.onPresence((users) => setOnline(new Set(users.map((u) => u.userId))));
      r.onBroadcast((e) => {
        if (e.event === 'typing' && e.from) setTyping((t) => ({ ...t, [e.from!]: Date.now() }));
      });
      room.current = r;
    }
    return () => {
      off();
      r?.leave();
      room.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [list?.length]);

  // "yazıyor…" 3 sn sonra kendiliğinden düşer
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const typingNames = Object.entries(typing)
    .filter(([id, at]) => id !== me && Date.now() - at < 3000)
    .map(([id]) => people.get(id)?.displayName ?? `#${id}`);

  function onType(v: string) {
    setText(v);
    if (Date.now() - lastTyping.current > 1500) {
      lastTyping.current = Date.now();
      room.current?.send('typing');
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      const m = await messages.insert({
        conversationId: c.id,
        body,
        members: c.members, // okuyabilecekler = sohbetin üyeleri
        senderName: people.get(me)?.displayName ?? null,
        createdAt: new Date().toISOString(),
      });
      setList((l) => (!l || l.some((x) => x.id === m.id) ? l : [...l, m]));
    } catch (err) {
      setError(errorText(err));
      setText(body);
    }
  }

  const others = members.filter((id) => id !== me);
  const onlineOthers = others.filter((id) => online.has(id));
  const group = others.length > 1;
  const title = titleOf(c, people, me);
  const dayOf = (v: string | null) => (v ? new Date(v).toDateString() : '');
  const dayLabel = (v: string | null) => {
    if (!v) return '';
    const d = new Date(v);
    const t = new Date();
    const y = new Date(Date.now() - 86400_000);
    if (d.toDateString() === t.toDateString()) return 'Bugün';
    if (d.toDateString() === y.toDateString()) return 'Dün';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  };

  return (
    <>
      <header className="chat-head">
        <a href="#/" className="icon-btn chat-back" aria-label="Sohbetler"><Icon name="arrowLeft" size={18} /></a>
        <span className="presence-wrap">
          {group ? <span className="avatar md group-av"><Icon name="users" size={18} /></span> : <Avatar name={title} size="md" />}
          {!group && onlineOthers.length > 0 && <span className="presence-dot" />}
        </span>
        <div className="grow">
          <div className="strong truncate">{title}</div>
          <div className="xs">
            {typingNames.length ? (
              <span style={{ color: 'var(--brand-text)' }}>{group ? `${typingNames.join(', ')} yazıyor…` : 'yazıyor…'}</span>
            ) : onlineOthers.length ? (
              <span style={{ color: 'var(--ok)' }}>{group ? `${onlineOthers.length} kişi çevrimiçi` : 'Çevrimiçi'}</span>
            ) : (
              <span className="muted">{group ? `${members.length} üye` : 'Çevrimdışı'}</span>
            )}
          </div>
        </div>
        {group && (
          <span className="avatar-stack hide-sm">
            {others.slice(0, 4).map((id) => <Avatar key={id} name={people.get(id)?.displayName ?? `#${id}`} size="sm" />)}
          </span>
        )}
      </header>
      <div className="messages">
        {!list ? (
          <Spinner />
        ) : (
          list.map((m, i) => {
            const mine = m.ownerId === me;
            const prev = list[i - 1];
            const next = list[i + 1];
            const newDay = !prev || dayOf(prev.createdAt) !== dayOf(m.createdAt);
            const first = newDay || prev!.ownerId !== m.ownerId;
            const last = !next || next.ownerId !== m.ownerId || dayOf(next.createdAt) !== dayOf(m.createdAt);
            return (
              <div key={m.id} className="msg-wrap">
                {newDay && <div className="day-sep"><span>{dayLabel(m.createdAt)}</span></div>}
                <div className={`msg-row ${mine ? 'mine' : ''} ${first ? 'first' : ''}`}>
                  {!mine && group && <span className="msg-av">{last ? <Avatar name={m.senderName} size="sm" /> : null}</span>}
                  <div className={`bubble ${mine ? 'mine' : ''} ${first ? 'first' : ''} ${last ? 'last' : ''}`}>
                    {!mine && group && first && <div className="sender" style={{ color: colorOf(m.senderName ?? '?') }}>{m.senderName}</div>}
                    <span className="body">{m.body}</span>
                    <span className="time">{formatTime(m.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {typingNames.length > 0 && (
          <div className="msg-row first"><div className="bubble typing" aria-label="yazıyor"><span /><span /><span /></div></div>
        )}
        <div ref={bottom} />
      </div>
      {error && <div style={{ padding: '0 16px' }}><ErrorText>{error}</ErrorText></div>}
      <form onSubmit={send} className="composer">
        <input placeholder="Mesaj yaz…" value={text} onChange={(e) => onType(e.target.value)} aria-label="Mesaj" />
        <button className="send-btn" disabled={!text.trim()} aria-label="Gönder"><Icon name="send" size={18} /></button>
      </form>
    </>
  );
}
