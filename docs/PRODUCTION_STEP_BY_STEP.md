# 心镜 SoulMirror · 8 步上线超详细操作手册

> **域名**：soulzenai.com → API：`https://api.soulzenai.com/v1`  
> **服务器**：Ubuntu（sub2api:3000，心镜 API:3010，AI:8010）  
> **邮箱**：与 sub2api 共用 126 SMTP（第四步）

每个大步骤下都有**编号小步骤**，按顺序做，做完一步打勾再往下。

---

# 第 0 步：Mac 本地跑通

**目的**：在你自己电脑上确认代码没问题，避免把坏代码部署到服务器。

---

## 0.1 打开终端，进入项目目录

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
```

**在干什么**：后续所有命令都在这个目录或其子目录执行。

---

## 0.2 确认依赖已安装（首次才做）

```bash
npm install
npm run types:build
npm run chart:build
```

**在干什么**：安装 Node 依赖，编译共享包。只需首次或 `package.json` 变更后做。

---

## 0.3 确认本地配置文件存在

```bash
ls services/api/.env services/ai/.env
```

若不存在：

```bash
cp services/api/.env.example services/api/.env
cp services/ai/.env.example services/ai/.env
```

编辑 `services/ai/.env`，填入 DeepSeek Key：

```env
DEEPSEEK_API_KEY=sk-你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=8001
```

**在干什么**：API 和 AI 服务启动时要读这些配置。

---

## 0.4 启动 MongoDB（终端 1）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
npm run docker:up
```

等待几秒，验证：

```bash
docker ps | grep mongo
```

**在干什么**：Docker 启动 MongoDB 容器，存用户、报告、验证码。

---

## 0.5 启动 AI 服务（终端 2，保持运行）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/services/ai
source .venv/bin/activate    # 首次需: python3 -m venv .venv && pip install -r requirements.txt
./run.sh
```

看到 `Application startup complete` 或类似输出即成功。

**在干什么**：Python 服务，负责紫微报告生成、心镜 AI 对话。

---

## 0.6 启动 API 服务（终端 3，保持运行）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
npm run api
```

看到 `SoulMirror API listening on http://localhost:3000/v1`。

**在干什么**：NestJS 后端，App 所有请求都经过它。

---

## 0.7 启动 App（终端 4）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
npx expo start --localhost
```

按 `i` 开 iOS 模拟器，或扫码真机调试。

**在干什么**：Expo 开发服务器，加载 React Native App。

---

## 0.8 命令行快速验收

新开终端 5：

```bash
curl http://localhost:8001/health
# 期望: {"status":"ok"}

curl http://localhost:3000/v1/tests/catalog
# 期望: JSON

curl http://localhost:3000/v1/auth/config
# 期望: email_verify_enabled 等字段

bash /Users/heyang/Desktop/myProject/SoulMirror/scripts/verify-local.sh
```

**在干什么**：不打开 App 也能确认三个服务都正常。

---

## 0.9 App 内手动验收

在模拟器里逐项完成：

| # | 操作 | 通过 |
|---|------|------|
| 1 | 邮箱注册（开发模式验证码看 API 终端日志） | ☐ |
| 2 | 邮箱 + 密码登录 | ☐ |
| 3 | 探索 → 紫微斗数 → 排盘 → 生成报告 | ☐ |
| 4 | 报告 Tab 能看到总结 | ☐ |
| 5 | 心镜 Tab 发消息有回复 | ☐ |
| 6 | 关系人 → 生成关系报告（可选） | ☐ |

**全部打勾 → 进入第 1 步。**

---

# 第 1 步：Push 代码到 GitHub

**目的**：把代码托管到 GitHub，服务器通过 `git pull` 拉取，而不是手动复制文件。

---

## 1.1 确认 Git 已初始化

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
git status
```

- 若提示 `not a git repository`，执行：

```bash
git init
git branch -M main
```

