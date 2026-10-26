import type { Item } from './model';
import { startOfDay } from './schedule';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Whole days from today to the item's due day (negative = late).
export function daysUntil(iso: string, now: Date): number {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / 864e5);
}

export function dueLabel(iso: string, now: Date): string {
  const days = daysUntil(iso, now);
  if (days < 0) return `${plural(-days, 'day')} late`;
  if (days === 0) return 'due today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

// Short gap: "12d", "4mo", "1.5y".
export function formatGap(days: number): string {
  if (days < 100) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

// Memorize items show FSRS's current gap, e.g. "Memorize · 30d".
export function scheduleLabel(item: Item): string {
  const { schedule } = item;
  if (schedule.mode === 'recurring') return `Every ${plural(schedule.every, schedule.unit)}`;
  const { reps, scheduled_days } = schedule.fsrs;
  return `Memorize · ${reps === 0 ? 'new' : formatGap(scheduled_days)}`;
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}
