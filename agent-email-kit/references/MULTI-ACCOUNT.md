# 多账号配置参考

## 概述

邮件技能支持配置多个邮箱账号，在同一个配置文件中管理。

## 添加账号

### 方式一：使用 setup.sh 脚本

```bash
bash setup.sh
```

选择 "Add a new account" 选项，按提示输入配置信息。

### 方式二：手动编辑配置文件

在 `~/.config/agent-mail-kit/.env` 中添加带前缀的配置变量：

```bash
# Work account (WORK_ prefix)
WORK_IMAP_HOST=imap.company.com
WORK_IMAP_PORT=993
WORK_IMAP_USER=me@company.com
WORK_IMAP_PASS=password
WORK_IMAP_TLS=true
WORK_IMAP_REJECT_UNAUTHORIZED=true
WORK_IMAP_MAILBOX=INBOX
WORK_SMTP_HOST=smtp.company.com
WORK_SMTP_PORT=587
WORK_SMTP_SECURE=false
WORK_SMTP_USER=me@company.com
WORK_SMTP_PASS=password
WORK_SMTP_FROM=me@company.com
WORK_SMTP_REJECT_UNAUTHORIZED=true
```

## 使用命名账号

在命令中添加 `--account <name>` 参数指定使用的账号：

```bash
# 使用 work 账号检查邮件
node scripts/imap.js --account work check

# 使用 work 账号发送邮件
node scripts/smtp.js --account work send --to foo@bar.com --subject Hi --body Hello
```

不指定 `--account` 参数时，默认使用无前缀的默认账号。

## 账号命名规则

- 只能包含字母和数字（例如：`work`, `163`, `personal2`）
- 大小写不敏感：`work` 和 `WORK` 指向同一个账号
- 配置文件中的前缀必须是大写（例如：`WORK_IMAP_HOST`）
- `ALLOWED_READ_DIRS` 和 `ALLOWED_WRITE_DIRS` 是全局配置，所有账号共享（始终不需要前缀）

## 列出所有配置的账号

```bash
node scripts/imap.js list-accounts
node scripts/smtp.js list-accounts
```

---

**文件位置**：`references/MULTI-ACCOUNT.md`
**使用时机**：需要配置多个邮箱、切换不同账号发送邮件时
