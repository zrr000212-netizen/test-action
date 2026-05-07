# IMAP 命令参考

## 概述

IMAP 命令用于接收和管理邮件。所有命令都支持 `--account` 参数指定账号。

---

## check - 检查新邮件

检查未读邮件或最近的邮件。

```bash
node scripts/imap.js [--account <name>] check [--limit 10] [--mailbox INBOX] [--recent 2h]
```

**选项：**
- `--limit <n>`：最大结果数（默认：10）
- `--mailbox <name>`：检查的邮箱文件夹（默认：INBOX）
- `--recent <time>`：只显示最近 X 时间内的邮件（例如：30m, 2h, 7d）

**示例：**
```bash
# 检查最近 2 小时的邮件
node scripts/imap.js check --recent 2h

# 检查最近 7 天的 20 封邮件
node scripts/imap.js check --recent 7d --limit 20
```

---

## fetch - 获取邮件详情

根据 UID 获取完整邮件内容。

```bash
node scripts/imap.js [--account <name>] fetch <uid> [--mailbox INBOX]
```

**选项：**
- `--mailbox <name>`：邮箱文件夹（默认：INBOX）

**示例：**
```bash
# 获取 UID 为 12345 的邮件内容
node scripts/imap.js fetch 12345
```

---

## download - 下载附件

下载邮件中的所有附件或指定附件。

```bash
node scripts/imap.js [--account <name>] download <uid> [--mailbox INBOX] [--dir <path>] [--file <filename>]
```

**选项：**
- `--mailbox <name>`：邮箱文件夹（默认：INBOX）
- `--dir <path>`：输出目录（默认：当前目录）
- `--file <filename>`：只下载指定文件名的附件（默认：下载所有）

**示例：**
```bash
# 下载所有附件到 ~/Downloads
node scripts/imap.js download 12345 --dir ~/Downloads

# 只下载 report.pdf
node scripts/imap.js download 12345 --file report.pdf
```

---

## search - 搜索邮件

根据各种条件搜索邮件。

```bash
node scripts/imap.js [--account <name>] search [options]
```

**选项：**
- `--unseen`：只显示未读邮件
- `--seen`：只显示已读邮件
- `--from <email>`：发件人地址包含
- `--subject <text>`：主题包含
- `--recent <time>`：最近 X 时间内（例如：30m, 2h, 7d）
- `--since <date>`：指定日期之后（格式：YYYY-MM-DD）
- `--before <date>`：指定日期之前（格式：YYYY-MM-DD）
- `--limit <n>`：最大结果数（默认：20）
- `--mailbox <name>`：搜索的邮箱文件夹（默认：INBOX）

**示例：**
```bash
# 搜索 boss@company.com 最近 7 天发来的邮件
node scripts/imap.js search --from boss@company.com --recent 7d --limit 20

# 搜索未读邮件
node scripts/imap.js search --unseen

# 搜索主题包含 "报告" 的邮件
node scripts/imap.js search --subject "报告"
```

---

## mark-read / mark-unread - 标记已读/未读

将一封或多封邮件标记为已读或未读。

```bash
node scripts/imap.js [--account <name>] mark-read <uid> [uid2 uid3 ...]
node scripts/imap.js [--account <name>] mark-unread <uid> [uid2 uid3 ...]
```

**示例：**
```bash
# 标记单封邮件为已读
node scripts/imap.js mark-read 12345

# 标记多封邮件为未读
node scripts/imap.js mark-unread 12345 12346 12347
```

---

## list-mailboxes - 列出所有邮箱文件夹

```bash
node scripts/imap.js [--account <name>] list-mailboxes
```

---

## list-accounts - 列出所有配置的账号

```bash
node scripts/imap.js list-accounts
```

---

**文件位置**：`references/IMAP-API.md`
**使用时机**：需要接收邮件、搜索邮件、下载附件、管理邮件状态时
