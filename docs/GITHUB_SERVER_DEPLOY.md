# 心镜 SoulMirror · GitHub + 云服务器 + 安装包 保姆级教程

> 适用：Mac 本地开发 + GitHub 管理代码 + 一台 Linux 云服务器部署后端 + EAS 云端打 Android/iOS 安装包。

---

## 先理解分工（很重要）

| 做什么 | 在哪里做 |
|--------|----------|
| 写代码、push GitHub | 你的 Mac |
| 跑 API + AI + MongoDB | **云服务器** |
| 打 **Android APK/AAB** | **Expo EAS 云端**（Mac 或服务器触发均可） |
| 打 **iOS IPA** | **Expo EAS 云端**（Linux 服务器无法本地编 iOS） |

**结论**：云服务器负责 **后端**；手机安装包用 **EAS Build** 在 Expo 云端编译，不是在 VPS 上 `gcc` 编译 App。

---

# 第一部分：把项目 push 到 GitHub

## 1.1 在 GitHub 创建仓库

1. 打开 https://github.com/new
2. Repository name：`SoulMirror`（或你喜欢的名字）
3. 选 **Private**（推荐，避免泄露业务代码）
4. **不要**勾选 "Add a README"（本地已有代码）
5. 点 **Create repository**

记下仓库地址，例如：

```text
https://github.com/你的用户名/SoulMirror.git
```

---

## 1.2 本地 Mac 初始化 Git 并 push

在终端执行（路径改成你的）：

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror

# 初始化 git
git init
git branch -M main

# 确认 .env 不会被提交（已在 .gitignore）
git status
# 不应看到 services/api/.env、services/ai/.env

# 首次提交
git add .
git commit -m "Initial commit: SoulMirror MVP"

# 关联远程仓库（替换成你的地址）
git remote add origin https://github.com/你的用户名/SoulMirror.git

# 推送
git push -u origin main
```

### 若 push 时要登录 GitHub

- **HTTPS**：用 Personal Access Token 当密码  
  生成：https://github.com/settings/tokens
- **SSH**（推荐长期使用）：
  ```bash
  ssh-keygen -t ed25519 -C "your@email.com"
  cat ~/.ssh/id_ed25519.pub   # 复制到 GitHub → Settings → SSH keys
  git remote set-url origin git@github.com:你的用户名/SoulMirror.git
  git push -u origin main
  ```

---

## 1.3 以后日常更新代码

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
git add .
git commit -m "描述你的改动"
git push
```

---

# 第二部分：云服务器部署后端

假设服务器：**Ubuntu 22.04**，有 root 或 sudo 权限，已绑定域名（例如 `api.example.com`）。

## 2.1 SSH 登录服务器

```bash
ssh root@你的服务器IP
# 或
ssh ubuntu@你的服务器IP
```

---

## 2.2 首次安装环境

```bash
# 在服务器上
sudo apt update && sudo apt install -y git

# clone 仓库（替换成你的 GitHub 地址）
sudo mkdir -p /opt/soulmirror
sudo chown $USER:$USER /opt/soulmirror
git clone https://github.com/你的用户名/SoulMirror.git /opt/soulmirror
cd /opt/soulmirror

# 运行一键环境脚本
chmod +x scripts/server-setup.sh
bash scripts/server-setup.sh
```

`server-setup.sh` 会安装：Node.js 20、Python3、Docker、PM2、Nginx、EAS CLI。

> 安装 Docker 后若提示权限，**退出 SSH 重新登录**一次。

---

## 2.3 配置生产环境变量

**不要**把 `.env` 提交到 GitHub。在服务器上手动创建：

### API 配置

```bash
nano /opt/soulmirror/services/api/.env
```

