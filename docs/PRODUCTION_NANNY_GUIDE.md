# 心镜 SoulMirror · 生产部署 + APK + 邮箱注册 保姆级教程

> **适用**：Mac 开发机 + Ubuntu 云服务器  
> **域名示例**：`soulzenai.com` → API 地址 `https://api.soulzenai.com/v1`  
> **原则**：后端 HTTPS + 邮箱验证码能真实收到 → 再打 APK

---

## 一、整体架构（先建立全局概念）

```text
Android 手机 App（APK）
        │
        │  HTTPS 443
        ▼
Nginx（api.soulzenai.com）
        │
        │  本机转发
        ▼
NestJS API（127.0.0.1:3010）──────► MongoDB（127.0.0.1:27017）
        │
        │  内网调用
        ▼
Python AI（127.0.0.1:8010）──────► DeepSeek API（报告 + 心镜对话）

注册验证码邮件：
API ──SMTP──► 你的邮箱服务商（阿里云邮件/腾讯企业邮/QQ 邮箱等）──► 用户邮箱
```

**你在做什么**：把后端跑在服务器上，用域名 + HTTPS 暴露给手机；App 打包时写入 API 地址；邮箱注册靠 SMTP 发真实验证码。

---

## 二、上线前准备清单

| 准备项 | 用途 | 去哪办 |
|--------|------|--------|
| **云服务器** | 跑 API / AI / MongoDB | 阿里云 / 腾讯云 Ubuntu |
| **域名** | `api.soulzenai.com` | 域名注册商 |
| **DeepSeek API Key** | 紫微报告、心镜对话 | platform.deepseek.com |
| **SMTP 邮箱服务** | 注册/重置密码验证码 | 见第八节 |
| **GitHub 仓库** | 服务器拉代码 | github.com |
| **Expo 账号** | 云端打 APK | expo.dev |

**国内服务器 + 域名**：通常需要 **ICP 备案** 才能稳定使用 80/443（约 7～20 工作日）。备案期间可临时用 IP:3010 内测，**不要用于正式分发**。

---

## 三、阶段 0：本地先跑通（约 30 分钟）

> **目的**：确认代码没问题，再花钱部署服务器。

### 0.1 启动服务

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror

# 终端 1：数据库
npm run docker:up

# 终端 2：AI
cd services/ai && source .venv/bin/activate && ./run.sh

# 终端 3：API
npm run api

# 终端 4：App
cd apps/mobile && npx expo start --localhost
```

### 0.2 本地验收

```bash
curl http://localhost:8001/health          # AI 正常
curl http://localhost:3000/v1/tests/catalog # API 正常
bash scripts/verify-local.sh                # 一键脚本（含邮箱注册流程）
```

App 内：邮箱注册 → 紫微排盘 → 报告 → 心镜对话，全流程走一遍。

---

## 四、阶段 1：代码推到 GitHub

> **目的**：服务器通过 `git pull` 拉代码，而不是手动拷文件。

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror

git status   # 确认 .env 不在列表里（已被 .gitignore 忽略）

git add .
git commit -m "准备生产部署"
git push origin main
```

**注意**：`services/api/.env`、`services/ai/.env` **永远不要提交**，密钥只放服务器本地。

---

## 五、阶段 2：服务器首次环境（只做一次）

> **目的**：安装 Node、Python、MongoDB、PM2、Nginx 等运行环境。

### 5.1 SSH 登录

```bash
ssh root@你的服务器公网IP
```

### 5.2 云厂商安全组（控制台操作）

放行入站：

| 端口 | 用途 |
|------|------|
| 22 | SSH |
| 80 | HTTP（申请 SSL 证书） |
| 443 | HTTPS（App 正式访问） |

**不要**对公网开放 3010、8010、27017（仅本机访问）。

### 5.3 安装 MongoDB（若无 Docker）

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod
mongosh --eval "db.runCommand({ ping: 1 })"   # 应 ok: 1
```

**在干什么**：安装数据库，用户、报告、验证码都存在这里。

### 5.4 安装 Node 20 + PM2 + Python

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3 python3-venv python3-pip git nginx
sudo npm install -g pm2
```

### 5.5 克隆代码

