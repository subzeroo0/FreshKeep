# FreshKeep — Product Requirements (MVP)

> Text extracted from the original PDF (Nov 17, 2026). Tables and code blocks keep their PDF layout.

```text
FreshKeep — Product Requirements (MVP)




  FreshKeep — Product Requirements (MVP)
    Nov 17, 2026       ·   ​@Pavan Kamal




  Overview
  FreshKeep (working name) is a mobile app that knows what is in your fridge and when
  each item expires, then plans breakfast, lunch and dinner around what needs eating first.
  The MVP is built to demo to clients today: scan or import groceries, see what is expiring,
  and get diet-aware meals that use it up.

  Problem. Households buy dairy and fresh groceries, store them in the fridge and forget
  them. Dates get checked only when cleaning out, after the item has expired, so food and
  money go in the bin.

  Why India, why now. Quick commerce (Blinkit, Swiggy Instamart, Zepto) has made small,
  frequent grocery orders normal in cities. More orders mean more perishables arriving,
  and every order is already a digital record of what entered the house. FreshKeep turns
  that record into a fridge inventory with almost no typing.

  Target users

         Urban working couples and families who order groceries online several times a week
         Young professionals living alone or with flatmates, who buy in small packs and forget
         them
         Home cooks who plan meals around a diet (vegetarian, Jain, high-protein, diabetic-
         friendly)

  How it works, in one line. Add items (scan the barcode and date, import an order
  screenshot, or quick-add) → FreshKeep tracks expiry with a confidence level → the fridge
  view sorts items by urgency → meal suggestions use near-expiry items first and match
  the user's diet → nudges arrive before food goes bad.

  Goals and success metrics (targets for the pilot, to be validated)


     Metric                                Definition                                   Pilot target

     Items rescued rate                    Items marked used before expiry ÷ items      ≥ 80%
                                           closed (used + discarded)

     Time to add an order                  Share screenshot → all items in the fridge   < 60 seconds




                                                                                                       Page 1 of 24
FreshKeep — Product Requirements (MVP)




     Metric                               Definition                                     Pilot target

     Time to add one scanned              Barcode + date scan → saved                    < 10 seconds
     item

     Weekly active households             Households that open the app and update        Track from
                                          at least one item a week                       launch

     Suggestion acceptance                Meal suggestions marked "cooked" ÷             ≥ 20%
                                          suggestions shown




  Scope and tech stack
  The MVP is one user, one fridge, on a phone, with order import included from day one.
  Anything that needs partnerships, sharing between people or a large data pipeline is left
  for later.


     Area                   In the MVP                              Later (v2+)

     Adding                 Barcode scan, expiry date scan          Voice add, receipt photo from a
     items                  (camera + AI), manual and quick-add     kirana store
                            for loose items and leftovers

     Order                  Share a Blinkit / Instamart / Zepto     Invoice email import through Gmail,
     import                 order screenshot, or pick it from the   direct platform partnerships with
                            gallery; unpack checklist               real batch dates

     Expiry                 Category shelf-life estimates,          Crowd-learned shelf life per SKU ×
                            scanned dates, opened-state             platform × city (seeded table in the
                            override, confidence tag                MVP)

     Fridge                 Urgency-sorted list, mark used /        Freezer and pantry zones, photo of
                            partly used / opened / thrown out       the fridge shelf

     Meals                  Diet onboarding, daily B/L/D            Weekly planner, shopping list from
                            suggestions, "what can I make now",     gaps, recipe videos
                            cook → auto-deduct

     Nudges                 Daily morning nudge, "expires           WhatsApp nudges, smart timing
                            tomorrow" alerts

     Impact                 Items rescued vs wasted, ₹ saved        Household leaderboard, sharing
                            this month



                                                                                                        Page 2 of 24
FreshKeep — Product Requirements (MVP)




     Area                   In the MVP                             Later (v2+)

     Accounts               Single device, local data, optional    Household sharing, login, cloud sync
                            anonymous ID


  Tech stack (chosen for a one-day build with Claude Code)


     Layer                    Choice                                Why

     App                      Expo (React Native) + TypeScript,     Runs on a real phone through Expo
                              Expo Router                           Go the same day; camera and share
                                                                    features work

     Barcode                   expo-camera barcode scanning         Built in, no extra native setup
                              (EAN-13, EAN-8, UPC-A, QR)

     Local data                expo-sqlite + a small repository     Works offline, fast, no backend
                              layer                                 needed for the inventory

     State                    Zustand                               Simple global store for profile and
                                                                    inventory

     Notifications             expo-notifications (local            Expiry nudges without a push
                              scheduled)                            server

     Backend                  Small Node API (Hono) deployed on     Holds the Claude API key; proxies AI
                              Vercel or Railway                     and product lookup

     AI                       Claude API, a vision-capable model    Reads printed dates, parses order
                              (e.g. claude-sonnet-5-5 )             screenshots, generates meals as
                                                                    JSON

     Product data             Open Food Facts API + local seed      Open Food Facts coverage of Indian
                              catalogue of common Indian SKUs       products is patchy, so the seed fills
                                                                    the gaps for the demo

     UI                       NativeWind (Tailwind for React        Fast styling, consistent tokens
                              Native)




                                                                                                      Page 3 of 24
FreshKeep — Product Requirements (MVP)




  Data model
  Nine local tables hold everything. InventoryItem is the core record: each one has an
  effective expiry date and a confidence level that says where that date came from. Dates
  are stored as ISO strings ( YYYY-MM-DD ) in the user's local time zone.

     // ---------- Profile & diet ----------
     type DietType = 'vegetarian' | 'eggetarian' | 'jain' | 'vegan' |
     'non_vegetarian' | 'pescatarian';
     type Goal = 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'weight_loss'
     | 'diabetic_friendly';
     type Equipment = 'stove' | 'pressure_cooker' | 'microwave' | 'oven' |
     'air_fryer' | 'mixer_grinder';


     interface UserProfile {
       id: string;                    // uuid, created on first launch
       name?: string;
       householdSize: number;         // 1-8
       dietType: DietType;
       goals: Goal[];
       allergies: string[];           // e.g. ['peanut', 'lactose']
       dislikes: string[];            // free text tags, e.g. ['brinjal']
       cuisines: string[];            // e.g. ['south_indian', 'north_indian',
     'continental']
       mealsAtHome: { breakfast: boolean; lunch: boolean; dinner: boolean };
       cookTimeWeekdayMin: number;    // 10 | 20 | 30 | 45
       cookTimeWeekendMin: number;
       equipment: Equipment[];
       city?: string;                 // for learned shelf life
       nudgeTime: string;             // 'HH:mm', default '08:00'
       onboardedAt?: string;
     }


     // ---------- Catalogue ----------
     type Category = 'milk' | 'curd_yogurt' | 'paneer' | 'cheese' | 'butter_ghee'
     | 'cream' | 'eggs'
       | 'bread' | 'batter' | 'leafy_veg' | 'vegetables' | 'fruits' | 'meat' |
     'fish' | 'tofu'
       | 'sauces_condiments' | 'beverages' | 'ready_to_eat' | 'leftovers' |
     'other';


     interface Product {                   // catalogue entry, cached from Open Food
     Facts or seed



                                                                                      Page 4 of 24
FreshKeep — Product Requirements (MVP)




         id: string;                    // uuid
         barcode?: string;              // GTIN, unique when present
         name: string;                  // 'Amul Taaza Toned Milk'
         brand?: string;
         packSize?: string;             // '500 ml'
         category: Category;
         imageUrl?: string;
         vegMark?: 'veg' | 'non_veg';   // FSSAI green/brown dot when known
         allergens: string[];
         source: 'off' | 'seed' | 'user' | 'ai';
     }


     // ---------- Inventory ----------
     type ExpiryConfidence = 'confirmed' | 'learned' | 'estimated';
     type ItemStatus = 'active' | 'used' | 'discarded';
     type Location = 'fridge' | 'freezer' | 'pantry';


     interface InventoryItem {
       id: string;
       productId?: string;            // null for quick-add loose items
       displayName: string;           // what the user sees, editable
       category: Category;
       quantity: number;              // e.g. 2
       unit: 'pcs' | 'g' | 'kg' | 'ml' | 'l' | 'pack';
       remainingFraction: number;     // 1 = full, 0.5 = half left
       location: Location;
       addedAt: string;               // when added to the app
       purchasedAt: string;           // delivery date for imports, else addedAt
       printedExpiry?: string;        // from a scan or manual entry
       estimatedExpiry?: string;      // from the estimator
       openedAt?: string;
       effectiveExpiry: string;       // computed, see Expiry intelligence
       confidence: ExpiryConfidence;
       status: ItemStatus;
       source: 'scan' | 'order_import' | 'manual' | 'quick_add' | 'leftover';
       orderImportId?: string;
       pricePaise?: number;           // for ₹ saved / wasted
       needsDateCheck: boolean;       // shown on the unpack checklist
     }


     // ---------- Shelf life ----------
     interface ShelfLifeRule {
       category: Category;



                                                                               Page 5 of 24
FreshKeep — Product Requirements (MVP)




         location: Location;
         unopenedDays: number;           // from purchase when no printed date
         openedDays: number;             // from opening
         perishable: boolean;            // true = goes on the unpack checklist
     }


     interface LearnedShelfLife {      // seeded in the MVP, crowd-built later
       productId: string;
       platform: Platform;
       city: string;
       medianDaysLeftAtDelivery: number;
       sampleSize: number;            // use only when >= 5
     }


     // ---------- Order import ----------
     type Platform = 'blinkit' | 'instamart' | 'zepto' | 'bigbasket' | 'other';


     interface OrderImport {
       id: string;
       platform: Platform;
       orderedAt?: string;
       deliveredAt: string;           // defaults to now
       imageUri: string;              // local copy of the screenshot
       status: 'parsing' | 'review' | 'done' | 'failed';
       totalPaise?: number;
     }


     interface OrderImportLine {
       id: string;
       orderImportId: string;
       rawText: string;                  // as read from the screenshot
       parsedName: string;
       parsedPackSize?: string;
       quantity: number;
       pricePaise?: number;
       matchedProductId?: string;
       matchScore: number;               // 0-1
       include: boolean;                 // user can untick non-food items
     }


     // ---------- Events & meals ----------
     interface ConsumptionEvent {
       id: string;



                                                                                  Page 6 of 24
FreshKeep — Product Requirements (MVP)




         itemId: string;
       type: 'opened' | 'used_partly' | 'used_up' | 'discarded' |
     'date_corrected';
         fraction?: number;
         at: string;
         mealSuggestionId?: string;
     }


     interface MealSuggestion {
         id: string;
         date: string;
         slot: 'breakfast' | 'lunch' | 'dinner';
         title: string;                 // 'Palak paneer with jeera rice'
         description: string;
         cookTimeMin: number;
         servings: number;
         usesItems: { itemId: string; amount: string; fraction: number }[];
         extraIngredients: string[];        // staples the user may need
         steps: string[];
         rescueScore: number;           // see Meal suggestion engine
         status: 'suggested' | 'cooked' | 'skipped';
     }




  Modules
  The app is split into 22 small modules so Claude Code can build and test them one at a
  time. Each one lists what it does, what goes in and out, the logic, the UI and the checks
  that say it is done.


  Foundation
  M1. App shell and navigation

         Purpose: Expo Router app with a bottom tab bar: Fridge (home), Meals, Add (centre
         button), Impact, Profile.
         Logic: on launch, if UserProfile.onboardedAt is empty, route to onboarding;
         otherwise to Fridge. The Add button opens a sheet with three choices: Scan item,
         Import order, Quick add.
         UI: light theme, fresh green primary, red / amber / green urgency colours, large tap
         targets.




                                                                                           Page 7 of 24
FreshKeep — Product Requirements (MVP)




         Done when: tabs switch without reload; the Add sheet opens from every tab; a fresh
         install lands on onboarding.

  M2. Local database and repositories

         Purpose: create the SQLite tables from the Data model and expose typed functions.
         Logic: a migration runner with a version number; repositories profileRepo ,
          productRepo , inventoryRepo , orderRepo , eventRepo , mealRepo , shelfLifeRepo .
         Every inventory write recomputes effectiveExpiry and confidence through M14.
         Done when: unit tests create, read, update and list items; re-running migrations does
         not lose data.

  M3. Backend API proxy

         Purpose: keep the Claude API key off the phone and give the app five endpoints (see
         API endpoints).
         Logic: Hono server; validates input with Zod; sends images as base64 to Claude; asks
         for JSON only and validates the reply against a Zod schema; retries once on invalid
         JSON; 20-second timeout.
         Done when: each endpoint returns valid JSON for the sample images in /fixtures ; a
         bad image returns a 422 with a readable message.


  Onboarding and profile
  M4. Onboarding flow (about 2 minutes, every step skippable)

     1. Welcome: one line on the value ("Eat what you buy before it expires") and a Start
        button.
     2. Household: size (1–8) and which meals are eaten at home.
     3. Diet type: single choice (vegetarian, eggetarian, Jain, vegan, non-vegetarian,
        pescatarian).
     4. Goals: multi-choice (balanced, high-protein, low-carb, keto, weight loss, diabetic-
        friendly).
     5. Allergies and dislikes: chips for common ones (peanut, lactose, gluten, soy, shellfish,
        egg) plus free text.
     6. Cuisines: multi-choice (South Indian, North Indian, Gujarati, Bengali, Maharashtrian,
        Continental, Asian).
     7. Time and kitchen: weekday and weekend cook time; equipment chips.
     8. Nudges: notification permission and nudge time (default 8:00 AM).



                                                                                              Page 8 of 24
FreshKeep — Product Requirements (MVP)




     9. First items: "Import your last grocery order" (M11) or "Scan something from your
        fridge" (M6), with skip.
         Done when: the profile saves after each step (so quitting midway keeps answers);
         skipping sets sensible defaults (household 2, vegetarian, balanced, 20 / 45 min, stove
         + pressure cooker).

  M5. Profile and preferences

         Purpose: edit any onboarding answer later.
         UI: a list of sections that open the same step components used in M4.
         Logic: saving a diet, allergy or goal change clears today's unaccepted meal
         suggestions so they regenerate.
         Done when: changing diet from vegetarian to vegan removes paneer dishes from the
         next suggestions.


  Adding items
  M6. Barcode scanner

         Purpose: read the product barcode with the camera.
         Logic: expo-camera with types EAN-13, EAN-8, UPC-A, UPC-E; ignore repeat reads of
         the same code within 2 seconds; haptic tick on read; torch toggle.
         UI: full-screen camera, framing box, "Can't scan? Type it in" link to M10.
         Done when: a Coke can and an Amul milk pouch scan in under 2 seconds in normal
         light.

  M7. Product lookup

         Purpose: turn a barcode into a Product .
         Logic, in order: (1) local Product table; (2) seed catalogue; (3) Open Food Facts GET
         /api/v2/product/{barcode}.json through the backend; (4) not found → ask the user
         to take a photo of the front of the pack and call /ai/identify-product , then let them
         edit the name and category. Map Open Food Facts categories to our Category list
         with a lookup table; unknown → other .
         Done when: a known barcode shows name, size and image; an unknown one ends with
         a saved user product.

  M8. Expiry date capture

         Purpose: read the printed "Best before / Use by / Exp" date.




                                                                                           Page 9 of 24
FreshKeep — Product Requirements (MVP)




         Logic: after the product is identified, open the camera with the hint "Point at the date
         on the pack"; the user taps capture; crop to the frame; send to /ai/read-date ; pass
         the reply to M9 for normalising. If the model returns a "best before N months from
         packing" style, compute from the packed date.
         UI: show the date read in large type with the matching text highlighted ("EXP 12/03/27
         → 12 Mar 2027"), buttons Looks right, Edit, Skip (estimate it).
         Done when: tested on 10 sample photos (milk pouch, curd cup, bread bag, can bottom,
         butter carton), at least 8 are read correctly or flagged as unsure; Skip always works.

  M9. Date parser and normaliser

         Purpose: turn raw date strings into ISO dates without guessing silently.
         Logic: handle DD/MM/YY , DD/MM/YYYY , DD.MM.YY , DD-MMM-YY , MMM YY (use last day
         of month), MM/YY , YYYY-MM-DD , "Best before 6 months from manufacture" with a
         packed date. Indian packs use day-first, so default to DD/MM . Reject dates more than 3
         years ahead or more than 30 days in the past; mark the result unsure and ask the
         user.
         Done when: unit tests cover every format above plus the reject rules.

  M10. Manual and quick add

         Purpose: add items with no barcode (vegetables, fruit, loose paneer, dosa batter) and
         leftovers.
         UI: search box with chips for the 30 most common items (tomato, onion, spinach, milk,
         curd, paneer, eggs, bread, coriander, dosa batter…), quantity stepper, optional date,
         location; a Leftover toggle that asks "what dish?" and sets a 2-day fridge life.
         Logic: category from the chip or a keyword map; expiry from M14.
         Done when: adding "spinach, 1 bunch" takes 3 taps and shows an estimated date.


  Order import
  M11. Order intake

         Purpose: get an order screenshot into the app.
         Logic: three ways in: (1) share sheet — register the app as a share target for images
         (Android intent filter; iOS share extension via expo-share-intent ); (2) "Import
         order" in the Add sheet opens the gallery picker, multi-select up to 5 screenshots for
         long orders; (3) the clipboard check: if an image was copied recently, offer it. Create
         an OrderImport with status parsing .




                                                                                            Page 10 of 24
FreshKeep — Product Requirements (MVP)




         Done when: sharing a screenshot from the Photos app opens FreshKeep on the
         import screen with the image attached.

  Note: the share-sheet route needs native configuration, so it does not run in Expo Go.
  Build the gallery picker first (it works in Expo Go), then make an Expo development build
  for the share sheet if time allows.

  M12. Order parsing

         Purpose: read the line items from the screenshot(s).
         Logic: call /ai/parse-order with all images; the reply lists platform, order date if
         visible, and lines (name, pack size, quantity, price). Merge lines across screenshots
         and drop duplicates where name and size match. Mark non-food lines (detergent,
         tissues) as include: false .
         Done when: sample Blinkit, Instamart and Zepto screenshots in /fixtures parse
         with every food line found.

  M13. Catalogue matching and dedupe

         Purpose: link each parsed line to a Product and avoid duplicate inventory.
         Logic: normalise names (lowercase, remove pack size and brand noise), fuzzy match
         against Product.name with a token-overlap score; ≥ 0.8 = auto-match, 0.5–0.8 = show
         as "Did you mean?", < 0.5 = new product with category from /ai/parse-order 's
          categoryGuess . When saving, if an active item with the same product was added in
         the last 24 hours, ask "Same milk you just scanned?" and merge if yes.
         Done when: "Amul Taaza Toned Fresh Milk 500 ml" matches the seed product "Amul
         Taaza Toned Milk 500ml".

  M14. Expiry estimator (rules in the Expiry intelligence section)

         Purpose: give every item an effective expiry date and confidence.
         Logic: pure function computeExpiry(item, rules, learned, profile) that returns
          { effectiveExpiry, confidence, needsDateCheck } .
         Done when: unit tests cover printed date, learned, estimated, opened override and
         frozen items.

  M15. Import review and unpack checklist

         Purpose: confirm the order quickly, then confirm dates only where they matter.
         UI, screen 1 (Review): "12 items found from Blinkit"; each line shows matched name,
         quantity and estimated expiry; untick to exclude; tap to fix the match. Button Add to
         fridge.


                                                                                           Page 11 of 24
FreshKeep — Product Requirements (MVP)




         UI, screen 2 (Unpack): "3 items worth checking when you unpack" — only items where
          needsDateCheck is true. Each row has Scan date (M8) and Looks fine (keeps the
         estimate). A local notification 30 minutes later reminds the user if the checklist is still
         open.
         Done when: a 12-item order goes from share to fridge in under 60 seconds with no
         date scans; scanning one date flips that item to Confirmed.


  Fridge
  M16. Fridge (inventory) screen

         Purpose: home screen; what is in the fridge, most urgent first.
         UI: summary strip ("2 expire today · 4 this week"); sections Use today (≤ 1 day, red),
         This week (2–5 days, amber), Fine (> 5 days, green), Expired (collapsed, grey). Each
         row: image or category icon, name, quantity, "2 days left", confidence tag (Confirmed /
         Learned / Estimated). Filter chips by category and location; search.
         Gestures: swipe right = Used up; swipe left = Thrown out; long press = Opened, Used
         some, Edit.
         Done when: list re-sorts instantly after any action; expired items never appear in the
         top sections.

  M17. Item detail and actions

         UI: name, image, quantity, remaining slider (0–100%), dates (purchased, printed,
         opened, effective), confidence and where it came from ("Estimated: milk lasts about 2
         days from delivery"), buttons Mark opened, Scan date, Move to freezer, Used up,
         Thrown out, and "Meals that use this".
         Logic: every action writes a ConsumptionEvent ; Mark opened sets openedAt and
         recomputes expiry; Move to freezer uses the freezer rule.
         Done when: opening a milk item with 6 days left changes it to 2 days left.


  Meals
  M18. Meal suggestion engine (details in its own section)

         Purpose: produce breakfast, lunch and dinner for today that use the most urgent
         items and fit the profile.
         Logic: build context (active items with days left, profile) → call /ai/suggest-meals →
         validate → drop anything that breaks a hard rule (diet, allergy) → score → keep the
         best per slot plus 2 alternatives. Cache per day; regenerate when inventory changes



                                                                                              Page 12 of 24
FreshKeep — Product Requirements (MVP)




         by more than 3 items or the user pulls to refresh.
         Done when: with spinach and paneer expiring tomorrow and a vegetarian profile, at
         least one slot uses both; a vegan profile never gets dairy.

  M19. Meals screen and "cook this"

         UI: three cards (Breakfast, Lunch, Dinner), each with title, time, "Uses: spinach, paneer
         (expire tomorrow)", rescue badge, swipe for alternatives. Detail view with ingredients
         (from fridge vs staples) and steps. Button I cooked this. A What can I make now?
         button for an instant suggestion in under 15 minutes of cooking.
         Logic: I cooked this reduces remainingFraction of each used item by its fraction ,
         marks items at 0 as used up, and logs events with the suggestion id.
         Done when: cooking a suggestion updates the fridge and the Impact numbers
         straight away.


  Nudges and impact
  M20. Notifications

         Logic: schedule one local morning nudge at nudgeTime that names up to 3 items
         expiring within 1 day and the suggested meal that uses them ("Curd and spinach
         expire tomorrow. Palak raita for lunch?"); one "expires today" alert at 6 PM only for
         items still active; no nudge on days with nothing urgent. Reschedule after every
         inventory change. Tapping opens the relevant meal or item.
         Done when: with demo mode on, a nudge can be triggered from Profile → Developer →
         "Send test nudge".

  M21. Impact screen

         UI: this month's items rescued vs thrown out (bar), rescued rate, ₹ saved (sum of
         pricePaise × fraction for items used before expiry), ₹ wasted, most-wasted
         category with a tip.
         Done when: numbers match the event log in a test with 10 seeded events.


  Demo
  M22. Demo mode and seed data

         Purpose: a reliable pitch without depending on live scanning.




                                                                                            Page 13 of 24
FreshKeep — Product Requirements (MVP)




         Logic: Profile → Developer → Load demo fridge fills about 18 items across all urgency
         levels (including milk expiring today, spinach and paneer tomorrow, curd in 3 days,
         eggs in 10), a sample Blinkit order screenshot in the gallery, 2 weeks of past events for
         the Impact screen, and pre-cached meal suggestions so the demo works offline.
         Reset app clears everything.
         Done when: from a fresh install, loading the demo fridge shows all screens populated
         within 5 seconds.


  Expiry intelligence
  Every item gets a date, even when nobody scans it. The date comes from the best source
  available, and the confidence tag tells the user how much to trust it. This is what makes
  order import work: the screenshot gives the product and delivery date, and the estimator
  fills in the expiry.

  Order of sources (first match wins)

     1. Confirmed: a printed date the user scanned or typed.
     2. Learned: the typical days left at delivery for this product, platform and city, when at
         least 5 samples exist. Seeded for about 20 common SKUs in the MVP; built from users'
         confirmed scans later.
     3. Estimated: the category rule's unopenedDays counted from purchasedAt .

  Then apply overrides

         Opened: effectiveExpiry = min(base date, openedAt + openedDays) .
         Confidence stays as it was for the base date.
         Freezer: use the freezer row for that category instead.
         Partly used: no change to the date; only remainingFraction changes.

  Unpack checklist rule. needsDateCheck = perishable && confidence === 'estimated'
  && unopenedDays <= 10 . Long-life items keep their estimate without asking.

  Urgency buckets. daysLeft = effectiveExpiry − today . Use today: ≤ 1. This week: 2–5.
  Fine: > 5. Expired: < 0.

  Starting shelf-life rules (fridge, approximate, to be checked against food-safety
  guidance before launch)




                                                                                            Page 14 of 24
FreshKeep — Product Requirements (MVP)




     Category                            Unopened (days from   Opened    Perishable   Freezer
                                         purchase)             (days)                 (days)

     Milk (pouch /                       2                     2         Yes          30
     carton)

     UHT / tetra milk                    90                    3         No           —

     Curd / yogurt                       5                     3         Yes          —

     Paneer                              4                     2         Yes          60

     Cheese (block /                     30                    10        Yes          90
     slices)

     Butter / ghee                       60                    30        No           180

     Fresh cream                         7                     3         Yes          —

     Eggs                                14                    —         Yes          —

     Bread                               4                     3         Yes          30

     Idli / dosa batter                  3                     2         Yes          30

     Leafy vegetables                    3                     —         Yes          —

     Other vegetables                    6                     —         Yes          —

     Fruits                              5                     2 (cut)   Yes          —

     Meat / chicken                      2                     1         Yes          90

     Fish                                1                     1         Yes          90

     Tofu                                5                     3         Yes          60

     Sauces /                            180                   30        No           —
     condiments

     Leftovers                           2                     —         Yes          30


  These numbers are starting defaults for the demo. The Learned layer exists to replace
  them with real data per product, so their exact values matter less over time.




                                                                                                Page 15 of 24
FreshKeep — Product Requirements (MVP)




  Meal suggestion engine
  The AI proposes meals, and the app decides. Claude generates candidate meals as JSON
  from the fridge and the profile. The app then removes anything that breaks a hard rule
  and ranks the rest by how much near-expiry food each meal rescues.

  Hard rules (checked in code, never trusted to the model)

         Diet type: a word list per diet (Jain: no onion, garlic, potato, carrot or other root
         vegetables; vegan: no dairy, egg, honey; vegetarian: no meat, fish, egg; eggetarian: no
         meat or fish).
         Allergies: no listed allergen in usesItems or extraIngredients .
         Cook time: ≤ the weekday or weekend limit.
         Equipment: steps must not need equipment the user does not have (the model
         returns equipmentNeeded ).

  Rescue score. Each fridge item has an urgency weight; a meal's score adds up the
  weights of the items it uses, by how much of each it uses.

     w_i = \frac{1}{1 + \max(d_i, 0)} \qquad \text{score} = \sum_{i \in
     \text{meal}} w_i \cdot f_i \;-\; 0.05 \cdot n_{\text{extra}}


  Here d is days left, f is the fraction of the item the meal uses, and n_extra is the number of
  staples not in the fridge. An item expiring today scores 1, tomorrow 0.5, in 3 days 0.25. The
  small penalty favours meals that need fewer extra purchases.

  Selection. Ask for 4 candidates per slot. After filtering, pick the highest score per slot,
  but do not use the same urgent item as the main ingredient in all three slots. Keep the
  next 2 as swipe alternatives.

  Prompt (sent by /ai/suggest-meals )




                                                                                           Page 16 of 24
FreshKeep — Product Requirements (MVP)




     System: You are a home-cooking planner for an Indian household. You reduce
     food waste by
     using ingredients that expire soonest. Reply with JSON only, matching the
     schema.


     User:
     Date: {{today}} ({{weekday|weekend}})
     Household: {{householdSize}} people. Meals at home: {{slots}}.
     Diet: {{dietType}}. Goals: {{goals}}. Allergies: {{allergies}}. Dislikes:
     {{dislikes}}.
     Cuisines: {{cuisines}}. Max cook time: {{cookTimeMin}} min. Equipment:
     {{equipment}}.
     Fridge, most urgent first (id | name | qty | days left):
     {{items}}
     Assume common staples are available: rice, atta, dal, oil, salt, spices,
     onion, tomato,
     unless the diet excludes them.
     Give 4 meal ideas for each of: {{slots}}. Prefer items with 0-2 days left.
     Use realistic home dishes, not restaurant dishes.


  Response schema (validated with Zod)

     {
          "meals": [
              {
                  "slot": "lunch",
                  "title": "Palak paneer with jeera rice",
                  "description": "Uses the spinach and paneer before they turn
     tomorrow.",
           "cookTimeMin": 30,
                  "servings": 2,
                  "usesItems": [ { "itemId": "…", "amount": "1 bunch", "fraction": 1.0 }
     ],
                  "extraIngredients": ["cream (optional)"],
                  "equipmentNeeded": ["stove", "mixer_grinder"],
                  "steps": ["Blanch spinach 2 min…"]
              }
          ]
     }


  Fallback. If the API fails or the phone is offline, use a local library of about 60 tagged
  recipes (diet, cuisine, main ingredients, time) and run the same filter and score.



                                                                                               Page 17 of 24
FreshKeep — Product Requirements (MVP)




  Screens and navigation
  Every way of adding food ends in the same urgency-sorted fridge, and everything the
  user gets back (meals, nudges, impact) reads from it.




  main app flow · 3 ways in, 1 fridge, 3 outputs

  Cooking a suggested meal deducts the items it used, which keeps the fridge accurate
  without extra taps.


     Screen                                        Reached from                           Modules

     Onboarding (9 steps)                          First launch                           M4

     Fridge (home tab)                             Tab bar, after onboarding, after any   M16
                                                   add

     Item detail                                   Tap an item in the fridge              M17

     Add sheet                                     Centre tab button                      M1

     Barcode scanner → product card                Add sheet → Scan item                  M6, M7

     Date capture → confirm                        After product is identified; unpack    M8, M9
                                                   checklist

     Quick add                                     Add sheet → Quick add                  M10

     Import review                                 Share sheet, or Add sheet → Import     M11–M13,
                                                   order                                  M15




                                                                                                   Page 18 of 24
FreshKeep — Product Requirements (MVP)




     Screen                                           Reached from                          Modules

     Unpack checklist                                 After Add to fridge on import         M15
                                                      review

     Meals (tab) + meal detail                        Tab bar, morning nudge                M18, M19

     Impact (tab)                                     Tab bar                               M21

     Profile (tab) + preference editors +             Tab bar                               M5, M20,
     Developer                                                                              M22




  API endpoints
  The backend has five endpoints. The phone keeps all user data; the server holds no
  inventory and only passes requests to Open Food Facts and Claude.


     Method + path                       Input                       Output                       Used
                                                                                                  by

     GET                                 GTIN                        { found, product: {          M7
     /products/:barcode                                              name, brand, packSize,
                                                                     category, imageUrl,
                                                                     allergens, vegMark } }
                                                                     from the seed catalogue,
                                                                     then Open Food Facts

     POST /ai/identify-                  { image } (front of         { name, brand, packSize,     M7
     product                             pack, base64 JPEG ≤ 1       category, vegMark,
                                         MB)                         confidence }

     POST /ai/read-date                  { image,                    { rawText, dateType:         M8,
                                         productCategory }           'expiry' | 'best_before'     M9
                                                                     | 'use_by' | 'packed' |
                                                                     'unknown', isoDate?,
                                                                     bestBeforeMonths?,
                                                                     packedDate?, unsure:
                                                                     boolean }




                                                                                                   Page 19 of 24
FreshKeep — Product Requirements (MVP)




     Method + path                       Input                   Output                       Used
                                                                                              by

     POST /ai/parse-                     { images: [ … ] } (up   { platform, orderedAt?,      M12
     order                               to 5)                   lines: [ { rawText,
                                                                 name, packSize,
                                                                 quantity, pricePaise,
                                                                 categoryGuess, isFood }
                                                                 ] }

     POST /ai/suggest-                   { profile, items: [ {   { meals: [ … ] }             M18
     meals                               id, name, quantity,     (schema in Meal suggestion
                                         daysLeft } ], date,     engine)
                                         slots }


  Rules for every AI endpoint

         Resize images on the phone to a 1280 px long edge before upload.
         Ask the model for JSON only; validate with Zod; one retry with the validation error
         included; then return 422.
         Never send the user's name or city to the model; send only what the task needs.
         Log request time and token use for cost tracking; no images are stored on the server.

  Environment variables: ANTHROPIC_API_KEY , CLAUDE_MODEL , OFF_USER_AGENT (Open
  Food Facts asks for an app name and contact in the user agent), PORT .


  Build plan for today
  Build in 9 passes, each one a separate Claude Code session that ends with something
  running on the phone. If time runs short, stop after pass 7: demo mode covers anything
  that is not finished.

  Before you start (15 minutes)

         Install Node 20+, the Expo Go app on your phone, and create a Claude API key.
         Collect fixtures in a /fixtures folder: 3–4 screenshots of your own Blinkit /
         Instamart / Zepto orders; 10 close-up photos of printed dates (milk pouch, curd cup,
         bread bag, can bottom, butter carton); 3 front-of-pack photos.
         Paste this PRD into the repo as docs/PRD.md and create CLAUDE.md with the kickoff
         prompt below.




                                                                                              Page 20 of 24
FreshKeep — Product Requirements (MVP)




  Kickoff prompt for CLAUDE.md

     You are building FreshKeep, an Expo (React Native, TypeScript) app that
     tracks fridge
     items and their expiry, imports grocery orders from screenshots, and suggests
     meals that
     use near-expiry food. The full spec is in docs/PRD.md. Follow its module
     numbers (M1-M22),
     data model and API contracts exactly.
     Rules:
     - Monorepo: /app (Expo, Expo Router, NativeWind, Zustand, expo-sqlite) and
     /server (Hono, Zod).
     - Build one module at a time. After each, run type-check and tests, and tell
     me how to see it on the phone.
     - Business logic (expiry, date parsing, scoring, diet filters) lives in pure
     functions in
         /app/src/lib with unit tests (Vitest).
     - Never put the Anthropic API key in the app. All AI calls go through
     /server.
     - Keep UI simple and consistent: green primary, red/amber/green urgency
     colours.


  Passes


     Pass       Modules                     What you see at the end                       Time

     1          M1, M2                      App opens on the phone with five tabs;        45
                                            database ready                                min

     2          M14, M9 (pure logic +       Expiry and date-parsing tests pass            30
                tests)                                                                    min

     3          M22 (seed data), M16, M17   Demo fridge loads; urgency sections, swipes   60
                                            and item detail work                          min

     4          M3 (server), M6, M7, M8,    Scan a barcode and a date; quick-add a        75 min
                M10                         vegetable

     5          M11, M12, M13, M15          Share an order screenshot → review → unpack   75 min
                                            checklist → fridge

     6          M4, M5                      Onboarding and editable profile               45
                                                                                          min




                                                                                           Page 21 of 24
FreshKeep — Product Requirements (MVP)




     Pass       Modules                  What you see at the end                         Time

     7          M18, M19                 Meals tab with B/L/D cards; "I cooked this"     60
                                         updates the fridge                              min

     8          M20, M21                 Morning nudge and Impact screen                 40
                                                                                         min

     9          Polish                   App icon, splash, empty states, loading         30
                                         states, error messages                          min


  Total is about 8 hours of build time. Passes 3 and 5 carry the pitch, so protect their time.

  Demo script for the client pitch (5 minutes)

     1. The problem (30 s). "How much of what you ordered on Blinkit last week did you
        throw away?" Open the Impact screen with the seeded month: items rescued vs
        wasted, ₹ lost.
     2. Import an order (60 s). Share a real Blinkit screenshot to the app. 12 items appear with
        dates already filled in. Point at the Estimated tag and the 3-item unpack checklist.
     3. Scan one date (30 s). Scan the date on a real milk pouch; the tag flips to Confirmed.
     4. The fridge (45 s). Show Use today / This week / Fine. Long-press the milk → Mark
        opened → its date moves up.
     5. Meals (60 s). Open Meals: lunch uses the spinach and paneer that expire tomorrow.
        Change diet to vegan in Profile and refresh: paneer disappears.
     6. Cook and close the loop (30 s). Tap "I cooked this"; the fridge and Impact update.
     7. The moat (45 s). Explain the Learned layer: every confirmed scan teaches how fresh
         each product arrives, by platform and city, which nobody else has.

  Keep demo mode loaded as a backup on a second phone in case the network or camera
  fails.


  Risks, open questions and roadmap
  The biggest risk is that people stop updating the fridge, so the app's dates drift from
  reality and they stop trusting it. Every design choice above tries to keep updates under 5
  seconds.

  Risks




                                                                                           Page 22 of 24
FreshKeep — Product Requirements (MVP)




     Risk                                Impact                   Mitigation

     Inventory drift (items used but     Wrong nudges, lost       Swipe actions, "I cooked this"
     not marked)                         trust                    auto-deducts, a weekly "Still
                                                                  have these?" check of 5 items

     Date reading errors (curved         Wrong expiry             Always show the read date for
     cans, dot-matrix print)                                      confirmation; unsure flag;
                                                                  manual edit

     Order screenshot formats            Import breaks            Vision model reads any layout;
     change                                                       keep fixtures and re-test;
                                                                  gallery picker as fallback

     Estimates wrong for a specific      Early or late nudges     Estimated tag + "check the
     product                                                      pack" wording; Learned layer
                                                                  replaces estimates

     Meal suggestions break a diet       Lost trust, possible     Hard rules checked in code,
     rule                                harm for allergies       never only in the prompt

     AI cost per user                    Unit economics           Cache meals per day; resize
                                                                  images; use a smaller model for
                                                                  date reading if accuracy holds

     Share sheet needs a native          Not in Expo Go           Gallery picker for the demo;
     build                                                        development build for pilots

     Food-safety liability               Users eat spoiled food   Wording is "use soon" and
                                                                  "check before eating", never
                                                                  "safe to eat"; shelf-life table
                                                                  reviewed before launch


  Open questions

         Business model for the pitch: free consumer app, freemium, or a white-label for quick-
         commerce or dairy brands?
         Are we pitching to a quick-commerce platform (data partnership, real batch dates) or
         to an investor or brand?
         Single user or household sharing in the first pilot?
         Final product name and brand.

  Roadmap after the MVP



                                                                                               Page 23 of 24
FreshKeep — Product Requirements (MVP)




     1. v1.1: cloud sync and household sharing; crowd-learned shelf life from confirmed
        scans.
     2. v1.2: invoice email import through Gmail; weekly planner; shopping list from meal
         gaps.
     3. v2: platform partnerships for real batch and expiry dates per order; WhatsApp
        nudges; brand-sponsored recipes for near-expiry products.




                                                                                          Page 24 of 24
```
