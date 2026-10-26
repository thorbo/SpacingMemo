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

export function scheduleLabel(item: Item): string {
  const { schedule } = item;
  if (schedule.mode === 'memorize') return 'Memorize';
  return `Every ${plural(schedule.every, schedule.unit)}`;
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}
