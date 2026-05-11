#!/usr/bin/env node

/**
 * SMTP Email CLI
 * Send email via SMTP protocol. Works with Gmail, Outlook, 163.com, and any standard SMTP server.
 * Supports attachments, HTML content, and multiple recipients.
 * 
 * Enhanced with identity tagging: automatically adds agent/channel/session info to email.
 */

const nodemailer = require('nodemailer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const config = require('./config');
const { recordSend } = require('./maillog');

// ========== 身份标识配置 ==========
// 从共享配置文件或环境变量读取身份信息
function loadIdentityConfig() {
  const sharedConfigPath = path.join(os.homedir(), '.agents-shared/config/email-identity.json');
  let sharedConfig = {};
  try {
    if (fs.existsSync(sharedConfigPath)) {
      sharedConfig = JSON.parse(fs.readFileSync(sharedConfigPath, 'utf8'));
    }
  } catch (e) {
    // 配置文件不存在或无效，使用默认值
  }
  return sharedConfig;
}

// 获取当前身份信息
function getIdentity() {
  const sharedConfig = loadIdentityConfig();
  
  // 优先从环境变量读取
  const agentName = process.env.AGENT_NAME || process.env.OPENCLAW_AGENT_NAME || process.env.HERMES_AGENT_NAME || 'AI Agent';
  const channel = process.env.AGENT_CHANNEL || process.env.OPENCLAW_CHANNEL || process.env.HERMES_CHANNEL || 'Unknown';
  const session = process.env.AGENT_SESSION || process.env.OPENCLAW_SESSION || process.env.HERMES_SESSION || 'Unknown';
  
  // 根据 agentName 确定 fromName
  let fromName;
  if (agentName.toLowerCase().includes('openclaw') || agentName.includes('胖胖虾')) {
    fromName = sharedConfig.openclaw?.fromName || 'OpenClaw - 胖胖虾';
  } else if (agentName.toLowerCase().includes('hermes') || agentName.includes('毅马仕')) {
    fromName = sharedConfig.hermes?.fromName || 'Hermes - 毅马仕';
  } else {
    fromName = agentName;
  }
  
  return {
    agentName,
    channel,
    session,
    fromName,
    enabled: true
  };
}

// 生成邮件签名
function generateSignature(isHtml = false) {
  const identity = getIdentity();
  const datetime = new Date().toLocaleString('zh-CN');
  
  if (isHtml) {
    return `<hr><p>🤖 发送者：${identity.agentName}<br>📱 渠道：${identity.channel}<br>💬 会话：${identity.session}<br>⏰ 发送时间：${datetime}</p>`;
  } else {
    return `\n---\n🤖 发送者：${identity.agentName}\n📱 渠道：${identity.channel}\n💬 会话：${identity.session}\n⏰ 发送时间：${datetime}`;
  }
}

// 处理发件人名称（加入身份标识）
function processFromAddress(fromAddress) {
  const identity = getIdentity();
  
  // 如果 from 已经有名称，提取邮箱部分，替换名称
  const emailMatch = fromAddress ? fromAddress.match(/<(.+)>/) : null;
  const email = emailMatch ? emailMatch[1] : fromAddress;
  
  return `${identity.fromName} <${email}>`;
}

function validateReadPath(inputPath) {
  let realPath;
  try {
    realPath = fs.realpathSync(inputPath);
  } catch {
    realPath = path.resolve(inputPath);
  }

  if (!config.allowedReadDirs.length) {
    throw new Error('ALLOWED_READ_DIRS not set in .env. File read operations are disabled.');
  }

  const allowedDirs = config.allowedReadDirs.map(d =>
    path.resolve(d.replace(/^~/, os.homedir()))
  );

  const allowed = allowedDirs.some(dir =>
    realPath === dir || realPath.startsWith(dir + path.sep)
  );

  if (!allowed) {
    throw new Error(`Access denied: '${inputPath}' is outside allowed read directories`);
  }

  return realPath;
}

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};
  const positional = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      options[key] = value || true;
      if (value && !value.startsWith('--')) i++;
    } else {
      positional.push(arg);
    }
  }

  return { command, options, positional };
}

