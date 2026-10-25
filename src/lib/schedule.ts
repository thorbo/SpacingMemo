// Scheduling: pure functions that take an item and return an updated copy.
// Due dates are always the start of a local day, so an item is "due" for
// that whole day. `allItems` is used to count how busy each day is.

import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';
import type { Card, Grade } from 'ts-fsrs';

import type {
  Item,
  MemorizeAction,
  MemorizeSchedule,
  RecurringAction,
  RecurringSchedule,
  RecurringUnit,
  Settings,
  StoredFsrsCard,
} from './model';

// Gaps of at least this many days get a random ±10% shift (fuzz).
const FUZZ_MIN_DAYS = 5;
const FUZZ_RATIO = 0.1;

const GRADES: Record<Exclude<MemorizeAction, 'punt'>, Grade> = {
  forgot: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
};

// ---- Date helpers (local time) ----

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Clamps to the last day of the month, e.g. Jan 31 + 1 month = Feb 28/29.
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// ---- FSRS card conversion ----

function toCard(stored: StoredFsrsCard): Card {
  return {
    ...stored,
    due: new Date(stored.due),
    last_review: stored.last_review ? new Date(stored.last_review) : undefined,
  };
}

function fromCard(card: Card): StoredFsrsCard {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review?.toISOString(),
  };
}

function scheduler(settings: Settings) {
  return fsrs(
    generatorParameters({
      request_retention: settings.targetRecall,
      // Whole days only; we do our own fuzz and load balancing.
      learning_steps: [],
      relearning_steps: [],
      enable_fuzz: false,
    }),
  );
}

// ---- New items (due today) ----

export function newMemorizeSchedule(now: Date): MemorizeSchedule {
  return { mode: 'memorize', fsrs: fromCard(createEmptyCard(now)) };
}

export function newRecurringSchedule(every: number, unit: RecurringUnit): RecurringSchedule {
  return { mode: 'recurring', every, unit };
}

export function initialDue(now: Date): string {
  return startOfDay(now).toISOString();
}

// ---- Queries ----

export function isDue(item: Item, now: Date): boolean {
  return new Date(item.due) <= now;
}

export function dueCount(items: Item[], now: Date): number {
  return items.filter((item) => isDue(item, now)).length;
}

function loadByDay(allItems: Item[], excludeId: string): Map<string, number> {
  const load = new Map<string, number>();
  for (const item of allItems) {
    if (item.id === excludeId) continue;
    const key = dayKey(new Date(item.due));
    load.set(key, (load.get(key) ?? 0) + 1);
  }
  return load;
}

// Picks a day from `candidates` (start-of-day dates). Prefers days under the
// cap, chosen at random; if all are full, the least loaded (earliest on tie).
function pickDay(
  candidates: Date[],
  load: Map<string, number>,
  cap: number,
  random: () => number,
): Date {
  const count = (d: Date) => load.get(dayKey(d)) ?? 0;
  const open = candidates.filter((d) => count(d) < cap);
  if (open.length > 0) return open[Math.floor(random() * open.length)];
  return candidates.reduce((best, d) => (count(d) < count(best) ? d : best));
}

function dayRange(from: Date, minDays: number, maxDays: number): Date[] {
  const days: Date[] = [];
  for (let n = minDays; n <= maxDays; n++) days.push(addDays(from, n));
  return days;
}

// ---- Actions ----

export function reviewMemorize(
  item: Item,
  action: MemorizeAction,
  now: Date,
  settings: Settings,
  allItems: Item[],
  random: () => number = Math.random,
): Item {
  if (item.schedule.mode !== 'memorize') throw new Error('Item is not in memorize mode');
  if (action === 'punt') return punt(item, now, settings, allItems);

  const { card } = scheduler(settings).next(toCard(item.schedule.fsrs), now, GRADES[action]);
  const gap = Math.max(1, card.scheduled_days);
  const spread = gap >= FUZZ_MIN_DAYS ? Math.round(gap * FUZZ_RATIO) : 0;
  const candidates = dayRange(startOfDay(now), gap - spread, gap + spread);
  const due = pickDay(candidates, loadByDay(allItems, item.id), settings.dailyCap, random);

  return {
    ...item,
    due: due.toISOString(),
    schedule: { ...item.schedule, fsrs: fromCard(card) },
  };
}

// Recurring items are never moved by the daily cap.
export function completeRecurring(
  item: Item,
  action: RecurringAction,
  now: Date,
  settings: Settings,
  allItems: Item[],
): Item {
  if (item.schedule.mode !== 'recurring') throw new Error('Item is not in recurring mode');
  if (action === 'punt') return punt(item, now, settings, allItems);

  const { every, unit } = item.schedule;
  const today = startOfDay(now);
  const due =
    unit === 'month'
      ? addMonths(today, every)
      : addDays(today, unit === 'week' ? every * 7 : every);
  return { ...item, due: due.toISOString() };
}

// Skip without reviewing: FSRS state is untouched; the item moves to the
// lightest day in the punt window.
export function punt(item: Item, now: Date, settings: Settings, allItems: Item[]): Item {
  const { min, max } = settings.puntWindowDays;
  const candidates = dayRange(startOfDay(now), min, max);
  const load = loadByDay(allItems, item.id);
  const count = (d: Date) => load.get(dayKey(d)) ?? 0;
  const due = candidates.reduce((best, d) => (count(d) < count(best) ? d : best));
  return { ...item, due: due.toISOString() };
}
