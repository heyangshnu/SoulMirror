# 心镜 SoulMirror · 后端验收通过后操作手册

> **当前状态**：服务器 API + AI 已跑通，5/5 验收通过  
> **域名**：soulzenai.com（API 使用 api.soulzenai.com）  
> **GitHub**：heyangshnu/SoulMirror

---

# 你现在在哪一步

```text
✅ 本地开发
✅ 代码 push GitHub
✅ 服务器部署（3010 / 8010）
✅ 生产验收 5/5
⬜ 域名 DNS + HTTPS          ← 若域名还在审核，可先跳过，用 IP 内测
⬜ Mac / 手机 App 联调
⬜ 打 Android 内测 APK
⬜ 域名 HTTPS 后打正式包
⬜ 上架应用商店（可选）
```

---

# 阶段 A：域名与 HTTPS（域名审核通过后）

## A1. DNS 解析

登录买域名的地方（阿里云/腾讯云等）→ **DNS 解析** → 添加：

| 类型 | 主机记录 | 记录值 | TTL |
|------|----------|--------|-----|
| A | `api` | 你的服务器公网 IP | 600 |

生效验证（Mac 或服务器）：

```bash
ping api.soulzenai.com
# 应显示你的服务器 IP
```

## A2. Nginx 配置

SSH 登录服务器：

```bash
sudo nano /etc/nginx/sites-available/soulmirror
```

粘贴（确认端口是 **3010**）：

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

## A3. HTTPS 证书

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.soulzenai.com
```

按提示：输入邮箱 → 同意条款 → 选自动跳转 HTTPS。

## A4. 公网验收

```bash
curl https://api.soulzenai.com/v1/tests/catalog

cd /opt/soulmirror
bash scripts/verify-production.sh https://api.soulzenai.com/v1
```

必须再次 **5/5 全部通过**。

---

# 阶段 B：域名还没下来 — 用 IP 先测 App

## B1. 云厂商安全组

临时放行 **3010** 端口（仅内测，HTTPS 上线后关闭）。

## B2. Mac 模拟器测试

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile

# 把 YOUR_SERVER_IP 换成真实 IP
EXPO_PUBLIC_API_URL=http://YOUR_SERVER_IP:3010/v1 npx expo start --localhost
```

打开模拟器里的「心镜」→ 登录：

- 手机号：`13800138000`
- 验证码：`123456`（若 NODE_ENV=development 或 SMS_DEV_MODE=true）

## B3. 完整体验路径

1. 登录  
2. 引导页 → 可跳过  
3. 用户画像 → 完成或跳过  
4. **探索 → 塔罗**（最快）  
5. **报告** Tab 查看结果  
6. **心镜** Tab 发消息测试 AI  
7. **我的** Tab 查看账号  

---

# 阶段 C：打 Android 内测 APK

## C1. 确认 API 地址

编辑 `apps/mobile/eas.json`：

**域名已 HTTPS 可用：**

```json
"EXPO_PUBLIC_API_URL": "https://api.soulzenai.com/v1"
```

**域名未就绪，临时用 IP（仅内测）：**

```json
"EXPO_PUBLIC_API_URL": "http://YOUR_SERVER_IP:3010/v1"
```

> ⚠️ 正式分发请用 HTTPS 域名，不要用 HTTP + IP。

提交代码：

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
git add apps/mobile/eas.json
git commit -m "chore: set API URL for mobile build"
git push
```

## C2. 注册 Expo 并登录

```bash
npm install -g eas-cli
eas login
# 没有账号去 https://expo.dev 注册
```

## C3. 关联项目（首次）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
eas init
```

## C4. 打 Android 内测包（APK）

```bash
eas build --platform android --profile preview
```

- 等待约 10～20 分钟  
- 打开 https://expo.dev → 你的账号 → 项目 → **Builds**  
- 下载 `.apk`  

## C5. 安装到 Android 手机

1. 把 APK 传到手机（微信/网盘/数据线）  
2. 设置 → 允许安装未知来源  
3. 安装并打开「心镜」  
4. 登录并走完整流程（同阶段 B3）  

---

# 阶段 D：iOS（可选，需 Apple 开发者 ¥688/年）

```bash
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios
```

通过 **TestFlight** 分发给测试员。  
iOS 不能像 APK 那样随便发文件，必须走 TestFlight 或 App Store。

---

# 阶段 E：日常维护

## 更新后端

```bash
# Mac
git push

# 服务器
ssh root@你的服务器IP
cd /opt/soulmirror
git pull origin main
npm install
npm run api:build
pm2 restart soulmirror-api soulmirror-ai
bash scripts/verify-production.sh http://127.0.0.1:3010/v1
```

## 更新 App（改了前端后）

```bash
cd apps/mobile
eas build -p android --profile preview
# 用户需重新安装新 APK
```

## 常用运维命令

```bash
pm2 list
pm2 logs soulmirror-api --lines 50
pm2 logs soulmirror-ai --lines 50
sudo systemctl status mongod
sudo systemctl reload nginx
```

---

# 阶段 F：上线前合规（国内上架需要）

| 项 | 说明 | 状态 |
|----|------|------|
| 隐私政策页面 | 可访问的 HTTPS 网页 | ⬜ |
| 用户协议 | 同上 | ⬜ |
| ICP 备案 | 大陆服务器 + 域名 | ⬜ 域名审核/备案中 |
| 软件著作权 | 国内安卓商店常要 | ⬜ |
| 真实短信登录 | 去掉 123456，接阿里云/腾讯云短信 | ⬜ |
| 生成式 AI 备案 | 国内 App 可能需要 | ⬜ |

文案定位：**文化娱乐 + 心理自助**，避免「医疗诊断」表述。

---

# 推荐时间线（按你当前进度）

| 时间 | 任务 |
|------|------|
| **今天** | Mac 用 IP 测 App 全流程（阶段 B） |
| **今天/明天** | `eas build` 打 Android APK，真机安装（阶段 C） |
| **域名下来后** | DNS + Nginx + HTTPS（阶段 A） |
| **HTTPS 通过后** | 改 eas.json 为 `https://api.soulzenai.com/v1`，重打 APK |
| **1～2 周后** | 隐私政策、软著、短信、商店上架（阶段 F） |

---

# 快速命令速查

```bash
# 服务器验收
bash /opt/soulmirror/scripts/verify-production.sh http://127.0.0.1:3010/v1
bash /opt/soulmirror/scripts/verify-production.sh https://api.soulzenai.com/v1

# Mac 连服务器测 App
EXPO_PUBLIC_API_URL=http://服务器IP:3010/v1 npx expo start --localhost

# 打 Android 包
cd apps/mobile && eas build -p android --profile preview

# 恢复 PM2（若误删）
pm2 start dist/main.js --name soulmirror-api --cwd /opt/soulmirror/services/api
pm2 start run-prod.sh --name soulmirror-ai --interpreter bash --cwd /opt/soulmirror/services/ai
pm2 save
```

---

*文档版本：2026-05-28 · 后端 5/5 已通过*
