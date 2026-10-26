import { Tabs } from 'expo-router';

// Text-only tabs for now: icons need an extra package (not yet approved).
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 15 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
