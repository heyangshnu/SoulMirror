# 心镜 SoulMirror · 全流程操作手册

> 适用对象：**heyangshnu**（GitHub） + **Ubuntu 云服务器**  
> 目标：域名 → 后端上线 → 验证可用 → 打 Android 安装包

---

## 流程总览

```text
阶段 0  本地开发验证（Mac）
阶段 1  申请域名 + DNS 解析
阶段 2  代码 push 到 GitHub
阶段 3  Ubuntu 服务器部署后端
阶段 4  配置 HTTPS 正式 API
阶段 5  生产环境验收（必须通过再打包）
阶段 6  EAS 打 Android APK 内测包
阶段 7  （可选）正式上架
```

**原则：阶段 5 全部通过之前，不要打 Android 包。**

---

# 阶段 0：本地验证（Mac，约 30 分钟）

在推 GitHub、买域名之前，先确认本地能跑通。

## 0.1 启动 4 个服务

```bash
# 终端 1：数据库
cd /Users/heyang/Desktop/myProject/SoulMirror
npm run docker:up

# 终端 2：AI
cd /Users/heyang/Desktop/myProject/SoulMirror/services/ai
source .venv/bin/activate
./run.sh

# 终端 3：API
cd /Users/heyang/Desktop/myProject/SoulMirror
npm run api

# 终端 4：App（模拟器里点「心镜」或 npx expo start --localhost）
open -a Simulator
```

## 0.2 本地验收清单（全部打勾再继续）

```bash
# 1. MongoDB
docker ps | grep mongo

# 2. AI
curl http://localhost:8001/health
# 期望：{"status":"ok"}

# 3. API
curl http://localhost:3000/v1/tests/catalog
# 期望：JSON 含 bazi/mbti/tarot/palm

# 4. 登录接口
curl -X POST http://localhost:3000/v1/auth/sms/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'
# 期望：success: true
```

App 内验收：

- [ ] 登录 `13800138000` / `123456`
- [ ] 塔罗测试能生成报告
- [ ] 报告 Tab 能看到内容
- [ ] 心镜 Tab 能收到回复

---

# 阶段 1：申请域名（约 1 天）

## 1.1 在哪里买

国内推荐（备案方便、支付宝/微信）：

| 平台 | 地址 | 说明 |
|------|------|------|
| **阿里云** | https://wanwang.aliyun.com | 最常用 |
| **腾讯云** | https://dnspod.cloud.tencent.com | 和 DNS 一体 |
| **华为云** | https://www.huaweicloud.com/product/dns.html | 备选 |

海外（无需备案，但国内访问可能慢）：

| 平台 | 地址 |
|------|------|
| Cloudflare | https://www.cloudflare.com/products/registrar/ |
| Namecheap | https://www.namecheap.com |

**国内 App 正式上架建议买 `.com` / `.cn` 并在同一云厂商备案。**

## 1.2 选购建议

- 名称示例：`soulmirror.cn`、`xinjing.app`、`heyangSoul.com`
- 首年 `.com` 约 ¥50～80，`.cn` 约 ¥30～50
- 先买 **1 年** 即可

## 1.3 购买步骤（以阿里云为例）

1. 登录阿里云 → **域名注册**
2. 搜索想要的域名 → 加入清单 → 结算
3. 完成 **实名认证**（个人身份证，约 1 小时～1 天）

## 1.4 DNS 解析到你的云服务器

假设：

- 域名：`soulmirror.cn`（换成你实际买的）
- 服务器公网 IP：`123.45.67.89`（换成你的）

在域名控制台 → **解析设置** → 添加记录：

| 记录类型 | 主机记录 | 记录值 | 说明 |
|----------|----------|--------|------|
| A | `api` | `123.45.67.89` | API 地址 → `api.soulmirror.cn` |
| A | `@` | `123.45.67.89` | 可选，官网首页 |
| A | `www` | `123.45.67.89` | 可选 |

保存后等待 **5 分钟～24 小时** 生效。

验证：

```bash
ping api.soulmirror.cn
# 应 ping 到你的服务器 IP
```

## 1.5 备案说明（国内服务器 + 国内域名）

若服务器在**中国大陆**（阿里云/腾讯云国内节点）：

- 需要 **ICP 备案** 才能用 80/443 端口对外提供 Web 服务
- 在云厂商控制台 → **备案** → 按指引提交（约 7～20 个工作日）
- **备案期间**：可先用 **服务器 IP + 端口** 做内测（见阶段 5 备选方案）

若服务器在**香港/海外**：

- 通常无需备案，但国内用户访问可能较慢
- 国内应用商店上架仍可能需要备案

