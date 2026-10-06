// Share an exercise as a URL: compact JSON → deflate (when CompressionStream
// exists) → base64url in the location hash, plus a CRC32 so a link that got
// mangled in transit is detected instead of silently decoding to garbage.
//
// Prefixes:
//   'z:' compact + deflated, 'j:' compact raw — both end in '.<crc32 hex>'
//   'd:' / 'r:' legacy full-JSON links (deflated / raw), still decoded.
//
// Compact form: grid rows are stored sparsely — only cells that sound — because
// hundreds of identical empty cells are what made the old links long and
// prone to losing a repeated chunk when copied around.

import { INSTRUMENTS } from './exercise.js'

export class ShareLinkError extends Error {
  constructor(msg) { super(msg); this.name = 'ShareLinkError' }
}

function b64url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function unb64url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

let crcTable = null
export function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

// ---- Compact exercise form ----
const CELL_DEFAULTS = { accent: false, roll: 0 }

// A sounding cell becomes its gap from the previous stored cell (plain hit) or
// [gap, {props that differ from a plain hit}]. Gaps, not absolute indices, so a
// groove that repeats bar after bar packs into a repeating sequence that
// deflate folds away. Silent cells are dropped unless they carry other props.
function packRow(row) {
  const out = []
  let prev = -1
  row.forEach((c, i) => {
    if (!c) return
    const diff = {}
    Object.keys(c).forEach((k) => {
      if (k === 'on') { if (!c.on) diff.on = false; return }
      if (k in CELL_DEFAULTS && c[k] === CELL_DEFAULTS[k]) return
      diff[k] = c[k]
    })
    const keys = Object.keys(diff)
    if (!c.on && keys.length === 1) return // just { on: false }
    out.push(keys.length ? [i - prev, diff] : i - prev)
    prev = i
  })
  return out
}

function unpackRow(packed, n) {
  const row = Array.from({ length: n }, () => ({ on: false, accent: false, roll: 0 }))
  let i = -1
  for (const e of packed || []) {
    const [gap, diff] = Array.isArray(e) ? e : [e, {}]
    if (!Number.isInteger(gap) || gap < 1) break
    i += gap
    if (i >= n) break
    row[i] = { on: true, accent: false, roll: 0, ...diff }
  }
  return row
}

export function compactExercise(ex) {
  if (!ex || !ex.rows) return ex
  const n = ex.rows[INSTRUMENTS[0]]?.length ?? Object.values(ex.rows)[0]?.length ?? 0
  const h = {}
  Object.keys(ex.rows).forEach((k) => {
    const packed = packRow(ex.rows[k] || [])
    if (packed.length) h[k] = packed
  })
  // Sticking as one string, '.' for blank — repeating patterns compress well.
  const st = ex.sticking || []
  const s = st.every((v) => !v || (v.length === 1 && v !== '.')) ? st.map((v) => v || '.').join('') : st
  const { rows, sticking, ...rest } = ex // eslint-disable-line no-unused-vars
  return { ...rest, _c: 1, n, h, s }
}

export function expandExercise(obj) {
  if (!obj || obj._c !== 1) return obj
  const { _c, n, h, s, ...rest } = obj // eslint-disable-line no-unused-vars
  const rows = {}
  const keys = new Set([...INSTRUMENTS, ...Object.keys(h || {})])
  keys.forEach((k) => { rows[k] = unpackRow(h?.[k], n) })
  const sticking = Array.from({ length: n }, (_, i) => {
    const v = typeof s === 'string' ? s[i] : s?.[i]
    return !v || v === '.' ? '' : v
  })
  return { ...rest, rows, sticking }
}

// ---- Encode / decode ----
async function deflate(bytes) {
  const stream = new Response(bytes).body.pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function inflate(bytes) {
  const stream = new Response(bytes).body.pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function encodeShare(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(compactExercise(obj)))
  const sum = crc32(bytes)
  if (typeof CompressionStream !== 'undefined') {
    try {
      return `z:${b64url(await deflate(bytes))}.${sum}`
    } catch { /* fall through to raw */ }
  }
  return `j:${b64url(bytes)}.${sum}`
}

// Decodes any link format; throws ShareLinkError when the payload is damaged.
export async function decodeShare(s) {
  const tag = s.slice(0, 2)
  try {
    if (tag === 'z:' || tag === 'j:') {
      const dot = s.lastIndexOf('.')
      if (dot < 2) throw new ShareLinkError('missing checksum')
      const sum = s.slice(dot + 1)
      const packed = unb64url(s.slice(2, dot))
      const bytes = tag === 'z:' ? await inflate(packed) : packed
      if (crc32(bytes) !== sum) throw new ShareLinkError('checksum mismatch')
      return expandExercise(JSON.parse(new TextDecoder().decode(bytes)))
    }
    if (tag === 'd:') return JSON.parse(new TextDecoder().decode(await inflate(unb64url(s.slice(2)))))
    if (tag === 'r:') return JSON.parse(new TextDecoder().decode(unb64url(s.slice(2))))
  } catch (e) {
    throw e instanceof ShareLinkError ? e : new ShareLinkError(e.message)
  }
  throw new ShareLinkError('Unknown share format')
}

export async function shareUrlFor(obj) {
  const encoded = await encodeShare(obj)
  return `${location.origin}${location.pathname}#x=${encoded}`
}

// The encoded payload from the current URL hash, or null.
export function shareFromHash(hash = location.hash) {
  const m = hash.match(/[#&]x=([^&]+)/)
  return m ? m[1] : null
}
