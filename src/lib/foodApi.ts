import { useEffect, useState } from 'react'
import { parseOffProduct, type NewFood } from './nutrition'

const FIELDS = 'code,product_name,product_name_de,brands,nutriments,product_quantity_unit,quantity'

export async function searchOff(query: string, signal?: AbortSignal): Promise<NewFood[]> {
  const key = query.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '40',
    fields: FIELDS,
  })
  const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { products?: Record<string, unknown>[] }
  const results = dedupeFoods((data.products ?? []).map(parseOffProduct).filter((p): p is NewFood => !!p)).slice(0, 25)
  cache.set(key, results)
  return results
}

const cache = new Map<string, NewFood[]>()

export async function fetchProduct(code: string): Promise<NewFood | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { status?: number; product?: Record<string, unknown> }
  if (data.status !== 1 || !data.product) return null
  const food = parseOffProduct({ ...data.product, code })
  return food && { ...food, barcode: code }
}

export function dedupeFoods(foods: NewFood[]) {
  const seen = new Set<string>()
  return foods.filter((f) => {
    const key = `${f.name}|${f.brand ?? ''}|${f.kcal}`.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

type OnlineState = { status: 'idle' | 'loading' | 'done' | 'offline' | 'busy'; results: NewFood[] }

export function useOnlineSearch(query: string, enabled: boolean): OnlineState {
  const [state, setState] = useState<OnlineState & { query: string }>({ query: '', status: 'idle', results: [] })
  const q = query.trim()
  const active = enabled && q.length >= 3 && navigator.onLine

  useEffect(() => {
    if (!active) return
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      searchOff(q, ctrl.signal)
        .then((results) => setState({ query: q, status: 'done', results }))
        .catch((e) => {
          const err = e as Error
          if (err.name !== 'AbortError') setState({ query: q, status: 'busy', results: [] })
        })
    }, 700)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [q, active])

  if (!enabled || q.length < 3) return { status: 'idle', results: [] }
  if (!navigator.onLine) return { status: 'offline', results: [] }
  if (state.query !== q) return { status: 'loading', results: state.results }
  return state
}
