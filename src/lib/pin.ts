import { useSyncExternalStore } from 'react'
import { getSetting, setSetting } from '../db/settings'

let unlocked = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useUnlocked() {
  return useSyncExternalStore(subscribe, () => unlocked)
}

export function lock() {
  unlocked = false
  emit()
}

document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && lock())

async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`system-app:${pin}`))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function checkPin(pin: string) {
  const hash = await getSetting('pinHash')
  return !!hash && hash === (await hashPin(pin))
}

export async function tryUnlock(pin: string) {
  if (!(await checkPin(pin))) return false
  unlocked = true
  emit()
  return true
}

export async function setPin(pin: string) {
  await setSetting('pinHash', pin ? await hashPin(pin) : '')
}
