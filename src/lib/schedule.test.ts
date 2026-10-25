/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_SETTINGS, type Item, type Settings } from './model.ts';
import {
  addDays,
  addMonths,
  completeRecurring,
  dueCount,
  initialDue,
  isDue,
  newMemorizeSchedule,
  newRecurringSchedule,
  punt,
  reviewMemorize,
  startOfDay,
} from './schedule.ts';

// Local-time dates, matching how the app computes days.
const at = (ymd: string, time = '09:00') => new Date(`${ymd}T${time}:00`);
const day = (ymd: string) => startOfDay(at(ymd)).toISOString();
const ymd = (iso: string) => new Date(iso).toLocaleDateString('en-CA');
const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 864e5);

const first = () => 0;
const last = () => 0.999;

function memorizeItem(now: Date, id = 'm'): Item {
  return {
    id,
    categoryId: 'c',
    title: 'Song',
    createdAt: now.toISOString(),
    due: initialDue(now),
    schedule: newMemorizeSchedule(now),
  };
}

function recurringItem(every: number, unit: 'day' | 'week' | 'month', due: string, id = 'r'): Item {
  return {
    id,
    categoryId: 'c',
    title: 'Call Sam',
    createdAt: due,
    due,
    schedule: newRecurringSchedule(every, unit),
  };
}

// `n` filler items due on the given day.
function fill(ymdStr: string, n: number): Item[] {
  return Array.from({ length: n }, (_, k) => recurringItem(1, 'month', day(ymdStr), `${ymdStr}-${k}`));
}

// Reviews `item` with Good `times` times, each on its due day.
function goodTimes(item: Item, times: number, settings: Settings = DEFAULT_SETTINGS): Item {
  let current = item;
  for (let i = 0; i < times; i++) {
    const now = new Date(new Date(current.due).getTime() + 9 * 3600e3);
    current = reviewMemorize(current, 'good', now, settings, [current], first);
  }
  return current;
}

describe('date helpers', () => {
  it('addMonths clamps to the end of shorter months', () => {
    assert.equal(ymd(addMonths(at('2027-01-31'), 1).toISOString()), '2027-02-28');
    assert.equal(ymd(addMonths(at('2028-01-31'), 1).toISOString()), '2028-02-29');
    assert.equal(ymd(addMonths(at('2026-10-15'), 3).toISOString()), '2027-01-15');
  });

  it('addDays crosses month and year boundaries', () => {
    assert.equal(ymd(addDays(at('2026-12-30'), 3).toISOString()), '2027-01-02');
  });
});

describe('new items and due queries', () => {
  it('new items are due at the start of today', () => {
    const now = at('2026-10-25', '15:30');
    assert.equal(initialDue(now), day('2026-10-25'));
    assert.ok(isDue(memorizeItem(now), now));
  });

  it('isDue and dueCount include overdue items and exclude future ones', () => {
    const now = at('2026-10-25');
    const items = [
      recurringItem(1, 'day', day('2026-10-20'), 'late'),
      recurringItem(1, 'day', day('2026-10-25'), 'today'),
      recurringItem(1, 'day', day('2026-10-26'), 'tomorrow'),
    ];
    assert.deepEqual(items.map((i) => isDue(i, now)), [true, true, false]);
    assert.equal(dueCount(items, now), 2);
  });
});

