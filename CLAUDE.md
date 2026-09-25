# CLAUDE.md — trazo-app (React/Vite frontend)

Mirror of the review-critical subset of the workspace rules (`~/dev/trazo/CLAUDE.md`
+ `.claude/rules/*`), which live outside this repo and are therefore invisible to CI.
Keep this short; edit it deliberately when a rule below changes.

## Commands
```bash
npm run start   # dev server
npm run build   # production build
npm run test    # vitest
npm run lint:fix
npm run format
```
⛔ `npm run build` passing proves NOTHING about types — ~815 TypeScript errors are masked
by the build config. A change is verified by rendering the page, not by a green build.

## ⛔ Git: shared working trees

Several Claude sessions share this checkout. Two rules, both learned by breaking them on
2026-09-25:

- **Stage only paths you edited.** `git add <file>` takes the whole file, including another
  session's hunks. Run `git status` first; use `git add -p` when a file is dirty from both.
  ⚠️ `src/i18n/lang/en-US.json` and `es-419.json` are the usual trap — nearly every
  session edits them. Append keys in place; never re-serialise or re-sort, which turns a 3-key
  change into a 7,700-line diff.
- **Branch from `origin/main`**, not the current HEAD:
  `git fetch origin && git switch -c <name> origin/main`. Then check
  `git log --oneline origin/main..HEAD` before opening the PR — anything unfamiliar there is
  someone's unreviewed work about to merge under your name.

⚠️ **A worktree must sit beside a matching `trazo-back` worktree.** 30 tests here reach
into `trazo-back/` by relative path, and 7 backend tests reach back as
`parents[3] / "trazo-app"`. A worktree elsewhere either fails outright or, worse, silently
compares against whatever branch the main `trazo-back` tree happens to hold. Pair them:
`~/dev/trazo-wt/<task>/{trazo-back,trazo-app}`, symlinking `node_modules`. Full recipe in the
workspace CLAUDE.md.

⛔ No AI attribution in commits or PR bodies.

## This repo is MIXED .jsx / .tsx
The activity wizard is `NewEvent.jsx`. Never filter a search to `.tsx` only — it fabricates
"orphaned code" findings.

## Colour — measured, not chosen
Green has two jobs and they are not interchangeable:

| Role | Token | Ratio |
|---|---|---|
| brand / decorative fill, icons, progress, tints | `green.500` #4CAF50 | never under white content |
| **text on white, badge fills, primary button** | `green.700` #2E7D32 | 5.13:1 ✓ |
| hover / active | `green.800` / `green.900` | 7.87 / 12.41 ✓ |
| non-text boundaries (borders, dividers, focus rings) | `green.600` #388E3C | 4.12:1 ✓ (needs 3.0) |

- **If it renders glyphs, it is `green.700`.** `green.600` is a BOUNDARY colour; it clears the
  3.0 non-text floor but not the 4.5 text floor. It spread to 75 `<Text>`/`<Link>`/`<Heading>`/
  `<StatNumber>` call sites because it read as "the safe dark green".
- **⛔ NEVER white text or a white icon on `green.500`** (2.78:1 — fails AA and the 3:1 non-text
  floor), and never `green.500` AS text on white. This regressed ~60 times because the colour
  arrives through a variable (`const accentColor = useColorModeValue('green.500', …)`), not a
  literal prop. Grep the DECLARATION, not the call site.
- **Hover must get DARKER.** `primaryHover: green.600` over a `green.700` button drops a
  white-labelled primary from 5.13 to 4.12 on pointer-enter. Hover = `green.800`.
- 16px bold is NOT "large text" (needs ≥18.66px bold or ≥24px), so bold 16px on a green fill
  still owes 4.5:1.
- ⛔ Never hardcode hex. Foreign palettes keep creeping in: `#38A169` is Chakra's green,
  `#16A34A`/`#22C55E` Tailwind's, `#F59E0B`/`#D97706` Tailwind ambers, and
  `trazo.emerald`/`#059669` is Tailwind emerald-600. A map API needing a literal string uses
  the theme's own hex, not a lookalike.

## Status colour = meaning, never decoration
done/success → green · in progress → `variant="warning"` · error → `danger` · a plain fact or
count → `neutral`. Usage meters encode UTILISATION (green → amber ≥80% → red ≥100%), not which
metric it is. Blue survives only in Chakra `Alert status="info"`.
- ⚠️ `colorScheme="amber"` is NOT a usable pill (amber tint = 2.63:1). Use `variant="warning"`.
- ⚠️ The theme defines `amber`, NOT `orange` — an `orange.*` token silently resolves to
  Chakra's orange, a different accent.

