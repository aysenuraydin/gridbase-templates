// ════════════════════════════════════════════════════════════════
//  Sohbet: solda sohbetler, sağda açık sohbet.
//  Realtime: iki tablo aboneliği (conversations, messages). GridBase olayı yalnız okuyabildiğin satır için
//  gönderir: messages'ta members kolonunda adın yoksa o mesajın olayı sana hiç gelmez.
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './shared/auth';
import { errorText } from './shared/gridbase';
import { Icon } from './shared/icons';
import { Avatar, Empty, ErrorText, Skeleton, TopBar, navigate, useRoute } from './shared/ui';
import { conversations, ensureProfile, memberIds, messages, profiles, rt, titleOf, type Conversation, type Message, type Profile } from './data';
import { ChatView } from './ChatView';
import { NewChat } from './NewChat';
import { NotifyButton } from './NotifyButton';

export type MessageListener = (m: Message, type: 'insert' | 'update' | 'delete') => void;

export function ChatApp() {
  const { user } = useAuth();
  const me = String(user!.id);
  const route = useRoute();
  const openId = route[0] === 'c' ? Number(route[1]) : null;
  const [people, setPeople] = useState<Map<string, Profile>>(new Map());
  const [list, setList] = useState<Conversation[] | null>(null);
  const [unread, setUnread] = useState<Record<number, number>>({});
  const [creating, setCreating] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const listeners = useRef(new Set<MessageListener>());
  const openRef = useRef(openId);
  openRef.current = openId;

  const loadPeople = useCallback(() => profiles.list().then((rows) => setPeople(new Map(rows.map((p) => [p.ownerId, p])))), []);
  const loadConversations = useCallback(() => conversations.list({ sort: 'id:desc' }).then(setList).catch((e) => setError(errorText(e))), []);

  useEffect(() => {
    ensureProfile(user!).then(loadPeople).catch((e) => setError(errorText(e)));
    loadConversations();
    // Biri seni bir sohbete ekleyince (members'ta id'in) olay gelir: listeye düşer.
    const offConv = rt.subscribe<Conversation>('conversations', (c) => {
      setList((l) => {
        if (!l) return l;
        if (c.type === 'delete') return l.filter((x) => x.id !== c.id);
        return l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c.row! : x)) : [c.row!, ...l];
      });
      loadPeople();
    });
    const offMsg = rt.subscribe<Message>('messages', (c) => {
      const m = c.row ?? ({ id: c.id } as Message);
      for (const fn of listeners.current) fn(m, c.type);
      if (c.type === 'insert' && m.ownerId !== me && m.conversationId !== openRef.current) {
        setUnread((u) => ({ ...u, [m.conversationId]: (u[m.conversationId] ?? 0) + 1 }));
      }
    });
    const offRe = rt.onReconnect(loadConversations);
    const offStatus = rt.onStatus(setLive);
    return () => {
      offConv();
      offMsg();
      offRe();
      offStatus();
    };
  }, [user, me, loadPeople, loadConversations]);

  useEffect(() => {
    if (openId) setUnread((u) => ({ ...u, [openId]: 0 }));
  }, [openId]);

  const subscribe = useCallback((fn: MessageListener) => {
    listeners.current.add(fn);
    return () => void listeners.current.delete(fn);
  }, []);

  const open = useMemo(() => list?.find((c) => c.id === openId) ?? null, [list, openId]);

  async function create(memberIdsList: string[], title: string) {
    const members = [...new Set([me, ...memberIdsList])].join(',');
    const c = await conversations.insert({ title: title || null, members, createdAt: new Date().toISOString() });
    await messages.insert({ conversationId: c.id, body: '👋', members, senderName: people.get(me)?.displayName ?? null, createdAt: new Date().toISOString() });
    setList((l) => (l?.some((x) => x.id === c.id) ? l : [c, ...(l ?? [])]));
    setCreating(false);
    navigate(`/c/${c.id}`);
  }

  const needle = q.toLocaleLowerCase('tr-TR');
  const shown = (list ?? []).filter((c) => !needle || titleOf(c, people, me).toLocaleLowerCase('tr-TR').includes(needle));

  return (
    <div className="chat-shell">
      <TopBar title="Sohbet" icon="messages" wide right={<><NotifyButton /><span className={`live ${live ? 'on' : ''} hide-sm`}>{live ? 'Bağlı' : 'Bağlanıyor'}</span></>} />
      <div className={`chat-layout ${openId ? 'has-open' : ''}`}>
        <aside className="chat-list">
          <div className="chat-list-head">
            <div className="row between">
              <h2>Sohbetler</h2>
              <button className="btn sm primary" onClick={() => setCreating(true)} title="Yeni sohbet"><Icon name="pen" size={14} />Yeni</button>
            </div>
            <div className="input-icon">
              <Icon name="search" size={15} />
              <input placeholder="Sohbetlerde ara" value={q} onChange={(e) => setQ(e.target.value)} style={{ height: 36, minHeight: 36 }} />
            </div>
          </div>
          {error && <div style={{ padding: '0 14px' }}><ErrorText>{error}</ErrorText></div>}
          <div className="chat-items">
            {!list ? (
              [0, 1, 2].map((i) => <div key={i} className="chat-item"><Skeleton h={42} w={42} r={99} /><div className="grow stack sm"><Skeleton h={13} w="55%" /><Skeleton h={11} w="35%" /></div></div>)
            ) : !list.length ? (
              <div className="chat-empty-list">
                <span className="tile"><Icon name="messages" size={20} /></span>
                <p className="small muted">Henüz sohbet yok.</p>
                <button className="btn sm" onClick={() => setCreating(true)}><Icon name="plus" size={14} />Sohbet başlat</button>
              </div>
            ) : !shown.length ? (
              <p className="muted small" style={{ padding: '8px 16px' }}>Sonuç yok.</p>
            ) : (
              shown.map((c) => {
                const title = titleOf(c, people, me);
                const group = memberIds(c).length > 2;
                return (
                  <a key={c.id} href={`#/c/${c.id}`} className={`chat-item ${c.id === openId ? 'active' : ''} ${unread[c.id] ? 'unread' : ''}`}>
                    {group ? <span className="avatar md group-av"><Icon name="users" size={18} /></span> : <Avatar name={title} size="md" />}
                    <div className="grow">
                      <div className="truncate chat-item-title">{title}</div>
                      <div className="faint xs truncate">{group ? `${memberIds(c).length} üye` : 'Birebir sohbet'}</div>
                    </div>
                    {!!unread[c.id] && <span className="count-badge">{unread[c.id]}</span>}
                  </a>
                );
              })
            )}
          </div>
        </aside>
        <section className="chat-main">
          {open ? (
            <ChatView key={open.id} conversation={open} people={people} me={me} subscribe={subscribe} />
          ) : openId && list ? (
            <div className="chat-placeholder"><Empty icon="messages" title="Sohbet bulunamadı" plain /></div>
          ) : (
            <div className="chat-placeholder hide-sm">
              <span className="tile lg"><Icon name="messages" size={24} /></span>
              <h3>Bir sohbet seç</h3>
              <p className="muted small">Soldan bir sohbet aç ya da yeni bir tane başlat.</p>
              <button className="btn primary" onClick={() => setCreating(true)}><Icon name="pen" size={15} />Yeni sohbet</button>
            </div>
          )}
        </section>
      </div>
      {creating && <NewChat people={[...people.values()].filter((p) => p.ownerId !== me)} onClose={() => setCreating(false)} onCreate={create} />}
    </div>
  );
}
