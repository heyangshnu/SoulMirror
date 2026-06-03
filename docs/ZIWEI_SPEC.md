# 紫微斗数产品规格（心镜 SoulMirror）

## 已确认决策

| 项 | 决策 |
|----|------|
| 流派 | 三合 + iztro（`@soulmirror/chart`） |
| 历法 | 阳历为主，支持农历 |
| 时辰不详 | 允许「未知」，默认午时，UI 警告 |
| 真太阳时 | 首版启用（出生地经度校正） |
| 探索页 | 紫微为主，MBTI/塔罗/手相辅助 |
| 报告语气 | 治愈向，忌→课题 |
| 得分 | 紫微报告无分数，仅 themeLabel + 文字 |
| 流年粒度 | 到年（流月为进阶） |
| 付费 | 内测全免费 |
| 关系人 | 配偶/子女/父母/兄弟姐妹，上限 6 |
| 飞星四化 | P2 附录（流年/关系报告） |
| 语音日记 | ASR（OPENAI_API_KEY 可选 Whisper） |
| 聊天摘要 | 写入 life_context，注入命盘与心镜 |

## 架构

```
Mobile → API (NestJS) → @soulmirror/chart (iztro 排盘)
                      → AI (Python/DeepSeek) 仅解读 JSON
```

排盘不在 LLM 中完成；AI 只接收结构化命盘数据。

## API 端点（`/v1/chart`）

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/birth-profile` | 建档（一次） |
| GET | `/birth-profile` | 查询命盘 |
| GET | `/horoscope?year=` | 大限/流年结构 |
| POST | `/reports/natal` | 本命报告 |
| POST | `/reports/daxian` | 大限报告 |
| POST | `/reports/liunian` | 流年报告 `{ year? }` |
| GET/POST/DELETE | `/relations` | 关系人 CRUD（≤6） |
| POST | `/relations/:id/report` | 关系报告 + 飞星附录 |
| GET | `/life-context` | 生活背景 |
| PUT | `/weekly-focus` | 本周焦点 |
| POST | `/voice-diary` | 日记 `{ text \| audioBase64 }` |
| POST | `/chat-summary` | 从最近 bot 会话摘要 |

## 四阶段交付

- **P0**：chart 包、建档、本命报告、探索页重构、无分数报告、心镜注入 chart_context
- **P1**：大限/流年时间轴 UI + 报告
- **P2**：关系人 + 飞星四化附录
- **P3**：语音日记 + 聊天摘要 → life_context

## 本地验证

见 [LOCAL_TESTING.md](./LOCAL_TESTING.md) 第八节，或运行：

```bash
chmod +x scripts/verify-local.sh
./scripts/verify-local.sh
```
