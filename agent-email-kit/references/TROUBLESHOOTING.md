# 排错指南

## 常见问题与解决方案

---

### 连接超时 / Connection timeout

**症状：** 长时间无响应后报连接超时错误

**可能原因 & 解决方案：**
1. **网络问题**
   - 检查网络连接是否正常
   - 验证是否可以访问邮件服务器
   - 检查防火墙设置

2. **Host/Port 配置错误**
   - 检查 `IMAP_HOST` / `SMTP_HOST` 是否正确
   - 检查 `IMAP_PORT` / `SMTP_PORT` 是否正确
   - 参考 `references/PROVIDERS.md` 确认配置

3. **TLS/SSL 配置问题**
   - 确认 `IMAP_TLS` / `SMTP_SECURE` 设置与服务器要求匹配
   - 对于自签名证书：设置 `IMAP_REJECT_UNAUTHORIZED=false` 或 `SMTP_REJECT_UNAUTHORIZED=false`

---

### 认证失败 / Authentication failed

**症状：** 报错 "Authentication failed" 或类似信息

**可能原因 & 解决方案：**

#### 1. Gmail / Google 邮箱
- ❌ 不要使用常规账号密码
- ✅ 必须生成 **App Password**（应用专用密码）
- 👉 访问：https://myaccount.google.com/apppasswords
- 👉 需要先开启两步验证

#### 2. 163.com / 126.com / 188.com 网易邮箱
- ❌ 不要使用登录密码
- ✅ 必须使用**授权码**
- 👉 网页登录邮箱 → 设置 → POP3/SMTP/IMAP → 开启服务 → 获取授权码

#### 3. 通用检查项
- 确认用户名（通常是完整邮箱地址）正确
- 确认密码/授权码正确（注意前后无空格）
- 确认账号没有被锁定或限制

---

### TLS/SSL 错误

**症状：** 与 TLS/SSL 相关的错误信息

**解决方案：**
1. 确认 `IMAP_TLS` 设置与服务器要求匹配
2. 确认 `SMTP_SECURE` 设置与服务器要求匹配
   - 端口 465 通常需要 `SMTP_SECURE=true`
   - 端口 587 通常需要 `SMTP_SECURE=false`（使用 STARTTLS）
3. 对于自签名证书的企业邮箱：
   - 设置 `IMAP_REJECT_UNAUTHORIZED=false`
   - 设置 `SMTP_REJECT_UNAUTHORIZED=false`

---

### 附件下载失败

**症状：** 无法下载附件或下载到空文件

**可能原因 & 解决方案：**
1. **安全路径限制**
   - 检查 `ALLOWED_READ_DIRS` 和 `ALLOWED_WRITE_DIRS` 配置
   - 确保目标路径在允许的目录列表中
   - 路径需要绝对路径或 `~` 开头的用户目录

2. **权限问题**
   - 确认目标目录有写入权限
   - 确认磁盘空间足够

3. **附件文件名编码问题**
   - 某些非英文字符可能导致文件名乱码
   - 使用 `--file` 参数指定正确的文件名

---

### 发送邮件被拒收 / 进入垃圾箱

**症状：** 邮件发送成功但收件人未收到，或在垃圾箱中

**建议：**
1. 检查邮件内容是否包含垃圾邮件关键词
2. 避免大量发送相同内容的邮件
3. 确认发件人域名有正确的 SPF/DKIM 配置
4. 对于企业邮箱，可能需要管理员白名单

---

### 配置文件位置

主配置文件位于：
```
~/.config/agent-mail-kit/.env
```

权限应为 600（仅所有者可读可写）：
```bash
chmod 600 ~/.config/agent-mail-kit/.env
```

---

### 查看当前配置的账号

```bash
node scripts/imap.js list-accounts
node scripts/smtp.js list-accounts
```

这会列出所有已配置的账号及其状态。

---

### 重新运行配置向导

如果配置有问题，可以重新运行 setup.sh：
```bash
bash setup.sh
```

---

**文件位置**：`references/TROUBLESHOOTING.md`
**使用时机**：遇到连接问题、认证失败、发送/接收失败时
