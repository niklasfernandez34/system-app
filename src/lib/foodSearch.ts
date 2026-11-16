import MiniSearch, { type Query } from 'minisearch'
import { useEffect, useMemo, useState } from 'react'
import { FOOD_HEADWORDS, FOOD_SYNONYMS } from '../config/foodSynonyms'
import type { NewFood } from './nutrition'

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d)\s*,\s*(\d)/g, '$1.$2')
}

export function words(text: string) {
  return normalize(text)
    .split(/[^a-z0-9.]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean)
}

export function indexTerms(text: string) {
  const w = words(text)
  const out = [...w]
  for (let i = 0; i < w.length - 1; i++) out.push(w[i] + w[i + 1])
  for (const t of w)
    for (const h of FOOD_HEADWORDS) if (t.length > h.length + 2 && (t.endsWith(h) || t.startsWith(h))) out.push(h)
  return out
}

const GROUPS = FOOD_SYNONYMS.map((g) => g.map((m) => words(m)))

export function synonymsOf(term: string) {
  const out = new Set<string>([term])
  for (const g of GROUPS) {
    const hit = g.some((m) => m.length === 1 && (m[0] === term || (term.length >= 4 && m[0].startsWith(term))))
    if (hit) for (const m of g) out.add(m.join(' '))
  }
  return [...out]
}

export function buildQuery(text: string | string[]): Query | null {
  const terms = typeof text === 'string' ? words(text) : text
  if (!terms.length) return null
  return {
    combineWith: 'AND',
    queries: terms.map((t) => ({
      combineWith: 'OR',
      queries: synonymsOf(t).map((s) => (s.includes(' ') ? { combineWith: 'AND', queries: s.split(' ') } : s)),
    })),
  }
}

export type SearchDoc = { id: number; name: string; brand?: string; aliases?: string }

export function createIndex(docs: SearchDoc[], boost?: (id: number) => number) {
  const ms = new MiniSearch<SearchDoc>({
    fields: ['name', 'brand', 'aliases'],
    tokenize: indexTerms,
    processTerm: (t) => t,
    searchOptions: {
      tokenize: words,
      processTerm: (t) => t,
      prefix: true,
      fuzzy: (t) => (/\d/.test(t) ? false : t.length >= 7 ? 2 : t.length >= 4 ? 1 : false),
      boost: { name: 2 },
      boostDocument: boost ? (id) => boost(id as number) : undefined,
    },
  })
  ms.addAll(docs)
  return (text: string, limit = 30) => {
    const query = buildQuery(text)
    if (!query) return []
    const ids = ms.search(query).slice(0, limit).map((r) => r.id as number)
    const terms = words(text).slice(0, 6)
    if (terms.length < 2 || ids.length >= (terms.length === 2 ? 1 : 5)) return ids
    const found = new Set(ids)
    const more = terms
      .flatMap((_, i) => ms.search(buildQuery(terms.filter((__, j) => j !== i))!))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.id as number)
    return [...ids, ...more.filter((id) => !found.has(id) && found.add(id))].slice(0, limit)
  }
}

type Row = [string, string, string, string, number, number, number, number, number]

export function rowToFood(r: Row): NewFood {
  const generic = r[0].startsWith('ch:')
  return {
    name: r[1],
    brand: r[2] || undefined,
    barcode: generic ? undefined : r[0],
    ref: generic ? r[0] : undefined,
    source: generic ? 'base' : 'off',
    unit: r[8] ? 'ml' : 'g',
    kcal: r[4],
    protein: r[5],
    carbs: r[6],
    fat: r[7],
  }
}

type Base = { rows: Row[]; search: ReturnType<typeof createIndex>; byCode: Map<string, Row> }
let base: Promise<Base> | undefined

export function loadBase() {
  base ??= import('../data/foods.json').then((m) => {
    const rows = m.default as unknown as Row[]
    const search = createIndex(
      rows.map((r, id) => ({ id, name: r[1], brand: r[2], aliases: r[3] })),
      (id) => (rows[id][0].startsWith('ch:') ? 1.5 : 1),
    )
    const byCode = new Map(rows.filter((r) => !r[0].startsWith('ch:')).map((r) => [r[0], r]))
    return { rows, search, byCode }
  })
  return base
}

export async function findBaseBarcode(code: string) {
  const { byCode } = await loadBase()
  const row = byCode.get(code) ?? byCode.get(code.replace(/^0+/, '')) ?? byCode.get(code.padStart(13, '0'))
  return row ? rowToFood(row) : null
}

export function useBaseSearch(query: string, enabled: boolean) {
  const [data, setData] = useState<Base>()
  useEffect(() => {
    if (enabled) loadBase().then(setData)
  }, [enabled])
  const results = useMemo(
    () => (data && query.trim() ? data.search(query, 40).map((i) => rowToFood(data.rows[i])) : []),
    [data, query],
  )
  return { ready: !!data, results }
}
