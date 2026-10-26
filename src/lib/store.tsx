// App state: loads AppData from one JSON file at startup and saves it after
// every change. If the file can't be read, nothing is ever written, so a
// read error can never wipe saved data.

import { File, Paths } from 'expo-file-system';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  DEFAULT_SETTINGS,
  type AppData,
  type Category,
  type Id,
  type Item,
  type MemorizeAction,
  type RecurringAction,
  type RecurringUnit,
  type Schedule,
  type Settings,
} from './model';
import {
  completeRecurring,
  initialDue,
  newMemorizeSchedule,
  newRecurringSchedule,
  reviewMemorize,
} from './schedule';

const FILE_NAME = 'spacingmemo.json';

const EMPTY: AppData = { version: 1, categories: [], items: [], settings: DEFAULT_SETTINGS };

export type ItemInput = {
  title: string;
  notes?: string;
  categoryId: Id;
  mode: Schedule['mode'];
  every: number;
  unit: RecurringUnit;
};

type Store = {
  data: AppData;
  addCategory: (name: string) => void;
  renameCategory: (id: Id, name: string) => void;
  // Returns false (and does nothing) if the category still has items.
  deleteCategory: (id: Id) => boolean;
  saveItem: (input: ItemInput, id?: Id) => void;
  deleteItem: (id: Id) => void;
  // Applies a button action; returns the item as it was before, for Undo.
  act: (id: Id, action: MemorizeAction | RecurringAction) => Item | undefined;
  restoreItem: (item: Item) => void;
  updateSettings: (patch: Partial<Settings>) => void;
};

const StoreContext = createContext<Store | null>(null);

function dataFile() {
  return new File(Paths.document, FILE_NAME);
}

function load(): AppData {
  const file = dataFile();
  if (!file.exists) return EMPTY;
  const parsed = JSON.parse(file.textSync()) as AppData;
  return { ...EMPTY, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
}

// Saves run one at a time, in order, so an older save can't overwrite a newer one.
let saveQueue = Promise.resolve();

function save(data: AppData) {
  const text = JSON.stringify(data);
  saveQueue = saveQueue
    .then(async () => {
      const file = dataFile();
      if (!file.exists) file.create();
      await file.write(text);
    })
    .catch((error) => console.warn('Saving failed', error));
}

export function newId(): Id {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function initialSchedule(input: ItemInput, now: Date): Schedule {
  return input.mode === 'memorize'
    ? newMemorizeSchedule(now)
    : newRecurringSchedule(input.every, input.unit);
}

export function StoreProvider({ children, fallback }: { children: ReactNode; fallback: (error: string) => ReactNode }) {
  const [initial] = useState(() => {
    try {
      return { data: load(), error: null };
    } catch (error) {
      return { data: EMPTY, error: String(error) };
    }
  });
  const [data, setData] = useState(initial.data);
  const ref = useRef(data);
  const loaded = initial.error === null;

  useEffect(() => {
    if (loaded) save(data);
  }, [data, loaded]);

  if (!loaded) return fallback(initial.error);

  const commit = (next: AppData) => {
    ref.current = next;
    setData(next);
  };
  const setItems = (items: Item[]) => commit({ ...ref.current, items });

  const store: Store = {
    data,
    addCategory(name) {
      const category: Category = { id: newId(), name, createdAt: new Date().toISOString() };
      commit({ ...ref.current, categories: [...ref.current.categories, category] });
    },
    renameCategory(id, name) {
      commit({
        ...ref.current,
        categories: ref.current.categories.map((c) => (c.id === id ? { ...c, name } : c)),
      });
    },
    deleteCategory(id) {
      if (ref.current.items.some((i) => i.categoryId === id)) return false;
      commit({ ...ref.current, categories: ref.current.categories.filter((c) => c.id !== id) });
      return true;
    },
    saveItem(input, id) {
      const now = new Date();
      const fields = { title: input.title, notes: input.notes, categoryId: input.categoryId };
      const existing = id ? ref.current.items.find((i) => i.id === id) : undefined;
      if (!existing) {
        const item: Item = {
          id: newId(),
          ...fields,
          createdAt: now.toISOString(),
          due: initialDue(now),
          schedule: initialSchedule(input, now),
        };
        setItems([...ref.current.items, item]);
        return;
      }
      let updated: Item = { ...existing, ...fields };
      if (existing.schedule.mode !== input.mode) {
        // Switching modes resets the schedule; the item is due today.
        updated = { ...updated, due: initialDue(now), schedule: initialSchedule(input, now) };
      } else if (input.mode === 'recurring') {
        updated = { ...updated, schedule: newRecurringSchedule(input.every, input.unit) };
      }
      setItems(ref.current.items.map((i) => (i.id === id ? updated : i)));
    },
    deleteItem(id) {
      setItems(ref.current.items.filter((i) => i.id !== id));
    },
    act(id, action) {
      const { items, settings } = ref.current;
      const item = items.find((i) => i.id === id);
      if (!item) return undefined;
      const now = new Date();
      const next =
        item.schedule.mode === 'memorize'
          ? reviewMemorize(item, action as MemorizeAction, now, settings, items)
          : completeRecurring(item, action as RecurringAction, now, settings, items);
      setItems(items.map((i) => (i.id === id ? next : i)));
      return item;
    },
    restoreItem(item) {
      setItems(ref.current.items.map((i) => (i.id === item.id ? item : i)));
    },
    updateSettings(patch) {
      commit({ ...ref.current, settings: { ...ref.current.settings, ...patch } });
    },
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
