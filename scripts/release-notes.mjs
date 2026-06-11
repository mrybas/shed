// Prints the GitHub Release notes (markdown) for a version, taken from the
// same changelog the in-app "What's new" dialog uses — one source of truth.
//
//   node scripts/release-notes.mjs v5.38
import { CHANGELOG } from '../src/data/changelog.js'

const version = process.argv[2]
const entry = CHANGELOG.find((e) => e.version === version)
if (!entry) {
  console.error(`No changelog entry for ${version} — add one to src/data/changelog.js`)
  process.exit(1)
}
const lines = entry.items.map((item) => `- ${item.text}`)
console.log(lines.join('\n'))
console.log('\n---\nTry it live: https://shed.beardlabs.cc')
