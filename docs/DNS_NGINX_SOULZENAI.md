# soulzenai.com · DNS + Nginx + HTTPS 详细操作手册

> **域名**：soulzenai.com  
> **API 子域名**：api.soulzenai.com  
> **服务器**：Ubuntu（心镜 API 端口 **3010**）  
> **目标**：App 使用 `https://api.soulzenai.com/v1`

---

# 一、整体架构

```text
手机 App
    │
    ▼  HTTPS :443
Nginx (api.soulzenai.com)
    │
    ▼  HTTP 127.0.0.1:3010
NestJS API (PM2: soulmirror-api)
    │
    ▼
MongoDB + AI :8010
```

**注意**：3010 端口只对 Nginx 本机开放，**不要**对公网长期开放 3010；对外只开 80、443。

---

# 二、配置 DNS 解析

## 2.1 登录域名控制台

根据你购买域名的平台登录：

| 平台 | 控制台入口 |
|------|------------|
| 阿里云 | https://dns.console.aliyun.com |
| 腾讯云 | https://console.cloud.tencent.com/cns |
| 华为云 | 域名注册 → DNS 解析 |

找到域名 **soulzenai.com** → 点击 **解析设置** / **DNS 解析**。

## 2.2 添加 A 记录（API 用）

点击 **添加记录**，填写：

| 字段 | 填写内容 |
|------|----------|
| **记录类型** | A |
| **主机记录** | `api` |
| **记录值** | 你的云服务器公网 IP（如 `123.45.67.89`） |
| **TTL** | 600 或默认 |

保存后，完整域名为：

```text
api.soulzenai.com  →  你的服务器 IP
```

## 2.3（可选）添加官网记录

若以后要做官网，可再加：

| 主机记录 | 类型 | 记录值 | 说明 |
|----------|------|--------|------|
| `@` | A | 服务器 IP | soulzenai.com 根域名 |
| `www` | A 或 CNAME | 服务器 IP 或 `@` | www.soulzenai.com |

**心镜 App 只需要 `api` 这一条即可。**

## 2.4 验证 DNS 是否生效

在 **Mac 终端**（或服务器）执行：

```bash
ping api.soulzenai.com
```

应 ping 到你的服务器 IP。

更精确：

```bash
nslookup api.soulzenai.com
# 或
dig api.soulzenai.com +short
```

**必须解析正确后再做 Nginx 和 HTTPS**，否则 certbot 会失败。

> DNS 生效时间：通常 5～30 分钟，最长 24 小时。

---

# 三、服务器：确认 API 在跑

SSH 登录服务器：

```bash
ssh root@你的服务器IP
```

检查：

```bash
pm2 list
# soulmirror-api 和 soulmirror-ai 都应是 online

curl http://127.0.0.1:3010/v1/tests/catalog
curl http://127.0.0.1:8010/health
```

若 API 没跑，先恢复：

```bash
cd /opt/soulmirror
pm2 start dist/main.js --name soulmirror-api --cwd /opt/soulmirror/services/api
pm2 start run-prod.sh --name soulmirror-ai --interpreter bash --cwd /opt/soulmirror/services/ai
pm2 save
```

---

# 四、配置 Nginx

## 4.1 确认 Nginx 已安装

```bash
nginx -v
sudo systemctl status nginx
```

未安装则：

```bash
sudo apt update
sudo apt install -y nginx
```

## 4.2 创建心镜站点配置

```bash
sudo nano /etc/nginx/sites-available/soulmirror
```

**完整粘贴以下内容**（端口 3010 不要改错）：

