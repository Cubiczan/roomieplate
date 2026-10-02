# RoomiePlate demo script

Two minutes. The app is already on Alex. You are showing a friend why the planner lives on the laptop.

## 0:00 — Open the app

Open `http://127.0.0.1:43123`.

Say: “This is RoomiePlate. Alex is my roommate. Peanut and shellfish are not preferences. They are out of the kitchen.”

Point at the honey banner. Read the short version: not medical advice, verify labels, shared kitchens still cross-contact.

Point at the pill in the header.

- **Local gemma2:2b** means Ollama is up and the next plan will ask that model.
- **Offline fixtures** means the model is not there. The demo still runs, and every card will say so.

## 0:25 — The profile

Scroll the left column if you are on a phone.

- Allergies: Peanut and Shellfish are filled.
- Time budget: 30 minutes.
- Vegetarian-friendly is on.
- Pantry already has rice, lemon, garlic, chickpeas, spinach, black beans.

Say: “Dislikes are soft. Allergies are not. Olives get skipped when there is another safe dish. Peanut never gets that courtesy.”

If you edited anything, hit **Load Alex** to come back.

## 0:50 — Generate the week

Press **Plan Alex week**.

Wait for Monday. Read the green line out loud:

`SAFE for Alex: no peanut/shellfish`

Say: “That sentence is not the model being polite. The app writes it after scanning the title, the ingredients, and the steps. If the model names a banned food, the meal is replaced.”

Click Tuesday, then Wednesday. Each dinner stays under 30 minutes. If the card says **Offline fixture**, say that Ollama did not answer and these templates were still allergen-checked. If it says **Local model**, Gemma wrote the dish and RoomiePlate still ran the scan.

## 1:20 — Swap one dinner

On the open day, press **Swap meal**.

The new title is different. The safety line is the same. Say: “Swapping does not relax the rule. The new dish is checked again, and it cannot repeat the rest of the week.”

Optional: **Regenerate Tuesday** replaces that day only.

## 1:40 — Grocery list

Scroll to **Grocery list**.

- The note names peanut and shellfish.
- Quantities are combined for two people.
- Rice and anything else from the pantry sit under **Already on hand**, not in the shop.

Press **Copy** or **Download**. The text file starts with the allergy watch.

## 2:00 — Why it is local

Close with this:

“Alex’s allergies do not need to sit in a cloud prompt. Ollama runs Gemma, or Llama, on this machine. `OLLAMA_MODEL` swaps the weights. If the laptop is offline, the fixture planner still refuses peanut and shellfish. That is the open-source part: you can change the model, read the prompt, and keep the health note at home.”

## Screenshots

Taken with the offline fixture path (Ollama was not running). Regenerate them with the dev server up: `npm run demo:screenshots`.

- `docs/screenshots/01-profile.png` — Alex’s profile and the not-medical-advice banner
- `docs/screenshots/02-week.png` — the seven-day strip
- `docs/screenshots/02-monday-dinner.png` — Monday’s dinner, ingredients, and the safety line
- `docs/screenshots/03-after-swap.png` — after Swap meal
- `docs/screenshots/04-grocery.png` — combined list and allergy watch
- `docs/screenshots/05-mobile.png` — the same planner on a phone width

## If something looks wrong

- Pill stuck on “Checking local model”: `/api/status` could not reach `OLLAMA_BASE_URL`. Fixtures will still generate.
- A meal mentions a food you thought was banned: stop, and treat that as a bug. The tests in `tests/planner.test.ts` cover the fixture path and a model meal that says “peanut butter.”
- Screenshots for a write-up: with the dev server running, `npm run demo:screenshots`.
