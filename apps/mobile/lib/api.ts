import { Platform } from 'react-native';
import { translate } from '@/lib/i18n';
import { localizeApiError } from '@/lib/translate-api-error';
import { useAuthStore } from '@/store/auth';
import { useLocaleStore } from '@/store/locale';

const defaultHost =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/v1' : 'http://localhost:3000/v1';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? defaultHost;

function locale() {
  return useLocaleStore.getState().locale;
}

function t(key: string, params?: Record<string, string | number>) {
  return translate(locale(), key, params);
}

function formatApiMessage(data: Record<string, unknown>): string | undefined {
  const msg = data.message ?? data.error;
  const sep = locale() === 'en' ? '; ' : '；';
  if (Array.isArray(msg)) {
    return msg.map((m) => localizeApiError(String(m), locale())).join(sep);
  }
  if (typeof msg === 'string' && msg.trim()) {
    return localizeApiError(msg, locale());
  }
  return undefined;
}

async function parseJsonBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 120);
    throw new Error(
      snippet
        ? `${snippet} (HTTP ${res.status})`
        : t('errors.serverResponse', { status: res.status }),
    );
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const loc = locale();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': loc === 'en' ? 'en' : 'zh-CN',
    'X-App-Locale': loc,
    ...(options.headers as Record<string, string>),
  };

  if (options.auth !== false) {
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(locale() === 'en' ? 'Request timed out' : '请求超时，请稍后重试');
    }
    throw new Error(t('errors.network'));
  }

  const data = await parseJsonBody(res);

  if (!res.ok) {
    if (res.status === 401 && options.auth !== false) {
      useAuthStore.getState().logout();
      throw new Error(t('errors.sessionExpired'));
    }
    throw new Error(formatApiMessage(data) || t('errors.requestFailed', { status: res.status }));
  }
  return data as T;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function download(path: string): Promise<ArrayBuffer> {
  const loc = locale();
  const headers: Record<string, string> = {
    'Accept-Language': loc === 'en' ? 'en' : 'zh-CN',
    'X-App-Locale': loc,
  };
  const token = useAuthStore.getState().token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers });
  } catch {
    throw new Error(t('errors.network'));
  }

  if (!res.ok) {
    const data = await parseJsonBody(res);
    throw new Error(formatApiMessage(data) || t('errors.requestFailed', { status: res.status }));
  }
  return res.arrayBuffer();
}

export const api = {
  get: <T>(path: string, auth = true) =>
    request<T>(path, { method: 'GET', auth, signal: AbortSignal.timeout(20_000) }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
      auth,
      signal: AbortSignal.timeout(60_000),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE', signal: AbortSignal.timeout(20_000) }),
  download,
  arrayBufferToBase64,
};
