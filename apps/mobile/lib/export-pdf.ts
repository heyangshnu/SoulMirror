import { Platform, Share } from 'react-native';
import { api } from '@/lib/api';

async function writePdfFile(filename: string, buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);

  try {
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.cache, filename);
    await file.write(bytes);
    return file.uri;
  } catch {
    const FileSystem = await import('expo-file-system/legacy');
    const dir = FileSystem.cacheDirectory;
    if (!dir) throw new Error('Cache directory unavailable');
    const uri = `${dir}${filename}`;
    await FileSystem.writeAsStringAsync(uri, api.arrayBufferToBase64(buffer), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  }
}

async function sharePdfFile(uri: string): Promise<void> {
  try {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      return;
    }
  } catch {
    // expo-sharing native module not linked — fall through
  }

  const result = await Share.share(
    Platform.OS === 'ios' ? { url: uri, title: 'SoulMirror Plan' } : { url: uri },
  );
  if (result.action === Share.dismissedAction) return;
}

export async function exportReportPdf(reportId: string): Promise<void> {
  const buffer = await api.download(`/analysis/reports/${reportId}/export`);
  const filename = `soulmirror-plan-${reportId.slice(-6)}.pdf`;

  if (Platform.OS === 'web') {
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const uri = await writePdfFile(filename, buffer);
  await sharePdfFile(uri);
}
