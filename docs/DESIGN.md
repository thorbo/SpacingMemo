# SpacingMemo — Design (v1)

A phone app (iPhone first, via Expo Go) that reminds you to review things on a spaced schedule.

## Concepts

- **Category** — a named group, e.g. Programming, Music, Parenting.
- **Item** — one thing in a category, e.g. a song. Fields: title, optional notes/link, mode.
- **Mode** (per item):
  - **Memorize** — spacing grows using the FSRS algorithm.
  - **Recurring** — fixed schedule: every N days / weeks / months.
  - Mode can be changed when editing. Switching resets the schedule: Memorize progress is lost and the item becomes due today.

## Buttons when an item is due

| Mode      | Buttons                          |
|-----------|----------------------------------|
| Memorize  | Forgot · Hard · Good · Punt      |
| Recurring | Done · Punt                      |

- **Forgot / Hard / Good** map to FSRS ratings Again / Hard / Good. (No Easy button, by choice.)
- **Done** (recurring): next due = completion time + interval (relative to when you mark it done, not the original date).
- **Punt** (both modes): you didn't do it. Logged as a skip, not a review — the item's memory state is untouched. Moved to the lightest day within the next 1–3 days (window is a setting).

## Scheduling — Memorize mode

- Library: [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (MIT, official TypeScript FSRS).
- Intra-day learning steps disabled (`learning_steps: []`) — all gaps are whole days.
- **Target recall** (`request_retention`) is a setting. It controls how fast gaps grow. Measured with ts-fsrs 5.4.2 default weights, answering Good every time:

  | Target recall | Gaps (days)                         |
  |---------------|-------------------------------------|
  | 0.90 (FSRS default) | 2, 11, 46, 163, 497 …         |
  | 0.95          | 1, 3, 8, 19, 43, 89 …               |
  | 0.97          | 1, 2, 4, 7, 13, 22, 36, 58, 90 …    |

  Default: **0.95**.
- No review history is kept (scope). Each item stores only its current FSRS state, which is all scheduling needs. Trade-off: FSRS self-tuning from your history isn't possible later.

## Avoiding pile-ups

- **One daily notification** at a chosen time: "N items due today" — not one per item.
- **Fuzz**: ±10% random shift on gaps ≥ 5 days.
- **Daily cap** (default 10): the new due day is picked at random among days in the fuzz window that are under the cap; if all are full, the least-loaded day. Recurring items are never moved by the cap.
- **Overdue** items simply stay due; no penalty.

## Notifications

- Local notifications booked ahead (no server). Text is fixed when booked, so the whole set is cancelled and rebuilt after any data change and whenever the app opens.
- A fixed-size queue: starting at the first day anything is due (however far out), one per day while anything is due, up to **15**, plus a final "Open SpacingMemo to keep your reminders coming." the day after.
- Once 30 days pass without an export (or, if never exported, since the oldest item was created), notifications add "Time to export a backup."

## Screens

1. Today — due items as collapsed cards (title, category, "N days late" tag until acted on). Tap a card to expand it: shows notes and large action buttons. One card expanded at a time. After any action button, a brief "Undo" banner (about 5 seconds) restores the item exactly as it was. When nothing is due: "Nothing due. Next item in N days." ("tomorrow" when N = 1; with no items at all, a prompt to add the first one).
2. Categories → Items in a category → Add/Edit item. A category can only be deleted when it has no items.
3. Settings — notification time, daily cap, punt window, target recall, Export, Import, "Last exported: N days ago".

Spacing is always visible: memorize items show their current FSRS gap (e.g. "Memorize · 30d"), and each action button shows where it would move the item (e.g. Good "45d"). The shown result is exactly what the tap applies.

## Storage & backup

- All data in one JSON file in the app's document folder (`expo-file-system`). Saves write a temp file and move it over the real one; on load, the temp file is used if the real one is missing. If the file can't be read, the app never writes.
- **Export**: share a copy via the iOS share sheet (`expo-sharing`); pick Save to Files → iCloud Drive to get it off the phone. Closing the share sheet counts as an export (it can't tell whether a file was saved).
- **Import**: pick a JSON file via `expo-document-picker`, replace current data (after confirmation).
- Reason: Expo Go data is lost if Expo Go is deleted — export is the safety net.

## Tech

- Expo SDK 58, TypeScript, Expo Router (`src/app/`).
- Local notifications (`expo-notifications`) — supported in Expo Go; no server.
- Scheduling logic is plain TypeScript in `src/lib/`, tested with Node's built-in test runner (no extra test dependency).