// Create SMTP transporter
function createTransporter() {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    throw new Error('Missing SMTP configuration. Check your config at ~/.config/agent-mail-kit/.env');
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    tls: {
      rejectUnauthorized: config.smtp.rejectUnauthorized,
    },
  });
}

// Send email
async function sendEmail(options) {
  const transporter = createTransporter();

  // Verify connection
  try {
    await transporter.verify();
    console.error('SMTP server is ready to send');
  } catch (err) {
    throw new Error(`SMTP connection failed: ${err.message}`);
  }

  // 处理身份标识和签名
  const noSignature = options['no-signature'] || false;
  
  // 添加签名到正文
  if (options.html && !noSignature) {
    options.html += generateSignature(true);
  } else if (options.text && !noSignature) {
    options.text += generateSignature(false);
  } else if (options.body && !noSignature) {
    options.body += generateSignature(false);
  }

  const mailOptions = {
    from: processFromAddress(options.from || config.smtp.from || config.smtp.user),
    to: options.to,
    cc: options.cc || undefined,
    bcc: options.bcc || undefined,
    subject: options.subject || '(no subject)',
    text: options.text || undefined,
    html: options.html || undefined,
    attachments: options.attachments || [],
  };

  // If neither text nor html provided, use default text
  if (!mailOptions.text && !mailOptions.html) {
    mailOptions.text = (options.body || '') + (noSignature ? '' : generateSignature(false));
  }

  const info = await transporter.sendMail(mailOptions);
  
  // 记录发送日志
  try {
    const template = process.argv.includes('--html-file') || process.argv.includes('--body-file') ? 'template' : 'direct';
    recordSend(mailOptions.to, mailOptions.subject, template, process.env.AGENT_NAME);
  } catch (e) {
    // 日志记录失败不影响主流程
  }

  return {
    success: true,
    messageId: info.messageId,
    response: info.response,
    to: mailOptions.to,
  };
}

