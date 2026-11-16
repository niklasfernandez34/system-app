import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { useSearchParams } from 'react-router'
import { Button, Chips, Dialog, DrawingEditor, DrawingPreview, SystemWindow, TextField } from './ui'
import { db, type FileCategory } from '../db/db'
import { isEmpty } from '../lib/drawing'
import { defaultTitle, hostOf, normalizeUrl, youtubeId } from '../lib/links'
import {
  addFolder,
  addLink,
  deleteFolder,
  deleteLink,
  renameFolder,
  updateFile,
  updateLink,
  useMaterial,
  type MaterialItem,
} from '../lib/material'
import { addFiles, deleteFile, openFile, shareFile } from '../lib/uni'
import { createDrawing, deleteDrawings, updateDrawingMeta } from '../lib/drawings'

const CATEGORIES: { id: FileCategory; label: string; one: string }[] = [
  { id: 'script', label: 'Skripte', one: 'Skript' },
  { id: 'exercise', label: 'Übungen', one: 'Übung' },
  { id: 'note', label: 'Notizen', one: 'Notiz' },
  { id: 'video', label: 'Videos', one: 'Video' },
  { id: 'web', label: 'Webseiten', one: 'Webseite' },
]
const one = (c: FileCategory) => CATEGORIES.find((x) => x.id === c)!.one
const byOne = (o: string) => CATEGORIES.find((x) => x.one === o)!.id
const NO_FOLDER = 'Ohne Ordner'