## Custom breakpoints (differ from Chakra defaults)
`src/theme/foundations/breakpoints.js`: `sm` = **320px** (not 480), `smd` 480, `smdd` 550,
`smddd` 690, `md` 768, `lg` 960, `xl` 1200.
Mobile-only (<480px) is `{{ base: 'x', smd: 'y' }}`, NEVER `{{ base: 'x', sm: 'y' }}`.

## Page layout
`StandardPage` owns the width (`PAGE_MAX_W = '8xl'`, 1440px) for hero, Back button and body.
⛔ Never cap content yourself — `<VStack maxW="6xl" mx="auto">` inside a page puts the title on
a different grid from its own cards (~140px offset at ≥1800px, invisible at 1440px). Use
`contentMaxW` only for a genuinely narrow page. A page reachable from the sidebar has NO Back
button; a drill-down always does.

## Components & sizing
1. Check `src/components/Design/StandardComponents.tsx` FIRST. 2. Chakra with theme props.
3. Custom components need approval.
- `StandardSegmentedControl` = one of a few views of the SAME content. `StandardSectionTabs` =
  different sections of one record. Neither uses `role="radiogroup"`. Selection is never signalled
  by colour alone.
- Never Chakra `2xs` (10px). Minimum 11px badges, 12px (`xs`) text.
- ⚠️ Chakra silently ignores some props: `Badge colorScheme`, `StandardCard variant`, Stack
  `divider`; `${status}.50` is not a token. `StandardCard` drops 14 props (no rest-spread).
  A test that supplies its own input passes forever — verify by computed style.

## Mutation payload rule (clobber class — 4 incidents)
A mutation/form payload sends ONLY fields its UI renders. Never hardcoded defaults for
unrendered keys (`treated_lumber_present: 'false'`, `conservation_practices: JSON.stringify([])`),
never destructive filters over another editor's rows. **One editor per fact** — §205.202 parcel
facts belong to the Parcel Application wizard only; sales to SalesRecordsSection; OFPP to the
farm profile card / OSP module G2.0. Tripwire:
`src/store/api/__tests__/mutationPayloadGuards.test.ts`. Verify any form change with a
round-trip: save, re-fetch, assert the OTHER editor's fields survived.

## State & data
- RTK Query for ALL API calls, `credentials: 'include'` (cookie auth). 401 → silent refresh →
  retry in `customFetchBase.ts`. Frontend never touches tokens in JS.
- ⛔ A duplicate RTK endpoint name silently no-ops (first module wins). Guard:
  `endpointNameCollisions.test.ts`.
- ⛔ A SKIPPED RTK query reads as `isLoading: false` with no data — do not render that as "empty".

## i18n
All user-facing text via `intl.formatMessage`, key added to BOTH locales in the same change.
ES farm term is **finca**, never granja. es-419 is neutral **tuteo**, not voseo (guard
`spanishRegister.test.ts`). ⛔ A zod schema at MODULE SCOPE is untranslatable by construction —
a string sweep cannot see it. `fieldValues.es.ts` is keyed by ENGLISH label.
Adding a field = the 7 steps in `src/config/events/ADDING_FIELDS.md`, in ONE change.

## Consumer-facing surfaces (highest-stakes)
- ⛔ **There is no transparency score.** Never render a 0-100 number, a percentage, a grade, an
  index, or a verdict badge ("Fully Documented") derived from a farm's own records. This is the
  self-created sustainability-label class banned by EU ECGT 2024/825 (live 2026-09-27) and an
  FTC 16 CFR 260.4 general-benefit risk. Counts, timelines, photo counts and third-party certs
  are fine; a total is not. Login does not make a claim safe.
- Progressive disclosure: transparency EVIDENCE first (factual counts), carbon inside an
  expandable section — never a carbon hero.
- Blockchain: "recorded", never "verified". The add-on is withdrawn; it is not consumer-facing.
- Certification badges: USDA Organic = "Verified" (green) only for a database match; everything
  else "Self-Reported" (gray). OMRI lists MATERIALS — never phrase a match as "your good practice".
- AVOID consumer copy: "CO2e", "LCA", "emission factors", "Scope 1/2/3".
- A NUMBER on screen is a claim — only show one we would defend in the first comment.

## CSS production build — DO NOT CHANGE
`emotion-cache.ts` (`speedy: false`), `trazo-dashboard-styles.css`, `netlify.toml`
(`[build.processing.css]` is load-bearing), `index.html` emotion insertion meta tag.
Deploy is **Netlify**, not Vercel; `vercel.json` has no CSS-processing equivalent.

## Verification
Test breakpoints at 375px, 768px, 1440px — and layout at ≥1800px. Touch targets 44px min.
QR page: <500ms load, <500KB initial bundle.
