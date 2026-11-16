import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Chips, Dialog, ProgressBar, SystemWindow, TextField } from './ui'
import { CARD_ROUND_MIN, XP } from '../config/xp'
import type { CardRecord } from '../db/db'
import { BOX_DAYS, dueCards } from '../lib/cardBox'
import { addCard, deleteCard, finishRound, rateCard, updateCard, useCards } from '../lib/cards'
import { currentDay } from '../lib/events'
import { setSetting, useSetting } from '../db/settings'

type Draft = { id?: number; front: string; back: string; topic: string }
type Session = { free: boolean; queue: number[]; index: number; flipped: boolean; known: number; wrong: number; seen: number[] }
type Done = { known: number; wrong: number; xp: boolean; free: boolean }

const ALL = 'Alle'
const ORDERS = ['Feste Reihenfolge', 'Zufällig'] as const
const shuffle = <T,>(list: T[]) => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const boxLabel = (b: number) => (BOX_DAYS[b] === 0 ? 'neu' : `${BOX_DAYS[b]} T.`)

export function Flashcards({ subjectId }: { subjectId: number }) {
  const cards = useCards(subjectId)
  const today = useLiveQuery(() => currentDay())
  const [topic, setTopic] = useState(ALL)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [done, setDone] = useState<Done | null>(null)
  const [showList, setShowList] = useState(false)
  const order = useSetting('cardOrder')

  if (!cards || !today) return null
  const topics = [...new Set(cards.map((c) => c.topic).filter((t): t is string => !!t))].sort()
  const filtered = topic === ALL ? cards : cards.filter((c) => c.topic === topic)
  const due = dueCards(filtered, today)
  const byId = new Map(cards.map((c) => [c.id, c]))

  const start = (free: boolean) => {
    const base = [...(free ? filtered : due)].sort((a, b) => a.createdAt - b.createdAt)
    const list = order === 'random' ? shuffle(base) : base
    setDone(null)
    setSession({ free, queue: list.map((c) => c.id), index: 0, flipped: false, known: 0, wrong: 0, seen: [] })
  }

  const rate = async (known: boolean) => {
    if (!session) return
    const id = session.queue[session.index]
    if (!session.free) await rateCard(id, known)
    const queue = known ? session.queue : [...session.queue, id]
    const next: Session = {
      ...session,
      queue,
      index: session.index + 1,
      flipped: false,
      known: session.known + (known ? 1 : 0),
      wrong: session.wrong + (known ? 0 : 1),
      seen: session.seen.includes(id) ? session.seen : [...session.seen, id],
    }
    if (next.index < queue.length) return setSession(next)
    const xp = !session.free && (await finishRound(subjectId, next.seen.length))
    setSession(null)
    setDone({ known: next.known, wrong: next.wrong, xp, free: session.free })
  }

  const stop = async () => {
    if (!session) return
    const xp = !session.free && (await finishRound(subjectId, session.seen.length))
    setSession(null)
    setDone({ known: session.known, wrong: session.wrong, xp, free: session.free })
  }

  const save = async (again: boolean) => {
    if (!draft || !draft.front.trim() || !draft.back.trim()) return
    const data = { front: draft.front.trim(), back: draft.back.trim(), topic: draft.topic.trim() || undefined }
    if (draft.id) await updateCard(draft.id, data)
    else await addCard(subjectId, data)
    setDraft(again ? { front: '', back: '', topic: draft.topic } : null)
  }

  if (session) {
    const card = byId.get(session.queue[session.index])
    if (!card) return null
    return (
      <SystemWindow title={session.free ? 'Freies Üben' : 'Lernrunde'}>
        <ProgressBar value={session.index + 1} max={session.queue.length} label="Karte" />
        <button
          type="button"
          onClick={() => setSession({ ...session, flipped: !session.flipped })}
          className="mt-4 flex min-h-56 w-full flex-col items-center justify-center rounded-lg border border-sys-glow/60 bg-sys-glow/5 p-4 text-center shadow-glow"
        >
          {card.topic && <span className="mb-2 text-xs uppercase tracking-widest text-sys-muted">{card.topic}</span>}
          <span className="whitespace-pre-wrap text-lg">{session.flipped ? card.back : card.front}</span>
          <span className="mt-4 text-xs text-sys-muted">{session.flipped ? 'Rückseite' : 'Tippen zum Umdrehen'}</span>
        </button>
        {session.flipped ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="danger" onClick={() => rate(false)}>
              Nicht gewusst
            </Button>
            <Button onClick={() => rate(true)}>Gewusst</Button>
          </div>
        ) : (
          <Button className="mt-4 w-full" onClick={() => setSession({ ...session, flipped: true })}>
            Umdrehen
          </Button>
        )}
        <button type="button" className="mt-3 w-full text-xs text-sys-muted underline" onClick={stop}>
          Runde beenden
        </button>
      </SystemWindow>
    )
  }

  return (
    <>
      {done && (
        <SystemWindow title="Runde beendet">
          <p className="text-center">
            <span className="text-sys-glow">{done.known} gewusst</span> · <span className="text-sys-danger">{done.wrong} nicht gewusst</span>
          </p>
          <p className="mt-1 text-center text-xs text-sys-muted">
            {done.free
              ? 'Freies Üben ändert die Fächer nicht und gibt keine XP.'
              : done.xp
                ? `+${XP.cards_round} XP (Intelligenz)`
                : `XP gibt es ab ${CARD_ROUND_MIN} Karten pro Runde (höchstens 3 Runden am Tag).`}
          </p>
        </SystemWindow>
      )}

      <SystemWindow title="Karteikarten">
        {topics.length > 0 && (
          <div className="mb-4">
            <Chips options={[ALL, ...topics]} value={topic} onChange={setTopic} />
          </div>
        )}
        <div className="mb-4 grid grid-cols-6 gap-1 text-center">
          {BOX_DAYS.map((_, b) => (
            <div key={b} className="rounded border border-sys-line py-1">
              <span className="block text-lg tabular-nums">{filtered.filter((c) => c.box === b).length}</span>
              <span className="block text-[10px] text-sys-muted">{boxLabel(b)}</span>
            </div>
          ))}
        </div>
        <div className="mb-3">
          <Chips
            label="Reihenfolge"
            options={ORDERS}
            value={order === 'random' ? 'Zufällig' : 'Feste Reihenfolge'}
            onChange={(o) => setSetting('cardOrder', o === 'Zufällig' ? 'random' : 'fixed')}
          />
        </div>
        <Button className="w-full" disabled={!due.length} onClick={() => start(false)}>
          {due.length ? `Lernen (${due.length} fällig)` : 'Heute nichts fällig'}
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="ghost" disabled={!filtered.length} onClick={() => start(true)}>
            Alle üben
          </Button>
          <Button variant="ghost" onClick={() => setDraft({ front: '', back: '', topic: topic === ALL ? '' : topic })}>
            + Karte
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-sys-muted">
          Gewusst → nächstes Fach (1, 2, 4, 8, 16 Tage). Nicht gewusst → zurück an den Anfang.
        </p>
        {filtered.length > 0 && (
          <button type="button" className="mt-3 w-full text-xs text-sys-muted underline" onClick={() => setShowList(!showList)}>
            {showList ? 'Karten ausblenden' : `Alle Karten (${filtered.length})`}
          </button>
        )}
        {showList && (
          <ul className="mt-2 divide-y divide-sys-line">
            {[...filtered]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((c) => (
                <CardRow key={c.id} card={c} onEdit={() => setDraft({ id: c.id, front: c.front, back: c.back, topic: c.topic ?? '' })} />
              ))}
          </ul>
        )}
      </SystemWindow>

      <Dialog open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Karte bearbeiten' : 'Neue Karte'}>
        {draft && (
          <div className="space-y-3">
            <TextField label="Vorderseite (Frage)" multiline rows={3} value={draft.front} onChange={(front) => setDraft({ ...draft, front })} />
            <TextField label="Rückseite (Antwort)" multiline rows={3} value={draft.back} onChange={(back) => setDraft({ ...draft, back })} />
            <TextField label="Thema (optional)" value={draft.topic} onChange={(t) => setDraft({ ...draft, topic: t })} placeholder="z. B. Kapitel 2" />
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <button key={t} type="button" className="rounded-full border border-sys-line px-3 py-1 text-xs text-sys-muted" onClick={() => setDraft({ ...draft, topic: t })}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            {draft.id ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="danger"
                  onClick={async () => {
                    await deleteCard(draft.id!)
                    setDraft(null)
                  }}
                >
                  Löschen
                </Button>
                <Button disabled={!draft.front.trim() || !draft.back.trim()} onClick={() => save(false)}>
                  Speichern
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" disabled={!draft.front.trim() || !draft.back.trim()} onClick={() => save(false)}>
                  Speichern
                </Button>
                <Button disabled={!draft.front.trim() || !draft.back.trim()} onClick={() => save(true)}>
                  + Nächste
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  )
}

function CardRow({ card, onEdit }: { card: CardRecord; onEdit: () => void }) {
  return (
    <li>
      <button type="button" className="w-full py-2 text-left" onClick={onEdit}>
        <span className="block truncate">{card.front}</span>
        <span className="block truncate text-xs text-sys-muted">
          {card.back} · {boxLabel(card.box)}
        </span>
      </button>
    </li>
  )
}
