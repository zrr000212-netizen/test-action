# 阶段二：访谈调研（Interview & Research）

## 目标
深入了解技能的输入/输出格式、依赖工具、成功标准。

## 必问清单

| # | 问题 | 为什么重要 |
|---|------|-----------|
| 1 | 技能的输入是什么？ | 决定技能如何启动 |
| 2 | 技能的输出是什么？ | 决定技能如何交付结果 |
| 3 | 涉及哪些工具？ | 决定技能依赖和兼容性 |
| 4 | 有没有现成的参考技能？ | 避免重复造轮子 |
| 5 | 成功标准是什么？ | 决定何时技能算"完成" |
| 6 | 有没有特殊约束或偏好？ | 避免返工 |

## 调研方法

### 查看现有技能找参考

```python
# Hermes 环境
from skills_list import skills_list
skills = skills_list(category='devops')  # 按分类筛选

# OpenClaw 环境
# 查看 ~/.agents-shared/skills/ 和 ~/.openclaw/shared/skills/
```

### 搜索相关技能关键词

```python
from search_files import search_files
results = search_files(
    pattern="email|backup|notification",
    target="content",
    path="~/.agents-shared/skills"
)
```

## 方案模板

```markdown
【访谈调研方案】

技能全貌：
  输入：<inputs>
  输出：<outputs>
  工具链：<tools to use>
  依赖：<dependencies>

参考技能：<existing skills to draw from>
技能结构建议：<SKILL.md structure>

成功标准：
  1. <criterion 1>
  2. <criterion 2>

请胖教练确认后进入起草阶段。
```

## 多Agent注意事项

如果技能需要多 Agent 协同：
- 明确哪个 Agent 是**主导**（负责创建技能）
- 哪个是**辅助**（参与评审或执行子任务）
- 共享目录路径确认（`~/.agents-shared/skills/`）
- 各自负责哪个阶段

## 注意事项

- 不要跳过用户确认直接进入起草
- 边界情况和异常处理要提前问清楚
- 如果用户说不清楚，引导用具体例子说明
