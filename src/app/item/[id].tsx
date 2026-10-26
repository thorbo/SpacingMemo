// Add or edit an item. Route id "new" creates one (with ?categoryId=).

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { dueLabel, scheduleLabel } from '@/lib/format';
import type { RecurringUnit, Schedule } from '@/lib/model';
import { useStore } from '@/lib/store';
import { Button, Label, Muted, Screen, Segmented, styles } from '@/ui/components';
import { useColors } from '@/ui/theme';

const UNITS: { value: RecurringUnit; label: string }[] = [
  { value: 'day', label: 'Days' },
  { value: 'week', label: 'Weeks' },
  { value: 'month', label: 'Months' },
];

export default function ItemScreen() {
  const { id, categoryId } = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const { data, saveItem, deleteItem } = useStore();
  const c = useColors();
  const existing = data.items.find((i) => i.id === id);
  const recurring = existing?.schedule.mode === 'recurring' ? existing.schedule : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [category, setCategory] = useState(existing?.categoryId ?? categoryId ?? data.categories[0]?.id ?? '');
  const [mode, setMode] = useState<Schedule['mode']>(existing?.schedule.mode ?? 'memorize');
  const [every, setEvery] = useState(String(recurring?.every ?? 1));
  const [unit, setUnit] = useState<RecurringUnit>(recurring?.unit ?? 'month');
  const [error, setError] = useState('');

  const everyNumber = Number(every);
  const unitLabel = UNITS.find((u) => u.value === unit)!.label.toLowerCase();

  const onSave = () => {
    if (!title.trim()) return setError('Enter a title.');
    if (!category) return setError('Choose a category.');
    if (mode === 'recurring' && !(Number.isInteger(everyNumber) && everyNumber >= 1 && everyNumber <= 365)) {
      return setError('Enter a whole number from 1 to 365.');
    }
    saveItem(
      { title: title.trim(), notes: notes.trim() || undefined, categoryId: category, mode, every: everyNumber, unit },
      existing?.id,
    );
    router.back();
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert(`Delete "${existing.title}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteItem(existing.id);
          router.back();
        },
      },
    ]);
  };

  const inputStyle = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }];

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: existing ? 'Edit item' : 'New item',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={{ color: c.accent, fontSize: 17 }}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={onSave} hitSlop={12}>
              <Text style={{ color: c.accent, fontSize: 17, fontWeight: '600' }}>Save</Text>
            </Pressable>
          ),
        }}
      />

      {existing && (
        <Muted>
          {scheduleLabel(existing)} · Next review: {dueLabel(existing.due, new Date())}
        </Muted>
      )}

      <Label>Title</Label>
      <TextInput
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          setError('');
        }}
        placeholder="Clair de lune, bars 1–27"
        placeholderTextColor={c.muted}
        style={inputStyle}
      />

      <Label>Category</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {data.categories.map((cat) => (
          <Button
            key={cat.id}
            title={cat.name}
            variant={cat.id === category ? 'primary' : 'default'}
            onPress={() => setCategory(cat.id)}
          />
        ))}
      </View>

      <Label>Notes (optional)</Label>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="A link, a hint, or what to focus on"
        placeholderTextColor={c.muted}
        multiline
        style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
      />

      <Label>Mode</Label>
      <Segmented
        options={[
          { value: 'memorize', label: 'Memorize' },
          { value: 'recurring', label: 'Recurring' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'recurring' && (
        <>
          <Label>Repeat every</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={every}
              onChangeText={(t) => {
                setEvery(t);
                setError('');
              }}
              keyboardType="number-pad"
              style={[inputStyle, { width: 70, textAlign: 'center' }]}
            />
            <View style={{ flex: 1 }}>
              <Segmented options={UNITS} value={unit} onChange={setUnit} />
            </View>
          </View>
        </>
      )}

      {existing && existing.schedule.mode !== mode ? (
        <Text style={{ color: c.warnText }}>Switching modes resets this item's progress. It'll be due today.</Text>
      ) : mode === 'recurring' ? (
        <Muted>
          {existing ? 'Next' : 'First reminder today. Next'} one {everyNumber || 'N'} {unitLabel} after you tap
          Done.
        </Muted>
      ) : (
        <Muted>Reviews get further apart as you remember it.</Muted>
      )}

      {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}

      {existing && <Button title="Delete item" variant="danger" onPress={onDelete} style={{ marginTop: 24 }} />}
    </Screen>
  );
}
