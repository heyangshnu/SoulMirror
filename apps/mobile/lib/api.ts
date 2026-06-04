import { Platform } from 'react-native';
import { useAuthStore } from '@/store/auth';

const defaultHost =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/v1' : 'http://localhost:3000/v1';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? defaultHost;

function formatApiMessage(data: Record<string, unknown>): string | undefined {
  const msg = data.message ?? data.error;
  if (Array.isArray(msg)) return msg.join('；');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return undefined;
}

async function parseJsonBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 120);
    throw new Error(snippet ? `${snippet} (HTTP ${res.status})` : `服务器响应异常 (HTTP ${res.status})`);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.auth !== false) {
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('网络连接失败，请检查网络或稍后重试');
  }

  const data = await parseJsonBody(res);

  if (!res.ok) {
    if (res.status === 401 && options.auth !== false) {
      useAuthStore.getState().logout();
      throw new Error('登录已过期，请重新登录');
    }
    throw new Error(formatApiMessage(data) || `请求失败 (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
      auth,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