```nginx
server {
    listen 80;
    server_name api.soulzenai.com;

    # 可选：访问根路径时提示
    location = / {
        return 200 'SoulMirror API OK. Use /v1/';
        add_header Content-Type text/plain;
    }

    location /v1/ {
        proxy_pass http://127.0.0.1:3010/v1/;
        proxy_http_version 1.1;

        # WebSocket（对话 /v1/agent/stream 必需）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时（AI 生成报告 / 长连接对话可能较慢）
        proxy_connect_timeout 120s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

保存：`Ctrl+O` → 回车 → `Ctrl+X`。

## 4.3 启用站点

```bash
sudo ln -sf /etc/nginx/sites-available/soulmirror /etc/nginx/sites-enabled/
```

## 4.4 检查配置并重载

```bash
sudo nginx -t
```

应显示：

```text
syntax is ok
test is successful
```

```bash
sudo systemctl reload nginx
```

## 4.5 测试 HTTP（HTTPS 之前）

在 Mac 或服务器：

```bash
curl http://api.soulzenai.com/v1/tests/catalog
```

应返回 JSON（含 bazi、mbti 等）。

若失败，排查：

| 现象 | 处理 |
|------|------|
| Could not resolve host | DNS 未生效，继续等或检查解析 |
| Connection refused | 安全组未放行 **80** 端口 |
| 502 Bad Gateway | API 未运行或端口不是 3010 |

---

# 五、云厂商安全组

在云控制台（阿里云/腾讯云等）→ **安全组** → 入站规则：

| 端口 | 协议 | 来源 | 说明 |
|------|------|------|------|
| 80 | TCP | 0.0.0.0/0 | HTTP（申请证书用） |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 22 | TCP | 你的 IP | SSH |

**3010 不要对公网开放**（只给 Nginx 本机用）。

---

# 六、申请 HTTPS 证书（Let's Encrypt）

## 6.1 安装 certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

## 6.2 自动配置 SSL

```bash
sudo certbot --nginx -d api.soulzenai.com
```

按提示操作：

1. 输入邮箱（证书到期提醒）
2. 同意服务条款 `Y`
3. 是否分享邮箱：可选 `N`
4. 是否跳转 HTTPS：选 **2**（Redirect，强制 HTTPS）

成功后会显示 Congratulations。

## 6.3 验证 HTTPS

```bash
curl https://api.soulzenai.com/v1/tests/catalog
```

浏览器访问：https://api.soulzenai.com/v1/tests/catalog  
应看到 JSON。

## 6.4 证书自动续期

certbot 会自动添加定时任务。可测试：

```bash
sudo certbot renew --dry-run
```

---

# 七、生产环境完整验收

```bash
cd /opt/soulmirror
bash scripts/verify-production.sh https://api.soulzenai.com/v1
```

必须 **5/5 全部 ✅**。

---

# 八、更新 App 使用 HTTPS 域名

## 8.1 修改 eas.json（Mac 上）

`apps/mobile/eas.json` 中确保：

```json
"EXPO_PUBLIC_API_URL": "https://api.soulzenai.com/v1"
```

## 8.2 Mac 本地测试（无需重装也可先试）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
EXPO_PUBLIC_API_URL=https://api.soulzenai.com/v1 npx expo start --localhost
```

HTTPS 下 **不需要** HTTP 的 ATS 例外，iOS 应能正常请求。

## 8.3 重新打 Android / iOS 包

```bash
cd apps/mobile
eas build -p android --profile preview
# iOS: eas build -p ios --profile preview
```

---

# 九、与现有两个 App 共存说明

你服务器上已有 Nginx 配置：

- `agent-admin`
- `cloudtoken.conf`

**心镜是新增独立配置文件** `soulmirror`，通过不同 `server_name` 区分：

| 域名 | 转发到 |
|------|--------|
| 现有 App 的域名 | 各自原有端口（3000/3001 等） |
| api.soulzenai.com | 127.0.0.1:3010 |

互不冲突。查看所有站点：

```bash
ls -la /etc/nginx/sites-enabled/
```

---

# 十、常见问题

### Q1：certbot 报错 Domain not pointed to this server

DNS 还没生效，或 A 记录 IP 填错。用 `dig api.soulzenai.com` 核对。

### Q2：502 Bad Gateway

```bash
pm2 list
curl http://127.0.0.1:3010/v1/tests/catalog
grep PORT /opt/soulmirror/services/api/.env   # 应是 3010
```

### Q3：登录失败（验证码）

服务器 `services/api/.env` 需其一：

```env
NODE_ENV=development
```

或（pull 新代码后）：

```env
NODE_ENV=production
SMS_DEV_MODE=true
```

然后 `pm2 restart soulmirror-api`。

### Q4：备案未完成能否用 HTTPS？

- **大陆服务器**：未备案有时 80/443 会被拦截，以云厂商政策为准
- **香港/海外服务器**：通常可直接用

---

# 十一、操作 Checklist（打印对照）

- [ ] DNS：A 记录 `api` → 服务器 IP
- [ ] `ping api.soulzenai.com` 正确
- [ ] `pm2 list` 两个服务 online
- [ ] 创建 `/etc/nginx/sites-available/soulmirror`
- [ ] `nginx -t` 通过并 reload
- [ ] 安全组放行 80、443
- [ ] `curl http://api.soulzenai.com/v1/tests/catalog` OK
- [ ] `certbot --nginx -d api.soulzenai.com` 成功
- [ ] `curl https://api.soulzenai.com/v1/tests/catalog` OK
- [ ] `verify-production.sh https://api.soulzenai.com/v1` 5/5
- [ ] App 改用 `https://api.soulzenai.com/v1` 并重测

---

# 十二、命令速查

```bash
# DNS 检查
dig api.soulzenai.com +short

# Nginx
sudo nginx -t && sudo systemctl reload nginx

# HTTPS 申请
sudo certbot --nginx -d api.soulzenai.com

# 验收
bash /opt/soulmirror/scripts/verify-production.sh https://api.soulzenai.com/v1

# App 测试
EXPO_PUBLIC_API_URL=https://api.soulzenai.com/v1 npx expo start --localhost
```

---

*文档版本：2026-05-28 · 域名 soulzenai.com*
