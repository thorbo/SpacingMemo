/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Item } from './model.ts';
import { MAX_REMINDERS, planReminders } from './reminders.ts';
import { addDays, newRecurringSchedule, startOfDay } from './schedule.ts';

const at = (ymd: string, time = '09:00') => new Date(`${ymd}T${time}:00`);
const day = (ymd: string) => startOfDay(at(ymd)).toISOString();

function item(due: string, id = due): Item {
  return { id, categoryId: 'c', title: 'x', createdAt: due, due, schedule: newRecurringSchedule(1, 'month') };
}

describe('planReminders', () => {
  it('plans nothing when there are no items', () => {
    assert.deepEqual(planReminders([], '08:00', at('2026-10-25', '07:00')), []);
  });

  it('schedules today when the reminder time is still ahead', () => {
    const plan = planReminders([item(day('2026-10-25'))], '08:00', at('2026-10-25', '07:00'));
    assert.deepEqual(plan[0], { date: at('2026-10-25', '08:00'), body: '1 item due today' });
  });

  it('skips today once the reminder time has passed', () => {
    const plan = planReminders([item(day('2026-10-25'))], '08:00', at('2026-10-25', '09:00'));
    assert.deepEqual(plan[0].date, at('2026-10-26', '08:00'));
  });

  it('counts overdue items on later days, since they stay due', () => {
    const items = [item(day('2026-10-24'), 'a'), item(day('2026-10-27'), 'b')];
    const plan = planReminders(items, '08:00', at('2026-10-25', '07:00'));
    assert.equal(plan[0].body, '1 item due today'); // 10/25
    assert.equal(plan[2].body, '2 items due today'); // 10/27
  });

  it('skips days with nothing due', () => {
    const plan = planReminders([item(day('2026-10-28'))], '08:00', at('2026-10-25', '07:00'));
    assert.deepEqual(plan[0].date, at('2026-10-28', '08:00'));
  });

  it('books far-out items with no time limit', () => {
    const plan = planReminders([item(day('2027-04-25'))], '08:00', at('2026-10-25', '07:00'));
    assert.deepEqual(plan[0], { date: at('2027-04-25', '08:00'), body: '1 item due today' });
  });

  it('stays under the iOS limit of 64 and ends with a nudge the day after the last one', () => {
    const plan = planReminders([item(day('2026-10-25'))], '08:00', at('2026-10-25', '07:00'));
    assert.equal(plan.length, MAX_REMINDERS + 1);
    assert.ok(plan.length <= 64);
    const last = plan[plan.length - 1];
    assert.deepEqual(last.date, addDays(plan[plan.length - 2].date, 1));
    assert.match(last.body, /Open SpacingMemo/);
  });
});
