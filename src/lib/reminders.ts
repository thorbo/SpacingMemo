// Plans the daily "N items due today" notifications. Pure (no Expo imports)
// so it can be tested with Node.
//
// iOS limits how many notifications an app can have pending (64), not how far
// ahead they are. So we skip days with nothing due, book up to MAX_REMINDERS
// days that have something due (however far out), then one final nudge to
// open the app so the plan can be extended.

import type { Item } from './model';
// Explicit .ts extension so Node's test runner can resolve this value import.
import { addDays, startOfDay } from './schedule.ts';

// Kept small on purpose; opening the app refills the queue.
export const MAX_REMINDERS = 15;

export type PlannedReminder = { date: Date; body: string };

// The notification time on the given day.
function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

// Days without an export before notifications add a backup reminder.
export const BACKUP_AFTER_DAYS = 30;

const countBody = (count: number) => `${count} ${count === 1 ? 'item' : 'items'} due today`;

// `lastExportAt` is when a backup was last exported; if never, the age of the
// oldest item counts instead.
export function planReminders(
  items: Item[],
  notifyTime: string,
  now: Date,
  lastExportAt?: string,
): PlannedReminder[] {
  if (items.length === 0) return [];
  const dueDays = items.map((i) => startOfDay(new Date(i.due))).sort((a, b) => a.getTime() - b.getTime());
  const plan: PlannedReminder[] = [];

  const backupBase = startOfDay(
    new Date(lastExportAt ?? items.reduce((a, b) => (a.createdAt < b.createdAt ? a : b)).createdAt),
  );
  const backupDue = addDays(backupBase, BACKUP_AFTER_DAYS);
  const body = (day: Date, count: number) =>
    day >= backupDue ? `${countBody(count)}. Time to export a backup.` : countBody(count);

  // Nothing is due before the earliest due day, so start there (or today).
  const today = startOfDay(now);
  let day = dueDays[0] > today ? dueDays[0] : today;
  while (plan.length < MAX_REMINDERS) {
    const date = atTime(day, notifyTime);
    // Anything not acted on stays due, so a day's count includes earlier days.
    // Once something is due, every later day has a count, so this loop ends.
    const count = dueDays.filter((d) => d <= day).length;
    if (date > now && count > 0) plan.push({ date, body: body(day, count) });
    day = addDays(day, 1);
  }

  plan.push({
    date: atTime(day, notifyTime),
    body: 'Open SpacingMemo to keep your reminders coming.',
  });
  return plan;
}