**在干什么**：初始化本地 Git 仓库，默认分支叫 `main`。

---

## 1.2 确认密钥不会被提交

```bash
git status
```

检查列表里**不应出现**：

- `services/api/.env`
- `services/ai/.env`

若出现了，说明 `.gitignore` 没生效，**不要继续**，先修复。

```bash
cat .gitignore | grep "\.env"
# 应看到 services/api/.env 和 services/ai/.env
```

**在干什么**：`.env` 里有 JWT 密钥、SMTP 密码，绝对不能进 GitHub。

---

## 1.3 创建 GitHub 仓库（首次才做）

1. 浏览器打开 https://github.com/new  
2. Owner 选你的账号（如 `heyangshnu`）  
3. Repository name 填 `SoulMirror`  
4. 选 **Private**（私有，代码不公开）  
5. **不要**勾选 "Add a README"（本地已有代码）  
6. 点 **Create repository**  
7. 记下仓库地址，例如：  
   `https://github.com/heyangshnu/SoulMirror.git`

**在干什么**：在 GitHub 上创建一个空仓库，用来接收你的代码。

---

## 1.4 关联远程仓库（首次才做）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
git remote add origin https://github.com/heyangshnu/SoulMirror.git
```

验证：

```bash
git remote -v
# 应显示 origin 指向你的仓库
```

若之前加错了：

```bash
git remote set-url origin https://github.com/heyangshnu/SoulMirror.git
```

**在干什么**：告诉本地 Git「推送到哪个 GitHub 地址」。

---

## 1.5 配置 GitHub 登录（首次才做，二选一）

### 方式 A：HTTPS + Personal Access Token（简单）

1. GitHub → Settings → Developer settings → Personal access tokens  
2. Generate new token，勾选 `repo`  
3. 复制 token（只显示一次）  
4. 推送时用 token 代替密码

### 方式 B：SSH（推荐长期使用）

```bash
ssh-keygen -t ed25519 -C "你的邮箱"
# 一路回车

cat ~/.ssh/id_ed25519.pub
# 复制整行输出
```

GitHub → Settings → SSH and GPG keys → New SSH key → 粘贴 → Save

```bash
git remote set-url origin git@github.com:heyangshnu/SoulMirror.git
ssh -T git@github.com
# 应看到 Hi heyangshnu!
```

**在干什么**：GitHub 需要验证身份才允许 push。

---

## 1.6 查看改了哪些文件

```bash
git status
```

**在干什么**：看哪些文件会被提交。红色 = 未暂存，绿色 = 已暂存。

---

## 1.7 添加文件到暂存区

```bash
git add .
```

或只加部分：

```bash
git add apps/mobile docs services packages
```

再次确认：

```bash
git status
```

**仍然没有** `.env` 文件。

**在干什么**：`git add` = 把改动放进「待提交的包裹」，还没真正提交。

---

## 1.8 写提交说明并提交

```bash
git commit -m "feat: 紫微解读、邮箱注册、报告等待弹窗"
```

**在干什么**：在本地 Git 历史里创建一条快照，附说明文字。

若提示 `nothing to commit`，说明没有新改动，可跳过 1.7～1.8 直接 push。

---

## 1.9 推送到 GitHub

首次：

```bash
git push -u origin main
```

以后每次：

```bash
git push
```

**在干什么**：把本地 commit 上传到 GitHub 云端。

---

## 1.10 验证推送成功

1. 浏览器打开 `https://github.com/heyangshnu/SoulMirror`  
2. 能看到最新文件和 commit 说明  
3. 确认仓库里**没有** `services/api/.env`

**在干什么**：确认服务器接下来 `git clone` / `git pull` 能拿到正确代码。

---

## 1.11 日常更新流程（以后改代码时重复）

