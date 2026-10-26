// Small shared building blocks for the screens.

import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useColors } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.label, { color: c.muted }]}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.muted, fontSize: 14 }}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'quiet' | 'danger';
  big?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'default', big, style }: ButtonProps) {
  const c = useColors();
  const color = { default: c.text, primary: c.accent, quiet: c.muted, danger: c.danger }[variant];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        big && styles.bigButton,
        { borderColor: c.border, backgroundColor: variant === 'primary' ? c.accentBg : c.card },
        pressed && { opacity: 0.6 },
        style,
      ]}>
      <Text style={[styles.buttonText, big && styles.bigButtonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { borderColor: c.border }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, { backgroundColor: selected ? c.accentBg : c.card }]}>
            <Text style={{ color: selected ? c.accent : c.text, fontSize: 15 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// A settings row with − / + buttons.
export function Stepper({
  label,
  display,
  onMinus,
  onPlus,
}: {
  label: string;
  display: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.row, { borderColor: c.border }]}>
      <Text style={{ color: c.text, fontSize: 16, flex: 1 }}>{label}</Text>
      <Button title="−" onPress={onMinus} style={styles.stepButton} />
      <Text style={{ color: c.text, fontSize: 16, minWidth: 84, textAlign: 'center' }}>{display}</Text>
      <Button title="+" onPress={onPlus} style={styles.stepButton} />
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, paddingBottom: 48 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  label: { fontSize: 13, marginTop: 8, marginBottom: -4, marginLeft: 4 },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  bigButton: { paddingVertical: 16, flex: 1 },
  buttonText: { fontSize: 15 },
  bigButtonText: { fontSize: 17, fontWeight: '500' },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
  },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepButton: { width: 44, paddingHorizontal: 0 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, fontSize: 16 },
});
