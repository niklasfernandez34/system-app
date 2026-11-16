import { useEffect, useState } from 'react'
import { parseOffProduct, type NewFood } from './nutrition'

const FIELDS = 'code,product_name,product_name_de,brands,nutriments'

export async function searchOff(query: string, signal?: AbortSignal): Promise<NewFood[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    fields: FIELDS,
  })
  const res = await fetch(`https://de.openfoodfacts.org/cgi/search.pl?${params}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { products?: Record<string, unknown>[] }
  return (data.products ?? []).map(parseOffProduct).filter((p): p is NewFood => !!p)
}

type OnlineState = { status: 'idle' | 'loading' | 'done' | 'offline' | 'error'; results: NewFood[] }

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
          if ((e as Error).name !== 'AbortError') setState({ query: q, status: 'error', results: [] })
        })
    }, 600)
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