---

# 阶段 2：Push 代码到 GitHub

## 2.1 创建仓库

1. 打开 https://github.com/new
2. Owner：**heyangshnu**
3. Repository name：`SoulMirror`
4. Visibility：**Private**
5. 不勾选 README → Create

仓库地址：

```text
https://github.com/heyangshnu/SoulMirror.git
```

## 2.2 本地首次推送

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror

git init
git branch -M main

# 确认密钥不会被提交
git status | grep -E "\.env$" && echo "警告：.env 将被提交！" || echo "OK：.env 已忽略"

git add .
git commit -m "Initial commit: SoulMirror MVP"

git remote add origin https://github.com/heyangshnu/SoulMirror.git
git push -u origin main
```

### SSH 方式（推荐）

```bash
ssh-keygen -t ed25519 -C "你的邮箱"
cat ~/.ssh/id_ed25519.pub
# 复制输出 → GitHub → Settings → SSH and GPG keys → New SSH key

git remote set-url origin git@github.com:heyangshnu/SoulMirror.git
git push -u origin main
```

## 2.3 日常更新

```bash
git add .
git commit -m "描述改动"
git push
```

---

# 阶段 3：Ubuntu 服务器部署后端

假设已 SSH 登录：`ssh root@你的服务器IP`

## 3.1 安全组 / 防火墙

在云厂商控制台放行：

| 端口 | 用途 |
|------|------|
| 22 | SSH |
| 80 | HTTP（申请 SSL 用） |
| 443 | HTTPS API |

Ubuntu 本机：

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 3.2 Clone 代码

```bash
sudo mkdir -p /opt/soulmirror
sudo chown $USER:$USER /opt/soulmirror

git clone https://github.com/heyangshnu/SoulMirror.git /opt/soulmirror
cd /opt/soulmirror
```

## 3.3 安装环境

```bash
chmod +x scripts/server-setup.sh
bash scripts/server-setup.sh
```

安装完成后 **重新 SSH 登录**（Docker 权限生效）。

## 3.4 配置生产环境变量

```bash
cp services/api/.env.example services/api/.env
cp services/ai/.env.example services/ai/.env
nano services/api/.env
nano services/ai/.env
```

**services/api/.env**（示例）：

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/soulmirror
JWT_SECRET=请用 openssl rand -hex 32 生成
AI_SERVICE_URL=http://127.0.0.1:8001
NODE_ENV=production
```

生成 JWT 密钥：

```bash
openssl rand -hex 32
```

**services/ai/.env**（示例）：

```env
DEEPSEEK_API_KEY=sk-你的DeepSeek密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=8001
```

## 3.5 首次部署

```bash
cd /opt/soulmirror
bash scripts/server-deploy.sh
```

## 3.6 服务器本地验证

```bash
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:3000/v1/tests/catalog
```

---

# 阶段 4：配置 HTTPS 正式 API

把 `api.soulmirror.cn` 换成 **你的实际域名**。

## 4.1 安装 Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

## 4.2 Nginx 配置

```bash
sudo nano /etc/nginx/sites-available/soulmirror
```

写入：

```nginx
server {
    listen 80;
    server_name api.soulmirror.cn;

    location /v1/ {
        proxy_pass http://127.0.0.1:3000/v1/;
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

## 4.3 申请免费 SSL 证书

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.soulmirror.cn
```

按提示输入邮箱，选同意，选自动重定向 HTTPS。

## 4.4 公网验证

```bash
curl https://api.soulmirror.cn/v1/tests/catalog
```

应返回 JSON。**这一步成功 = 后端已对外可用。**

---

# 阶段 5：生产环境验收（打 Android 包前必做）

## 5.1 服务器端自动化验收

在**任意能上网的电脑**上执行（把域名换成你的）：

```bash
API=https://api.soulmirror.cn/v1

echo "=== 1. 测试目录 ==="
curl -sf "$API/tests/catalog" | head -c 200
echo ""

echo "=== 2. 发送验证码 ==="
curl -sf -X POST "$API/auth/sms/send" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'
echo ""

echo "=== 3. 登录 ==="
TOKEN=$(curl -sf -X POST "$API/auth/sms/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo "Token 获取: ${TOKEN:0:20}..."

echo "=== 4. 塔罗测试（需 AI 服务） ==="
curl -sf -X POST "$API/tests/tarot/draw" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"general","seed":1}' | head -c 300
echo ""

echo "=== 5. 报告列表 ==="
curl -sf "$API/reports" -H "Authorization: Bearer $TOKEN" | head -c 200
echo ""

echo "=== 全部通过 ==="
```

