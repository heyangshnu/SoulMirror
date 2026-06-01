# 心镜 SoulMirror 本地测试保姆级教程

> 适用：Mac + Docker + Xcode，iOS 模拟器体验完整功能。

---

## 零、你会用到什么

| 工具 | 干什么 | 怎么确认已装好 |
|------|--------|----------------|
| Docker Desktop | 跑 MongoDB | 菜单栏有鲸鱼图标，`docker ps` 不报错 |
| Node.js | 跑 API 和 App | `node -v` 有版本号 |
| Python 3 | 跑 AI 服务 | `python3 --version` |
| Xcode | iOS 模拟器 | `xcodebuild -version` 有输出 |

**需要开 4 个终端**，建议用 iTerm/终端分屏，分别命名为：`数据库` `AI` `API` `App`。

---

## 一、一次性准备（只做一次）

### 1.1 进入项目

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
```

### 1.2 安装依赖

```bash
npm install
cd packages/shared-types && npm run build && cd ../..
```

### 1.3 配置文件

```bash
# API 配置（若还没有）
cp services/api/.env.example services/api/.env

# AI 配置（若还没有）
cp services/ai/.env.example services/ai/.env
```

编辑 `services/ai/.env`，填入 DeepSeek Key（可选，不填也能测，只是用模板回复）：

```env
DEEPSEEK_API_KEY=sk-你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=8001
```

### 1.4 Python 虚拟环境（只做一次）

```bash
cd services/ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 1.5 iOS 原生工程（只做一次，约 10～20 分钟）

```bash
cd apps/mobile
brew install cocoapods    # 若 pod 命令不存在
npx expo run:ios          # 第一次会编译很久，成功后模拟器里会有 App
cd ../..
```

> 之后日常测试不必每次 `run:ios`，见下文「方式 A / 方式 B」。

---

## 二、每次测试：按顺序启动 4 个服务

### 终端 1：数据库

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
npm run docker:up
```

**验证：**

```bash
docker ps
```

应看到 `mongo` 容器，`STATUS` 为 `Up`，端口 `27017`。

---

### 终端 2：AI 服务

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/services/ai
source .venv/bin/activate
./run.sh
```

**验证（新开一个终端）：**

```bash
curl http://localhost:8001/health
```

应返回：`{"status":"ok"}`

> **保持此终端不关**，看到 `Application startup complete` 即正常。

---

### 终端 3：业务 API

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
npm run api
```

**验证（新开一个终端）：**

```bash
curl http://localhost:3000/v1/tests/catalog
```

应返回 JSON，里面有 `bazi`、`mbti` 等测试项。

再测登录接口：

```bash
curl -X POST http://localhost:3000/v1/auth/sms/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'
```

应返回 `success: true`，开发环境验证码固定 **`123456`**。

> **保持此终端不关**。

---

### 终端 4：启动 App

#### 方式 A：已 `expo run:ios` 编译过（推荐）

模拟器里已有「心镜」图标时：

1. 打开模拟器：`open -a Simulator`
2. 点击 **心镜** 图标打开 App

若改了前端代码需要热更新：

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
npx expo start --localhost
```

保持 Metro 运行，在已安装的 App 里会自动连上（或重新点开 App）。

#### 方式 B：重新编译安装（改了原生依赖时）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
npx expo run:ios
```

#### 方式 C：仅看 Web 界面（最快，功能不完整）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
npm run web
```

浏览器打开 http://localhost:8081

---

## 三、App 内完整测试流程（约 10 分钟）

按顺序操作，每步打勾：

- [ ] **1. 登录**  
  - 手机号：`13800138000`（任意 11 位均可）  
  - 验证码：`123456`

- [ ] **2. 引导页**  
  - 可点「跳过」或走完 3 屏

- [ ] **3. 用户画像**  
  - 选年龄段、语气，点「完成」（或「稍后再说」）

- [ ] **4. 探索 → 塔罗**（最快）  
  - 选领域 → 「洗牌并抽牌」→ 等待报告

- [ ] **5. 报告 Tab**  
  - 应看到刚生成的报告，点进去有紫色圆环和分章节内容

- [ ] **6. 心镜 Tab**  
  - 发消息如「最近有点焦虑」，应有 AI 回复

- [ ] **7. 我的 Tab**  
  - 能看到昵称等信息

- [ ] **8.（可选）再测 MBTI**  
  - 探索 → MBTI → 答完 28 题 → 报告

---

## 四、服务关系图

```
iOS 模拟器「心镜」App
        │
        ▼  http://localhost:3000/v1
   NestJS API（终端 3）
        │
        ├──► MongoDB（Docker，终端 1）
        │
        └──► AI 服务（终端 2，:8001）
                    │
                    └──► DeepSeek API（可选，.env 里配 Key）
```

---

## 五、常见问题

### Q1：`curl localhost:8001` 连不上

AI 没启动。去终端 2 执行 `./run.sh`，等 `Application startup complete`。

### Q2：登录失败 / 网络错误

1. 确认终端 3 API 在跑  
2. iOS 模拟器用 `localhost` 即可，**不必**设 `EXPO_PUBLIC_API_URL`  
3. 执行：`curl http://localhost:3000/v1/tests/catalog`

### Q3：测试提交失败

API 连不上 AI。确认终端 2 在跑，且 `services/api/.env` 里：

```env
AI_SERVICE_URL=http://localhost:8001
```

### Q4：`docker ps` 没有 mongo

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
npm run docker:up
```

确认 Docker Desktop 已打开（鲸鱼图标 Running）。

### Q5：模拟器没有 App Store / Expo Go

**不要用 Expo Go**，用已编译的「心镜」App（`npx expo run:ios`）。

### Q6：`expo start --ios` 报 Request timed out

改用：

```bash
npx expo start --localhost
```

然后直接点模拟器里已安装的「心镜」图标。

### Q7：DeepSeek 没生效

1. 检查 `services/ai/.env` 里 `DEEPSEEK_API_KEY`  
2. **重启** AI 服务（终端 2 Ctrl+C 再 `./run.sh`）

### Q8：CocoaPods 安装失败

```bash
brew install cocoapods
pod --version
cd apps/mobile && npx expo run:ios
```

---

## 六、测试结束后关闭

```bash
# 各终端 Ctrl+C 停掉 AI、API、Metro

# 停数据库
cd /Users/heyang/Desktop/myProject/SoulMirror
npm run docker:down
```

---

## 七、每日最短启动清单（复制用）

```bash
# 终端 1
cd ~/Desktop/myProject/SoulMirror && npm run docker:up

# 终端 2
cd ~/Desktop/myProject/SoulMirror/services/ai && source .venv/bin/activate && ./run.sh

# 终端 3
cd ~/Desktop/myProject/SoulMirror && npm run api

# 终端 4（可选，要热更新时）
cd ~/Desktop/myProject/SoulMirror/apps/mobile && npx expo start --localhost

# 然后：open -a Simulator → 点「心镜」→ 登录 13800138000 / 123456
```

---

*文档版本：2026-05-28*
