// ════════════════════════════════════════════════════════════════
//  Dosyalar (Drive gibi). Her dosya = drive_files tablosunda bir satır + drive kovasında dosya.
//  Yükleme sırası: önce satır, sonra dosya satıra bağlanarak (table + rowId), sonra dosya adı satıra.
//  Kova "Row" okumalı: satırı okuyabilen (sahibi ya da sharedWith'teki kişi) dosyayı da indirir.
//  Klasör = satırdaki folder yolu ("Projeler/2026"); ayrı tablo gerekmez.
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import type { Row } from '@gridbasetr/client';
import { createRealtime } from '@gridbasetr/client/realtime';
import { nameOf, useAuth } from './shared/auth';
import { errorText, gb, table } from './shared/gridbase';
import { Icon, type IconName } from './shared/icons';
import { Avatar, Empty, ErrorText, Modal, Skeleton, TopBar, formatBytes, formatShortDate, navigate, useConfirm, useRoute } from './shared/ui';
import { ShareDialog, ensureProfile, splitIds, usePeople } from './people';

type DriveFile = Row<{ name: string; fileName: string | null; size: number; contentType: string | null; folder: string; sharedWith: string | null; ownerName: string | null; createdAt: string | null; ownerId: string }>;
const files = table<Omit<DriveFile, 'id'>>('drive_files');
const rt = createRealtime(gb);

// Dosya türü → renkli simge (uzantı yazılı). Renkler app.css'te (.ft-*).
const kind = (f: DriveFile): { cls: string; label: string; icon: IconName } => {
  const t = f.contentType ?? '';
  const ext = (/\.([a-z0-9]{1,5})$/i.exec(f.name)?.[1] ?? '').toUpperCase();
  if (t.startsWith('image/')) return { cls: 'img', label: ext || 'IMG', icon: 'image' };
  if (t === 'application/pdf') return { cls: 'pdf', label: 'PDF', icon: 'fileText' };
  if (t.startsWith('video/')) return { cls: 'video', label: ext || 'VID', icon: 'file' };
  if (t.startsWith('audio/')) return { cls: 'audio', label: ext || 'SES', icon: 'file' };
  if (/zip|rar|7z|tar/.test(t) || /\.(zip|rar|7z|tar|gz)$/i.test(f.name)) return { cls: 'zip', label: ext || 'ZIP', icon: 'file' };
  if (/\.(dwg|dxf|skp)$/i.test(f.name)) return { cls: 'cad', label: ext, icon: 'file' };
  if (/sheet|excel|csv/.test(t) || /\.(xlsx?|csv)$/i.test(f.name)) return { cls: 'xls', label: ext || 'XLS', icon: 'file' };
  if (/word|document/.test(t) || /\.(docx?|odt|rtf)$/i.test(f.name)) return { cls: 'doc', label: ext || 'DOC', icon: 'fileText' };
  return { cls: 'other', label: ext || 'DOSYA', icon: 'file' };
};

const FileIcon = ({ f }: { f: DriveFile }) => {
  const k = kind(f);
  return <span className={`ft ft-${k.cls}`}>{k.label.slice(0, 4)}</span>;
};

