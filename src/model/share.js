// Share an exercise as a URL: JSON → deflate (when CompressionStream exists) →
// base64url in the location hash. Prefixes: 'd:' deflated, 'r:' raw.

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

export async function encodeShare(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))
      const buf = await new Response(stream).arrayBuffer()
      return 'd:' + b64url(new Uint8Array(buf))
    } catch { /* fall through to raw */ }
  }
  return 'r:' + b64url(bytes)
}

export async function decodeShare(s) {
  const tag = s.slice(0, 2)
  const bytes = unb64url(s.slice(2))
  if (tag === 'd:') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    const buf = await new Response(stream).arrayBuffer()
    return JSON.parse(new TextDecoder().decode(buf))
  }
  if (tag === 'r:') return JSON.parse(new TextDecoder().decode(bytes))
  throw new Error('Unknown share format')
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
