# Skill 项目集成工作流

## 双栖模式

技能文件同时存在于两个位置：

| 位置 | 用途 | 路径模式 |
|------|------|----------|
| Hermes 运行时 | Agent 会话中自动加载 | `~/.hermes/skills/<category>/<skill-name>/SKILL.md` |
| 项目仓库 | 版本控制、团队共享、交付物 | `<project>/.arts/skills/<skill-name>/SKILL.md` |

## 集成步骤

1. 确认项目已有 `.arts/skills/` 目录（若无则创建）
2. 在项目下创建与 hermes 同名的技能目录
3. 复制 SKILL.md 和所有 scripts/references/templates
4. `git add` → `git commit` → `git push`

## 目录结构对照

```
# Hermes 运行时
~/.hermes/skills/devops/springboot-docker-packaging/
├── SKILL.md
└── scripts/
    ├── cross-arch-build.sh
    └── package-and-upload.sh

# 项目仓库（去掉 category 层级）
<project>/.arts/skills/springboot-docker-packaging/
├── SKILL.md
└── scripts/
    ├── cross-arch-build.sh
    └── package-and-upload.sh
```

注意：项目目录中去掉了 hermes 的 category 子目录（devops/），直接放在 `.arts/skills/` 下。

## Git 操作注意事项

### 共享分支 push 被拒

当 dev 分支有其他人推送的新提交时，`git push` 会被拒绝。处理流程：

```bash
# 如有本地未提交修改，先 stash
git stash

# 拉取远程最新代码
git pull origin dev

# 完成技能文件复制和 add/commit 后
git pull --rebase origin dev   # rebase 避免合并提交
git push origin dev

# 恢复本地修改
git stash pop
```

### 提交信息规范

```
feat: add <skill-name> skill - <简要描述>
```

示例：`feat: add springboot-docker-packaging skill - Docker镜像构建与打包全流程(跨架构/SWR/CCE/tar.gz/OBS)`

## HDAgentSkills 项目信息

| 属性 | 值 |
|------|-----|
| 仓库 | git@codehub.devcloud.cn-north-4.huaweicloud.com:0c016e6a6f014ab0ad68f88d7ef2f9b2/HDAgentSkills.git |
| dev 分支路径 | /root/HDAgentSkillDev/ |
| dev_blue 分支路径 | /root/HDAgentSkills/ |
| 技能目录 | .arts/skills/ |