每次改完代码：

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
git status                    # 1. 看改了啥
git add .                     # 2. 暂存
git commit -m "描述本次改动"   # 3. 提交
git push                      # 4. 推送
```

然后在服务器 `git pull`（第 3 步 / 日常更新）。

---

# 第 2 步：服务器首次装环境

**目的**：在云服务器上安装 MongoDB、Node.js、Python、PM2、Nginx 等，心镜才能跑。

**在哪做**：SSH 登录服务器后的终端。

---

## 2.1 SSH 登录服务器

```bash
ssh root@你的服务器公网IP
```

输入密码或使用密钥登录。

**在干什么**：远程连接到你的 Ubuntu 云服务器。

---

## 2.2 云厂商安全组放行端口

登录**阿里云 / 腾讯云控制台**（不是 SSH 里）：

1. 找到你的云服务器实例  
2. 进入 **安全组** → **入站规则** → **添加**  
3. 添加以下规则：

| 端口 | 协议 | 来源 | 用途 |
|------|------|------|------|
| 22 | TCP | 你的 IP 或 0.0.0.0/0 | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP（申请 SSL） |
| 443 | TCP | 0.0.0.0/0 | HTTPS（App 访问） |

**不要**放行 3010、8010、27017 到公网。

**在干什么**：防火墙允许外网访问 Web 端口，同时保护内部服务端口。

---

## 2.3 更新系统包

```bash
sudo apt update
sudo apt upgrade -y
```

**在干什么**：更新 Ubuntu 软件源，减少安装报错。

---

## 2.4 安装 MongoDB

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
```

启动并开机自启：

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

验证：

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
# 期望: ok: 1
```

**在干什么**：安装数据库，存储用户、报告、邮箱验证码等。

---

## 2.5 安装 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # 期望 v20.x
npm -v
```

**在干什么**：NestJS API 需要 Node.js 运行。

---

## 2.6 安装 PM2

```bash
sudo npm install -g pm2
pm2 -v
```

**在干什么**：进程守护，API/AI 崩溃自动重启，关机后可配置自启。

---

## 2.7 安装 Python 3 + venv

```bash
sudo apt install -y python3 python3-venv python3-pip
python3 --version
```

**在干什么**：AI 服务是 Python FastAPI。

---

## 2.8 安装 Git 和 Nginx

```bash
sudo apt install -y git nginx
git --version
nginx -v
```

**在干什么**：Git 拉代码；Nginx 做 HTTPS 反向代理（第 5 步用）。

---

## 2.9 创建项目目录

```bash
sudo mkdir -p /opt/soulmirror
sudo chown $USER:$USER /opt/soulmirror
```

**在干什么**：固定代码放在 `/opt/soulmirror`，和 sub2api 等项目分开。

---

**第 2 步完成标志**：`mongod` 运行中，`node -v` 有输出，`pm2 -v` 有输出。

---

# 第 3 步：克隆代码 + 配置 + 首次部署

**目的**：把 GitHub 代码拉到服务器，配好环境变量，编译并启动 API + AI。

---

## 3.1 克隆仓库

```bash
cd /opt/soulmirror
git clone https://github.com/heyangshnu/SoulMirror.git .
```

若目录已有旧代码：

```bash
cd /opt/soulmirror
git pull origin main
```

**在干什么**：从 GitHub 下载最新代码到服务器。

---

## 3.2 生成 JWT 密钥

```bash
openssl rand -hex 32
```

复制输出的 64 位字符串，下一步要用。

**在干什么**：用户登录 Token 的签名密钥，必须随机且保密。

---

## 3.3 创建 API 配置文件

```bash
cp /opt/soulmirror/services/api/.env.production.example /opt/soulmirror/services/api/.env
nano /opt/soulmirror/services/api/.env
```

填入（**JWT_SECRET 换成 3.2 生成的**）：

