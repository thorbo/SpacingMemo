# SpacingMemo

A phone app that reminds you to review things on a spaced schedule, so you remember them long-term (songs, concepts, techniques), plus simple recurring reminders (e.g. "call Sam monthly").

It runs on iPhone through **Expo Go**. All data stays on the phone; there's no server. Design decisions are in [docs/DESIGN.md](docs/DESIGN.md).

---

## Using the app

### Categories and items

- **Categories** tab: type a name and tap **Add** (e.g. Music, Programming).
- Tap a category to rename it, see its items, or **Add item**.
- A category can only be deleted once it has no items.

### Two kinds of items

| Mode | What it's for | Buttons when due |
|---|---|---|
| **Memorize** | Things to learn permanently. Gaps grow each time you remember it. | Forgot · Hard · Good · Punt |
| **Recurring** | Fixed schedule: every N days / weeks / months. | Done · Punt |

You can switch an item's mode when editing it. Switching resets its progress.

### Reviewing (Today tab)

- The **Today** tab lists everything due, oldest first. Late items show "N days late".
- Tap a card to expand it: you'll see its notes and the buttons.
- Each button shows **where it would move the item** (e.g. Good "45d"). That's exactly what tapping applies.
- **Forgot**: you didn't remember it. The gap shrinks.
- **Hard**: you remembered with effort. The gap grows a little.
- **Good**: you remembered it. The gap grows.
- **Done** (recurring): next one is N days / weeks / months from today.
- **Punt**: you didn't get to it. It moves 1–3 days out, to the lightest day, and its progress isn't affected.
- After any button, an **Undo** banner shows for 5 seconds.

### Seeing and setting the spacing

- Memorize items show their current gap, e.g. "Memorize · 30d" ("new" before the first review).
- On the item page, **Spacing (days)** can be set by hand. Use it for something you already know: enter 60 and the next review is 60 days out, and Good keeps growing from there. Leave it blank to start fresh.

### Notifications

- One notification a day at your chosen time: "N items due today". Allow notifications when the phone asks (it asks once you have an item).
- Up to 15 days of reminders are booked ahead, starting at the first day anything is due, however far out. Opening the app refreshes them.
- If you ignore reminders for 15 days, a last notification says "Open SpacingMemo to keep your reminders coming."

### Settings

- **Daily reminder**: notification time (15-minute steps).
- **Max items per day**: spreads reviews so one day doesn't pile up (default 10).
- **Punt: soonest / latest**: where Punt can move an item (default 1–3 days).
- **Memory target**: how sure you want to be that you'll still remember an item when it's reviewed (default 95%). Higher means more frequent reviews.

### Backup

Data lives inside Expo Go on the phone. **Deleting Expo Go deletes it.** Back up regularly:

- **Export data** opens the share sheet. Choose **Save to Files → iCloud Drive** to get it off the phone.
- **Import data** picks a backup file and replaces everything on the phone (it asks first).
- Settings shows "Last exported: N days ago". After 30 days without an export, the daily notification adds "Time to export a backup."

---

## Opening the app on your iPhone

The app is published with **EAS Update** to the Expo project [@thorbo/SpacingMemo](https://expo.dev/accounts/thorbo/projects/SpacingMemo). Your PC doesn't need to be running.

1. Install **Expo Go** from the App Store.
2. In Expo Go, sign in with the Expo account **thorbo** (Expo Go only opens updates for projects your account owns).
3. Open the project: in Expo Go, look under your projects for **SpacingMemo**. Or open the [EAS dashboard](https://expo.dev/accounts/thorbo/projects/SpacingMemo/updates) on your phone and use the update's preview / QR code.

Expo Go only opens updates built for its own SDK version. This project uses **SDK 58**. When Expo Go updates to a newer SDK, the project needs upgrading (`npx expo install expo@latest --fix`), then publishing again.

---

## Development

Requires Node.js (24 works) and npm.

```bash
npm install          # install dependencies
npx expo start       # run locally; scan the QR code with your iPhone camera
npx expo start --tunnel   # if the phone can't reach your PC over Wi-Fi
npm test             # scheduling and reminder tests (Node's built-in test runner)
npx tsc --noEmit     # type check
npx expo-doctor      # check dependencies and config
```

### Publishing a new version

After changing code, publish it so Expo Go picks it up:

```bash
npx eas-cli@latest update --channel main --message "describe the change" --environment production --platform ios
```

Then fully close and reopen the app in Expo Go to get the new version. You must be signed in (`npx eas-cli@latest whoami`; `npx eas-cli@latest login` if not).

### Project layout

| Path | What's in it |
|---|---|
| `src/app/` | Screens (Expo Router). `(tabs)/` holds Today, Categories, Settings. |
| `src/lib/model.ts` | Data types (all plain JSON). |
| `src/lib/schedule.ts` | Scheduling: FSRS reviews, recurring, punt, spacing, daily cap. |
| `src/lib/reminders.ts` | Plans the daily notifications. |
| `src/lib/notifications.tsx` | Books the notifications on the phone. |
| `src/lib/store.tsx` | Loads and saves the data file. |
| `src/lib/backup.ts` | Export and import. |
| `src/ui/` | Shared UI pieces and colors. |
| `docs/DESIGN.md` | Design decisions. |

Scheduling uses [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) (the `ts-fsrs` library).