```bash
sudo mkdir -p /opt/soulmirror
sudo chown $USER:$USER /opt/soulmirror
git clone https://github.com/heyangshnu/SoulMirror.git /opt/soulmirror
cd /opt/soulmirror
```

---

## 六、阶段 3：配置生产环境变量（最关键）

> **目的**：告诉 API 连哪个数据库、哪个 AI、怎么发邮件。

### 6.1 API 配置

```bash
cd /opt/soulmirror
cp services/api/.env.production.example services/api/.env
nano services/api/.env
```

**逐行说明**：

```env
# API 监听端口（你服务器 3000/3001 已被占用，用心镜专用 3010）
PORT=3010

# MongoDB 地址，soulmirror 是库名
MONGODB_URI=mongodb://127.0.0.1:27017/soulmirror

# 登录 Token 签名密钥，必须随机（下面命令生成）
JWT_SECRET=粘贴 openssl rand -hex 32 的输出

# AI 服务内网地址，端口与 ai/.env 一致
AI_SERVICE_URL=http://127.0.0.1:8010

NODE_ENV=production
MEMORY_STORE=false

# ── 邮箱注册（生产必配）──
EMAIL_VERIFY_ENABLED=true
EMAIL_DEV_MODE=false          # ⚠️ 生产必须 false，才会发真实邮件

SMTP_HOST=smtp.example.com    # 邮件服务器地址（见第八节）
SMTP_PORT=587                 # 587=TLS，465=SSL
SMTP_USERNAME=你的发信账号
SMTP_PASSWORD=你的 SMTP 密码/授权码
SMTP_FROM=心镜 <noreply@soulzenai.com>   # 发件人显示名 + 地址
```

生成 JWT：

```bash
openssl rand -hex 32
```

### 6.2 AI 配置

```bash
cp services/ai/.env.production.example services/ai/.env
nano services/ai/.env
```

```env
DEEPSEEK_API_KEY=sk-你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=8010
```

**在干什么**：AI 只监听本机 8010，外网访问不到，只有 API 能调用，更安全。

---

## 七、阶段 4：首次部署后端

> **目的**：编译代码并用 PM2 守护进程，崩溃自动重启。

```bash
cd /opt/soulmirror
bash scripts/server-deploy.sh
```

脚本会自动：`git pull` → 装依赖 → 编译 API → 装 Python 依赖 → PM2 启动。

### 7.1 验证本机

```bash
curl http://127.0.0.1:8010/health
curl http://127.0.0.1:3010/v1/tests/catalog
curl http://127.0.0.1:3010/v1/auth/config
# 应返回 email_verify_enabled: true, email_dev_mode: false
```

### 7.2 查看进程

```bash
pm2 list
pm2 logs soulmirror-api --lines 30
pm2 logs soulmirror-ai --lines 30
```

---

## 八、阶段 5：邮箱验证码（生产必做）

> **目的**：用户注册时收到 6 位验证码邮件，而不是只在服务器日志里看。

### 8.1 原理

1. App 调 `POST /v1/auth/send-register-code` → API 生成 6 位码 → 通过 SMTP 发邮件  
2. 用户填验证码 + 密码 → `POST /v1/auth/register` → 注册成功  
3. `EMAIL_DEV_MODE=false` 且 SMTP 配齐 → **必须发真实邮件**；否则会报错

### 8.2 方案 A：QQ 邮箱（最快上手，适合内测）

1. 登录 QQ 邮箱 → **设置 → 账户**  
2. 开启 **POP3/SMTP** → 生成 **授权码**（16 位，不是 QQ 密码）  
3. 写入 `.env`：

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USERNAME=你的QQ号@qq.com
SMTP_PASSWORD=16位授权码
SMTP_FROM=心镜 <你的QQ号@qq.com>
```

**限制**：QQ 邮箱单日发信量有限，正式运营建议用企业邮或阿里云邮件推送。

### 8.3 方案 B：阿里云邮件推送（推荐正式环境）

1. 阿里云控制台 → **邮件推送** → 开通  
2. **发信域名**：添加 `soulzenai.com`，按提示配 **SPF、MX、DKIM** DNS 记录  
3. 创建 **发信地址**：如 `noreply@soulzenai.com`  
4. 获取 SMTP 地址、用户名、密码，填入 `.env`  
5. `SMTP_FROM=心镜 <noreply@soulzenai.com>`

**在干什么**：让 Gmail/QQ/163 等收件箱信任你的邮件，减少进垃圾箱。

### 8.4 方案 C：腾讯企业邮

1. 注册企业微信 / 腾讯企业邮  
2. 添加域名 `soulzenai.com` 并验证  
3. 创建邮箱 `noreply@soulzenai.com`  
4. SMTP：`smtp.exmail.qq.com`，端口 465 或 587

### 8.5 改完配置后重启 API

```bash
pm2 restart soulmirror-api
```

### 8.6 服务器上测试发信

```bash
curl -X POST http://127.0.0.1:3010/v1/auth/send-register-code \
  -H "Content-Type: application/json" \
  -d '{"email":"你的真实邮箱@example.com"}'
