# agentskills.io 核心规范

> 注：agentskills.io 网站从当前环境网络不可达，以下内容基于 skill-creator 技能的已知规范整理。请在可访问时补充验证。

## 技能目录结构

```
skill-name/
├── SKILL.md              # 必须：YAML frontmatter + Markdown
├── references/           # 按需：详细文档（>300行需含目录表）
├── scripts/             # 按需：可执行代码
└── assets/              # 按需：模板、图标等
```

## 三层渐进披露原则

| 层级 | 内容 | 加载时机 | 理想规模 |
|------|------|----------|----------|
| 元数据 | name + description | 始终在context | ~100词 |
| SKILL.md 正文 | 核心工作流 | 技能触发时 | <500行 |
| Bundled 资源 | references/scripts/assets | 按需加载 | 无限制 |

## SKILL.md 精简指南

### 放主文件的（SKILL.md）

- Overview（1-2段）
- When to Use（含触发词和反触发）
- Core workflow（精简步骤，每步一行）
- Output format（关键格式定义）
- Common pitfalls（高频错误）
- Verification checklist（检查项）
- **指向 references/ 的清晰指针**

### 放子文件的（references/）

- 详细的阶段指南（如本文件的各个章节）
- 完整的示例库
- 大型模板（>300行）
- 工具特定的详细配置
- agentskills.io 原文未在此列出但建议按此原则拆分的内容：
  - `references/workflows/` — 多步骤流程的详细分解
  - `references/templates/` — 标准文档模板
  - `references/schemas/` — 数据结构定义

## Description 最佳实践

```yaml
# 优秀 Description（多个触发场景，避免undertrigger）
description: "Use when user wants to send an email, compose a message, 
  or needs to notify someone via email. Handles compose, review, attach, 
  and send. Even if user doesn't say 'email' explicitly — if they mention 
  'let them know', 'send a message to', 'notify' — use this skill."

# 差的 Description（undertrigger — 太窄）
description: "Send emails using SMTP."
```

**"稍微激进一点"原则：** Description 的目的是确保技能在需要时被调用，宁可稍微over-trigger也不要under-trigger。

## 技能触发机制

了解触发机制有助于设计更好的 Description：

- 技能出现在 `available_skills` 列表中（name + description）
- Agent 根据 description 决定是否consult技能
- **简单任务**（一步完成）可能不触发技能（Agent直接处理）
- **复杂、多步骤、需要特定工具**的任务可靠触发

因此测试提示词要有足够复杂度，否则技能不会被调用。

## 质量标准

| 标准 | 要求 |
|------|------|
| 可用性 | 技能在真实场景能被正确触发并产出预期结果 |
| 精简性 | SKILL.md ≤ 500行，详细内容在 references/ |
| 可维护性 | 技能结构清晰，后续容易修改 |
| 跨平台 | 不绑定特定Agent实现，全球可用 |
| 文档完整 | 有足够的示例和验证清单 |

## 参考资料

- Anthropics skill-creator：https://github.com/anthropics/skills/tree/main/skills/skill-creator
- agentskills.io（当前网络不可达，请在可访问时查阅）
