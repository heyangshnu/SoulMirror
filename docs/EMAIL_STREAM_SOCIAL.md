# 邮箱登录、流式对话与缘分匹配

## 1. 邮箱注册/登录（与 sub2api 一致）

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/auth/config` | 返回 `email_verify_enabled` 等 |
| POST | `/v1/auth/send-register-code` | 发送 6 位注册验证码 |
| POST | `/v1/auth/register` | 注册（含验证码、协议） |
| POST | `/v1/auth/login` | 邮箱 + 密码登录 |
| POST | `/v1/auth/send-reset-password-code` | 重置密码验证码 |
| POST | `/v1/auth/reset-password` | 重置密码 |

### 环境变量（`services/api/.env`）

```env
EMAIL_VERIFY_ENABLED=true
EMAIL_DEV_MODE=true          # 开发：无 SMTP 时在日志打印验证码
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=noreply@soulzenai.com
```

开发模式：`EMAIL_DEV_MODE=true` 且未配 SMTP 时，验证码会打印在 API 日志中。

---

## 2. 心镜流式对话

- AI 服务：`POST /bot/chat/stream`（SSE）
- API 代理：`POST /v1/bot/sessions/:id/messages/stream`
- 移动端：`lib/chat-stream.ts`，心镜 Tab 逐字显示回复

Nginx 需关闭 SSE 缓冲（若已配置 `proxy_buffering off` 则无需改动）。

---

## 3. 缘分匹配（磁场社交）

### 流程

1. 用户完成至少一项探索测试 → 自动写入 `matchProfile`（MBTI、八字五行、得分等）
2. 在「缘分」Tab 开启「磁场匹配」
3. 系统按契合度推荐其他已开启匹配的用户
4. 向对方「申请聊天」→ 对方在「申请」Tab 通过
5. 建立好友关系，可在「好友」Tab 进入一对一聊天

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/social/discover/status` | 匹配开关与 profile 状态 |
| POST | `/v1/social/discover/enable` | 开启/关闭可被搜索 |
| GET | `/v1/social/discover` | 发现契合用户列表 |
| POST | `/v1/social/chat-requests` | 申请聊天 |
| GET | `/v1/social/chat-requests` | 待处理/已发申请 |
| PATCH | `/v1/social/chat-requests/:id` | 通过/拒绝 |
| GET | `/v1/social/friends` | 好友列表 |
| GET | `/v1/social/chats/:friendId` | 聊天记录 |
| POST | `/v1/social/chats/:friendId/messages` | 发送消息 |

契合度算法：MBTI 互补 + 八字五行相生 + 测试得分相近度。

---

## 4. 部署更新

```bash
cd /opt/soulmirror && git pull
cd services/api && npm install && npm run build
pm2 restart soulmirror-api soulmirror-ai
```

重新打包 APK：`cd apps/mobile && eas build -p android --profile preview`