```

**期望**：返回 `{"message":"验证码已发送"}`，邮箱收到主题为「心镜 - 注册验证码」的邮件。

若失败：

```bash
pm2 logs soulmirror-api --lines 50
```

常见原因：授权码错误、SMTP_FROM 与发信账号不一致、端口/SSL 配置不对、被服务商限流。

### 8.7 完整注册测试

```bash
# 1. 发验证码（邮件里看 6 位数字）
# 2. 注册
curl -X POST http://127.0.0.1:3010/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"你的邮箱@example.com",
    "password":"Test123456",
    "verificationCode":"邮件里的6位码",
    "terms_accepted":true,
    "terms_version":"1.0"
  }'
```

应返回 `accessToken`，说明邮箱注册链路通了。

---

## 九、阶段 6：域名 + Nginx + HTTPS

> **目的**：手机 App 通过 `https://api.soulzenai.com/v1` 访问，而不是裸 IP。

### 9.1 DNS 解析

域名控制台 → 添加 **A 记录**：

| 主机记录 | 类型 | 记录值 |
|----------|------|--------|
| `api` | A | 服务器公网 IP |

验证：

```bash
ping api.soulzenai.com
dig api.soulzenai.com +short
```

### 9.2 Nginx 反向代理

```bash
sudo nano /etc/nginx/sites-available/soulmirror
```

粘贴（注意端口 **3010**）：

```nginx
server {
    listen 80;
    server_name api.soulzenai.com;

    location /v1/ {
        proxy_pass http://127.0.0.1:3010/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # AI 生成报告较慢
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;

        # 心镜流式对话（SSE）必须关闭缓冲
        proxy_buffering off;
        proxy_cache off;
    }
}
```

启用：

```bash
sudo ln -sf /etc/nginx/sites-available/soulmirror /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**在干什么**：Nginx 是「门卫」，外网只认 443，内部转发到 3010。

### 9.3 申请免费 SSL 证书

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.soulzenai.com
```

按提示：填邮箱 → 同意条款 → 选 **强制跳转 HTTPS**。

### 9.4 公网验收

```bash
curl https://api.soulzenai.com/v1/tests/catalog
curl https://api.soulzenai.com/v1/auth/config

# 用你的真实邮箱再测一次发验证码
curl -X POST https://api.soulzenai.com/v1/auth/send-register-code \
  -H "Content-Type: application/json" \
  -d '{"email":"你的邮箱"}'
```

---

## 十、阶段 7：Mac 模拟生产 App（打 APK 前必做）

> **目的**：不打包，先确认 App 能连上生产 API + 邮箱注册。

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
EXPO_PUBLIC_API_URL=https://api.soulzenai.com/v1 npx expo start --localhost
```

模拟器验收：

- [ ] 邮箱注册 → 收到验证码 → 注册成功  
- [ ] 邮箱 + 密码登录  
- [ ] 紫微排盘 → 生成报告（等待弹窗）  
- [ ] 心镜对话流式回复  
- [ ] 关系人报告  

**全部通过再打包。**

---

## 十一、阶段 8：打 Android APK 安装包

> **目的**：生成 `.apk` 文件，发给测试用户直接安装。

### 8.1 确认 eas.json 里的 API 地址

`apps/mobile/eas.json` 应已配置：

```json
"preview": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://api.soulzenai.com/v1"
  },
  "android": {
    "buildType": "apk"
  }
}
```

**在干什么**：打包时把 API 地址写进 App，装到手机上就会连生产服务器。

若域名未就绪，临时可改 IP（仅内测）：

```json
"EXPO_PUBLIC_API_URL": "http://你的IP:3010/v1"
```

改完 `git commit && git push`。

### 8.2 安装 EAS CLI 并登录

```bash
npm install -g eas-cli
eas login
# 无账号：https://expo.dev 注册
```

### 8.3 首次关联项目（若未做过）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
eas init
```

