import { useColorScheme } from 'react-native';

const light = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  muted: '#6B6B70',
  border: '#D1D1D6',
  accent: '#0A66D8',
  accentBg: '#E3EEFB',
  danger: '#C62828',
  warnBg: '#FFF1D6',
  warnText: '#8A5300',
};

const dark: typeof light = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  muted: '#9A9AA0',
  border: '#38383A',
  accent: '#4C9BFF',
  accentBg: '#0F2A4A',
  danger: '#FF6B6B',
  warnBg: '#3A2A0A',
  warnText: '#FFC266',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