// Read file content for attachments
function readAttachment(filePath) {
  validateReadPath(filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Attachment file not found: ${filePath}`);
  }
  return {
    filename: path.basename(filePath),
    path: path.resolve(filePath),
  };
}

// Send email with file content
async function sendEmailWithContent(options) {
  // Handle attachments
  if (options.attach) {
    const attachFiles = options.attach.split(',').map(f => f.trim());
    options.attachments = attachFiles.map(f => readAttachment(f));
  }

  return await sendEmail(options);
}

// Test SMTP connection
async function testConnection() {
  const transporter = createTransporter();

  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from: processFromAddress(config.smtp.from || config.smtp.user),
      to: config.smtp.user,
      subject: 'SMTP Connection Test',
      text: 'This is a test email from the IMAP/SMTP email skill.' + generateSignature(false),
      html: '<p>This is a <strong>test email</strong> from the IMAP/SMTP email skill.</p>' + generateSignature(true),
    });

    return {
      success: true,
      message: 'SMTP connection successful',
      messageId: info.messageId,
    };
  } catch (err) {
    throw new Error(`SMTP test failed: ${err.message}`);
  }
}

// Display accounts in a formatted table
function displayAccounts(accounts, configPath) {
  // Handle no config file case
  if (!configPath) {
    console.error('No configuration file found.');
    console.error('Run "bash setup.sh" to configure your email account.');
    process.exit(1);
  }

  // Handle no accounts case
  if (accounts.length === 0) {
    console.error(`No accounts configured in ${configPath}`);
    process.exit(0);
  }

  // Display header with config path
  console.log(`Configured accounts (from ${configPath}):\n`);

  // Calculate column widths
  const maxNameLen = Math.max(7, ...accounts.map(a => a.name.length)); // 7 = 'Account'.length
  const maxEmailLen = Math.max(5, ...accounts.map(a => a.email.length)); // 5 = 'Email'.length
  const maxImapLen = Math.max(4, ...accounts.map(a => a.imapHost.length)); // 4 = 'IMAP'.length
  const maxSmtpLen = Math.max(4, ...accounts.map(a => a.smtpHost.length)); // 4 = 'SMTP'.length

  // Table header
  const header = `  ${padRight('Account', maxNameLen)}  ${padRight('Email', maxEmailLen)}  ${padRight('IMAP', maxImapLen)}  ${padRight('SMTP', maxSmtpLen)}  Status`;
  console.log(header);

  // Separator line
  const separator = '  ' + '─'.repeat(maxNameLen) + '  ' + '─'.repeat(maxEmailLen) + '  ' + '─'.repeat(maxImapLen) + '  ' + '─'.repeat(maxSmtpLen) + '  ' + '────────────────';
  console.log(separator);

  // Table rows
  for (const account of accounts) {
    const statusIcon = account.isComplete ? '✓' : '⚠';
    const statusText = account.isComplete ? 'Complete' : 'Incomplete';
    const row = `  ${padRight(account.name, maxNameLen)}  ${padRight(account.email, maxEmailLen)}  ${padRight(account.imapHost, maxImapLen)}  ${padRight(account.smtpHost, maxSmtpLen)}  ${statusIcon} ${statusText}`;
    console.log(row);
  }

  // Footer
  console.log(`\n  ${accounts.length} account${accounts.length > 1 ? 's' : ''} total`);
}

// Helper: right-pad a string to a fixed width
function padRight(str, len) {
  return (str + ' '.repeat(len)).slice(0, len);
}

// Main CLI handler
async function main() {
  const { command, options, positional } = parseArgs();

  try {
    let result;

    switch (command) {
      case 'send':
        if (!options.to) {
          throw new Error('Missing required option: --to <email>');
        }
        if (!options.subject && !options['subject-file']) {
          throw new Error('Missing required option: --subject <text> or --subject-file <file>');
        }

        // Read subject from file if specified
        if (options['subject-file']) {
          validateReadPath(options['subject-file']);
          options.subject = fs.readFileSync(options['subject-file'], 'utf8').trim();
        }

        // Read body from file if specified
        if (options['body-file']) {
          validateReadPath(options['body-file']);
          const content = fs.readFileSync(options['body-file'], 'utf8');
          if (options['body-file'].endsWith('.html') || options.html) {
            options.html = content;
          } else {
            options.text = content;
          }
        } else if (options['html-file']) {
          validateReadPath(options['html-file']);
          options.html = fs.readFileSync(options['html-file'], 'utf8');
        } else if (options.body) {
          options.text = options.body;
        }

        result = await sendEmailWithContent(options);
        break;

      case 'test':
        result = await testConnection();
        break;

      case 'list-accounts':
        {
          const { listAccounts } = require('./config');
          const { accounts, configPath } = listAccounts();
          displayAccounts(accounts, configPath);
        }
        return;  // Exit early, no JSON output

      default:
        console.error('Unknown command:', command);
        console.error('Available commands: send, test, list-accounts');
        console.error('\nUsage:');
        console.error('  send   --to <email> --subject <text> [--body <text>] [--html] [--cc <email>] [--bcc <email>] [--attach <file>] [--no-signature]');
        console.error('  send   --to <email> --subject <text> --body-file <file> [--html-file <file>] [--attach <file>] [--no-signature]');
        console.error('  test   Test SMTP connection');
        console.error('\nEnvironment Variables (for identity):');
        console.error('  AGENT_NAME    - Agent name (e.g., "OpenClaw 胖胖虾")');
        console.error('  AGENT_CHANNEL - Channel name (e.g., "Feishu 飞书", "Main Web")');
        console.error('  AGENT_SESSION - Session type (e.g., "主会话", "子对话")');
        process.exit(1);
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