```env
PORT=3010
MONGODB_URI=mongodb://127.0.0.1:27017/soulmirror
JWT_SECRET=粘贴 openssl 输出
AI_SERVICE_URL=http://127.0.0.1:8010
NODE_ENV=production
MEMORY_STORE=false
SMS_DEV_MODE=false

EMAIL_VERIFY_ENABLED=true
EMAIL_DEV_MODE=false
```

保存：`Ctrl+O` 回车，`Ctrl+X` 退出。

**在干什么**：

| 变量 | 含义 |
|------|------|
| PORT=3010 | API 监听端口（避开 sub2api 的 3000） |
| MONGODB_URI | 连本机 MongoDB |
| JWT_SECRET | 登录令牌密钥 |
| AI_SERVICE_URL | 内网 AI 地址 |
| EMAIL_* | 第四步会补全 SMTP |

---

## 3.4 创建 AI 配置文件

```bash
cp /opt/soulmirror/services/ai/.env.production.example /opt/soulmirror/services/ai/.env
nano /opt/soulmirror/services/ai/.env
```

```env
DEEPSEEK_API_KEY=sk-你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=8010
```

可与 sub2api 的 `DEEPSEEK_API_KEY` 相同。

**在干什么**：AI 服务读 DeepSeek Key 生成报告和对话。

---

## 3.5 执行部署脚本

```bash
cd /opt/soulmirror
bash scripts/server-deploy.sh
```

脚本会自动：

1. `git pull` 拉最新代码  
2. `npm install` 装依赖  
3. 编译 `packages/shared-types`  
4. `npm run api:build` 编译 NestJS  
5. 创建 Python venv 并 `pip install`  
6. PM2 启动 `soulmirror-api` 和 `soulmirror-ai`  

**在干什么**：一键完成编译 + 启动。

---

## 3.6 检查 PM2 进程

```bash
pm2 list
```

期望：

| name | status |
|------|--------|
| soulmirror-api | online |
| soulmirror-ai | online |

若 errored：

```bash
pm2 logs soulmirror-api --lines 50
pm2 logs soulmirror-ai --lines 50
```

**在干什么**：确认两个服务都在跑。

---

## 3.7 本机 curl 验收

```bash
curl http://127.0.0.1:8010/health
curl http://127.0.0.1:3010/v1/tests/catalog
curl http://127.0.0.1:3010/v1/auth/config
```

**在干什么**：在服务器内部测试，不经过 Nginx/HTTPS。

---

## 3.8 设置 PM2 开机自启（推荐）

```bash
pm2 save
pm2 startup
```

按提示复制并执行它输出的 `sudo env PATH=...` 那一行命令。

**在干什么**：服务器重启后 API/AI 自动起来。

---

**第 3 步完成标志**：三个 curl 都有正常 JSON 返回，PM2 两个进程 online。

---

# 第 4 步：邮箱验证码（与 sub2api 相同）

**目的**：生产环境注册时，用户邮箱收到真实 6 位验证码。

---

## 4.1 在本机查看 sub2api 的 SMTP 配置

Mac 上：

```bash
grep -E "^SMTP_|^EMAIL_" /Users/heyang/Desktop/myProject/sub2api-full-code/sub2api-go/.env
```

应看到类似：

```env
SMTP_HOST=smtp.126.com
SMTP_PORT=465
SMTP_USERNAME=subtoapi@126.com
SMTP_PASSWORD=xxxx
SMTP_FROM=subtoapi@126.com
```

**在干什么**：心镜与 sub2api 共用同一 126 邮箱发信。

---

## 4.2 编辑心镜 API 的 .env

服务器上：

```bash
nano /opt/soulmirror/services/api/.env
```

追加或替换邮箱段（密码从 4.1 复制）：

```env
EMAIL_VERIFY_ENABLED=true
EMAIL_DEV_MODE=false
SMTP_HOST=smtp.126.com
SMTP_PORT=465
SMTP_USERNAME=subtoapi@126.com
SMTP_PASSWORD=从sub2api复制
SMTP_FROM=心镜 SoulMirror <subtoapi@126.com>
```

