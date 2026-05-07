---
name: agent-mail-kit
description: Send and manage email with AI agents. Supports identity tagging (agent/channel/session), Markdown templates with auto HTML rendering, variable substitution, multi-account, and send logging. Use when sending reports, notifications, proposals, or any email from an AI agent to users.
compatibility: Requires Node.js 16+ and npm. Works with any IMAP/SMTP server (Gmail, Outlook, 163.com, QQ Mail, enterprise email). Identity config at ~/.agents-shared/config/email-identity.json
metadata:
  openclaw:
    emoji: "📧"
    requires:
      bins:
        - node
        - npm
      env:
        - AGENT_NAME
        - AGENT_CHANNEL
        - AGENT_SESSION
        - IMAP_HOST
        - IMAP_USER
        - IMAP_PASS
        - SMTP_HOST
        - SMTP_USER
        - SMTP_PASS
    primaryEnv: SMTP_PASS
---

# IMAP/SMTP Email Tool

Read, search, and manage email via IMAP protocol. Send email via SMTP with identity tagging and templates.

---

## ⚠️ Gotchas (常见问题)

- **Gmail 不接受常规密码**，必须生成 App Password（16 字符），需要开启两步验证
- **163.com 不接受登录密码**，必须使用「授权码」，需要先在网页开启 IMAP/SMTP
- **126.com / 188.com 同上**：都用授权码，不是登录密码
- **发件人名称自动添加智能体标识**：`OpenClaw - 胖胖虾` 或 `Hermes - 毅马仕`
- **所有邮件会自动添加身份签名**，包含渠道和会话信息
- **不要手动修改 `SMTP_FROM` 的名称部分**，会被自动覆盖
- **附件下载有安全限制**：只能下载到 ALLOWED_READ_DIRS 列出的目录
- **QQ 企业邮箱 exmail.qq.com 使用 SMTP 465 端口**，不是 587

---

## 🚀 快速开始

### 1. 配置

运行配置向导：
```bash
bash setup.sh
```

配置文件位置：`~/.config/agent-mail-kit/.env`（或 `~/.config/agent-mail-kit/.env` 向后兼容）

### 2. 设置智能体身份

发送邮件前设置环境变量：
```bash
export AGENT_NAME="OpenClaw 胖胖虾"
export AGENT_CHANNEL="Feishu 飞书"
export AGENT_SESSION="主会话"
```

### 3. 测试连接
```bash
node scripts/smtp.js test
```

---

## 🤖 智能体身份标识

### 自动签名效果

**发件人显示：
```
OpenClaw - 胖胖虾 <your-email@example.com>
```

**邮件末尾自动添加：
```
---
🤖 发送者：OpenClaw 胖胖虾
📱 渠道：Feishu 飞书
💬 会话：主会话
⏰ 发送时间：2026/5/7 16:30:00
```

**禁用自动签名：
```bash
node scripts/smtp.js send --no-signature ...
```

---

## 📋 常用命令速查

### IMAP (接收邮件)
```bash
# 检查最近 2 小时的未读邮件
node scripts/imap.js check --recent 2h

# 搜索特定发件人的邮件
node scripts/imap.js search --from boss@company.com --recent 7d --limit 20

# 下载邮件附件
node scripts/imap.js download 12345 --dir ~/Downloads

# 列出所有邮箱文件夹
node scripts/imap.js list-mailboxes

# 列出所有配置的账号
node scripts/imap.js list-accounts
```

### SMTP (发送邮件)
```bash
# 发送简单邮件
node scripts/smtp.js send --to recipient@example.com --subject "Hello" --body "World"

# 发送带附件的邮件
node scripts/smtp.js send --to recipient@example.com --subject "Report" --body "Please find attached" --attach report.pdf

# 发送 HTML 邮件（推荐从文件读取）
node scripts/smtp.js send --to recipient@example.com --subject "Newsletter" --html-file newsletter.html

# 从文件读取正文
node scripts/smtp.js send --to team@example.com --subject "日报" --body-file report.md

# 禁用自动签名
node scripts/smtp.js send --to recipient@example.com --subject "Test" --body "No signature" --no-signature
```

### 📑 模板管理 (template.js)
```bash
# 列出所有可用模板
node scripts/template.js list
node scripts/template.js ls

# 预览指定模板（含变量替换效果）
node scripts/template.js preview daily-report
node scripts/template.js show daily-report

# 使用模板发送邮件
node scripts/template.js send daily-report kaveri.xu@huawei.com
```

---

## 📝 邮件模板

内置 6 种常用模板，位于 `assets/templates/`：

| 模板 | 目录 | 用途 |
|------|------|------|
| 日报 | `daily-report/` | 每日工作汇报 |
| 周报 | `weekly-report/` | 每周工作总结 |
| 技术方案 | `technical-proposal/` | 技术方案评审 |
| 复盘报告 | `postmortem/` | 项目复盘、故障复盘 |
| 会议纪要 | `meeting-minutes/` | 会议总结发送 |
| 通知公告 | `notification/` | 通用通知邮件 |

### 🚀 快速使用模板

**方法一：使用 template.js 脚本（推荐，支持自动变量替换 + Markdown 转 HTML）**
```bash
# 列出所有模板
node scripts/template.js list

# 预览模板效果
node scripts/template.js preview daily-report

# 使用模板发送邮件（自动变量替换 + 自动转 HTML + 内置样式）
node scripts/template.js send daily-report kaveri.xu@huawei.com
```

### 📊 发送日志管理 (maillog.js)
```bash
# 列出最近的发送记录（默认20条）
node scripts/maillog.js list
node scripts/maillog.js list 50

# 查看发送统计（按智能体、按模板分类）
node scripts/maillog.js stats
```

**方法二：直接使用 smtp.js**
```bash
node scripts/smtp.js send --to team@company.com --subject-file assets/templates/daily-report/subject.txt --body-file assets/templates/daily-report/body.md
```

### 🔄 支持的自动替换变量

模板中会自动替换以下变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `{{date}}` | 当前日期 | `2026-05-07` |
| `{{datetime}}` | 当前日期时间 | `2026/05/07 17:30` |
| `{{year}}` | 年份 | `2026` |
| `{{month}}` | 月份 | `05` |
| `{{day}}` | 日期 | `07` |
| `{{time}}` | 时间 | `17:30` |
| `{{sender}}` | 发送者名称 | `OpenClaw 胖胖虾` |
| `{{name}}` | 智能体名称 | `OpenClaw 胖胖虾` |
| `{{channel}}` | 渠道 | `Feishu 飞书` |
| `{{session}}` | 会话类型 | `主会话` |

---

## 📚 详细文档参考

更详细的文档请查看 `references/` 目录：

| 文档 | 文件名 | 内容 |
|------|--------|------|
| 🔌 IMAP 命令参考 | `references/IMAP-API.md` | 所有 IMAP 命令的完整参数说明和示例 |
| 📤 SMTP 命令参考 | `references/SMTP-API.md` | 所有 SMTP 命令的完整参数说明和示例 |
| 📧 邮件服务商配置 | `references/PROVIDERS.md` | 各邮箱服务商的服务器配置和注意事项 |
| 👥 多账号配置 | `references/MULTI-ACCOUNT.md` | 多账号配置和切换方法 |
| 🔧 排错指南 | `references/TROUBLESHOOTING.md` | 常见问题诊断和解决方案 |

---

## 🔒 安全说明

- 配置文件权限为 600（仅所有者可读可写）
- 附件路径受 ALLOWED_READ_DIRS 和 ALLOWED_WRITE_DIRS 限制
- 密码和敏感信息仅保存在用户目录，不提交到代码仓库
