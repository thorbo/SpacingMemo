// Export: share a copy of the data as a JSON file (e.g. save to iCloud Drive).
// Import: pick a JSON file and parse it; the caller confirms and replaces.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppData } from './model';
import { parseBackup } from './store';

export async function exportBackup(data: AppData): Promise<void> {
  const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const file = new File(Paths.cache, `spacingmemo-backup-${date}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

// Returns null if the user cancels. Throws if the file isn't a valid backup.
export async function pickBackup(): Promise<AppData | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  return parseBackup(await new File(result.assets[0].uri).text());
}
