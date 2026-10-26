import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

type IconProps = ComponentProps<typeof Ionicons>;

// The tab bar's color type is wider than the icon's; in practice it passes a string.
const icon =
  (name: IconProps['name']) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as IconProps['color']} size={size} />
  );

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories', tabBarIcon: icon('folder-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
