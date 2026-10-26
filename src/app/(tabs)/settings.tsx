import { View } from 'react-native';

import { formatTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { Card, Label, Muted, Screen, Stepper } from '@/ui/components';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function SettingsScreen() {
  const { data, updateSettings } = useStore();
  const { notifyTime, dailyCap, puntWindowDays, targetRecall } = data.settings;

  // Time moves in 15-minute steps and wraps around midnight.
  const [h, m] = notifyTime.split(':').map(Number);
  const shiftTime = (minutes: number) => {
    const total = (h * 60 + m + minutes + 24 * 60) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    updateSettings({ notifyTime: `${hh}:${mm}` });
  };

  const setPunt = (min: number, max: number) =>
    updateSettings({ puntWindowDays: { min: clamp(min, 1, max), max: clamp(max, min, 14) } });

  const recallPercent = Math.round(targetRecall * 100);
  const setRecall = (percent: number) => updateSettings({ targetRecall: clamp(percent, 70, 99) / 100 });

  return (
    <Screen>
      <Label>Reminders</Label>
      <Card>
        <Stepper
          label="Daily reminder"
          display={formatTime(notifyTime)}
          onMinus={() => shiftTime(-15)}
          onPlus={() => shiftTime(15)}
        />
        <Stepper
          label="Max items per day"
          display={String(dailyCap)}
          onMinus={() => updateSettings({ dailyCap: clamp(dailyCap - 1, 1, 50) })}
          onPlus={() => updateSettings({ dailyCap: clamp(dailyCap + 1, 1, 50) })}
        />
        <Stepper
          label="Punt: soonest"
          display={`${puntWindowDays.min} ${puntWindowDays.min === 1 ? 'day' : 'days'}`}
          onMinus={() => setPunt(puntWindowDays.min - 1, puntWindowDays.max)}
          onPlus={() => setPunt(puntWindowDays.min + 1, puntWindowDays.max)}
        />
        <Stepper
          label="Punt: latest"
          display={`${puntWindowDays.max} ${puntWindowDays.max === 1 ? 'day' : 'days'}`}
          onMinus={() => setPunt(puntWindowDays.min, puntWindowDays.max - 1)}
          onPlus={() => setPunt(puntWindowDays.min, puntWindowDays.max + 1)}
        />
      </Card>
      <Muted>One notification a day with how many items are due. Allow notifications when your phone asks.</Muted>

      <Label>Memorize</Label>
      <Card>
        <Stepper
          label="Memory target"
          display={`${recallPercent}%`}
          onMinus={() => setRecall(recallPercent - 1)}
          onPlus={() => setRecall(recallPercent + 1)}
        />
      </Card>
      <Muted>Higher means more frequent reviews and stronger memory.</Muted>

      <Label>Backup</Label>
      <View>
        <Muted>Export and import are coming in a later step.</Muted>
      </View>
    </Screen>
  );
}
