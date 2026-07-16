# Stage 04 Fuxi Node Runtime

Status: in_progress

## Deliverables

- `fuxi-nodes/` with 50 node prompts.
- `docs/FUXI_NODE_SCHEDULE.md`.
- `docs/CHART_ASSET_L0.md`.
- `agents/fuxi.md`.
- `commands/fuxi-run-node.md`.
- `commands/fuxi-initialize-16.md`.

## L0 Prerequisite

Fuxi initialization does not start from birth profile directly.

```text
birth profile
→ chart_asset_id
→ 01_命/_chart_assets/
→ 01_命/L0_排盘事实档案.md
→ 16 nodes
```

All 16 nodes must reference the same `chart_asset_id`.

## Initialization Nodes

```text
A01 A02 A03 A04 A05
B06 B07 B10
C13 C16 C18 C19 C20 C24 C25
D28
```

## B09 Policy

B09 is not initialized.

## Acceptance

- Fuxi Agent references the imported node prompt files.
- Fuxi nodes do not recalculate the chart.
- Fuxi task template preserves reality quotes separately from interpretation.
