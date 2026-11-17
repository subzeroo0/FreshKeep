# FreshKeep

Eat what you buy before it expires. FreshKeep keeps track of what's in your fridge and when each item expires. It then plans breakfast, lunch and dinner around whatever needs eating first.

![FreshKeep logo](docs/brand/freshkeep-logo.png)

## What's in the MVP

| Area | Status |
|---|---|
| Onboarding: household, diet, goals, allergies, cuisines, kitchen, nudges | ✅ every step skippable |
| Fridge home: Use today / This week / Fine / Expired, swipe used/thrown out, long-press menu, filters, search | ✅ |
| Item detail: confidence explanation, mark opened (date moves up), freezer, amount left, manual date | ✅ |
| Scan item: camera barcode on phone or typed barcode → Open Food Facts or a photo of the pack → expiry typed or scanned | ✅ |
| Quick add: 30 common chips, leftovers (2-day life), optional date | ✅ |
| Import order: your own screenshots or a photo of a bill, read by Claude (or typed in offline) → review → unpack checklist | ✅ |
| Expiry intelligence: Confirmed (printed date) → Estimated (category shelf life), opened/freezer overrides; the Learned layer fills in from real data later | ✅ unit-tested |
| Meals: B/L/D with rescue score, alternatives, "What can I make now?", "I cooked this" deducts from the fridge | ✅ offline recipes; AI planner with server |
| Impact: ₹ saved / wasted, rescued rate, weekly chart, most-wasted tip | ✅ |
| Nudges: morning + 6 PM local notifications, test nudge | ✅ (in-app banner on web) |
| Starts empty: no demo or sample data, everything comes from your own orders, scans and photos | ✅ |

## Run it

```bash
cd app
npm install
npx expo start          # scan the QR code with Expo Go (Android/iOS)
npm run web             # or open in a browser
npm test                # 42 logic tests
```

### Install on Android (APK)
**Download the latest build:** https://github.com/subzeroo0/FreshKeep/releases/latest/download/FreshKeep.apk (every push that touches `app/` or `server/` publishes a new release; all builds are under **Releases**). Open it on an Android phone and allow installs from unknown sources. The APK is signed with the debug key, which is fine for demos.

You can also use EAS: `npx eas-cli build -p android --profile preview` (needs an Expo account).

### Connect your Claude API key (real AI results)
The key lives only on the server. It never goes into the app or the repo.

1. **Deploy the server (about 5 min, free).** Sign in at [render.com](https://render.com) with GitHub → **New → Blueprint** → pick this repo and the branch `claude/peaceful-albattani-xjjw47`. Render reads `render.yaml` and asks for **ANTHROPIC_API_KEY**: paste your key there → **Apply**. When it's live, copy the URL, for example `https://freshkeep-api-xxxx.onrender.com`. Opening `<url>/health` should show `{"ok":true,"ai":true}`.
   *Railway or Fly.io work too: point them at `server/` and they'll use its `Dockerfile`. Set the same env var.*
2. **Point the app at it.** Either:
   - **Bake it into the APK:** GitHub → repo **Settings → Secrets and variables → Actions → Variables → New variable**, name `FRESHKEEP_API_URL`, value = the server URL. Then **Actions → Android APK → Run workflow**. Every APK built after that connects on its own.
   - **Or set it on the phone:** **Profile → AI server**, paste the URL → **Save & test**. It should say "Connected · AI on".
3. Render's free plan sleeps after 15 minutes idle, and the first request can take ~50 s to wake it. Open `/health` a minute before a demo.

**What turns on with the server**
| Where | What happens |
|---|---|
| Add → Import order | Pick up to 5 screenshots from Blinkit / Instamart / Zepto (or photograph a bill). Claude reads every line, price and quantity; you review, then they go in the fridge with dates |
| Add → Photo of a product | Snap the front of any pack, and Claude fills in name, brand, size, veg mark and category |
| Scan item → unknown barcode | Open Food Facts lookup first, then a photo of the pack if it's still unknown |
| Any date field | **Scan date** / **From photo**: Claude reads the printed date. You see the exact text it read ("EXP 12/03/27 → 12 Mar 2027") and confirm it |
| Meals | Claude plans breakfast, lunch and dinner from your fridge; the app still enforces every diet/allergy rule in code |

The web prototype link stays offline: browsers block calls to outside servers from inside an artifact. Use the APK or Expo Go for AI features.

Run the server locally: `cd server && cp .env.example .env` (add the key), `npm install && npm run dev`.

## Showing it to someone (5 min)
The app starts with an empty fridge, so do a real run before the meeting: import one of your own grocery orders and add a few things.
1. **Add → Import order**: pick a Blinkit, Instamart or Zepto screenshot. Claude lists every item with a price, and dates are filled in. **Add to fridge** opens the unpack checklist.
2. **Scan date** on a milk pouch: the item changes from Estimated to Confirmed.
3. **Add → Photo of a product**: snap a pack with no barcode, and the name and category are filled in.
4. **Fridge**: long-press an item → **Opened**, and its date moves up. Swipe right (used up) or left (thrown out).
5. **Meals**: breakfast, lunch and dinner built around what expires first. Change the diet in **Profile** and the ideas change.
6. **I cooked this**: the Fridge and Impact screens update straight away.

## Structure
```
app/src/app/        screens (Expo Router)
app/src/lib/        pure logic + tests (expiry, date parser, matching, meals, impact)
app/src/data/       product name catalogue, shelf-life rules, offline recipes
app/src/store/      Zustand store (persisted locally)
server/src/         Hono API: /products/:barcode, /ai/identify-product, /ai/read-date, /ai/parse-order, /ai/suggest-meals
docs/PRD.md         product requirements
```
