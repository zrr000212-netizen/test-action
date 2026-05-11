# 阶段三：起草技能（Writing Guide）

## 目录结构规范

```
skill-name/
├── SKILL.md              # 精简主文件（≤500行）
├── references/           # 详细内容（>300行需含目录表）
├── scripts/              # 可执行脚本（按需）
└── assets/              # 模板/资源（按需）
```

**精简化原则（来自 agentskills.io）：**
- SKILL.md 元数据（name + description）：约100词
- SKILL.md 正文：理想<500行
- 大于300行的子文件需含目录表
- 三层渐进披露：元数据 → 正文 → bundled资源

## YAML Frontmatter 格式

```yaml
---
name: skill-name              # 小写+连字符，≤64字符
description: "Use when <trigger scenario>. <What it does>."
version: 1.0.0
author: Hermes + OpenClaw for 胖教练
license: MIT
metadata:
  hermes:
    tags: [<tag1>, <tag2>]
    related_skills: [<existing-skill>]
---
```

**必需字段：** `name`、`description`（≤1024字符）
**推荐字段：** `version`、`author`、`license`、`metadata`

## Description 写法（关键）

```yaml
# 弱描述（不触发）
description: "How to send emails."

# 强描述（准确触发）
description: "Use when user wants to send an email, compose a message, or needs to notify someone via email. Handles compose, review, attach, and send."
```

规则：
1. **必须以 "Use when" 开头**
2. **包含触发场景的多种表述方式**（稍微"激进"一点）
3. 描述的是**触发类**，不是单个任务

## SKILL.md 正文结构

```markdown
# <Skill Title>

## Overview
<What this skill does and why it exists. 1-2 paragraphs.>

## When to Use
- 触发场景1：<scenario>
- 触发场景2：<scenario>
- **不要用于：** <counter-triggers>

## Core Sections
### <Section 1: Key workflow step>
<Instructions in imperative form. One step per line.>

### <Section 2: Another step>
<More instructions.>

## Output Formats
<If skill produces structured output, define the format here.>

## Examples
**Example 1:**
Input: <input description>
Output: <expected output>

## Common Pitfalls
1. <Mistake> → <Fix>
2. <Mistake> → <Fix>

## Verification Checklist
- [ ] <Check 1>
- [ ] <Check 2>
```

## 写作语言规范

（基于文档写作学习成果）

| 规范 | 推荐 | 避免 |
|------|------|------|
| 语气 | 祈使句（"Run X", "Use Y"） | 叙述句（"The agent should..."） |
| 结构 | 步骤清晰，一行一个指令 | 冗长段落 |
| 强调 | ⚠️ 警告 / 🚫 红线 | 全大写 MUST/NEVER（用解释代替） |
| 修饰 | 简洁具体 | 被动语态、冗余修饰词 |

## 多Agent协同写法

口吻示例（错误）：
> "Hermes Agent should..."

口吻示例（正确）：
> "The creating Agent and reviewing Agent collaborate via shared directory at `~/.agents-shared/skills/`."

## 常见错误

1. **描述太泛** — "Use when user wants help" 触发不了任何技能
2. **描述太窄** — 只列一种触发词，漏过其他合法调用
3. **SKILL.md 过长** — 内容多时拆分到 references/，主文件只做索引
4. **规则堆砌** — 用解释"为什么"代替硬性规则，LLM有theory of mind
