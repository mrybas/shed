// Small helpers shared by v2 components (mirrors the design prototype).
export const SUB_MULT = { quarter: 1, eighth: 2, triplet: 3, sixteenth: 4 }
export const TIME_SIGS = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8']

export function parseSig(sig) {
  const [num, den] = sig.split('/').map(Number)
  return { num: num || 4, den: den || 4 }
}

// Convert a "4/4" sig string to our model's timeSignature object.
export function sigToTimeSignature(sig) {
  const { num, den } = parseSig(sig)
  return { beats: num, unit: den }
}
