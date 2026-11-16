import { describe, expect, it } from 'vitest'
import { decide } from './syncDecide'

const base = { remoteRev: 'r1', lastRev: 'r1', localHash: 'h1', lastHash: 'h1' }

describe('decide', () => {
  it('lädt hoch, wenn Dropbox noch leer ist', () => {
    expect(decide({ ...base, remoteRev: null, lastRev: null, lastHash: null })).toBe('upload')
  })
  it('tut nichts ohne Änderungen', () => {
    expect(decide(base)).toBe('none')
  })
  it('lädt hoch bei lokaler Änderung', () => {
    expect(decide({ ...base, localHash: 'h2' })).toBe('upload')
  })
  it('lädt herunter, wenn nur das andere Gerät etwas geändert hat', () => {
    expect(decide({ ...base, remoteRev: 'r2' })).toBe('download')
  })
  it('meldet Konflikt, wenn beide etwas geändert haben', () => {
    expect(decide({ ...base, remoteRev: 'r2', localHash: 'h2' })).toBe('conflict')
  })
  it('fragt beim ersten Verbinden mit vorhandenem Dropbox-Stand', () => {
    expect(decide({ remoteRev: 'r1', lastRev: null, localHash: 'h1', lastHash: null })).toBe('conflict')
  })
})
