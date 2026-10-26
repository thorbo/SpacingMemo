import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { dueLabel, scheduleLabel } from '@/lib/format';
import { useStore } from '@/lib/store';
import { Button, Card, Label, Muted, Screen, styles } from '@/ui/components';
import { useColors } from '@/ui/theme';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, renameCategory, deleteCategory } = useStore();
  const c = useColors();
  const category = data.categories.find((cat) => cat.id === id);
  const [name, setName] = useState(category?.name ?? '');
  const now = new Date();

  if (!category) {
    return (
      <Screen>
        <Muted>This category no longer exists.</Muted>
      </Screen>
    );
  }

  const items = data.items
    .filter((i) => i.categoryId === category.id)
    .sort((a, b) => a.due.localeCompare(b.due));

  const onRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== category.name) renameCategory(category.id, trimmed);
    else setName(category.name);
  };

  const onDelete = () => {
    if (items.length > 0) {
      Alert.alert(
        "Can't delete this category",
        `Move or delete its ${items.length} ${items.length === 1 ? 'item' : 'items'} first.`,
      );
      return;
    }
    Alert.alert(`Delete "${category.name}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteCategory(category.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: category.name }} />

      <Label>Name</Label>
      <TextInput
        value={name}
        onChangeText={setName}
        onEndEditing={onRename}
        returnKeyType="done"
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
      />

      <Label>Items</Label>
      {items.length === 0 && <Muted>No items yet.</Muted>}
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
          accessibilityRole="button">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 16 }}>{item.title}</Text>
              <Muted>{scheduleLabel(item)}</Muted>
            </View>
            <Muted>{dueLabel(item.due, now)}</Muted>
          </Card>
        </Pressable>
      ))}

      <Button
        title="Add item"
        variant="primary"
        onPress={() =>
          router.push({ pathname: '/item/[id]', params: { id: 'new', categoryId: category.id } })
        }
      />

      <Button title="Delete category" variant="danger" onPress={onDelete} style={{ marginTop: 24 }} />
    </Screen>
  );
}
