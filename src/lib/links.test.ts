import { describe, expect, it } from 'vitest'
import { defaultTitle, normalizeUrl, youtubeId } from './links'

describe('normalizeUrl', () => {
  it('ergänzt https und lehnt Unsinn ab', () => {
    expect(normalizeUrl('youtube.com/watch?v=abc')).toBe('https://youtube.com/watch?v=abc')
    expect(normalizeUrl('  ')).toBe('')
    expect(normalizeUrl('http://a b')).toBe('')
  })
})

describe('youtubeId', () => {
  it('erkennt die üblichen YouTube-Adressen', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ?si=x')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://m.youtube.com/shorts/abc123')).toBe('abc123')
    expect(youtubeId('https://example.com/watch?v=abc')).toBe(null)
  })
})

describe('defaultTitle', () => {
  it('nimmt YouTube-Video oder den Seitennamen', () => {
    expect(defaultTitle('https://youtu.be/abc')).toBe('YouTube-Video')
    expect(defaultTitle('https://www.mathebibel.de/ableitung')).toBe('mathebibel.de')
  })
})