项目 ID 已在 `app.json` → `extra.eas.projectId`。

### 8.4 打内测 APK

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
eas build --platform android --profile preview
```

- 等待约 10～20 分钟（Expo 云端编译）  
- 打开 https://expo.dev → 登录 → 项目 **SoulMirror** → **Builds**  
- 下载 `.apk`

**profile preview** = 内测 APK，可直接安装；**profile production** = AAB，用于 Google Play 上架。

### 8.5 安装到 Android 手机

1. 把 APK 传到手机（微信 / 网盘 / 数据线）  
2. **设置 → 安全 → 允许安装未知来源**（各品牌路径略有不同）  
3. 点击 APK 安装 → 打开「心镜 SoulMirror」  
4. 用**真实邮箱**注册测试（会收到验证码邮件）

### 8.6 更新 App 后重新打包

改了前端代码后：

```bash
git push
cd apps/mobile
eas build -p android --profile preview
```

用户需**重新安装**新 APK（内测阶段无自动更新）。

---

## 十二、日常运维

### 更新后端

```bash
# Mac
git push

# 服务器
ssh root@你的IP
cd /opt/soulmirror && bash scripts/server-deploy.sh
```

### 只改了 .env（如 SMTP）

```bash
pm2 restart soulmirror-api
```

### 常用命令

```bash
pm2 list
pm2 logs soulmirror-api
pm2 logs soulmirror-ai
sudo systemctl status mongod
sudo certbot renew --dry-run   # 检查 SSL 续期
```

---

## 十三、故障排查

| 现象 | 原因 | 处理 |
|------|------|------|
| App 连不上 API | eas.json URL 错 / 没 HTTPS | 检查 `EXPO_PUBLIC_API_URL` |
| 注册收不到邮件 | SMTP 未配或 DEV_MODE=true | 查 `services/api/.env`，`pm2 logs` |
| 验证码发送报错 SMTP | 授权码错、FROM 不一致 | 对照第八节重配 |
| 报告生成失败 | DeepSeek Key 无效 / AI 挂了 | `pm2 logs soulmirror-ai` |
| 心镜对话不流式 | Nginx 缓冲 | 加 `proxy_buffering off` |
| HTTPS 502 | API 没跑 | `pm2 restart soulmirror-api` |
| ping 不通域名 | DNS 未生效 | 等 5～30 分钟或查解析 |

---

## 十四、国内上架额外事项（可选）

| 项 | 说明 |
|----|------|
| ICP 备案 | 大陆服务器 + 域名必须 |
| 隐私政策 / 用户协议 | 可访问的 HTTPS 网页 |
| 软件著作权 | 国内安卓商店常要求 |
| 生成式 AI 备案 | 视监管要求 |

---

## 十五、推荐执行顺序（一张表）

| 顺序 | 做什么 | 完成标志 |
|------|--------|----------|
| 1 | 本地跑通 | verify-local.sh 通过 |
| 2 | push GitHub | 仓库有最新代码 |
| 3 | 服务器装环境 + clone | mongod / node / pm2 OK |
| 4 | 配 `.env` + deploy | curl 3010 有 JSON |
| 5 | 配 SMTP + 测邮箱注册 | 真实邮箱收到验证码 |
| 6 | DNS + Nginx + HTTPS | curl https://api... 通 |
| 7 | Mac 连生产 API 测 App | 全流程 OK |
| 8 | eas build APK | 手机安装能用 |

---

## 十六、命令速查

```bash
# 本地
bash scripts/verify-local.sh

# 服务器部署
cd /opt/soulmirror && bash scripts/server-deploy.sh

# 生产 API 健康
curl https://api.soulzenai.com/v1/auth/config

# Mac 连生产
EXPO_PUBLIC_API_URL=https://api.soulzenai.com/v1 npx expo start --localhost

# 打 APK
cd apps/mobile && eas build -p android --profile preview
```

---

*文档版本：2026-05-28 · 含邮箱验证码注册 + EAS APK*
