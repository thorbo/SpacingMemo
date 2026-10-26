import { Alert, View } from 'react-native';

import { exportBackup, pickBackup } from '@/lib/backup';
import { daysUntil, formatTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { Button, Card, Label, Muted, Screen, Stepper } from '@/ui/components';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function SettingsScreen() {
  const { data, updateSettings, replaceAll, markExported } = useStore();
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

  // The share sheet doesn't say whether a file was actually saved, so closing
  // it counts as an export.
  const onExport = () => {
    exportBackup(data)
      .then(markExported)
      .catch((error) => Alert.alert("Couldn't export", String(error)));
  };

  const exportAge = data.lastExportAt ? -daysUntil(data.lastExportAt, new Date()) : null;
  const lastExported =
    exportAge === null ? 'never' : exportAge === 0 ? 'today' : `${exportAge} ${exportAge === 1 ? 'day' : 'days'} ago`;

  const onImport = async () => {
    try {
      const backup = await pickBackup();
      if (!backup) return;
      Alert.alert(
        'Replace all data?',
        `The backup has ${backup.categories.length} categories and ${backup.items.length} items. ` +
          'Everything currently on this phone will be replaced.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => replaceAll(backup) },
        ],
      );
    } catch (error) {
      Alert.alert("Couldn't import", error instanceof Error ? error.message : String(error));
    }
  };

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
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Export data" onPress={onExport} style={{ flex: 1 }} />
        <Button title="Import data" onPress={onImport} style={{ flex: 1 }} />
      </View>
      <Muted>Last exported: {lastExported}.</Muted>
      <Muted>
        Export saves a file you can keep in iCloud Drive. Import replaces everything on this phone. After 30 days
        without an export, the daily notification reminds you to back up.
      </Muted>
    </Screen>
  );
}
