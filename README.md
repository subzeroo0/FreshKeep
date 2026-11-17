# FreshKeep

Eat what you buy before it expires. FreshKeep keeps track of what's in your fridge and when each item expires. It then plans breakfast, lunch and dinner around whatever needs eating first.

![FreshKeep logo](docs/brand/freshkeep-logo.png)

## What's in the MVP

| Area | Status |
|---|---|
| Onboarding: household, diet, goals, allergies, cuisines, kitchen, nudges | ✅ every step skippable |
| Fridge home: Use today / This week / Fine / Expired, swipe used/thrown out, long-press menu, filters, search | ✅ |
| Item detail: confidence explanation, mark opened (date moves up), freezer, amount left, manual date | ✅ |
| Scan item: camera barcode on phone, typed barcode + sample packs everywhere → manual expiry entry | ✅ (camera date-reading needs the AI server) |
| Quick add: 30 common chips, leftovers (2-day life), optional date | ✅ |
| Import order: sample order, or your own screenshots with lines typed in (auto-read with AI server) → review → unpack checklist | ✅ |
| Expiry intelligence: Confirmed → Learned (seeded, 20 SKUs) → Estimated, opened/freezer overrides | ✅ unit-tested |
| Meals: B/L/D with rescue score, alternatives, "What can I make now?", "I cooked this" deducts from the fridge | ✅ offline recipes; AI planner with server |
| Impact: ₹ saved / wasted, rescued rate, weekly chart, most-wasted tip | ✅ |
| Nudges: morning + 6 PM local notifications, test nudge | ✅ (in-app banner on web) |
| Demo mode: 18-item fridge, a month of history, sample order | ✅ Profile → Developer |

## Run it

```bash
cd app
npm install
npx expo start          # scan the QR code with Expo Go (Android/iOS)
npm run web             # or open in a browser
npm test                # 38 logic tests
```

### Install on Android (APK)
Every push that touches `app/` runs **Actions → Android APK**. Open the run and download `freshkeep-apk` from the run's **Artifacts** section. Unzip it and install `app-release.apk` on the phone (you'll need to allow installs from unknown sources). The APK is signed with the debug key, which is fine for demos.

You can also use EAS: `npx eas-cli build -p android --profile preview` (needs an Expo account).

### AI server (optional)
```bash
cd server
cp .env.example .env    # add ANTHROPIC_API_KEY
npm install
npm run dev             # http://localhost:8787
```
In the app, go to **Profile → AI server** and paste the server URL. A phone can't use `localhost`, so deploy the server (Railway, Render or Vercel) or use your machine's LAN IP. Once it's connected, order screenshots are read automatically, unknown products are identified from a photo, and meals come from Claude. The app re-checks every diet and allergy rule in code.

## Demo script (5 min)
1. **Impact**: the seeded month shows ₹ rescued vs wasted.
2. **Add → Import order → Try the sample order**: 11 food items appear with dates already filled in. Point out the Estimated/Learned tags. **Add to fridge** opens the unpack checklist.
3. **Add → Scan item → Amul Taaza**: type `EXP 20/11/26`. The item is saved as Confirmed.
4. **Fridge**: long-press the milk → **Opened**, and its date moves up. Swipe items right (used up) or left (thrown out).
5. **Meals**: lunch is palak paneer, using the spinach and paneer that expire tomorrow. Switch **Profile → How do you eat? → Vegan** and the paneer dishes disappear.
6. **I cooked this**: the Fridge and Impact screens update straight away.

## Structure
```
app/src/app/        screens (Expo Router)
app/src/lib/        pure logic + tests (expiry, date parser, matching, meals, impact)
app/src/data/       seed catalogue, learned shelf life, recipes, demo data
app/src/store/      Zustand store (persisted locally)
server/src/         Hono API: /products/:barcode, /ai/identify-product, /ai/read-date, /ai/parse-order, /ai/suggest-meals
docs/PRD.md         product requirements
```
