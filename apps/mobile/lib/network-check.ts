import { translate, type Locale } from '@/lib/i18n';
import { API_BASE, api } from './api';

export type NetworkCheckItem = {
  name: string;
  ok: boolean;
  detail: string;
};

function t(locale: Locale, key: string, params?: Record<string, string | number>) {
  return translate(locale, key, params);
}

export async function runNetworkCheck(locale: Locale): Promise<NetworkCheckItem[]> {
  const fail = t(locale, 'network.fail');
  const items: NetworkCheckItem[] = [
    { name: 'API', ok: true, detail: API_BASE },
  ];

  try {
    const cfg = await api.get<{ email_verify_enabled?: boolean }>('/auth/config', false);
    const verify =
      locale === 'en'
        ? cfg.email_verify_enabled
          ? 'email verify on'
          : 'email verify off'
        : `邮箱验证 ${cfg.email_verify_enabled ? '已开启' : '未开启'}`;
    items.push({
      name: `① ${t(locale, 'network.apiReachable')}`,
      ok: true,
      detail: `${locale === 'en' ? 'OK' : '正常'} · ${verify}`,
    });
  } catch (e) {
    items.push({
      name: `① ${t(locale, 'network.apiReachable')}`,
      ok: false,
      detail: e instanceof Error ? e.message : fail,
    });
    return items;
  }

  try {
    await api.get('/tests/catalog', false);
    items.push({
      name: `② ${t(locale, 'network.catalogOk')}`,
      ok: true,
      detail: locale === 'en' ? 'OK' : '正常',
    });
  } catch (e) {
    items.push({
      name: `② ${t(locale, 'network.catalogOk')}`,
      ok: false,
      detail: e instanceof Error ? e.message : fail,
    });
  }

  try {
    const sessions = await api.get<unknown[]>('/bot/sessions');
    const n = Array.isArray(sessions) ? sessions.length : 0;
    items.push({
      name: locale === 'en' ? '③ Mirror sessions (auth)' : '③ 心镜会话（需登录）',
      ok: true,
      detail:
        locale === 'en'
          ? `OK · ${n} session(s)`
          : `正常 · 已有 ${n} 个会话`,
    });
  } catch (e) {
    items.push({
      name: locale === 'en' ? '③ Mirror sessions (auth)' : '③ 心镜会话（需登录）',
      ok: false,
      detail:
        e instanceof Error
          ? e.message
          : locale === 'en'
            ? 'Failed (not logged in or token expired)'
            : '失败（可能未登录或 Token 过期）',
    });
  }

  return items;
}
