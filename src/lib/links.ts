export function normalizeUrl(input: string) {
  const s = input.trim()
  if (!s) return ''
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`
  try {
    return new URL(withProto).toString()
  } catch {
    return ''
  }
}

export function youtubeId(url: string) {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host !== 'youtube.com' && host !== 'music.youtube.com') return null
    if (u.pathname === '/watch') return u.searchParams.get('v')
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/?]+)/)
    return m ? m[2] : null
  } catch {
    return null
  }
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function defaultTitle(url: string) {
  return youtubeId(url) ? 'YouTube-Video' : hostOf(url) || 'Link'
}
