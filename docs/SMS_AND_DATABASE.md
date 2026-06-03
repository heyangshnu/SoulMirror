# 真实手机号登录 & 数据库说明

## 一、放开正常手机号登录

当前逻辑：只要 `SMS_DEV_MODE=true` **或** `NODE_ENV≠production`，验证码固定为 `123456`，不会真正发短信。

### 生产环境配置（服务器 `/opt/soulmirror/services/api/.env`）

```env
NODE_ENV=production
SMS_DEV_MODE=false

# 腾讯云短信（控制台 → 短信 → 应用管理 / 签名 / 正文模板）
TENCENT_SMS_SECRET_ID=你的SecretId
TENCENT_SMS_SECRET_KEY=你的SecretKey
TENCENT_SMS_SDK_APP_ID=1400xxxxxx
TENCENT_SMS_SIGN_NAME=心镜
TENCENT_SMS_TEMPLATE_ID=1234567
TENCENT_SMS_REGION=ap-guangzhou
```

### 腾讯云控制台准备步骤

1. 开通 [短信服务](https://console.cloud.tencent.com/smsv2)
2. **创建应用** → 得到 `SmsSdkAppId`
3. **申请签名**（如「心镜」或公司名），审核通过后填入 `TENCENT_SMS_SIGN_NAME`
4. **申请模板**，正文示例：`您的验证码为{1}，{2}分钟内有效。` → 得到 `TemplateId`
5. 在 [访问管理 CAM](https://console.cloud.tencent.com/cam/capi) 创建 API 密钥 → `SecretId` / `SecretKey`

### 部署后重启

```bash
cd /opt/soulmirror/services/api
npm run build
pm2 restart soulmirror-api
```

### 验证

```bash
curl -X POST https://api.soulzenai.com/v1/auth/sms/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"你的手机号"}'
```

手机应收到 6 位验证码，再用 `/v1/auth/sms/login` 登录。

### 内测 vs 正式

| 场景 | SMS_DEV_MODE | 行为 |
|------|--------------|------|
| 内测 APK | `true` | 任意手机号可用 `123456` |
| 正式上线 | `false` + 腾讯云配置 | 真实短信，随机 6 位码 |

---

## 二、SoulMirror 用户存在哪里？

**心镜使用 MongoDB**，不是 MariaDB / SQLite。用户**无需手动建表**，Mongoose 在首次写入时自动创建集合。

| 集合名 | 对应 Schema | 用途 |
|--------|-------------|------|
| `users` | `User` | 注册用户（手机号、昵称、偏好等） |
| `smscodes` | `SmsCode` | 验证码（登录成功后删除） |
| `reports` | `Report` | 测试报告 |
| `botsessions` | `BotSession` | AI 对话会话 |

连接串（生产）：`mongodb://127.0.0.1:27017/soulmirror`

### 在服务器上查看用户

```bash
mongosh mongodb://127.0.0.1:27017/soulmirror

# 列出集合
show collections

# 查看所有注册用户
db.users.find({}, { phone: 1, nickname: 1, createdAt: 1 }).pretty()

# 统计人数
db.users.countDocuments()
```

---

## 三、sub2api 的数据库（不要混用心镜用户表）

你的 **sub2api** 项目（`sub2api-full-code`）架构与心镜**完全不同**：

| 项目 | 数据库 | 用户标识 | 用途 |
|------|--------|----------|------|
| **sub2api** | SQLite（+ Redis 余额） | **邮箱** + 密码 | API 代理、计费、API Key |
| **SoulMirror** | MongoDB | **手机号** + 短信 | 心理测试、AI 陪伴 App |

sub2api 的 `users` 表结构（`001_init.sql`）：

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME,
    updated_at DATETIME
);
```

**不建议**把心镜用户写入 sub2api 的 `users` 表：字段模型、认证方式、业务域都不一致，强行合并会导致 ID 冲突、登录体系混乱。

### 推荐方案

1. **保持独立**（推荐）：心镜继续用 MongoDB `soulmirror.users`，sub2api 继续用 SQLite `users`。两套系统各自运维。
2. **统一后台查看**（可选）：以后做一个管理页，分别调两个数据源；或定时把 MongoDB 用户同步到 MariaDB 只读表 `soulmirror_users`（仅统计用）。
3. **统一账号体系**（大改造）：需要 SSO / 手机号绑定邮箱、共享 JWT 等，属于新产品决策，当前阶段不必做。

### 若坚持在 MariaDB 建心镜专用表（可选）

在服务器 MariaDB 中单独建库，**不要**改 sub2api 库：

```sql
CREATE DATABASE IF NOT EXISTS soulmirror CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE soulmirror;

CREATE TABLE users (
  id            VARCHAR(24) PRIMARY KEY COMMENT 'MongoDB ObjectId',
  phone         VARCHAR(20) UNIQUE,
  nickname      VARCHAR(64) NOT NULL DEFAULT '心镜用户',
  age_range     VARCHAR(32),
  occupation    VARCHAR(64),
  concern       TEXT,
  bot_tone      VARCHAR(32) DEFAULT 'gentle',
  anonymous_mode TINYINT(1) DEFAULT 0,
  created_at    DATETIME NOT NULL,
  updated_at    DATETIME NOT NULL
);

CREATE INDEX idx_users_phone ON users(phone);
```

这需要额外写同步逻辑（注册/更新用户时双写 MongoDB + MariaDB），**当前代码未实现**；除非你有报表/BI 强需求，否则直接用 MongoDB 即可。

---

## 四、常见问题

**Q：登录后用户会自动创建吗？**  
A：会。首次验证码登录成功时，`auth.service.ts` 会 `create({ phone })` 写入 `users` 集合。

**Q：关掉 SMS_DEV_MODE 后内测包还能用 123456 吗？**  
A：不能。内测包与正式包共用同一 API 时，要么保持 `SMS_DEV_MODE=true` 做内测，要么发正式版并配好腾讯云短信。

**Q：服务器上的 MariaDB :3306 是心镜用的吗？**  
A：不是。心镜用本机 MongoDB :27017。MariaDB 是服务器上其他服务（如 next-server）用的，与心镜默认无关。
