# 邮件服务商配置参考

## 常用邮件服务器配置表

| Provider | IMAP Host | IMAP Port | SMTP Host | SMTP Port |
|----------|-----------|-----------|-----------|-----------|
| 163.com | imap.163.com | 993 | smtp.163.com | 465 |
| vip.163.com | imap.vip.163.com | 993 | smtp.vip.163.com | 465 |
| 126.com | imap.126.com | 993 | smtp.126.com | 465 |
| vip.126.com | imap.vip.126.com | 993 | smtp.vip.126.com | 465 |
| 188.com | imap.188.com | 993 | smtp.188.com | 465 |
| vip.188.com | imap.vip.188.com | 993 | smtp.vip.188.com | 465 |
| yeah.net | imap.yeah.net | 993 | smtp.yeah.net | 465 |
| Gmail | imap.gmail.com | 993 | smtp.gmail.com | 587 |
| Outlook | outlook.office365.com | 993 | smtp.office365.com | 587 |
| QQ Mail | imap.qq.com | 993 | smtp.qq.com | 587 |
| exmail.qq.com | imap.exmail.qq.com | 993 | smtp.exmail.qq.com | 465 |

## Gmail 特殊说明

- Gmail 不接受常规账号密码
- 必须生成 **App Password**（应用专用密码）：https://myaccount.google.com/apppasswords
- 使用生成的 16 位字符作为 `IMAP_PASS` / `SMTP_PASS`
- 需要 Google 账号已开启两步验证

## 163.com / 126.com / 188.com 特殊说明

- 不接受登录密码，必须使用**授权码**
- 需要先在网页端开启 IMAP/SMTP 服务
- 授权码获取方式：登录邮箱 → 设置 → POP3/SMTP/IMAP → 开启服务 → 获取授权码

---

**文件位置**：`references/PROVIDERS.md`
**使用时机**：配置新邮箱账号、排查连接问题时
