// Keeps the phone's scheduled notifications in sync with the app's data.
// Notification text is fixed when scheduled, so after any data change (and
// whenever the app comes to the foreground) we cancel ours and schedule again.

import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { AppData } from './model';
import { planReminders } from './reminders';
import { useStore } from './store';

// Wait for a burst of taps to settle before rescheduling.
const SYNC_DELAY_MS = 1000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function hasPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.ios?.status === Notifications.IosAuthorizationStatus.DENIED) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// Syncs run one at a time so a cancel can't race a schedule.
let syncQueue = Promise.resolve();

function sync(data: AppData) {
  const { items, settings, lastExportAt } = data;
  syncQueue = syncQueue
    .then(async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      // Ask for permission only once there's something to remind about.
      if (items.length === 0 || !(await hasPermission())) return;
      for (const { date, body } of planReminders(items, settings.notifyTime, new Date(), lastExportAt)) {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'SpacingMemo', body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        });
      }
    })
    .catch((error) => console.warn('Scheduling notifications failed', error));
}

export function ReminderSync() {
  const { data } = useStore();
  const latest = useRef(data);
  latest.current = data;

  useEffect(() => {
    const timer = setTimeout(() => sync(data), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync(latest.current);
    });
    return () => subscription.remove();
  }, []);

  return null;
}