describe('reviewMemorize', () => {
  it('first Good on a new item is due tomorrow at 95% target', () => {
    const now = at('2026-10-25');
    const next = reviewMemorize(memorizeItem(now), 'good', now, DEFAULT_SETTINGS, [], first);
    assert.equal(next.due, day('2026-10-26'));
    assert.equal(next.schedule.mode === 'memorize' && next.schedule.fsrs.reps, 1);
  });

  it('gaps grow with repeated Good', () => {
    const now = at('2026-10-25');
    let item = memorizeItem(now);
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      const reviewAt = new Date(new Date(item.due).getTime() + 9 * 3600e3);
      item = reviewMemorize(item, 'good', reviewAt, DEFAULT_SETTINGS, [item], first);
      gaps.push(daysBetween(reviewAt, new Date(item.due)));
    }
    for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] > gaps[i - 1], `gaps: ${gaps}`);
  });

  it('Forgot gives a shorter gap than Hard, and Hard shorter than Good', () => {
    const start = goodTimes(memorizeItem(at('2026-10-25')), 4);
    const now = new Date(new Date(start.due).getTime() + 9 * 3600e3);
    const gap = (action: 'forgot' | 'hard' | 'good') =>
      daysBetween(now, new Date(reviewMemorize(start, action, now, DEFAULT_SETTINGS, [], first).due));
    assert.ok(gap('forgot') < gap('hard'), `forgot ${gap('forgot')} vs hard ${gap('hard')}`);
    assert.ok(gap('hard') < gap('good'), `hard ${gap('hard')} vs good ${gap('good')}`);
  });

  it('a higher memory target gives shorter gaps', () => {
    const now = at('2026-10-25');
    const strict: Settings = { ...DEFAULT_SETTINGS, targetRecall: 0.97 };
    const loose: Settings = { ...DEFAULT_SETTINGS, targetRecall: 0.9 };
    const strictDue = new Date(goodTimes(memorizeItem(now), 4, strict).due);
    const looseDue = new Date(goodTimes(memorizeItem(now), 4, loose).due);
    assert.ok(strictDue < looseDue);
  });

  it('fuzz keeps gaps of 5+ days within ±10%', () => {
    const start = goodTimes(memorizeItem(at('2026-10-25')), 4);
    const now = new Date(new Date(start.due).getTime() + 9 * 3600e3);
    const low = daysBetween(now, new Date(reviewMemorize(start, 'good', now, DEFAULT_SETTINGS, [], first).due));
    const high = daysBetween(now, new Date(reviewMemorize(start, 'good', now, DEFAULT_SETTINGS, [], last).due));
    assert.ok(low >= 5);
    const mid = (low + high) / 2;
    assert.ok(high > low, 'fuzz should produce a range');
    assert.ok(mid - low <= Math.round(mid * 0.1) + 1 && high - mid <= Math.round(mid * 0.1) + 1);
  });

  it('gaps under 5 days are not fuzzed', () => {
    const now = at('2026-10-25');
    const a = reviewMemorize(memorizeItem(now), 'good', now, DEFAULT_SETTINGS, [], first);
    const b = reviewMemorize(memorizeItem(now), 'good', now, DEFAULT_SETTINGS, [], last);
    assert.equal(a.due, b.due);
  });

  it('daily cap moves the item to a day under the cap within the fuzz window', () => {
    const start = goodTimes(memorizeItem(at('2026-10-25')), 4);
    const now = new Date(new Date(start.due).getTime() + 9 * 3600e3);
    const lowDue = reviewMemorize(start, 'good', now, DEFAULT_SETTINGS, [], first).due;
    const highDue = reviewMemorize(start, 'good', now, DEFAULT_SETTINGS, [], last).due;
    // Fill every day in the window except the last one.
    const busy: Item[] = [];
    for (let d = new Date(lowDue); d < new Date(highDue); d = addDays(d, 1)) {
      busy.push(...fill(ymd(d.toISOString()), DEFAULT_SETTINGS.dailyCap));
    }
    const next = reviewMemorize(start, 'good', now, DEFAULT_SETTINGS, [start, ...busy], first);
    assert.equal(next.due, highDue);
  });

  it('gaps under 5 days stay on their day even when it is full', () => {
    const now = at('2026-10-25');
    const tomorrow = '2026-10-26';
    // Gap is 1 day (no window), so the only candidate is tomorrow, even if full.
    const busy = fill(tomorrow, DEFAULT_SETTINGS.dailyCap + 2);
    const next = reviewMemorize(memorizeItem(now), 'good', now, DEFAULT_SETTINGS, busy, first);
    assert.equal(next.due, day(tomorrow));
  });

  it('Punt leaves FSRS state untouched', () => {
    const start = goodTimes(memorizeItem(at('2026-10-25')), 2);
    const now = new Date(start.due);
    const next = reviewMemorize(start, 'punt', now, DEFAULT_SETTINGS, [start]);
    assert.deepEqual(next.schedule, start.schedule);
    assert.notEqual(next.due, start.due);
  });

  it('throws for a recurring item', () => {
    const item = recurringItem(1, 'month', day('2026-10-25'));
    assert.throws(() => reviewMemorize(item, 'good', at('2026-10-25'), DEFAULT_SETTINGS, []));
  });
});

