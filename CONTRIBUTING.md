# Contributing to shed.

Thanks for wanting to help! shed. is a small, focused app — contributions
that keep it fast, offline-first and account-free are very welcome.

## Getting started

```sh
git clone https://github.com/mrybas/shed.git
cd shed
npm install
npm run dev        # http://localhost:5173
```

You'll want two checks green before opening a PR:

```sh
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end tests (Playwright; npx playwright install once)
```

## What a good PR looks like

- **Tests included.** Pure logic gets a unit test next to the module
  (`src/model/foo.js` → `src/model/foo.test.js`); user-facing behavior gets
  a scenario in `e2e/app.spec.js`.
- **Changelog entry.** Add your change to the top of
  `src/data/changelog.js` — it powers the in-app "What's new" dialog and the
  GitHub Release notes.
- **Guide updated.** If you added or changed a feature, document it in
  `src/data/guide.js` (the in-app manual). If the UI changed, regenerate
  screenshots: `node scripts/guide-shots.mjs` (with the dev server running).
- **One feature per PR**, with a clear description of why.

Don't bump `APP_VERSION` or create tags — versioning and releases are done
by the maintainer when merging (releases are tag-driven; the tag must match
`APP_VERSION`).

If you use an AI coding assistant, point it at `CLAUDE.md` — it encodes the
same process rules.

## Things to know

- **No sample files.** All drums and clicks are synthesized in
  `src/audio/`. Changes to synthesis need a human listening pass — describe
  what you changed and why it sounds better.
- **No copyrighted material.** Never commit book PDFs or scans (e.g. Stick
  Control) or anything from a `design/` folder. Exercise *transcriptions*
  (our own data files) are fine.
- **Static hosting only.** No backend, no accounts, no trackers. Features
  must work offline and keep all data on the device.

## Bugs & ideas

Open a [GitHub issue](https://github.com/mrybas/shed/issues/new/choose) —
there are templates for bug reports and feedback. The in-app Feedback button
prefills one with your app version and platform.

## License

shed. is licensed under [AGPL-3.0](LICENSE). By contributing you agree your
contribution is licensed under the same terms. For commercial licensing
questions contact max.a.rybas@gmail.com.