export function DrivePage() {
  const { user } = useAuth();
  const me = String(user!.id);
  const people = usePeople();
  const route = useRoute();
  const shared = route[0] === 'shared';
  const folder = route[0] === 'f' ? route.slice(1).join('/') : '';
  const [list, setList] = useState<DriveFile[] | null>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<{ file: DriveFile; url: string } | null>(null);
  const [sharing, setSharing] = useState<DriveFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  const load = useCallback(() => files.list({ sort: 'id:desc' }).then(setList).catch((e) => setError(errorText(e))), []);
  useEffect(() => {
    ensureProfile(user!).catch(() => undefined);
    load();
    const off = rt.subscribe<DriveFile>('drive_files', (c) =>
      setList((l) => {
        if (!l) return l;
        if (c.type === 'delete') return l.filter((x) => x.id !== c.id);
        return l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c.row! : x)) : [c.row!, ...l];
      }),
    );
    return off;
  }, [user, load]);

  async function upload(list: FileList | File[]) {
    setError(null);
    for (const file of Array.from(list)) {
      setUploading((u) => [...u, file.name]);
      try {
        const row = await files.insert({
          name: file.name, size: file.size, contentType: file.type || null, folder, sharedWith: '', ownerName: nameOf(user), createdAt: new Date().toISOString(), fileName: null,
        });
        try {
          const fileName = await gb.storage.from('drive').upload(file, { table: 'drive_files', rowId: row.id });
          const done = await files.update(row.id, { fileName });
          setList((l) => (l?.some((x) => x.id === done.id) ? l.map((x) => (x.id === done.id ? done : x)) : [done, ...(l ?? [])]));
        } catch (e) {
          await files.delete(row.id).catch(() => undefined); // dosya gitmediyse boş satır kalmasın
          throw e;
        }
      } catch (e) {
        setError(`${file.name}: ${errorText(e)}`);
      } finally {
        setUploading((u) => u.filter((n) => n !== file.name));
      }
    }
  }

  async function open(f: DriveFile) {
    if (!f.fileName) return;
    try {
      const { url } = await gb.storage.getUrl(f.fileName); // özel kova: 5 dk geçerli imzalı link
      if (f.contentType?.startsWith('image/') || f.contentType === 'application/pdf') setPreview({ file: f, url });
      else window.open(url, '_blank');
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function remove(f: DriveFile) {
    if (!(await confirm.ask({ title: 'Dosya silinsin mi?', body: `“${f.name}” kalıcı olarak silinecek. Paylaştığın kişiler de artık göremez.`, ok: 'Sil', danger: true }))) return;
    try {
      if (f.fileName) await gb.storage.remove(f.fileName);
      await files.delete(f.id);
      setList((l) => l?.filter((x) => x.id !== f.id) ?? l);
    } catch (e) {
      setError(errorText(e));
    }
  }

  const all = list ?? [];
  const mine = all.filter((f) => f.ownerId === me);
  const inFolder = shared ? all.filter((f) => f.ownerId !== me) : mine.filter((f) => (f.folder ?? '') === folder);
  // Bu klasörün alt klasörleri (dosyaların yollarından)
  const subfolders = shared
    ? []
    : [...new Set(mine.map((f) => f.folder ?? '').filter((p) => p !== folder && (folder ? p.startsWith(folder + '/') : !!p)).map((p) => p.slice(folder ? folder.length + 1 : 0).split('/')[0]!))].sort();
  const used = mine.reduce((s, f) => s + (f.size || 0), 0);
  const crumbs = folder ? folder.split('/') : [];

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!shared && e.dataTransfer.files.length) upload(e.dataTransfer.files);
  };
  const folderHref = (parts: string[]) => `#/f/${parts.map(encodeURIComponent).join('/')}`;
  const quota = 100 * 1024 ** 2; // ücretsiz plan örneği; gerçek sınır GridBase planına bağlı
  const sharedCount = all.filter((f) => f.ownerId !== me).length;

  const newFolderForm = (
    <form
      className="row sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (newFolder?.trim()) navigate(`/f/${[...crumbs, newFolder.trim().replace(/\//g, '-')].map(encodeURIComponent).join('/')}`);
        setNewFolder(null);
      }}
    >
      <div className="input-icon">
        <Icon name="folder" size={15} />
        <input autoFocus placeholder="Klasör adı" value={newFolder ?? ''} onChange={(e) => setNewFolder(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setNewFolder(null)} style={{ height: 34, minHeight: 34, width: 180 }} />
      </div>
      <button className="btn sm primary">Oluştur</button>
      <button type="button" className="icon-btn" onClick={() => setNewFolder(null)} aria-label="Vazgeç"><Icon name="x" size={16} /></button>
    </form>
  );

  return (
    <>
      <TopBar title="Dosyalar" icon="folder" wide />
      <div className="drive">
        <aside className="drive-side">
          <button className="btn primary lg block" onClick={() => input.current?.click()} disabled={shared}>
            <Icon name="upload" size={17} />Yükle
          </button>
          <nav className="drive-nav">
            <a href="#/" className={!shared ? 'on' : ''}><Icon name="hardDrive" size={17} />Dosyalarım</a>
            <a href="#/shared" className={shared ? 'on' : ''}><Icon name="users" size={17} />Benimle paylaşılan{sharedCount > 0 && <span className="count">{sharedCount}</span>}</a>
          </nav>
          <div className="drive-quota">
            <div className="row between small"><span className="muted">Depolama</span><span className="tabular strong">{formatBytes(used)}</span></div>
            <div className="progress"><span style={{ width: `${Math.min(100, (used / quota) * 100)}%` }} /></div>
            <div className="faint xs">{mine.length} dosya · 100 MB'lık örnek kota</div>
          </div>
        </aside>

        <main
          className={`drive-main ${drag ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); if (!shared) setDrag(true); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }}
          onDrop={onDrop}
        >
          <div className="drive-tabs seg">
            <a href="#/" className={!shared ? 'on' : ''}>Dosyalarım</a>
            <a href="#/shared" className={shared ? 'on' : ''}>Paylaşılan</a>
          </div>
          <div className="drive-head">
            <nav className="crumbs" aria-label="Konum">
              {shared ? (
                <h1>Benimle paylaşılan</h1>
              ) : (
                <>
                  <a href="#/" className={crumbs.length ? '' : 'here'}>Dosyalarım</a>
                  {crumbs.map((c, i) => (
                    <span key={i} className="row sm">
                      <Icon name="chevronRight" size={15} className="faint" />
                      <a href={folderHref(crumbs.slice(0, i + 1))} className={i === crumbs.length - 1 ? 'here' : ''}>{c}</a>
                    </span>
                  ))}
                </>
              )}
            </nav>
            {!shared && (
              <div className="row sm">
                {newFolder === null ? (
                  <button className="btn sm" onClick={() => setNewFolder('')}><Icon name="folderPlus" size={16} />Yeni klasör</button>
                ) : newFolderForm}
                <button className="btn sm primary drive-upload-sm" onClick={() => input.current?.click()}><Icon name="upload" size={15} />Yükle</button>
              </div>
            )}
            <input ref={input} type="file" multiple hidden onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ''; }} />
          </div>

          {uploading.length > 0 && (
            <div className="card flush uploads">
              {uploading.map((n) => (
                <div key={n} className="list-item">
                  <span className="tile sm"><Icon name="cloudUpload" size={16} /></span>
                  <div className="grow stack sm">
                    <span className="small strong truncate">{n}</span>
                    <div className="progress indeterminate"><span /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <ErrorText>{error}</ErrorText>

          {!list ? (
            <div className="card flush">{[0, 1, 2, 3].map((i) => <div key={i} className="list-item"><Skeleton h={36} w={36} r={8} /><Skeleton h={14} w={`${50 - i * 8}%`} /></div>)}</div>
          ) : !subfolders.length && !inFolder.length ? (
            shared ? (
              <Empty icon="users" title="Seninle paylaşılan dosya yok">Biri sana bir dosya paylaştığında burada görünür.</Empty>
            ) : (
              <div className="drop-empty" onClick={() => input.current?.click()}>
                <span className="tile lg"><Icon name="cloudUpload" size={24} /></span>
                <h3>{folder ? 'Bu klasör boş' : 'Henüz dosya yok'}</h3>
                <p className="muted small">Dosyaları buraya sürükle ya da tıklayıp seç. Her tür dosya, en çok 100 MB.{folder && ' Klasör ilk dosyayla kalıcı olur.'}</p>
              </div>
            )
          ) : (
            <div className="card flush">
              <div className="file-head">
                <span className="grow">Ad</span>
                <span className="col-meta hide-sm">{shared ? 'Sahibi' : 'Eklendi'}</span>
                <span className="col-size">Boyut</span>
                <span className="col-act" />
              </div>
              <div className="list">
                {subfolders.map((s) => (
                  <a key={s} className="list-item file-row folder-row" href={folderHref([...crumbs, s])}>
                    <span className="ft ft-folder"><Icon name="folder" size={18} fill /></span>
                    <span className="grow strong truncate">{s}</span>
                    <span className="col-meta hide-sm muted small">Klasör</span>
                    <span className="col-size muted small">—</span>
                    <span className="col-act"><Icon name="chevronRight" size={16} className="faint" /></span>
                  </a>
                ))}
                {inFolder.map((f) => {
                  const shareIds = splitIds(f.sharedWith);
                  return (
                    <div key={f.id} className="list-item file-row">
                      <FileIcon f={f} />
                      <button className="file-name grow" onClick={() => open(f)} title={f.name}>
                        <span className="file-line">
                          <span className="truncate">{f.name}</span>
                          {!shared && shareIds.length > 0 && <span className="badge gray" title={`${shareIds.length} kişiyle paylaşıldı`}><Icon name="users" size={11} />{shareIds.length}</span>}
                        </span>
                        <span className="file-sub">{formatBytes(f.size || 0)} · {shared ? f.ownerName : formatShortDate(f.createdAt)}</span>
                      </button>
                      <span className="col-meta hide-sm muted small">
                        {shared ? <span className="row sm"><Avatar name={f.ownerName} size="xs" />{f.ownerName}</span> : formatShortDate(f.createdAt)}
                      </span>
                      <span className="col-size muted small tabular">{formatBytes(f.size || 0)}</span>
                      <span className="col-act actions">
                        <button className="icon-btn sm" title="İndir" onClick={() => open(f)}><Icon name="download" size={15} /></button>
                        {!shared && (
                          <>
                            <button className="icon-btn sm" title="Paylaş" onClick={() => setSharing(f)}><Icon name="userPlus" size={15} /></button>
                            <button className="icon-btn sm danger" title="Sil" onClick={() => remove(f)}><Icon name="trash" size={15} /></button>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {drag && (
            <div className="drop-overlay">
              <span className="tile lg"><Icon name="cloudUpload" size={26} /></span>
              <strong>Yüklemek için bırak</strong>
              <span className="small">{folder ? `“${crumbs[crumbs.length - 1]}” klasörüne` : 'Dosyalarım'}</span>
            </div>
          )}
        </main>
      </div>
      {preview && (
        <Modal
          title={preview.file.name}
          desc={`${formatBytes(preview.file.size || 0)} · ${formatShortDate(preview.file.createdAt)}`}
          onClose={() => setPreview(null)}
          size="xl"
          footer={<a className="btn primary" href={preview.url} target="_blank" rel="noreferrer"><Icon name="download" size={16} />İndir</a>}
        >
          {preview.file.contentType === 'application/pdf' ? (
            <iframe title={preview.file.name} src={preview.url} className="preview-frame" />
          ) : (
            <img src={preview.url} alt={preview.file.name} className="preview-img" />
          )}
        </Modal>
      )}
      {sharing && (
        <ShareDialog
          title={sharing.name}
          sharedWith={sharing.sharedWith}
          people={people}
          me={me}
          onClose={() => setSharing(null)}
          onSave={async (ids) => {
            const row = await files.update(sharing.id, { sharedWith: ids.join(',') });
            setList((l) => l?.map((x) => (x.id === row.id ? row : x)) ?? l);
          }}
        />
      )}
      {confirm.view}
    </>
  );
}
