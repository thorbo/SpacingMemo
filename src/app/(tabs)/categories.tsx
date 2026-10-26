import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { isDue } from '@/lib/schedule';
import { useStore } from '@/lib/store';
import { Button, Card, Muted, Screen, styles } from '@/ui/components';
import { useColors } from '@/ui/theme';

export default function CategoriesScreen() {
  const { data, addCategory } = useStore();
  const c = useColors();
  const [name, setName] = useState('');
  const now = new Date();

  const categories = [...data.categories].sort((a, b) => a.name.localeCompare(b.name));

  const onAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setName('');
  };

  return (
    <Screen>
      {categories.length === 0 && <Muted>Create a category, like Music or Programming.</Muted>}

      {categories.map((category) => {
        const items = data.items.filter((i) => i.categoryId === category.id);
        const dueCount = items.filter((i) => isDue(i, now)).length;
        return (
          <Pressable
            key={category.id}
            onPress={() => router.push(`/category/${category.id}`)}
            accessibilityRole="button">
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '500' }}>{category.name}</Text>
                <Muted>
                  {items.length} {items.length === 1 ? 'item' : 'items'} · {dueCount} due
                </Muted>
              </View>
              <Text style={{ color: c.muted, fontSize: 20 }}>›</Text>
            </Card>
          </Pressable>
        );
      })}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={onAdd}
          placeholder="New category"
          placeholderTextColor={c.muted}
          returnKeyType="done"
          style={[styles.input, { flex: 1, color: c.text, borderColor: c.border, backgroundColor: c.card }]}
        />
        <Button title="Add" variant="primary" onPress={onAdd} />
      </View>
    </Screen>
  );
}
