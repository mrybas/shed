// User click samples: persisted in IndexedDB (binary-friendly, offline in the
// PWA), decoded into AudioBuffers and handed to click.js at startup.
import { getAudioContext } from './AudioEngine.js'
import { setClickBuffer } from './click.js'

const DB_NAME = 'drums2_samples'
const STORE = 'clicks' // key: 'accent' | 'normal'; value: { name, data: ArrayBuffer }

export const MAX_SAMPLE_BYTES = 2 * 1024 * 1024

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const store = t.objectStore(STORE)
    const out = fn(store)
    t.oncomplete = () => resolve(out?.result)
    t.onerror = () => reject(t.error)
  })
}

async function decode(arrayBuffer) {
  const ctx = getAudioContext()
  // decodeAudioData consumes the buffer in some browsers — pass a copy.
  return ctx.decodeAudioData(arrayBuffer.slice(0))
}

// Save + decode + activate one slot. Returns the stored name.
export async function saveClickSample(slot, name, arrayBuffer) {
  if (arrayBuffer.byteLength > MAX_SAMPLE_BYTES) throw new Error('too-big')
  const buffer = await decode(arrayBuffer) // validate before persisting
  const db = await openDb()
  await tx(db, 'readwrite', (s) => s.put({ name, data: arrayBuffer }, slot))
  setClickBuffer(slot, buffer)
  return name
}

export async function deleteClickSample(slot) {
  const db = await openDb()
  await tx(db, 'readwrite', (s) => s.delete(slot))
  setClickBuffer(slot, null)
}

// Which slots have samples (names only — cheap, for UI lists).
export async function listClickSamples() {
  const db = await openDb()
  const out = {}
  for (const slot of ['accent', 'normal']) {
    const rec = await tx(db, 'readonly', (s) => s.get(slot))
    if (rec) out[slot] = { name: rec.name }
  }
  return out
}

// Decode persisted samples into the live click voice (call once at startup).
export async function initClickSamples() {
  try {
    const db = await openDb()
    for (const slot of ['accent', 'normal']) {
      const rec = await tx(db, 'readonly', (s) => s.get(slot))
      if (rec?.data) {
        try { setClickBuffer(slot, await decode(rec.data)) } catch { /* corrupt sample */ }
      }
    }
  } catch { /* IndexedDB unavailable (private mode) — synth click still works */ }
}