内容示例：

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/soulmirror
JWT_SECRET=请换成至少32位随机字符串
AI_SERVICE_URL=http://127.0.0.1:8001
NODE_ENV=production
```

### AI 配置

```bash
nano /opt/soulmirror/services/ai/.env
```

内容示例：

```env
DEEPSEEK_API_KEY=sk-你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=8001
```

---

## 2.4 首次部署后端

```bash
cd /opt/soulmirror
chmod +x scripts/server-deploy.sh
bash scripts/server-deploy.sh
```

验证：

```bash
curl http://127.0.0.1:3000/v1/tests/catalog
curl http://127.0.0.1:8001/health
```

---

## 2.5 配置 Nginx + HTTPS（对外提供 API）

```bash
sudo nano /etc/nginx/sites-available/soulmirror
```

写入（把 `api.example.com` 改成你的域名）：

```nginx
server {
    listen 80;
    server_name api.example.com;

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

启用并重载：

```bash
sudo ln -sf /etc/nginx/sites-available/soulmirror /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

申请免费 SSL（Let's Encrypt）：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

验证公网 API：

```bash
curl https://api.example.com/v1/tests/catalog
```

---

## 2.6 以后更新后端（pull + 重新部署）

```bash
cd /opt/soulmirror
git pull origin main
bash scripts/server-deploy.sh
```

---

# 第三部分：制作手机安装包

## 3.1 修改 App 里的生产 API 地址

编辑 `apps/mobile/eas.json`，把 `EXPO_PUBLIC_API_URL` 改成你的正式域名：

```json
"EXPO_PUBLIC_API_URL": "https://api.example.com/v1"
```

改完后 **commit 并 push**：

```bash
git add apps/mobile/eas.json
git commit -m "chore: set production API URL"
git push
```

---

## 3.2 注册 Expo 并关联项目

在 **Mac** 或 **服务器** 上均可（只需 Node.js）：

```bash
npm install -g eas-cli
eas login          # 注册 https://expo.dev
cd apps/mobile
eas init           # 关联 Expo 项目
```

---

## 3.3 打 Android 内测包（APK，可直接装手机）

```bash
cd apps/mobile
eas build --platform android --profile preview
```

或项目根目录：

```bash
bash scripts/build-mobile.sh preview android
```

- 构建在 **Expo 云端**进行（约 10～20 分钟）
- 完成后终端会给下载链接，或打开 https://expo.dev 下载 **.apk**
- 传到 Android 手机安装即可

---

## 3.4 打 Android 正式包（AAB，上传应用商店）

```bash
eas build --platform android --profile production
```

产物是 **.aab**，用于 Google Play 或部分国内商店。

---

## 3.5 打 iOS 包（IPA，TestFlight / App Store）

**需要 Apple Developer 账号（¥688/年）**

```bash
cd apps/mobile
eas build --platform ios --profile production
```

首次会引导配置证书（选 **Let EAS handle** 最省事）。

内测分发：

```bash
eas submit --platform ios
```

上传到 **TestFlight**，邀请测试员安装。

> **iOS 无法在 Linux 服务器本地编译**，必须通过 EAS 云端或 Mac + Xcode。

---

## 3.6 在服务器上触发打包（可选）

服务器已装 EAS CLI 时：

```bash
cd /opt/soulmirror
git pull
bash scripts/build-mobile.sh preview android
```

需先在服务器执行 `eas login` 登录同一 Expo 账号。

---

# 第四部分：完整流程图

```text
[Mac 开发]
    │
    ├─ git push ──► [GitHub 仓库]
    │                    │
    │                    ▼ git pull
    │              [云服务器 /opt/soulmirror]
    │                    │
    │                    ├─ Docker: MongoDB
    │                    ├─ PM2: NestJS API :3000
    │                    ├─ PM2: FastAPI AI :8001
    │                    └─ Nginx: https://api.example.com
    │
    └─ eas build ──► [Expo 云端编译]
                           │
                           ├─ Android APK/AAB
                           └─ iOS IPA
                                    │
                                    ▼
                              [用户手机安装]
                              App 连接 https://api.example.com/v1
```

---

# 第五部分：Checklist

## 上线前必做

- [ ] GitHub 仓库已创建，`.env` 未提交
- [ ] 服务器 `services/api/.env`、`services/ai/.env` 已配置
- [ ] `JWT_SECRET` 已换成强随机串
- [ ] 域名 + HTTPS 已配置
- [ ] `eas.json` 里 `EXPO_PUBLIC_API_URL` 指向正式 API
- [ ] 短信登录接入真实服务商（生产不能用 123456）
- [ ] 隐私政策 / 用户协议 URL 可访问

## 账号准备

- [ ] GitHub 账号
- [ ] Expo 账号（https://expo.dev）
- [ ] Apple Developer（iOS 上架）
- [ ] Google Play 开发者（Android 海外）
- [ ] 国内安卓商店：软著、ICP 等（若面向国内）

---

# 第六部分：常见问题

### Q：能在服务器上直接编译出 APK 吗？

可以触发 **EAS 云端构建**（`eas build`），不是在 VPS 上跑 Android Studio。这是 Expo 项目推荐方式。

### Q：服务器需要多大配置？

MVP 建议 **2 核 4G** 起。MongoDB + API + AI 同机可跑。

### Q：git pull 后 App 会自动更新吗？

不会。后端 `server-deploy.sh` 会更新 API；**App 需重新 `eas build` 并让用户安装新版本**。

### Q：私钥、.env 怎么同步到服务器？

**不要通过 Git 同步**。在服务器手动创建，或用 SSH scp 复制：

```bash
scp services/api/.env user@服务器IP:/opt/soulmirror/services/api/.env
scp services/ai/.env user@服务器IP:/opt/soulmirror/services/ai/.env
```

---

# 第七部分：命令速查

```bash
# === Mac：推代码 ===
git add . && git commit -m "update" && git push

# === 服务器：更新后端 ===
cd /opt/soulmirror && git pull && bash scripts/server-deploy.sh

# === Mac/服务器：打 Android 内测 APK ===
cd apps/mobile && eas build -p android --profile preview

# === Mac：打 iOS ===
cd apps/mobile && eas build -p ios --profile production
```

---

*文档版本：2026-05-28*
