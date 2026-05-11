# 阶段五：运行与评估（Run & Evaluate）

## 评估流程

```
步骤 1：运行测试（并发）
  with_skill 子任务 vs without_skill 子任务（同时启动，不分先后）

步骤 2：收集结果 + 人工审阅
  每个用例记录：输出、时间、token 消耗
  胖教练查看输出，给出反馈

步骤 3：分析改进点
  从胖教练反馈中提取通用问题
```

## Hermes 环境运行方式

由于 Hermes 没有 Claude Code 的 `--with-skill` 标志，使用 `delegate_task` 模拟：

### with-skill 运行

```
使用 xy-skill-creator 技能，执行以下任务：
- 技能路径：~/.agents-shared/skills/<skill-name>/
- 任务：<eval prompt>
- 输入文件：<files if any>
- 保存输出到：<workspace>/iteration-N/eval-ID/with_skill/outputs/
```

### baseline 运行（without_skill）

```
执行相同任务，但不使用任何技能。
- 任务：<eval prompt>
- 保存输出到：<workspace>/iteration-N/eval-ID/without_skill/outputs/
```

## 结果组织结构

```
<skill-workspace>/
└── iteration-1/
    ├── eval-1-descriptive-name/
    │   ├── with_skill/
    │   │   ├── outputs/
    │   │   └── eval_metadata.json
    │   ├── without_skill/
    │   │   ├── outputs/
    │   │   └── eval_metadata.json
    │   ├── grading.json
    │   └── timing.json
    └── benchmark.json
```

## 结果呈报模板

```markdown
【评估结果】

用例 1（<name>）：
  with_skill 输出：<summary of what skill produced>
  without_skill 输出：<summary of what baseline produced>
  差距：<what skill improved>

用例 2（<name>）：...

总体评估：
  技能是否达到预期？<yes/no/partially>
  主要问题：<issues>
  优先改进点：
    1. <priority 1>
    2. <priority 2>

请胖教练审阅并给出反馈。
```

## 评估维度

| 维度 | 指标 | 收集方式 |
|------|------|----------|
| 定性质量 | 输出是否有用、符合预期 | 胖教练人工审阅 |
| token消耗 | 总消耗、per-call | delegate_task 返回 |
| 运行时间 | 总耗时（毫秒） | delegate_task 返回 |
| 触发准确性 | 技能是否在正确场景被调用 | 人工判断 |

## 注意事项

- with_skill 和 without_skill **必须同时启动**（避免时间偏差）
- 评估结果必须呈报胖教练审阅，不能自己决定"够好了"
- 重点关注**技能在哪些case明显优于baseline**，以及**为什么**
