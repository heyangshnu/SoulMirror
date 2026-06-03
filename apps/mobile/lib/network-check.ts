import { API_BASE, api } from './api';

export type NetworkCheckItem = {
  name: string;
  ok: boolean;
  detail: string;
};

export async function runNetworkCheck(): Promise<NetworkCheckItem[]> {
  const items: NetworkCheckItem[] = [
    { name: 'API 地址', ok: true, detail: API_BASE },
  ];

  try {
    const cfg = await api.get<{ email_verify_enabled?: boolean }>('/auth/config', false);
    items.push({
      name: '① 连接 API（/auth/config）',
      ok: true,
      detail: `正常 · 邮箱验证 ${cfg.email_verify_enabled ? '已开启' : '未开启'}`,
    });
  } catch (e) {
    items.push({
      name: '① 连接 API（/auth/config）',
      ok: false,
      detail: e instanceof Error ? e.message : '失败',
    });
    return items;
  }

  try {
    await api.get('/tests/catalog', false);
    items.push({ name: '② 测试目录', ok: true, detail: '正常' });
  } catch (e) {
    items.push({
      name: '② 测试目录',
      ok: false,
      detail: e instanceof Error ? e.message : '失败',
    });
  }

  try {
    const sessions = await api.get<unknown[]>('/bot/sessions');
    items.push({
      name: '③ 心镜会话（需登录）',
      ok: true,
      detail: `正常 · 已有 ${Array.isArray(sessions) ? sessions.length : 0} 个会话`,
    });
  } catch (e) {
    items.push({
      name: '③ 心镜会话（需登录）',
      ok: false,
      detail: e instanceof Error ? e.message : '失败（可能未登录或 Token 过期）',
    });
  }

  return items;
}
