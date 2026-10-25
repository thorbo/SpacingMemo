// Data model for SpacingMemo. Plain data only (no classes) so the whole
// AppData object round-trips through JSON for storage and export/import.
// All dates are ISO 8601 strings.

import type { Card } from 'ts-fsrs';

export type Id = string;
export type IsoDate = string;

export type Category = {
  id: Id;
  name: string;
  createdAt: IsoDate;
};

// ts-fsrs Card with Date fields stored as ISO strings.
export type StoredFsrsCard = Omit<Card, 'due' | 'last_review'> & {
  due: IsoDate;
  last_review?: IsoDate;
};

export type MemorizeSchedule = {
  mode: 'memorize';
  fsrs: StoredFsrsCard;
};

export type RecurringUnit = 'day' | 'week' | 'month';

export type RecurringSchedule = {
  mode: 'recurring';
  every: number;
  unit: RecurringUnit;
};

export type Schedule = MemorizeSchedule | RecurringSchedule;

export type Item = {
  id: Id;
  categoryId: Id;
  title: string;
  notes?: string;
  createdAt: IsoDate;
  // When the item is next due. Source of truth for reminders; can differ from
  // fsrs.due after a Punt, which moves the item without touching FSRS state.
  due: IsoDate;
  schedule: Schedule;
};

export type MemorizeAction = 'forgot' | 'hard' | 'good' | 'punt';
export type RecurringAction = 'done' | 'punt';

export type Settings = {
  notifyTime: string; // "HH:MM", local time
  dailyCap: number;
  puntWindowDays: { min: number; max: number };
  targetRecall: number; // FSRS request_retention, 0–1
};

export const DEFAULT_SETTINGS: Settings = {
  notifyTime: '08:00',
  dailyCap: 10,
  puntWindowDays: { min: 1, max: 3 },
  targetRecall: 0.95,
};

// The saved file, and the export/import file.
export type AppData = {
  version: 1;
  categories: Category[];
  items: Item[];
  settings: Settings;
};
