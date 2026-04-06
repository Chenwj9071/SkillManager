# Skills Manager Undo And Log Export Design

**Goal**

为最近操作增加详情弹窗、可回滚操作的撤销能力，以及 CSV 日志导出能力，同时保证被后续变化覆盖的操作不能回滚。

**Scope**

- 支持撤销的操作：
  - `skill.availability.updated`
  - `skill.metadata.updated`
  - `skill.linked`
  - `directory.linked`
- 不支持撤销的操作：
  - `skill.deleted`
  - `directory.deleted`
  - `skills.rescanned`
  - `logs.cleared`
- 最近操作支持：
  - 查看详情
  - 导出 CSV
  - 对可回滚且仍有效的记录显示撤销按钮

## Data Model

现有 `activity_logs.detail_json` 升级为结构化日志详情，新增统一 `undo` 字段：

```json
{
  "undo": {
    "supported": true,
    "kind": "skill.availability",
    "targetPath": "/repo/.claude/skills/reviewer",
    "before": {
      "availabilityMode": "automatic"
    },
    "after": {
      "availabilityMode": "manual_only"
    }
  }
}
```

不同操作的 `before/after` 结构：

- `skill.availability.updated`
  - `before.availabilityMode`
  - `after.availabilityMode`
- `skill.metadata.updated`
  - `before.metadata`
  - `after.metadata`
- `skill.linked`
  - `before.exists`
  - `after.exists`
  - `after.symlinkTarget`
- `directory.linked`
  - `before.exists`
  - `after.exists`
  - `after.symlinkTarget`

## Undo Validation

撤销前必须重新检查目标当前状态，只有当前状态仍然等于日志记录的 `after` 才允许撤销。

判定规则：

- 技能可用性：
  - 当前 `availabilityMode` 必须等于 `after.availabilityMode`
- 技能元数据：
  - 当前结构化元数据快照必须与 `after.metadata` 全量一致
- 软链接创建：
  - 目标路径必须仍然存在
  - 必须仍然是符号链接
  - `symlinkTarget` 必须仍然等于 `after.symlinkTarget`

不满足时，返回不可撤销原因，例如：

- `目标已被后续操作修改`
- `目标链接已不存在`
- `目标已不再指向原始来源`

## Backend

新增能力：

- `GET /api/logs`
  - 返回增强后的日志记录，并带上后端计算的撤销状态
- `DELETE /api/logs`
  - 保留现有清空能力
- `POST /api/logs/export`
  - 返回 CSV 内容
- `POST /api/logs/:id/undo`
  - 尝试撤销对应操作
- `GET /api/logs/:id`
  - 返回单条日志详情及当前撤销状态

新增服务职责：

- 构建日志快照
- 计算单条日志是否可撤销
- 执行撤销
- 导出 CSV

撤销成功后记录一条新日志：

- `operation.undone`

## Frontend

最近操作区域调整为：

- 标题右侧保留“清空最近操作”
- 新增“导出 CSV”
- 每条日志可点击打开详情弹窗

详情弹窗展示：

- 操作类型
- 时间
- 目标路径
- 原始详情
- 撤销状态
- 若可撤销，显示“撤销此操作”按钮
- 若不可撤销，显示原因

## CSV Format

导出字段：

- `createdAt`
- `action`
- `targetType`
- `targetPath`
- `undoSupported`
- `undoAvailable`
- `undoReason`
- `detailJson`

编码使用 UTF-8，首行包含表头。

## Risks

- 元数据撤销依赖结构化快照，必须统一序列化格式，否则会误判为已覆盖
- 软链接状态在不同平台上要统一解析目标路径
- 旧日志没有 `undo` 字段时，只展示详情，不提供撤销
