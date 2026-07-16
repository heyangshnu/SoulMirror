# Runtime Audit

本原型的验收重点是链路可复盘，不是页面好看。

## Runtime Boundaries

Host 可以做：

- HTTP / WebSocket。
- 创建 slug project。
- 执行确定性的 L0 chart asset step。
- 启动 Claude Code agent。
- 按功曹路由结果调度罗汉/伏羲。
- 记录事件流、turns、tool-calls、memory diff、transcript。

Host 不可以做：

- 判断用户问题属于哪个领域。
- 判断哪条信息值得入库。
- 生成命理解读。
- 修改愿/境/缘/力长期记忆。
- 进行业务判断式 provider 切换。唯一允许的 fallback 是 Host 记录 `provider_fallback` 后，把菩萨/功曹/罗汉从 MiniMax M3 改跑 Ark `ark-code-latest`。

## Event Stream

`/{slug}` 页面必须能看到：

```text
chart_asset_started / chart_asset_done / chart_asset_error
fuxi_init_started / fuxi_node_started / fuxi_node_done / fuxi_init_done
agent_started / tool_call / agent_done
post_turn_packet
gongcao_backlog / gongcao_batch_started / gongcao_dispatch
luohan_inbox / luohan_batch_started / luohan_receipt
provider_fallback
background_idle
turn_done
config_error / agent_error
```

## Files Per Run

```text
turns.jsonl
agent-events.jsonl
tool-calls.jsonl
memory-diff.md
transcript.md
report.md
```

## Container

容器名固定：

```text
fate-and-fortune
```

默认基础镜像必须是多架构镜像，避免在 arm64 宿主上通过 amd64/qemu 跑 Claude Code。

Claude Code、Basic Memory config/cache、logs、memory projects 都落在容器 volume：

```text
/app/runtime
/app/memory-projects
```

不读取宿主机：

```text
~/.config/claude-code
~/.local/share/claude-code
~/basic-memory
```

## Failure Policy

如果模型 key、Ark/MiniMax URL、Claude Code、Basic Memory、Chart Asset 或容器架构不可用，测试失败并记录事件。系统不 mock。菩萨/功曹/罗汉允许从 MiniMax M3 fallback 到 Ark `ark-code-latest`，但必须产生 `provider_fallback` 审计事件；伏羲不使用 MiniMax fallback。