const sizeLabel = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`)
const fileIcon = (t: string) => (t === 'application/pdf' ? 'PDF' : t.startsWith('image/') ? 'BILD' : t.startsWith('video/') ? 'VIDEO' : 'DATEI')

type LinkDraft = { id?: number; url: string; title: string; category: FileCategory; folder?: string; touched: boolean }
type Edit = { item: MaterialItem; name: string; url: string; category: FileCategory; folder?: string; noSync?: boolean }

export function Material({ subjectId, folders }: { subjectId: number; folders: string[] }) {
  const items = useMaterial(subjectId)
  const [params, setParams] = useSearchParams()
  const folder = params.get('ordner') ?? undefined
  const input = useRef<HTMLInputElement>(null)
  const [upload, setUpload] = useState<FileCategory | null>(null)
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<LinkDraft | null>(null)
  const [edit, setEdit] = useState<Edit | null>(null)
  const [folderName, setFolderName] = useState<{ from?: string; name: string } | null>(null)
  const [filter, setFilter] = useState('Alle')
  const [drawing, setDrawing] = useState<number | null>(null)

  if (!items) return null
  const open = (f?: string) => setParams(f ? { bereich: 'dateien', ordner: f } : { bereich: 'dateien' }, { replace: true })
  const here = items.filter((i) => (i.folder ?? undefined) === folder || (folder === undefined && i.folder && !folders.includes(i.folder)))
  const kinds = CATEGORIES.filter((c) => here.some((i) => i.category === c.id))
  const active = kinds.some((k) => k.one === filter) ? filter : 'Alle'
  const shown = active === 'Alle' ? here : here.filter((i) => one(i.category) === active)
  const total = items.reduce((a, i) => a + (i.kind === 'file' ? i.size : 0), 0)

  const saveLink = async () => {
    if (!link) return
    const url = normalizeUrl(link.url)
    if (!url) return
    const data = { url, title: link.title.trim() || defaultTitle(url), category: link.category, folder: link.folder }
    if (link.id) await updateLink(link.id, data)
    else await addLink(subjectId, data)
    setLink(null)
  }

  const saveEdit = async () => {
    if (!edit) return
    const { item } = edit
    if (item.kind === 'file') await updateFile(item.id, { name: edit.name.trim() || item.name, category: edit.category, folder: edit.folder, noSync: edit.noSync || undefined })
    else if (item.kind === 'drawing') await updateDrawingMeta(item.id, { title: edit.name.trim() || 'Handschrift', category: edit.category, folder: edit.folder })
    else {
      const url = normalizeUrl(edit.url) || item.url
      await updateLink(item.id, { title: edit.name.trim() || defaultTitle(url), url, category: edit.category, folder: edit.folder })
    }
    setEdit(null)
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        onChange={async (e) => {
          const list = e.target.files
          if (!list?.length || !upload) return
          setBusy(true)
          try {
            await addFiles(subjectId, upload, list, folder)
          } finally {
            setBusy(false)
            setUpload(null)
            e.target.value = ''
          }
        }}
      />

      {folder === undefined && (
        <SystemWindow title="Ordner">
          <div className="grid grid-cols-2 gap-3">
            {folders.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => open(f)}
                className="flex min-h-20 flex-col justify-between rounded-lg border border-sys-glow/60 bg-sys-glow/5 p-3 text-left shadow-glow active:bg-sys-glow/20"
              >
                <span className="font-semibold leading-tight">▸ {f}</span>
                <span className="text-xs text-sys-muted">{items.filter((i) => i.folder === f).length} Einträge</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFolderName({ name: '' })}
              className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-sys-line text-sys-muted active:bg-sys-line/30"
            >
              + Ordner
            </button>
          </div>
        </SystemWindow>
      )}

      <SystemWindow title={folder ?? NO_FOLDER}>
        {folder !== undefined && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => open()}>
              ‹ Alle Ordner
            </Button>
            <Button variant="ghost" onClick={() => setFolderName({ from: folder, name: folder })}>
              Ordner bearbeiten
            </Button>
          </div>
        )}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Button disabled={busy} className="px-2" onClick={() => setUpload('script')}>
            {busy ? '…' : '+ Datei'}
          </Button>
          <Button className="px-2" onClick={() => setLink({ url: '', title: '', category: 'video', folder, touched: false })}>
            + Link
          </Button>
          <Button
            className="px-2"
            onClick={async () => setDrawing(await createDrawing({ subjectId, folder, category: 'note', title: `Notiz ${format(new Date(), 'd.M.')}` }))}
          >
            ✎ Schrift
          </Button>
        </div>
        {kinds.length > 1 && <Chips options={['Alle', ...kinds.map((k) => k.one)]} value={active} onChange={setFilter} />}
        {!shown.length && <p className="mt-4 text-center text-sm text-sys-muted">Noch nichts hier.</p>}
        <ul className="mt-3 divide-y divide-sys-line">
          {shown.map((i) => (
            <Row
              key={`${i.kind}${i.id}`}
              item={i}
              onMore={() =>
                setEdit({ item: i, name: i.kind === 'file' ? i.name : i.title, url: i.kind === 'link' ? i.url : '', category: i.category, folder: i.folder, noSync: i.kind === 'file' ? i.noSync : undefined })
              }
              onOpen={() => (i.kind === 'file' ? openFile(i) : i.kind === 'link' ? window.open(i.url, '_blank', 'noopener') : setDrawing(i.id))
              }
            />
          ))}
        </ul>
        {folder === undefined && total > 0 && (
          <p className="mt-3 text-center text-xs text-sys-muted">Dateien belegen {sizeLabel(total)} · Backup unter „Fotos + Dateien“</p>
        )}
      </SystemWindow>

      <Dialog open={!!upload} onClose={() => setUpload(null)} title="Datei hinzufügen">
        {upload && (
          <div className="space-y-3">
            <Chips label="Art" options={CATEGORIES.filter((c) => c.id !== 'web').map((c) => c.one)} value={one(upload)} onChange={(o) => setUpload(byOne(o))} />
            <p className="text-center text-xs text-sys-muted">Ordner: {folder ?? NO_FOLDER}</p>
            <Button className="w-full" onClick={() => input.current?.click()}>
              Datei wählen
            </Button>
          </div>
        )}
      </Dialog>

      <Dialog open={!!link} onClose={() => setLink(null)} title="Link hinzufügen">
        {link && (
          <div className="space-y-3">
            <TextField
              label="Adresse"
              value={link.url}
              onChange={(url) => {
                const yt = !!youtubeId(normalizeUrl(url))
                setLink({ ...link, url, category: link.touched ? link.category : yt || !url ? 'video' : 'web' })
              }}
              placeholder="https://youtu.be/…"
            />
            <TextField label="Titel (optional)" value={link.title} onChange={(title) => setLink({ ...link, title })} placeholder={normalizeUrl(link.url) ? defaultTitle(normalizeUrl(link.url)) : 'z. B. Ableitungen erklärt'} />
            <Chips label="Art" options={CATEGORIES.map((c) => c.one)} value={one(link.category)} onChange={(o) => setLink({ ...link, category: byOne(o), touched: true })} />
            <p className="text-center text-xs text-sys-muted">Ordner: {folder ?? NO_FOLDER}</p>
            {link.url.trim() && !normalizeUrl(link.url) && <p className="text-center text-sm text-sys-danger">Das ist keine gültige Adresse.</p>}
            <Button className="w-full" disabled={!normalizeUrl(link.url)} onClick={saveLink}>
              Speichern
            </Button>
          </div>
        )}
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.item.kind === 'link' ? 'Link' : edit?.item.kind === 'drawing' ? 'Handschrift' : 'Datei'}>
        {edit && (
          <div className="space-y-3">
            <TextField label={edit.item.kind === 'file' ? 'Name' : 'Titel'} value={edit.name} onChange={(name) => setEdit({ ...edit, name })} />
            {edit.item.kind === 'link' && <TextField label="Adresse" value={edit.url} onChange={(url) => setEdit({ ...edit, url })} />}
            <Chips label="Art" options={CATEGORIES.map((c) => c.one)} value={one(edit.category)} onChange={(o) => setEdit({ ...edit, category: byOne(o) })} />
            <Chips
              label="Ordner"
              options={[NO_FOLDER, ...folders]}
              value={edit.folder && folders.includes(edit.folder) ? edit.folder : NO_FOLDER}
              onChange={(f) => setEdit({ ...edit, folder: f === NO_FOLDER ? undefined : f })}
            />
            {edit.item.kind === 'file' && (
              <label className="flex items-center gap-2 text-sm text-sys-muted">
                <input type="checkbox" className="h-5 w-5 accent-sys-glow" checked={!!edit.noSync} onChange={(e) => setEdit({ ...edit, noSync: e.target.checked })} />
                Nur auf diesem Gerät (nicht synchronisieren, nicht im Backup)
              </label>
            )}
            {edit.item.kind === 'file' && (
              <Button variant="ghost" className="w-full" onClick={() => edit.item.kind === 'file' && shareFile(edit.item)}>
                Teilen / In anderer App öffnen
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="danger"
                onClick={async () => {
                  if (edit.item.kind === 'file') await deleteFile(edit.item.id)
                  else if (edit.item.kind === 'drawing') await deleteDrawings([edit.item.id])
                  else await deleteLink(edit.item.id)
                  setEdit(null)
                }}
              >
                Löschen
              </Button>
              <Button onClick={saveEdit}>Speichern</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!folderName} onClose={() => setFolderName(null)} title={folderName?.from ? 'Ordner bearbeiten' : 'Neuer Ordner'}>
        {folderName && (
          <div className="space-y-3">
            <TextField label="Name" value={folderName.name} onChange={(name) => setFolderName({ ...folderName, name })} placeholder="z. B. Grundlagen" />
            {folders.includes(folderName.name.trim()) && folderName.name.trim() !== folderName.from && (
              <p className="text-center text-sm text-sys-danger">Diesen Ordner gibt es schon.</p>
            )}
            <div className={`grid gap-2 ${folderName.from ? 'grid-cols-2' : ''}`}>
              {folderName.from && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    await deleteFolder(subjectId, folderName.from!)
                    setFolderName(null)
                    open()
                  }}
                >
                  Löschen
                </Button>
              )}
              <Button
                disabled={!folderName.name.trim() || (folders.includes(folderName.name.trim()) && folderName.name.trim() !== folderName.from)}
                onClick={async () => {
                  const name = folderName.name.trim()
                  if (folderName.from) {
                    await renameFolder(subjectId, folderName.from, name)
                    open(name)
                  } else await addFolder(subjectId, name)
                  setFolderName(null)
                }}
              >
                Speichern
              </Button>
            </div>
            {folderName.from && <p className="text-center text-xs text-sys-muted">Beim Löschen kommt der Inhalt nach „{NO_FOLDER}“.</p>}
          </div>
        )}
      </Dialog>
      <DrawingEditor
        id={drawing}
        onClose={async () => {
          const id = drawing
          setDrawing(null)
          const d = id ? await db.drawings.get(id) : undefined
          if (id && d && isEmpty(d.pages)) await deleteDrawings([id])
        }}
      />
    </>
  )
}

function Row({ item, onMore, onOpen }: { item: MaterialItem; onMore: () => void; onOpen: () => void }) {
  const yt = item.kind === 'link' ? youtubeId(item.url) : null
  const [thumbOk, setThumbOk] = useState(true)
  const title = item.kind === 'file' ? item.name : item.title
  const sub =
    item.kind === 'file'
      ? `${one(item.category)} · ${sizeLabel(item.size)} · ${format(item.createdAt, 'd.M.yy')}${item.noSync ? ' · nur hier' : ''}`
      : item.kind === 'drawing'
        ? `${one(item.category)} · Handschrift · ${format(item.updatedAt, 'd.M.yy')}`
        : `${one(item.category)} · ${hostOf(item.url)}`
  return (
    <li className="flex items-center gap-3 py-2">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onOpen}
      >
        {item.kind === 'drawing' ? (
          <span className="w-11 shrink-0">
            <DrawingPreview id={item.id} />
          </span>
        ) : yt && thumbOk ? (
          <img
            src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`}
            alt=""
            onError={() => setThumbOk(false)}
            className="h-9 w-16 shrink-0 rounded border border-sys-line object-cover"
          />
        ) : (
          <span className="w-11 shrink-0 rounded border border-sys-glow/60 py-1 text-center text-[10px] font-semibold text-sys-glow">
            {item.kind === 'file' ? fileIcon(item.type) : yt ? '▶' : 'LINK'}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate">{title}</span>
          <span className="block truncate text-xs text-sys-muted">{sub}</span>
        </span>
      </button>
      <Button variant="ghost" className="px-3" onClick={onMore}>
        ⋯
      </Button>
    </li>
  )
}