| 字段 | 说明 |
|------|------|
| EMAIL_DEV_MODE=false | **必须 false**，否则不发真邮件 |
| SMTP_PORT=465 | SSL 端口，与 sub2api 一致 |
| SMTP_FROM | 发件人地址必须与 USERNAME 一致 |

---

## 4.3 重启 API

```bash
pm2 restart soulmirror-api
pm2 logs soulmirror-api --lines 20
```

**在干什么**：让新 SMTP 配置生效。

---

## 4.4 测试发送注册验证码

```bash
curl -X POST http://127.0.0.1:3010/v1/auth/send-register-code \
  -H "Content-Type: application/json" \
  -d '{"email":"你的真实邮箱@example.com"}'
```

期望：`{"message":"验证码已发送"}`

去邮箱查「心镜 - 注册验证码」（垃圾箱也看）。

**在干什么**：验证 SMTP 链路通了。

---

## 4.5 测试完整注册

```bash
curl -X POST http://127.0.0.1:3010/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"你的真实邮箱@example.com",
    "password":"Test123456",
    "verificationCode":"邮件里的6位数字",
    "terms_accepted":true,
    "terms_version":"1.0"
  }'
```

期望：返回 `accessToken`。

**在干什么**：确认注册全流程 OK。

---

## 4.6 确认 auth/config 状态

```bash
curl http://127.0.0.1:3010/v1/auth/config
```

期望：

```json
{
  "email_verify_enabled": true,
  "email_dev_mode": false,
  ...
}
```

**第 4 步完成标志**：真实邮箱收到验证码，curl 注册成功。

---

# 第 5 步：域名 + Nginx + HTTPS

**目的**：让手机通过 `https://api.soulzenai.com/v1` 访问 API。

---

## 5.1 登录域名控制台

阿里云 / 腾讯云 → 域名管理 → 找到 **soulzenai.com** → DNS 解析。

---

## 5.2 添加 A 记录

| 字段 | 填什么 |
|------|--------|
| 记录类型 | A |
| 主机记录 | `api` |
| 记录值 | 服务器公网 IP |
| TTL | 600 或默认 |

保存后完整域名为：`api.soulzenai.com`

**在干什么**：把域名指向你的服务器 IP。

---

## 5.3 等待 DNS 生效并验证

```bash
ping api.soulzenai.com
dig api.soulzenai.com +short
```

应显示服务器 IP。通常 5～30 分钟，最长 24 小时。

---

## 5.4 创建 Nginx 配置文件

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
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

**在干什么**：外网 80 端口请求转发到本机 3010；`proxy_buffering off` 支持心镜流式对话。

---

## 5.5 启用站点并重载 Nginx

```bash
sudo ln -sf /etc/nginx/sites-available/soulmirror /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` 必须显示 `syntax is ok`。

---

## 5.6 测试 HTTP（HTTPS 之前）

```bash
curl http://api.soulzenai.com/v1/tests/catalog
```

**在干什么**：确认 Nginx 转发正常。

---

## 5.7 安装 certbot 并申请 SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.soulzenai.com
```

按提示：

1. 输入邮箱  
2. 同意条款 `Y`  
3. 是否分享邮箱：可选 `N`  
4. **选 2：Redirect**（强制 HTTPS）

**在干什么**：Let's Encrypt 免费 SSL 证书，App 必须用 HTTPS。

---

## 5.8 公网 HTTPS 验收

```bash
curl https://api.soulzenai.com/v1/tests/catalog
curl https://api.soulzenai.com/v1/auth/config

curl -X POST https://api.soulzenai.com/v1/auth/send-register-code \
  -H "Content-Type: application/json" \
  -d '{"email":"你的邮箱"}'
