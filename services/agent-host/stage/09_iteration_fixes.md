# Stage 09 Iteration Fixes

Status: active

This file records issues found during deterministic validation, container validation, and real Tesla live runs.

## ISSUE-001

发现于：`npm run validate:biography100`

问题：早期模拟验证把“原文保留”误判为“用户话语必须以‘我’或‘你说’开头”。

修改：检查 `user_message` 是否为非空字符串；原文保留由日志字段完整保存。

状态：fixed

## ISSUE-002

发现于：第一次真实 live run

问题：Host 直接调用的 Agent 文件是 `mode: subagent`，Claude Code 回退到默认 Agent 行为。

修改：全部改为 `mode: primary`，静态验证禁止 `mode: subagent`。

状态：fixed

## ISSUE-003

发现于：第一次真实 live run

问题：并发 Fuxi 节点共享同一个 Claude Code 状态目录，出现 SQLite migration 冲突。

修改：按 `slug + agent/sessionKey` 隔离 Claude Code state；Fuxi 节点使用 stateless run key。

状态：fixed

## ISSUE-004

发现于：Fuxi 初始化失败后的流程

问题：Fuxi 节点失败后，Host 仍继续调用 Bodhisattva 开场。

修改：16 个基础节点任一失败时 emit `fuxi_init_failed` 并停止后续对话。

状态：fixed

## ISSUE-005

发现于：长时间 live run 后 Docker 状态

问题：容器 writable layer 膨胀并触发 `ENOSPC`。

修改：将 `HOME`、`TMPDIR`、`XDG_CACHE_HOME`、Bun/NPM cache 全部定向到 `/app/runtime`；增加 stream error handler。

状态：fixed

## ISSUE-006

发现于：16 个 Fuxi 节点同时启动

问题：重模型初始化对容器资源压力过高。

修改：`FUXI_INIT_CONCURRENCY` 默认设为 `5`，只做容器背压，不减少 16 个节点。

状态：fixed

## ISSUE-007

发现于：live harness

问题：初始化阶段会被单个节点的中间 `agent_error` 提前打断，无法看到整体 `fuxi_init_failed`。

修改：初始化阶段只等待 `fuxi_init_done` 或 `fuxi_init_failed`。

状态：fixed

## ISSUE-008

发现于：测试语料审查

问题：早期问句过像系统测试提示，不像真实用户。

修改：增加 `docs/USER_EXPRESSION_RESEARCH.md` 和 100 条 Tesla 第一人称真实中文表达 fixture；静态验证禁止内部测试词。

状态：fixed

## ISSUE-009

发现于：真实 Fuxi/Claude Code provider call

问题：Ark 认证或订阅错误导致 Fuxi 初始化失败。

修改：不绕过、不 mock、不自动换 provider；页面和事件流保留 `fuxi_init_failed`。

状态：fixed-by-config

## ISSUE-010

发现于：第二次真实 live run

问题：虽然 `/app/runtime` 是 volume，container writable layer 仍快速膨胀。

修改：Claude Code 子进程 `cwd` 改为本轮 runtime workspace；entrypoint 增加 `ulimit -c 0`；静态验证覆盖。

状态：fixed

## ISSUE-011

发现于：Ark 认证失败 live run

问题：认证失败后继续排队剩余 Fuxi 节点没有价值。

修改：Fuxi 初始化遇到 fatal provider/config error 后 emit `fuxi_init_aborted`，未启动节点标记 skipped，最终 `fuxi_init_failed`。

状态：fixed

## ISSUE-012

发现于：第二次真实 live run 的 `agent-events.jsonl`

问题：WebSocket 事件顺序正确，但 `agent-events.jsonl` 中个别事件因异步 `appendFile` 竞争而顺序颠倒。

修改：按 `runRoot` 增加事件写入队列，所有 `agent-events.jsonl` 写入串行化。

状态：fixed

## ISSUE-013

发现于：最终确认 live run

问题：宿主机是 `arm64`，旧私有基础镜像只有 `amd64/linux`，Claude Code 在 emulation 下出现 `SIGILL`。

修改：默认基础镜像改为原生多架构 `node:22-trixie`；删除默认 `linux/amd64` platform 约束；保留 signal fatal abort。

状态：fixed

## ISSUE-014

发现于：L0 / Fuxi 设计审计

问题：Fuxi 初始化没有把“排盘事实资产”作为不可绕过的硬前置，存在各节点各自排盘或缺少共同 `chart_asset_id` 的风险。

修改：新增 Chart Asset step；写入 `01_命/_chart_assets/`、`L0_排盘事实档案.md`、`L0_模型事实上下文.md`；Fuxi 节点引用同一个 `chart_asset_id`。

验证：`npm run validate:chart` 通过；`tesla-demo` 生成 `chart_75c85fb5cf44644091e7008a`。

状态：fixed

## ISSUE-015

发现于：容器启动后的写入检查

问题：历史 volume 属于旧 uid，`smqt` 用户不能写 `/app/runtime` 和 `/app/memory-projects`。

修改：entrypoint 以 root 创建并 `chown` runtime/memory volume，再用 `gosu smqt` 降权启动 Node Host。

状态：fixed

## ISSUE-016

发现于：用户复核 Ark 配置

问题：Fuxi 曾被配置到 CodingPlan URL / router，而用户提供的是 Agent Plan 配置。

修改：Fuxi 默认模型改为 `deepseek-v4-pro`；Anthropic base URL 使用 `https://ark.cn-beijing.volces.com/api/plan`；OpenAI-compatible base URL 保留 `/api/plan/v3`；key 只走环境变量。

状态：fixed

## ISSUE-017

发现于：Tesla live run turn 81

问题：功曹在登记罗汉回执时出现长时间静默，测试无法判断是模型慢、工具卡住还是进程挂死。

修改：Claude Code runner 增加 role-level hard timeout、process-group `SIGTERM`、10 秒后 `SIGKILL`；Host 按角色传入默认 timeout。

验证：`npm run typecheck`、`npm run validate:static`、`docker compose build` 通过；恢复后完成 turns 82-100。

状态：fixed

## ISSUE-018

发现于：Tesla live run turn 82

问题：愿罗汉在 `memory_list_notes` 后使用 Claude Code built-in `Read` 读取 person memory 路径。

修改：四个罗汉 Agent prompt 和 Host batch prompt 增加路径读取流程：任何 note path 都作为 `memory.read_note` 参数使用；运行层继续把 built-in `Read` 作为 contract error。

验证：重跑 turn 82 后，罗汉均使用 `mcp__fate_memory__memory_read_note`；最终 turns 82-100 `contractErrors: 0`。

状态：fixed

## ISSUE-019

发现于：Tesla live run turns 82-100

问题：随着 Basic Memory 增长，后台处理速度明显变慢，尤其是功曹回执登记和部分罗汉读写。

证据：

```text
gongcao 111232ms
gongcao 104247ms
gongcao 103269ms
luohan-wish 102116ms
luohan-relation 93495ms
```

后续方向：

- 为功曹增加轻量 route index，不让 `routing-memory.md` 无限膨胀。
- 为每个罗汉维护 `_network/index.md` 和 active summary/context pack。
- 页面区分 receipt touched paths 与 broad memory diff。

状态：open-performance
