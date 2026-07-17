import { translate, type Locale } from '@/lib/i18n';

/** 服务端 API 返回的中文 message → i18n key（移动端按语言展示，服务端日志仍中文） */
const SERVER_MESSAGE_KEYS: Record<string, string> = {
  '请先同意用户协议': 'errors.server.termsRequired',
  '协议版本已更新，请刷新后重试': 'errors.server.termsVersion',
  '该手机号已注册': 'errors.server.phoneRegistered',
  '该邮箱已注册': 'errors.server.emailRegistered',
  '手机号或密码错误': 'errors.server.phoneOrPassword',
  '邮箱或密码错误': 'errors.server.emailOrPassword',
  '请输入有效的手机号（中国大陆 11 位或国际格式 +区号）': 'errors.server.phoneInvalid',
  '验证码无效或已过期': 'errors.server.otpInvalid',
  '请输入邮箱验证码': 'errors.server.emailCodeRequired',
  '服务器未开启邮箱验证': 'errors.server.emailVerifyOff',
  '登录已过期，请重新登录': 'errors.sessionExpired',
  'AI 服务未启动，请稍后重试': 'errors.server.aiOffline',
  'AI 服务响应超时，请稍后重试': 'errors.server.aiTimeout',
  '报告生成失败，请稍后重试': 'errors.server.reportFailed',
  '请先建立紫微命盘（填写生辰）': 'errors.server.chartRequired',
  '请提供文字或语音': 'errors.server.voiceRequired',
  '会话不存在': 'errors.server.sessionNotFound',
  '请先完成本命解读或至少一项探索测试后再开启磁场匹配': 'errors.server.matchProfile',
  '请先完成本命解读或探索测试': 'errors.server.matchProfile',
  '不能向自己发送申请': 'errors.server.selfRequest',
  '你们已经是好友': 'errors.server.alreadyFriends',
  '已发送过申请，请等待对方回应': 'errors.server.requestPending',
  '申请已处理': 'errors.server.requestHandled',
  '用户不存在或未开启匹配': 'errors.server.userNotFound',
  '关系人不存在': 'errors.server.relationNotFound',
  '报告不存在': 'errors.server.reportNotFound',
  '请稍后再试（60 秒内只能发送一次）': 'errors.server.rateLimit',
};

/** 排盘失败等带动态后缀的消息 */
const SERVER_PREFIX_KEYS: { prefix: string; key: string }[] = [
  { prefix: '排盘失败：', key: 'errors.server.chartBuildFailed' },
  { prefix: 'AI 服务异常：', key: 'errors.server.aiError' },
  { prefix: '关系人最多', key: 'errors.server.maxRelations' },
];

function t(locale: Locale, key: string, params?: Record<string, string | number>) {
  return translate(locale, key, params);
}

export function localizeApiError(message: string, locale: Locale): string {
  const trimmed = message.trim();
  if (!trimmed) return t(locale, 'errors.server.generic');

  const exact = SERVER_MESSAGE_KEYS[trimmed];
  if (exact) return t(locale, exact);

  for (const { prefix, key } of SERVER_PREFIX_KEYS) {
    if (trimmed.startsWith(prefix)) {
      if (key === 'errors.server.chartBuildFailed') {
        const detail = trimmed.slice(prefix.length).replace(/（请确认.*$/, '').trim() || 'unknown';
        return t(locale, key, { detail });
      }
      if (key === 'errors.server.aiError') {
        const detail = trimmed.slice(prefix.length).trim() || 'unknown';
        return t(locale, key, { detail });
      }
      if (key === 'errors.server.maxRelations') {
        const m = trimmed.match(/(\d+)/);
        return t(locale, key, { max: m?.[1] ?? '6' });
      }
      return t(locale, key);
    }
  }

  if (locale === 'zh') return trimmed;
  return t(locale, 'errors.server.generic');
}