```

**第 5 步完成标志**：HTTPS curl 全通，邮箱能收到验证码。

---

# 第 6 步：Mac 模拟器连生产 API

**目的**：不打包，先确认 App 能连上生产后端。

---

## 6.1 启动 Expo 并指定生产 API

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
EXPO_PUBLIC_API_URL=https://api.soulzenai.com/v1 npx expo start --localhost
```

**在干什么**：临时覆盖 API 地址为生产环境，不影响本地 `.env`。

---

## 6.2 打开模拟器

终端按 `i`（iOS）或 `a`（Android），或 Expo 菜单选 Open iOS Simulator。

---

## 6.3 逐项验收

| # | 操作 | 通过 |
|---|------|------|
| 1 | 注册：填邮箱 → 收验证码 → 注册成功 | ☐ |
| 2 | 退出 → 邮箱密码登录 | ☐ |
| 3 | 紫微斗数排盘 → 等待弹窗 → 报告生成 | ☐ |
| 4 | 报告 Tab 看总结 | ☐ |
| 5 | 心镜对话（流式回复） | ☐ |
| 6 | 关系人报告（可选） | ☐ |

**全部通过 → 可以打 APK。**

---

# 第 7 步：打 Android APK

**目的**：生成 `.apk` 文件，发给测试用户安装。

---

## 7.1 确认 eas.json 里的 API 地址

```bash
cat /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile/eas.json
```

确认：

```json
"EXPO_PUBLIC_API_URL": "https://api.soulzenai.com/v1"
```

若域名未就绪，临时可改 IP（仅内测），改完需 `git push`。

---

## 7.2 安装 EAS CLI

```bash
npm install -g eas-cli
eas --version
```

---

## 7.3 登录 Expo 账号

```bash
eas login
```

无账号：打开 https://expo.dev 注册（可用 GitHub 登录）。

**在干什么**：EAS 云端编译需要 Expo 账号。

---

## 7.4 确认项目已关联（首次才做）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
eas init
```

`app.json` 里已有 `projectId` 则跳过。

---

## 7.5 提交代码（若改了 eas.json）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
git add apps/mobile/eas.json
git commit -m "chore: production API URL for EAS"
git push
```

---

## 7.6 发起云端构建

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
eas build --platform android --profile preview
```

按提示：

- 是否创建 keystore：首次选 **Yes**（EAS 托管签名）  
- 等待约 **10～20 分钟**

**在干什么**：Expo 云端编译 Android APK，本地不需要 Android Studio。

---

## 7.7 下载 APK

1. 打开 https://expo.dev  
2. 登录 → 进入项目 **soulmirror**  
3. 左侧 **Builds**  
4. 找到刚完成的 build → **Download** → 得到 `.apk`

---

## 7.8 安装到 Android 手机

1. 把 APK 传到手机（微信文件 / 网盘 / 数据线）  
2. 手机 **设置 → 安全 → 允许安装未知来源**（各品牌路径略有不同）  
3. 点击 APK 安装  
4. 打开「心镜 SoulMirror」  
5. 用**真实邮箱**注册测试完整流程  

---

## 7.9 更新 App 后重新打包

改了前端代码后：

```bash
git push
cd apps/mobile
eas build -p android --profile preview
```

用户需**重新安装**新 APK（内测阶段无自动更新）。

---

**第 7 步完成标志**：手机安装 APK，邮箱注册 + 紫微报告 + 心镜对话全流程 OK。

---

# 附录：日常运维

## 更新后端

```bash
# Mac
git push

# 服务器
ssh root@你的IP
cd /opt/soulmirror && bash scripts/server-deploy.sh
```

## 只改了 .env

```bash
pm2 restart soulmirror-api
# 或
pm2 restart soulmirror-ai
```

## 常用排查

```bash
pm2 list
pm2 logs soulmirror-api --lines 50
pm2 logs soulmirror-ai --lines 50
sudo systemctl status mongod
curl https://api.soulzenai.com/v1/auth/config
```

---

*2026-05-28 · 8 步超详细版*
