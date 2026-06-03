# 心镜 SoulMirror 本地测试保姆级教程

> 覆盖：紫微斗数（三合/iztro）、邮箱登录、DeepSeek 报告、心镜流式对话、缘分匹配。  
> 适用：Mac（iOS 模拟器 / Android 模拟器 / Web）

---

## 零、你需要什么

| 工具 | 用途 | 检查命令 |
|------|------|----------|
| **Docker Desktop** | 跑 MongoDB | 菜单栏有鲸鱼图标；`docker ps` 不报错 |
| **Node.js 18+** | API + App | `node -v` |
| **Python 3.10+** | AI 服务 | `python3 --version` |
| **DeepSeek API Key** | 报告生成 + 心镜对话 | [platform.deepseek.com](https://platform.deepseek.com) 申请 |

**建议开 4 个终端窗口**，分别命名：`数据库` `AI` `API` `App`。

---

## 一、一次性准备（首次约 20 分钟）

### 1.1 进入项目

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
```

### 1.2 安装 Node 依赖

```bash
npm install
npm run types:build
npm run chart:build
```

### 1.3 配置文件

```bash
# 若还没有 .env，从示例复制
cp services/api/.env.example services/api/.env
cp services/ai/.env.example services/ai/.env
```

**编辑 `services/ai/.env`**（必填，否则报告和对话无法 AI 生成）：

```env
DEEPSEEK_API_KEY=sk-你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=8001
```

**确认 `services/api/.env`** 至少包含：

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/soulmirror
JWT_SECRET=soulmirror-dev-secret-change-in-production
AI_SERVICE_URL=http://localhost:8001
EMAIL_VERIFY_ENABLED=true
EMAIL_DEV_MODE=true
```

> `EMAIL_DEV_MODE=true`：本地不发真实邮件，验证码会打印在 **API 终端日志**里。

### 1.4 Python 虚拟环境（首次）

```bash
cd services/ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 1.5 编译 API（首次或改了后端 TypeScript 后）

```bash
cd services/api
npm run build
cd ../..
```

### 1.6 安装手机 App（三选一）

| 方式 | 命令 | 适合 |
|------|------|------|
| **iOS 模拟器** | `cd apps/mobile && npx expo run:ios` | Mac + Xcode，体验最完整 |
| **Android 模拟器** | `cd apps/mobile && npx expo run:android` | 已装 Android Studio |
| **Web 浏览器** | `cd apps/mobile && npm run web` | 最快看一眼 UI（部分原生能力受限） |

> 第一次 `expo run:ios` 会编译较久（10～20 分钟），之后日常测试不必每次重装。

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

应看到 `mongo` 容器，端口 `27017`，状态 `Up`。

---

### 终端 2：AI 服务（DeepSeek）

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/services/ai
source .venv/bin/activate
./run.sh
```

**验证（新开终端）：**

```bash
curl http://localhost:8001/health
```

应返回：`{"status":"ok"}`

看到 `Application startup complete` 即正常。**不要关这个终端。**

---

### 终端 3：业务 API

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror
npm run api
```

**验证：**

```bash
# 测试目录
curl http://localhost:3000/v1/tests/catalog

# 邮箱登录配置
curl http://localhost:3000/v1/auth/config
```

第二个应返回 `"email_verify_enabled": true`。

**不要关这个终端。**

---

### 终端 4：启动 App

#### 方式 A：iOS 模拟器（推荐）

```bash
open -a Simulator
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
npx expo start --localhost
```

在模拟器里点击 **心镜** 图标。若改了前端代码，保存后会热更新。

#### 方式 B：Web 快速预览

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
npm run web
```

浏览器打开提示的地址（通常 http://localhost:8081）。

#### 方式 C：Android 模拟器

Android 模拟器访问本机 API 要用 `10.0.2.2`，启动前执行：

```bash
cd /Users/heyang/Desktop/myProject/SoulMirror/apps/mobile
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/v1 npx expo start
```

---

## 三、服务关系图

```
手机 App / 浏览器
        │
        ▼  http://localhost:3000/v1  （Android 用 10.0.2.2:3000）
   NestJS API（终端 3）
        │
        ├──► MongoDB（Docker :27017）
        │
        └──► AI 服务（终端 2 :8001）
                    │
                    └──► DeepSeek API（探索报告 + 心镜对话）
```

---

## 四、App 内完整测试清单（约 20 分钟）

### 4.1 邮箱注册 + 登录

1. 打开 App → 进入登录页
2. 点 **注册** Tab
3. 勾选用户协议
4. 邮箱填：`test@local.dev`（任意未注册邮箱）
5. 密码：`123456`（至少 6 位）
6. 点 **获取** 验证码
7. **切到终端 3（API）**，在日志里找类似：

   ```
   [Email dev] register test@local.dev -> 123456
   ```

   把 6 位数字填进验证码框
8. 点 **注册** → 成功后切到 **登录** Tab，用同一邮箱密码登录

> 若注册时提示「AI 服务暂不可用」，先确认终端 2 在跑且 `DEEPSEEK_API_KEY` 已配置（注册本身不依赖 AI，但请确保 API 终端无报错）。

### 4.2 引导与用户画像

- [ ] 引导页可跳过或走完
- [ ] 「我的」→ 完善昵称、年龄段、语气（可选）

### 4.3 探索 · DeepSeek 实时报告（四种都测一遍）

每种测试提交后需 **等待 10～30 秒**（DeepSeek 正在写报告）。

| 测试 | 操作 | 预期 |
|------|------|------|
| **塔罗** | 探索 → 塔罗 → 选领域 → 抽牌 | 报告 Tab 出现新报告，得分非固定 78 |
| **八字** | 探索 → 八字 → 填生日时间 → 生成 | 章节内容个性化，得分每次可能不同 |
| **MBTI** | 探索 → MBTI → 答 28 题 | 报告含类型解读 + 动态得分 |
| **手相** | 探索 → 手相 → 上传或跳过 | AI 生成掌纹解读（当前为文字推断，非识图） |

**验证 DeepSeek 真的生效：**

- 同一测试做两次，**得分或正文应有差异**
- 报告详情页圆环下方有 `scoreLabel` 关键词（非固定 Zenith/Harmony）

**命令行快速测八字（需先登录拿 token）：**

```bash
# 1. 登录拿 token
TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@local.dev","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# 2. 提交八字（约 15～30 秒）
curl -s -X POST http://localhost:3000/v1/tests/bazi/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1995-06-15","birthTime":"10:30","gender":"female","calendar":"solar"}' | python3 -m json.tool
```

返回 JSON 里应有 `"score": 数字` 和多段 `"sections"`，且 `raw.llmGenerated` 为 `true`。

### 4.4 心镜 · 流式对话

1. 点 **心镜** Tab
2. 输入：`最近工作压力很大，睡不着`
3. 点发送

**预期：** 回复 **逐字出现**（不是等很久一次性弹出整段）。

**命令行测流式（可选）：**

```bash
# 先创建会话
SESSION=$(curl -s -X POST http://localhost:3000/v1/bot/sessions \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['_id'])")

# 流式请求（应看到 data: {"delta":"..."} 一行行输出）
curl -N -X POST "http://localhost:3000/v1/bot/sessions/$SESSION/messages/stream" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"你好"}'
```

### 4.5 缘分 · 磁场匹配 + 好友聊天

> 需要 **至少完成 1 项探索测试**，且最好有 **两个账号** 互相测试。

**账号 A：**

1. 完成一项探索（如塔罗）
2. **缘分** Tab → 打开 **开启磁场匹配**
3. **发现** 里应出现其他已开启的用户（本地只有你自己时列表为空，正常）

**账号 B（第二个邮箱注册，如 `test2@local.dev`）：**

1. 同样完成探索 + 开启匹配
2. 在 **发现** 里应看到账号 A，显示昵称、得分、契合度 %
3. 点 **申请聊天**

**回到账号 A：**

1. **缘分** → **申请** Tab → 看到 B 的申请 → 点 **通过**
2. **好友** Tab → 出现 B → 点击进入 **一对一聊天**

---

## 五、用 curl 做全套 API 冒烟（不打开 App）

复制整段执行（把邮箱改成你注册的）：

```bash
BASE=http://localhost:3000/v1
EMAIL=test@local.dev
PASS=123456

echo "=== 1. 配置 ==="
curl -s $BASE/auth/config | python3 -m json.tool

echo "=== 2. 登录 ==="
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))")

if [ -z "$TOKEN" ]; then echo "登录失败，请先按第四节注册"; exit 1; fi
echo "Token OK"

echo "=== 3. 塔罗报告（DeepSeek）==="
curl -s -X POST $BASE/tests/tarot/draw \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"general"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('score:', d.get('score'), 'title:', d.get('title'))"

echo "=== 4. 报告列表 ==="
curl -s $BASE/reports -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; r=json.load(sys.stdin); print('报告数:', len(r) if isinstance(r,list) else r)"

echo "=== 5. 缘分状态 ==="
curl -s $BASE/social/discover/status -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo "=== 完成 ==="
```

---

## 六、常见问题

### Q1：`curl localhost:8001` 连不上

终端 2 没启动。执行：

```bash
cd services/ai && source .venv/bin/activate && ./run.sh
```

### Q2：探索报告一直「AI 服务暂不可用」或得分固定 75

1. `services/ai/.env` 里 **`DEEPSEEK_API_KEY` 是否填写**
2. 终端 2 AI 是否在跑：`curl http://localhost:8001/health`
3. `services/api/.env` 里 **`AI_SERVICE_URL=http://localhost:8001`**（不是 8010）
4. 改 `.env` 后 **Ctrl+C 重启 AI 和 API**

### Q3：注册时收不到验证码

本地开发 **不会发邮件**。看 **终端 3（API）** 日志：

```
[Email dev] register your@email.com -> 123456
```

或临时关闭邮箱验证：在 `services/api/.env` 设 `EMAIL_VERIFY_ENABLED=false`，重启 API 后直接注册（无需验证码）。

### Q4：App 登录/网络错误

| 运行环境 | API 地址 |
|----------|----------|
| iOS 模拟器 | 默认 `http://localhost:3000/v1`，一般不用改 |
| Android 模拟器 | `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/v1` |
| 真机 | 电脑局域网 IP，如 `http://192.168.1.100:3000/v1` |

验证 API：`curl http://localhost:3000/v1/tests/catalog`

### Q5：`docker ps` 没有 mongo

1. 打开 Docker Desktop（鲸鱼图标 Running）
2. `npm run docker:up`

没有 Docker 时，可本机装 MongoDB：`brew install mongodb-community && brew services start mongodb-community`

### Q6：心镜对话不流式、一直转圈

1. 确认 API 已重新编译：`cd services/api && npm run build`
2. 重启 `npm run api`
3. 用 curl 测第四节 4.4 的流式命令

### Q7：缘分「发现」列表为空

- 需 **≥2 个用户** 都完成了探索测试且都 **开启了磁场匹配**
- 已是好友或已有待处理申请的用户不会出现在发现列表

### Q8：改了后端代码不生效

```bash
# API（TypeScript）
cd services/api && npm run build
# 终端 3 Ctrl+C 后重新 npm run api

# AI（Python，run.sh 带 --reload 一般自动重载）
# 若没生效，终端 2 Ctrl+C 后重新 ./run.sh
```

---

## 七、测试结束 · 关闭环境

```bash
# 各终端 Ctrl+C 停止 AI、API、Metro

cd /Users/heyang/Desktop/myProject/SoulMirror
npm run docker:down
```

---

## 八、每日最短启动清单（复制用）

```bash
# 终端 1 - 数据库
cd ~/Desktop/myProject/SoulMirror && npm run docker:up

# 终端 2 - AI
cd ~/Desktop/myProject/SoulMirror/services/ai && source .venv/bin/activate && ./run.sh

# 终端 3 - API
cd ~/Desktop/myProject/SoulMirror && npm run api

# 终端 4 - App（iOS）
cd ~/Desktop/myProject/SoulMirror/apps/mobile && npx expo start --localhost
# 然后 open -a Simulator → 点心镜
```

**快速路径：** 注册 → 看 API 日志验证码 → 登录 → **探索 → 紫微建档 → 本命报告** → 大限/流年 → 关系人 → 语音日记 → 心镜发消息 → 同步聊天摘要。

### 8.1 紫微功能验收清单

| 步骤 | App 操作 | 预期 |
|------|----------|------|
| 1 | 探索 → **紫微斗数** | 建档页：阳历/农历、真太阳时、时辰未知警告 |
| 2 | 保存并生成本命报告 | 报告无分数环，仅 themeLabel + 文字章节 |
| 3 | 探索 → **大限·流年** | 显示大限区间与流年宫位，可生成报告 |
| 4 | **关系人** | 添加 ≤6 人，生成关系报告（含飞星附录章节） |
| 5 | **语音日记** | 文字保存成功；可选配置 `OPENAI_API_KEY` 启用 Whisper |
| 6 | **心镜** 聊几句 → 语音日记页「同步聊天摘要」 | 对话可引用命盘背景 |
| 7 | 辅助测试 MBTI/塔罗/手相 | 仍可正常使用 |

**命令行冒烟（API 已启动时）：**

```bash
chmod +x scripts/verify-local.sh
./scripts/verify-local.sh
```

规格详见 [ZIWEI_SPEC.md](./ZIWEI_SPEC.md)。

---

*文档版本：2026-05-28 · 含紫微斗数 / 邮箱登录 / DeepSeek 报告 / 流式对话 / 缘分匹配*
