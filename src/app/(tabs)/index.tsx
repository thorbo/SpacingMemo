import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { daysUntil, dueLabel, scheduleLabel } from '@/lib/format';
import type { Item, MemorizeAction, RecurringAction } from '@/lib/model';
import { isDue } from '@/lib/schedule';
import { useStore } from '@/lib/store';
import { Button, Card, Muted, Screen } from '@/ui/components';
import { useColors } from '@/ui/theme';

type Action = MemorizeAction | RecurringAction;

const MEMORIZE_ACTIONS: { action: Action; title: string }[] = [
  { action: 'forgot', title: 'Forgot' },
  { action: 'hard', title: 'Hard' },
  { action: 'good', title: 'Good' },
  { action: 'punt', title: 'Punt' },
];

const RECURRING_ACTIONS: { action: Action; title: string }[] = [
  { action: 'done', title: 'Done' },
  { action: 'punt', title: 'Punt' },
];

const UNDO_MS = 5000;

export default function TodayScreen() {
  const { data, act, restoreItem } = useStore();
  const c = useColors();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ item: Item; title: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const now = new Date();
  const due = data.items.filter((i) => isDue(i, now)).sort((a, b) => a.due.localeCompare(b.due));
  const categoryName = (id: string) => data.categories.find((cat) => cat.id === id)?.name ?? '';

  const onAction = (item: Item, action: Action, title: string) => {
    const before = act(item.id, action);
    if (!before) return;
    setExpandedId(null);
    setUndo({ item: before, title: `${title}: ${item.title}` });
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const onUndo = () => {
    if (!undo) return;
    restoreItem(undo.item);
    clearTimeout(undoTimer.current);
    setUndo(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Muted>
          {due.length} due ·{' '}
          {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </Muted>

        {due.length === 0 && <EmptyState items={data.items} now={now} />}

        {due.map((item) => {
          const expanded = item.id === expandedId;
          const late = daysUntil(item.due, now) < 0;
          const actions = item.schedule.mode === 'memorize' ? MEMORIZE_ACTIONS : RECURRING_ACTIONS;
          return (
            <Card key={item.id}>
              <Pressable
                onPress={() => setExpandedId(expanded ? null : item.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
                  {late && (
                    <Text style={[styles.tag, { backgroundColor: c.warnBg, color: c.warnText }]}>
                      {dueLabel(item.due, now)}
                    </Text>
                  )}
                </View>
                <Muted>
                  {categoryName(item.categoryId)} · {scheduleLabel(item)}
                </Muted>
              </Pressable>
              {expanded && (
                <View style={{ marginTop: 12, gap: 12 }}>
                  {item.notes ? <Text style={{ color: c.text, fontSize: 16 }}>{item.notes}</Text> : null}
                  <View style={styles.actions}>
                    {actions.map(({ action, title }) => (
                      <Button
                        key={action}
                        title={title}
                        big
                        variant={action === 'punt' ? 'quiet' : 'default'}
                        onPress={() => onAction(item, action, title)}
                      />
                    ))}
                  </View>
                </View>
              )}
            </Card>
          );
        })}
      </Screen>

      {undo && (
        <View style={[styles.undo, { backgroundColor: c.text }]}>
          <Text style={{ color: c.background, flex: 1 }} numberOfLines={1}>
            {undo.title}
          </Text>
          <Pressable onPress={onUndo} accessibilityRole="button" hitSlop={12}>
            <Text style={{ color: c.background, fontWeight: '600' }}>Undo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function EmptyState({ items, now }: { items: Item[]; now: Date }) {
  if (items.length === 0) {
    return (
      <Card style={{ gap: 12 }}>
        <Muted>Add your first item to start getting reminders.</Muted>
        <Button title="Go to categories" variant="primary" onPress={() => router.navigate('/categories')} />
      </Card>
    );
  }
  const next = items.reduce((a, b) => (a.due < b.due ? a : b));
  const days = daysUntil(next.due, now);
  return <Muted>Nothing due. Next item {days === 1 ? 'tomorrow' : `in ${days} days`}.</Muted>;
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  title: { fontSize: 17, fontWeight: '500', flexShrink: 1 },
  tag: { fontSize: 12, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 8 },
  undo: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
