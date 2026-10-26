import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { Text, View, useColorScheme } from 'react-native';

import { StoreProvider } from '@/lib/store';

function LoadError({ error }: { error: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '500' }}>Couldn't read your saved data</Text>
      <Text>Nothing has been changed or overwritten. Restart the app to try again.</Text>
      <Text style={{ color: '#888' }}>{error}</Text>
    </View>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider fallback={(error) => <LoadError error={error} />}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="category/[id]" options={{ title: '' }} />
          <Stack.Screen name="item/[id]" options={{ presentation: 'modal' }} />
        </Stack>
      </StoreProvider>
    </ThemeProvider>
  );
}
