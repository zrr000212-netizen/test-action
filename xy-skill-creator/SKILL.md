---
name: xy-skill-creator
description: "Use when用户要求创建新技能、优化现有技能、或建立可复用工作流为技能。由Hermes与OpenClaw协同开发，适用于所有Agent平台。触发场景：用户说"把这个做成技能"、"写个XX技能"、"帮我建一个做XX的技能"、或要求优化/改进现有技能。Also use when helping multiple agents collaborate to author a shared skill."
version: 1.0.0
author: Hermes (毅马仕) + OpenClaw (胖胖虾) for 胖教练
license: MIT
metadata:
  hermes:
    tags: [skill-authoring, multi-agent, skill-creation, workflow]
    related_skills: [hermes-agent-skill-authoring, writing-plans, systematic-debugging]
---

# XY Skill Creator（多Agent协同技能创建框架）

## 核心定位

xy-skill-creator 是**由 Hermes 与 OpenClaw 协同开发**的技能创建框架——它将任意可复用工作流封装为可运行的 SKILL.md，**适用于所有 Agent 平台**。

**核心原则：**
1. **先出方案等确认再执行** — 每个关键节点先给方案，等确认后再推进
2. **出错不停继续解决** — 问题出现直接修，修完再汇报
3. **多Agent协同** — 共享目录协作，不是各自复制
4. **渐进披露** — 核心在 SKILL.md，详细内容在 references/

## 工作流（6阶段）

```
意图捕获 → 访谈调研 → 起草技能 → 测试用例 → 运行评估 → 迭代改进
    ↓           ↓           ↓          ↓          ↓          ↓
  方案确认    方案确认    草稿确认    用例确认   结果审阅   直到满意
```

**精简化原则：** SKILL.md 只保留框架和索引，详细内容见 references/ 各子文件。

## 阶段一：意图捕获

**目标：** 理解技能要解决什么问题、何时触发。

**方案模板：**
```
【意图捕获方案】
技能名称建议：<name>
技能定位：<what it does>
预期触发场景：<phrases and contexts>
预期输出：<output format>
验证方式：<how to verify>
```
→ 提交胖教练确认后再推进。

详见：`references/intent-capture.md`

## 阶段二：访谈调研

**目标：** 深入了解输入/输出格式、工具链、成功标准。

**必问清单：** 输入/输出/工具/依赖/参考技能/成功标准/特殊约束

详见：`references/research.md`

## 阶段三：起草技能

### 目录结构（精简化）
```
skill-name/
├── SKILL.md              # 精简主文件：概述 + 索引（≤500行）
├── references/           # 详细内容（>300行需含目录表）
│   ├── overview.md       # 技能全貌
│   ├── trigger-guide.md  # 触发词设计
│   └── examples.md       # 场景示例
├── scripts/             # 可执行脚本（按需）
└── assets/              # 模板/资源（按需）
```

### SKILL.md 结构模板
```yaml
---
name: <skill-name>
description: "Use when <trigger scenario>. <What it does>."
---

# <Skill Title>

## Overview
<What and why. 1-2 paragraphs.>

## When to Use
- 触发场景1
- 触发场景2
- **不要用于：** <counter-triggers>

## Core Sections
<Imperative instructions, one step per line.>

## Output Formats
<If applicable.>

## Common Pitfalls
1. <Mistake> → <Fix>

## Verification Checklist
- [ ] <Check 1>
- [ ] <Check 2>
```

### Description 写法
- 必须以 "Use when" 开头
- 包含触发场景的多种表述方式（稍微"激进"一点）

详见：`references/writing-guide.md`

## 阶段四：测试用例

**目标：** 设计 2-3 个真实场景测试提示词。

**格式：**
```json
{
  "skill_name": "<name>",
  "evals": [
    {"id": 1, "prompt": "<realistic, specific prompt>", "expected_output": "<desc>", "files": []}
  ]
}
```

**原则：** 真实具体，包含文件路径/场景/背景；不要太简单（简单查询不触发技能）。

详见：`references/test-cases.md`

## 阶段五：运行与评估

使用 `delegate_task` 模拟 with-skill vs baseline 并发对比：
- **with-skill：** 技能路径 + 任务 + 保存输出
- **baseline：** 相同任务，不使用技能

**结果呈报：** 定性对比 + token/时间指标 + 改进建议 → 胖教练审阅

详见：`references/evaluation.md`

## 阶段六：迭代改进

改进原则：
- 从反馈提炼**通用规律**，不止修个别错误
- 保持技能轻量，删除不产生价值的部分
- **解释 WHY** 而非堆砌 MUST/NEVER
- 寻找跨用例共同模式，内置到技能

**停止条件：** 胖教练满意 / 反馈全空 / 连续两轮无实质改进

详见：`references/iteration.md`

## 目录位置

**共享目录（Hermes + OpenClaw 共用）：**
- `~/.agents-shared/skills/<skill-name>/SKILL.md`
- `~/.agents-shared/skills/<skill-name>/references/`

**不放在** `~/.hermes/skills/` 或 `~/.openclaw/skills/`（各自私有目录会导致对方看不到）

## agentskills.io 核心规范

详见：`references/agentskills-structure.md`

## 常见陷阱

1. **描述太泛** — "Use when user wants help" 不触发
2. **描述太窄** — 一种触发词漏过其他合法调用
3. **规则堆砌** — 用解释代替 MUST，解释原因比强制规则更有效
4. **跳过用户确认** — 先出方案再执行，不"先斩后奏"
5. **各自复制而非共享** — 必须用 `~/.agents-shared/skills/`
6. **SKILL.md 过长** — 精简到 ≤500 行，详细内容移到 references/

## Verification Checklist

- [ ] 意图捕获方案已获胖教练确认
- [ ] 访谈调研覆盖所有必问项
- [ ] SKILL.md ≤ 500 行，详细内容在 references/
- [ ] Description 以 "Use when" 开头，触发描述有力
- [ ] 测试用例 2-3 个，真实具体
- [ ] 评估结果已呈报胖教练并获反馈
- [ ] 技能写入 `~/.agents-shared/skills/`（共享目录）
- [ ] 口吻反映 Hermes + OpenClaw 协同
