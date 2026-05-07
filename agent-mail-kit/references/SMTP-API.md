# SMTP 命令参考

## 概述

SMTP 命令用于发送邮件。所有命令都支持 `--account` 参数指定账号。

---

## send - 发送邮件

发送邮件，支持纯文本、HTML、附件、多收件人。

```bash
node scripts/smtp.js [--account <name>] send --to <email> --subject <text> [options]
```

**必填选项：**
- `--to <email>`：收件人邮箱，多个收件人用逗号分隔

**主题选项（二选一）：**
- `--subject <text>`：邮件主题文本
- `--subject-file <file>`：从文件读取主题

**正文选项（多选一）：**
- `--body <text>`：纯文本正文
- `--body-file <file>`：从文件读取正文（自动检测 HTML）
- `--html`：将正文作为 HTML 发送
- `--html-file <file>`：从文件读取 HTML 正文

**可选选项：**
- `--cc <email>`：抄送收件人，多个用逗号分隔
- `--bcc <email>`：密送收件人，多个用逗号分隔
- `--attach <file>`：附件，多个附件用逗号分隔
- `--from <email>`：覆盖默认发件人地址
- `--no-signature`：禁用自动添加的身份签名

---

### 使用示例

#### 1. 简单文本邮件
```bash
node scripts/smtp.js send --to recipient@example.com --subject "Hello" --body "World"
```

#### 2. HTML 格式邮件
```bash
node scripts/smtp.js send --to recipient@example.com --subject "Newsletter" --html --body "<h1>Welcome</h1>"
```

#### 3. 带附件的邮件
```bash
node scripts/smtp.js send --to recipient@example.com --subject "Report" --body "Please find attached" --attach report.pdf
```

#### 4. 多个收件人
```bash
node scripts/smtp.js send --to "a@example.com,b@example.com" --cc "c@example.com" --subject "Update" --body "Team update"
```

#### 5. 从文件读取正文
```bash
# 读取 Markdown 文件作为正文
node scripts/smtp.js send --to team@example.com --subject "日报" --body-file report.md

# 读取 HTML 文件
node scripts/smtp.js send --to all@example.com --subject "Newsletter" --html-file newsletter.html
```

#### 6. 使用邮件模板
```bash
# 使用日报模板发送
node scripts/smtp.js send --to team@company.com --subject-file assets/templates/daily-report/subject.txt --body-file assets/templates/daily-report/body.md
```

#### 7. 禁用自动签名
```bash
node scripts/smtp.js send --to recipient@example.com --subject "Test" --body "No signature" --no-signature
```

---

## test - 测试 SMTP 连接

通过给自己发送一封测试邮件来验证 SMTP 配置是否正确。

```bash
node scripts/smtp.js [--account <name>] test
```

---

## list-accounts - 列出所有配置的账号

```bash
node scripts/smtp.js list-accounts
```

---

**文件位置**：`references/SMTP-API.md`
**使用时机**：需要发送邮件、使用模板、添加附件等场景时
