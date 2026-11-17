# FreshKeep

FreshKeep is an Expo (React Native, TypeScript) app that tracks fridge items and their expiry, imports grocery orders from screenshots, and suggests meals that use near-expiry food. The full spec is in `docs/PRD.md`; follow its module numbers (M1–M22), data model and API contracts.

## Layout
- `/app` — Expo SDK 58, Expo Router (routes in `app/src/app/`), Zustand. See `app/AGENTS.md` for Expo-specific rules.
- `/server` — Hono + Zod proxy for Claude and Open Food Facts. Holds the API key; stores no user data.
- `/docs` — PRD and brand assets.

## Rules
- Business logic (expiry, date parsing, matching, scoring, diet filters, impact) lives in pure functions in `app/src/lib/` with Vitest tests in `app/src/lib/__tests__/`.
- Never put the Anthropic API key in the app. All AI calls go through `/server`.
- Hard diet/allergy rules are checked in code (`app/src/lib/meals.ts`), never trusted to the model.
- UI tokens are in `app/src/theme.ts`: brand green `#2A5731` (from the logo), red/amber/green urgency colours. Food-safety wording is "use soon / check before eating", never "safe to eat".
- After each change run `npm run typecheck` and `npm test` in both `app/` and `server/`.

## Deliberate MVP deviations from the PRD
- Local data is persisted with Zustand + AsyncStorage (works on phone and web) instead of expo-sqlite; the store in `app/src/store/useStore.ts` is the repository layer.
- Styling uses a StyleSheet token file instead of NativeWind.
- Expiry dates are typed (any printed format, parsed by M9) instead of read by the camera until the AI server is connected.
- Without a server URL the app runs fully offline: seed catalogue, 48 local recipes, manual order lines.