**若任一步失败，先修后端，不要打包。**

## 5.2 备案未完成时的临时验收

若域名还没备案、HTTPS 暂不可用，可临时用 IP 测试（**不要用于正式 App**）：

```bash
curl http://你的服务器IP:3000/v1/tests/catalog
```

需在安全组放行 3000 端口，且 App 里 API 地址用 `http://IP:3000/v1`（仅内测）。

## 5.3 Mac 上模拟「正式 App」连生产 API

不打包，先验证 App 能否连上生产后端：

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
EXPO_PUBLIC_API_URL=https://api.soulmirror.cn/v1 npx expo start --localhost
```

模拟器打开心镜，走一遍：登录 → 塔罗 → 报告 → 心镜聊天。

**这一步通过 = 可以打 Android 包。**

## 5.4 验收 Checklist（打印对照）

| # | 检查项 | 通过 |
|---|--------|------|
| 1 | `curl https://api.域名/v1/tests/catalog` 有 JSON | ☐ |
| 2 | 登录接口 success | ☐ |
| 3 | 带 Token 能抽塔罗并生成报告 | ☐ |
| 4 | AI health 正常 | ☐ |
| 5 | Mac 模拟器 + 生产 API URL 全流程 OK | ☐ |
| 6 | DeepSeek Key 已配（可选但建议） | ☐ |

---

# 阶段 6：制作 Android 安装包

**仅当阶段 5 全部通过后执行。**

## 6.1 修改 eas.json 中的 API 地址

编辑 `apps/mobile/eas.json`：

```json
"EXPO_PUBLIC_API_URL": "https://api.soulmirror.cn/v1"
```

提交推送：

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
git add apps/mobile/eas.json
git commit -m "chore: set production API URL for EAS build"
git push
```

## 6.2 注册 Expo

```bash
npm install -g eas-cli
eas login
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
eas init
```

## 6.3 打 Android 内测 APK

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
eas build --platform android --profile preview
```

- 等待约 10～20 分钟
- 打开 https://expo.dev → 你的项目 → **Builds** → 下载 `.apk`

## 6.4 安装到 Android 手机

1. 把 APK 传到手机（微信/数据线/网盘）
2. 设置 → 允许安装未知来源
3. 安装 → 打开「心镜」
4. 登录测试完整流程

## 6.5 打正式 AAB（上架用）

```bash
eas build --platform android --profile production
```

---

# 阶段 7：（可选）后续上架

| 平台 | 需要 |
|------|------|
| Google Play | AAB + 开发者账号 $25 |
| 国内安卓商店 | APK/AAB + 软著 + ICP 备案 + 隐私政策 |
| iOS | Apple Developer ¥688/年 + `eas build -p ios` |

---

# 附录 A：Ubuntu 常用运维命令

```bash
# 查看服务状态
pm2 status
pm2 logs soulmirror-api
pm2 logs soulmirror-ai

# 更新代码并重新部署
cd /opt/soulmirror && git pull origin main && bash scripts/server-deploy.sh

# 查看 Docker MongoDB
docker ps

# 重启 Nginx
sudo systemctl reload nginx

# SSL 证书续期（certbot 自动任务，可手动测）
sudo certbot renew --dry-run
```

---

# 附录 B：故障排查

| 现象 | 排查 |
|------|------|
| `ping api.域名` 不通 | 检查 DNS 解析、等待生效 |
| HTTPS 502 | `pm2 status` 看 API 是否运行 |
| 登录 OK 但测试失败 | `pm2 logs soulmirror-ai`，检查 DeepSeek Key |
| App 连不上 API | 确认 eas.json 里 URL 是 `https://` 且域名正确 |
| 备案中无法用 443 | 临时用 IP:3000 内测，备案完再切域名 |

---

# 附录 C：你的专属命令速查

```bash
# GitHub 仓库
https://github.com/heyangshnu/SoulMirror.git

# Mac 推代码
cd ~/Desktop/myProject/SoulMirror && git push

# Ubuntu 部署
ssh root@你的IP
cd /opt/soulmirror && git pull && bash scripts/server-deploy.sh

# 生产 API 验证
curl https://api.soulmirror.cn/v1/tests/catalog

# Mac 模拟生产环境
cd apps/mobile && EXPO_PUBLIC_API_URL=https://api.soulmirror.cn/v1 npx expo start --localhost

# 打 Android 内测包
cd apps/mobile && eas build -p android --profile preview
```

---

*文档版本：2026-05-28 · GitHub: heyangshnu · 服务器: Ubuntu*
