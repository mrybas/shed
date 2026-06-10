// Adapter that maps our exercise data onto the v2 Library's category model.
import { getBuiltinExercises } from './builtinExercises.js'
import { getStickControlExercises } from './stickControl.js'
import { getFirstStepsExercises } from './firstSteps.js'

// Technique categories (id, colored hue, icon from our Icon set, bilingual label).
export const CATEGORIES = [
  { id: 'firstSteps', hue: 'oklch(0.72 0.17 150)', icon: 'play', label: { en: 'First steps', uk: 'Перші кроки' } },
  { id: 'singles', hue: 'oklch(0.70 0.155 38)', icon: 'accent', label: { en: 'Singles', uk: 'Одиничні' } },
  { id: 'doubles', hue: 'oklch(0.74 0.115 178)', icon: 'grid', label: { en: 'Doubles', uk: 'Подвійні' } },
  { id: 'triples', hue: 'oklch(0.62 0.16 274)', icon: 'grid', label: { en: 'Triples', uk: 'Потрійні' } },
  { id: 'quads', hue: 'oklch(0.78 0.14 78)', icon: 'grid', label: { en: 'Quads', uk: 'Четверні' } },
  { id: 'paradiddle', hue: 'oklch(0.72 0.13 320)', icon: 'notes', label: { en: 'Paradiddles', uk: 'Парадидли' } },
  { id: 'rudiments', hue: 'oklch(0.72 0.13 158)', icon: 'star', label: { en: 'Rudiments', uk: 'Рудименти' } },
  { id: 'grooves', hue: 'oklch(0.74 0.12 250)', icon: 'metro', label: { en: 'Grooves', uk: 'Груви' } },
  { id: 'triplets', hue: 'oklch(0.70 0.14 30)', icon: 'notes', label: { en: 'Triplets', uk: 'Тріолі' } },
  { id: 'rolls', hue: 'oklch(0.66 0.14 280)', icon: 'grid', label: { en: 'Rolls', uk: 'Роли' } },
  { id: 'flams', hue: 'oklch(0.74 0.13 130)', icon: 'accent', label: { en: 'Flams', uk: 'Флеми' } },
]

export function CAT(id) {
  return CATEGORIES.find((c) => c.id === id) || null
}

// Derive a technique category from one of our exercise objects.
export function catOf(ex) {
  if (ex.cat) return ex.cat
  if (ex.section === 'first-steps') return 'firstSteps'
  if (ex.section === 'triplets') return 'triplets'
  if (ex.section === 'rolls') return 'rolls'
  if (ex.section === 'flams') return 'flams'
  if (ex.section === 'paradiddle') return 'paradiddle'
  if (ex.section === 'grooves') return 'grooves'
  if (ex.section === 'rudiments') return 'rudiments'
  if (ex.section === 'single-beat') {
    const tag = (ex.tags || []).find((t) => ['singles', 'doubles', 'triples', 'quads'].includes(t))
    return tag || 'singles'
  }
  // user / unknown -> infer from stroke tag if present, else grooves
  const tag = (ex.tags || []).find((t) => ['singles', 'doubles', 'triples', 'quads'].includes(t))
  return tag || 'grooves'
}

export function sigOf(ex) {
  return `${ex.timeSignature.beats}/${ex.timeSignature.unit}`
}

// Difficulty: an explicit ex.level wins; otherwise infer from the category.
export const LEVELS = ['beginner', 'intermediate', 'advanced']
export function levelOf(ex) {
  if (ex.level) return ex.level
  const cat = catOf(ex)
  if (cat === 'firstSteps') return 'beginner'
  if (cat === 'grooves' || cat === 'singles') return 'beginner'
  if (['quads', 'rolls', 'flams'].includes(cat)) return 'advanced'
  return 'intermediate' // doubles, triples, paradiddles, rudiments, triplets, user
}

// All built-in catalog exercises (Stick Control + Drumeo + basics), tagged with
// cat, ordered by category (so the library reads top-to-bottom), and given a
// single continuous number 1..N across the whole library. The source book
// number is preserved separately as `sourceNumber` for reference.
export function getCatalogExercises() {
  const order = new Map(CATEGORIES.map((c, i) => [c.id, i]))
  const all = [...getFirstStepsExercises(), ...getBuiltinExercises(), ...getStickControlExercises()].map((ex) => ({ ...ex, cat: catOf(ex) }))
  // Stable sort (preserves each category's source order) by category position.
  all.sort((a, b) => (order.get(a.cat) ?? 999) - (order.get(b.cat) ?? 999))
  return all.map((ex, i) => ({ ...ex, sourceNumber: ex.number ?? null, number: i + 1 }))
}
