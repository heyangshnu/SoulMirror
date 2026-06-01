# 心镜 SoulMirror · 服务器部署保姆级教程

> **域名**：soulzenai.com  
> **API 地址**：https://api.soulzenai.com/v1  
> **GitHub**：https://github.com/heyangshnu/SoulMirror  
> **服务器**：Ubuntu（已有 sub2api:3000、next:3001，心镜用 3010/8010）

---

# 第一部分：Mac 上 Push 代码到 GitHub

## 1.1 首次推送（若还没 push 过）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror

git init
git branch -M main
git add .
git commit -m "Initial commit: SoulMirror"

git remote add origin https://github.com/heyangshnu/SoulMirror.git
git push -u origin main
```

## 1.2 以后更新

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
git add .
git commit -m "描述改动"
git push
```

---

# 第二部分：服务器首次环境准备（只做一次）

SSH 登录：

```bash
ssh root@你的服务器IP
```

## 2.1 安装 MongoDB（你服务器没有 Docker，必须本机装）

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

sudo systemctl start mongod
sudo systemctl enable mongod
```

验证：

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
# 应输出 ok: 1
```

## 2.2 安装 Node.js 20 + PM2 + Python

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3 python3-venv python3-pip git

sudo npm install -g pm2
```

验证：

```bash
node -v    # v20.x
pm2 -v
python3 --version
```

## 2.3 克隆代码

```bash
sudo mkdir -p /opt/soulmirror
sudo chown $USER:$USER /opt/soulmirror

git clone https://github.com/heyangshnu/SoulMirror.git /opt/soulmirror
cd /opt/soulmirror
```

---

# 第三部分：.env 详细配置说明

> ⚠️ `.env` 文件**永远不要**提交到 GitHub，只在服务器上手动创建。

## 3.1 API 配置：`/opt/soulmirror/services/api/.env`

```bash
cd /opt/soulmirror
cp services/api/.env.production.example services/api/.env
nano services/api/.env
```

### 逐行说明

| 变量 | 示例值 | 说明 |
|------|--------|------|
| **PORT** | `3010` | API 监听端口。**必须是 3010**（你服务器 3000、3001 已被占用） |
| **MONGODB_URI** | `mongodb://127.0.0.1:27017/soulmirror` | MongoDB 连接地址。`soulmirror` 是库名，与其他 App 隔离 |
| **JWT_SECRET** | 随机 64 位字符串 | 用户登录 Token 签名密钥，**生产必须随机** |
| **AI_SERVICE_URL** | `http://127.0.0.1:8010` | API 调用 AI 服务的内网地址，端口与 AI .env 一致 |
| **NODE_ENV** | `production` | 生产环境标识 |
| **MEMORY_STORE** | `false` | Redis 缓存（MVP 未使用，保持 false） |

### 生成 JWT_SECRET

```bash
openssl rand -hex 32
```

把输出粘贴到 `JWT_SECRET=` 后面。

### 完整示例（复制后改 JWT 和 Key）

```env
PORT=3010
MONGODB_URI=mongodb://127.0.0.1:27017/soulmirror
JWT_SECRET=a1b2c3d4e5f6...你的64位随机串
AI_SERVICE_URL=http://127.0.0.1:8010
NODE_ENV=production
MEMORY_STORE=false
```

---

## 3.2 AI 配置：`/opt/soulmirror/services/ai/.env`

```bash
cp services/ai/.env.production.example services/ai/.env
nano services/ai/.env
```

### 逐行说明

| 变量 | 示例值 | 说明 |
|------|--------|------|
| **DEEPSEEK_API_KEY** | `sk-xxxxxxxx` | DeepSeek API 密钥，在 https://platform.deepseek.com 申请 |
| **DEEPSEEK_BASE_URL** | `https://api.deepseek.com` | DeepSeek API 地址，一般不用改 |
| **PORT** | `8010` | AI 服务端口，**仅本机访问**，不对外暴露 |

### 完整示例

```env
DEEPSEEK_API_KEY=sk-你的真实密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=8010
```

### 不填 DEEPSEEK_API_KEY 会怎样？

- 服务能启动
- MBTI 报告、心镜聊天会用**内置模板**回复，不会报错
- 建议生产环境务必填写

---

## 3.3 端口与域名对照表

| 用途 | 地址 | 谁访问 |
|------|------|--------|
| 公网 API | `https://api.soulzenai.com/v1` | 手机 App |
| 服务器内网 API | `http://127.0.0.1:3010/v1` | Nginx 转发 |
| 服务器内网 AI | `http://127.0.0.1:8010` | 仅 API 调用 |
| MongoDB | `127.0.0.1:27017` | 仅本机 |

---

# 第四部分：首次部署并测试

## 4.1 安装依赖 + 构建

```bash
cd /opt/soulmirror

npm install

cd packages/shared-types && npm run build && cd ../..

npm run api:build

cd services/ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..
```

## 4.2 手动启动测试（确认无误后再 PM2）

**终端 A - 启动 AI：**

