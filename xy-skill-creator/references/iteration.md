# 阶段六：迭代改进（Improve & Repeat）

## 迭代循环

```
评估结果 → 胖教练反馈 → 改进技能 → 再次评估 → ...
     ↑                                            |
     └────────────────────────────────────────────┘
```

## 改进原则

### 1. 从反馈中提炼通用规律

不要只是修个别用例的错误，要理解**根本原因**：

```
❌ 错误：用户在case 3说图表缺轴标签 → 在SKILL.md加一条"图表要有轴标签"
✅ 正确：用户在所有需要可视化的case都遇到同样问题 → 在references/加"可视化输出规范"章节
```

### 2. 保持技能轻量

- 删除不产生价值的指令
- 不要用 MUST/NEVER 堆砌（用解释代替）
- 一个规则能覆盖多个case就不需要两条

### 3. 解释 WHY 而非堆砌规则

```
❌ 堆砌：MUST add axis labels to charts. NEVER forget to label axes.

✅ 解释：Charts are read quickly — without axis labels, readers waste time
guessing what each axis represents. This is especially important when
presenting to stakeholders who aren't familiar with the raw data.
```

### 4. 寻找跨用例的共同模式

如果3个用例都写了相似的辅助脚本，技能应该内置它：
```python
# 在 scripts/ 目录添加共享脚本
scripts/
├── build_chart.py      # 所有用例都用到 → 内置到技能
└── format_output.py
```

## 迭代检查清单

在提交新一轮评估前，确认：

- [ ] 胖教练反馈的所有具体问题已解决
- [ ] 没有引入新的过度适配（技能不只适用于训练集）
- [ ] 技能的触发描述仍然清晰准确
- [ ] SKILL.md 仍然保持精简（没有重新变得臃肿）

## 停止条件

满足任一即停止迭代：

| 条件 | 说明 |
|------|------|
| 胖教练满意 | 明确表示"可以了" |
| 反馈全空 | 所有用例的反馈都是空的（胖教练认为都OK） |
| 无实质改进 | 连续两轮没有有意义的改变 |

## 技能收尾

### 描述优化（Description Optimization）

创建或大幅改进技能后，可优化 frontmatter 的 description 字段：

1. 生成 20 个触发测试查询（8-10 should-trigger + 8-10 should-not-trigger）
2. 提交胖教练审阅
3. 优化 description
4. 更新 SKILL.md frontmatter

### 打包交付清单

- [ ] SKILL.md 格式验证（frontmatter 完整、description ≤1024字符）
- [ ] 技能写入 `~/.agents-shared/skills/`（共享目录）
- [ ] 所有 references/ 子文件完整
- [ ] 更新 memory（如有新的工作流程约定）
- [ ] 向胖教练汇报交付