describe('completeRecurring', () => {
  it('Done schedules from the day you mark it done, not the original due date', () => {
    const item = recurringItem(1, 'month', day('2026-10-01'));
    const next = completeRecurring(item, 'done', at('2026-10-06'), DEFAULT_SETTINGS, []);
    assert.equal(next.due, day('2026-11-06'));
  });

  it('supports days, weeks, and months', () => {
    const now = at('2026-10-25');
    const due = day('2026-10-25');
    const next = (every: number, unit: 'day' | 'week' | 'month') =>
      ymd(completeRecurring(recurringItem(every, unit, due), 'done', now, DEFAULT_SETTINGS, []).due);
    assert.equal(next(3, 'day'), '2026-10-28');
    assert.equal(next(2, 'week'), '2026-11-08');
    assert.equal(next(1, 'month'), '2026-11-25');
  });

  it('ignores the daily cap', () => {
    const item = recurringItem(1, 'month', day('2026-10-25'));
    const busy = fill('2026-11-25', DEFAULT_SETTINGS.dailyCap + 5);
    const next = completeRecurring(item, 'done', at('2026-10-25'), DEFAULT_SETTINGS, busy);
    assert.equal(next.due, day('2026-11-25'));
  });

  it('Punt moves the item without changing its schedule', () => {
    const item = recurringItem(1, 'month', day('2026-10-25'));
    const next = completeRecurring(item, 'punt', at('2026-10-25'), DEFAULT_SETTINGS, [item]);
    assert.deepEqual(next.schedule, item.schedule);
    assert.equal(next.due, day('2026-10-26'));
  });

  it('throws for a memorize item', () => {
    const now = at('2026-10-25');
    assert.throws(() => completeRecurring(memorizeItem(now), 'done', now, DEFAULT_SETTINGS, []));
  });
});

describe('punt', () => {
  const now = at('2026-10-25');

  it('picks the earliest day when the window is empty', () => {
    const item = memorizeItem(now);
    assert.equal(punt(item, now, DEFAULT_SETTINGS, [item]).due, day('2026-10-26'));
  });

  it('picks the lightest day in the window', () => {
    const item = memorizeItem(now);
    const busy = [...fill('2026-10-26', 4), ...fill('2026-10-27', 1), ...fill('2026-10-28', 3)];
    assert.equal(punt(item, now, DEFAULT_SETTINGS, [item, ...busy]).due, day('2026-10-27'));
  });

  it('respects the punt window setting', () => {
    const item = memorizeItem(now);
    const settings: Settings = { ...DEFAULT_SETTINGS, puntWindowDays: { min: 2, max: 4 } };
    assert.equal(punt(item, now, settings, [item]).due, day('2026-10-27'));
  });

  it('does not count the item itself toward a day’s load', () => {
    const item = { ...memorizeItem(now), due: day('2026-10-26') };
    const busy = fill('2026-10-27', 1);
    // 10/26 holds only the item itself, so it counts as empty.
    assert.equal(punt(item, now, DEFAULT_SETTINGS, [item, ...busy]).due, day('2026-10-26'));
  });
});