```bash
cd /opt/soulmirror/services/ai
source .venv/bin/activate
export PYTHONPATH=.
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

看到 `Application startup complete` 后保持运行。

**终端 B - 启动 API：**

```bash
cd /opt/soulmirror
node services/api/dist/main.js
```

看到 `SoulMirror API listening on http://localhost:3010/v1`。

## 4.3 服务器本地验收（终端 C）

```bash
# 1. AI 健康检查
curl http://127.0.0.1:8010/health
# 期望：{"status":"ok"}

# 2. 测试目录（无需登录）
curl http://127.0.0.1:3010/v1/tests/catalog
# 期望：JSON，含 bazi/mbti/tarot/palm

# 3. 发送验证码
curl -X POST http://127.0.0.1:3010/v1/auth/sms/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'
# 期望：{"success":true,...}

# 4. 登录（开发模式验证码 123456）
curl -X POST http://127.0.0.1:3010/v1/auth/sms/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456"}'
# 期望：返回 accessToken

# 5. 一键验收脚本（推荐）
cd /opt/soulmirror
bash scripts/verify-production.sh http://127.0.0.1:3010/v1
# 期望：全部 ✅
```

**全部通过 → 按 Ctrl+C 停掉终端 A、B 的手动进程，改用 PM2。**

## 4.4 PM2 守护进程（正式运行）

```bash
cd /opt/soulmirror
bash scripts/server-deploy.sh
```

或手动：

```bash
pm2 start services/api/dist/main.js --name soulmirror-api
pm2 start "services/ai/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010" \
  --name soulmirror-ai \
  --cwd /opt/soulmirror/services/ai \
  --interpreter none

pm2 save
pm2 startup    # 按提示执行命令，实现开机自启
```

查看状态：

```bash
pm2 list
pm2 logs soulmirror-api --lines 30
pm2 logs soulmirror-ai --lines 30
```

---

# 第五部分：域名 soulzenai.com 配置

## 5.1 DNS 解析（域名控制台）

添加记录：

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| A | `api` | 你的服务器公网 IP |

生效后：

```bash
ping api.soulzenai.com
# 应 ping 到你的服务器 IP
```

## 5.2 Nginx 反向代理

```bash
sudo nano /etc/nginx/sites-available/soulmirror
```

粘贴：

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
    }
}
```

启用：

```bash
sudo ln -sf /etc/nginx/sites-available/soulmirror /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 5.3 HTTPS 证书（域名解析生效后）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.soulzenai.com
```

## 5.4 公网验收

```bash
curl https://api.soulzenai.com/v1/tests/catalog

cd /opt/soulmirror
bash scripts/verify-production.sh https://api.soulzenai.com/v1
```

---

# 第六部分：域名未生效前的临时测试

安全组临时放行 **3010** 端口，用 IP 测试：

```bash
curl http://你的服务器IP:3010/v1/tests/catalog
```

**Mac 模拟 App 连服务器：**

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
EXPO_PUBLIC_API_URL=http://你的服务器IP:3010/v1 npx expo start --localhost
```

模拟器打开心镜 → 登录 `13800138000` / `123456` → 塔罗测试。

---

# 第七部分：Android 手机测试

域名 HTTPS 可用后，打内测包：

```bash
# Mac 上
cd apps/mobile
eas login
eas build -p android --profile preview
```

`eas.json` 已配置 `https://api.soulzenai.com/v1`。

下载 APK 装到 Android 手机，登录测试。

---

# 第八部分：日常更新流程

```bash
# Mac：改代码
git push

# 服务器：更新部署
ssh root@你的服务器IP
cd /opt/soulmirror
git pull origin main
bash scripts/server-deploy.sh
```

---

# 第九部分：故障排查

| 现象 | 处理 |
|------|------|
| `curl 3010` 失败 | `pm2 list` 看 soulmirror-api 是否 online |
| 登录 OK，测试失败 | `pm2 logs soulmirror-ai`，检查 DEEPSEEK_API_KEY |
| MongoDB 连接失败 | `sudo systemctl status mongod` |
| HTTPS 502 | API 没跑或 Nginx proxy_pass 端口不是 3010 |
| 端口被占用 | `sudo ss -tlnp \| grep 3010` |

---

# 第十部分：Checklist

## 服务器首次部署

- [ ] MongoDB 安装并运行
- [ ] 代码 clone 到 `/opt/soulmirror`
- [ ] `services/api/.env` 配置完成（PORT=3010）
- [ ] `services/ai/.env` 配置完成（PORT=8010）
- [ ] `verify-production.sh http://127.0.0.1:3010/v1` 全部通过
- [ ] PM2 运行 soulmirror-api、soulmirror-ai

## 域名上线

- [ ] DNS：`api.soulzenai.com` → 服务器 IP
- [ ] Nginx 配置并重载
- [ ] certbot HTTPS
- [ ] `verify-production.sh https://api.soulzenai.com/v1` 全部通过

## App 测试

- [ ] Mac 模拟器 + 生产 API 全流程 OK
- [ ] Android APK 安装测试 OK

---

*域名：soulzenai.com · API：api.soulzenai.com · GitHub：heyangshnu/SoulMirror*
