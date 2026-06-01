# 心镜 SoulMirror

融合八字、MBTI、塔罗、手相的精神抚慰平台 — iOS / Android 双端 App。

## 项目结构

```
SoulMirror/
├── apps/mobile/          # Expo React Native 客户端
├── services/api/         # NestJS 业务 API
├── services/ai/          # Python FastAPI AI 编排
├── packages/shared-types # 共享 TypeScript 类型
└── docs/                 # 文档
```

## 快速开始

### 1. 安装依赖

```bash
npm install
cd packages/shared-types && npm run build
```

### 2. 启动基础设施（MongoDB + Redis）

```bash
npm run docker:up
```

### 3. 配置环境变量

```bash
cp services/api/.env.example services/api/.env
cp services/ai/.env.example services/ai/.env
# 可选：在 services/ai/.env 填入 DEEPSEEK_API_KEY 启用 AI 扩写
```

### 4. 启动 AI 服务（端口 8001）

```bash
cd services/ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
chmod +x run.sh && ./run.sh
```

### 5. 启动 API（端口 3000）

```bash
npm run api
```

### 6. 启动移动端

```bash
npm run mobile
# iOS 模拟器
cd apps/mobile && npm run ios
# Android 模拟器
cd apps/mobile && npm run android
```

## 开发说明

| 服务 | 地址 |
|------|------|
| API | http://localhost:3000/v1 |
| AI | http://localhost:8001 |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |

- **登录**：开发环境验证码固定为 `123456`
- **Android 模拟器**访问本机 API 使用 `10.0.2.2:3000`
- **真机调试**需设置 `EXPO_PUBLIC_API_URL=http://<你的电脑IP>:3000/v1`

## 设计规范

- 主色：**疗愈紫** `#7C6CF0`
- 风格：简约、留白、大圆角卡片

## 核心功能

- [x] 四种测试（八字 / MBTI / 塔罗 / 手相）
- [x] 结构化测试报告
- [x] 专属 AI 机器人对话
- [x] 用户画像与隐私（匿名模式、一键删号）
- [x] 心理危机关键词预警
- [ ] 付费订阅（Phase 2）
- [ ] 纪念日模块（Phase 2）

## 文档

详见 [docs/IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)
