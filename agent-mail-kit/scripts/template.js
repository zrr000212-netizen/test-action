#!/usr/bin/env node

/**
 * 邮件模板管理工具
 * 功能：列出模板、预览模板、变量替换、Markdown 转 HTML、使用模板发送邮件
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { recordSend } = require('./maillog');

// 简单的 Markdown 转 HTML 函数
function markdownToHtml(md) {
  let html = md;
  
  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3 style="color: #2c3e50; margin-top: 20px; margin-bottom: 10px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="color: #2c3e50; margin-top: 25px; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">$1</h1>');
  
  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // 列表
  html = html.replace(/^- \[ \] (.+)$/gm, '<li style="margin-left: 20px; padding: 3px 0;">⬜ $1</li>');
  html = html.replace(/^- \[x\] (.+)$/gim, '<li style="margin-left: 20px; padding: 3px 0;">✅ $1</li>');
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left: 20px; padding: 3px 0;">$1</li>');
  html = html.replace(/^\| (.+) \|$/gm, (match) => {
    // 简单的表格行，不处理，后面用完整表格逻辑
    return match;
  });
  
  // 表格（简单处理）
  const lines = html.split('\n');
  let inTable = false;
  let tableHtml = '';
  let resultLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<table style="border-collapse: collapse; width: auto; max-width: 100%; margin: 15px 0;">\n';
      }
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      const isHeaderLine = cells.every(c => /^-+$/.test(c));
      if (isHeaderLine) {
        continue; // 跳过分隔线
      }
      const isHeader = (i > 0 && !lines[i-1].startsWith('|')) || tableHtml.endsWith('<thead>\n');
      if (isHeader || tableHtml.endsWith('<table style="border-collapse: collapse; width: auto; max-width: 100%; margin: 15px 0;">\n')) {
        tableHtml += '<thead><tr style="background-color: #4a5568;">';
        for (const cell of cells) {
          tableHtml += `<th style="color: white; padding: 6px 12px; text-align: left; font-weight: 600; white-space: nowrap;">${cell}</th>`;
        }
        tableHtml += '</tr></thead><tbody>\n';
      } else {
        tableHtml += '<tr style="background-color: ' + (i % 2 === 0 ? '#f7fafc' : '#ffffff') + ';">';
        for (const cell of cells) {
          tableHtml += `<td style="padding: 5px 12px; border-bottom: 1px solid #e2e8f0; max-width: 300px; word-wrap: break-word;">${cell}</td>`;
        }
        tableHtml += '</tr>\n';
      }
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += '</tbody></table>\n';
        resultLines.push(tableHtml);
        tableHtml = '';
      }
      if (line.trim()) {
        resultLines.push(`<p style="margin: 8px 0; line-height: 1.6;">${line}</p>`);
      } else {
        resultLines.push('<br>');
      }
    }
  }
  if (inTable) {
    tableHtml += '</tbody></table>\n';
    resultLines.push(tableHtml);
  }
  
  html = resultLines.join('\n');
  
  // 水平线
  html = html.replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">');
  
  // 代码样式
  html = html.replace(/`([^`]+)`/g, '<code style="background: #edf2f7; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;">$1</code>');
  
  return html;
}

// 包装 HTML 内容（添加样式和头部）
function wrapHtmlContent(content, title) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
h1, h2, h3 { color: #2c3e50; }
</style>
</head>
<body>
${content}
</body>
</html>`;
}

// 模板目录
const TEMPLATES_DIR = path.join(__dirname, '../assets/templates');

// 获取当前日期等变量
function getVariables() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  // 获取周数（ISO周）
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil((((now - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
  
  // 本周一和本周日
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  
  return {
    date: `${year}-${month}-${day}`,
    datetime: `${year}/${month}/${day} ${hours}:${minutes}`,
    year,
    month,
    day,
    time: `${hours}:${minutes}`,
    week: `第${Math.floor(weekNum)}周`,
    weekNum: Math.floor(weekNum),
    startDate: formatDate(monday),
    endDate: formatDate(sunday),
    sender: process.env.AGENT_NAME || 'OpenClaw 智能体',
    name: process.env.AGENT_NAME || '智能体',
    channel: process.env.AGENT_CHANNEL || '未知渠道',
    session: process.env.AGENT_SESSION || '未知会话'
  };
}

// 变量替换
function replaceVariables(content, customVars = {}) {
  const vars = { ...getVariables(), ...customVars };
  
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

// 列出所有模板
function listTemplates() {
  console.log('\n📋 可用邮件模板列表:\n');
  
  const templates = fs.readdirSync(TEMPLATES_DIR);
  templates.forEach((template, index) => {
    const templatePath = path.join(TEMPLATES_DIR, template);
    if (fs.statSync(templatePath).isDirectory()) {
      const subjectFile = path.join(templatePath, 'subject.txt');
      const bodyFile = path.join(templatePath, 'body.md');
      
      const hasSubject = fs.existsSync(subjectFile);
      const hasBody = fs.existsSync(bodyFile);
      
      console.log(`  ${index + 1}. ${template}`);
      console.log(`     📄 subject.txt: ${hasSubject ? '✅' : '❌'}`);
      console.log(`     📝 body.md: ${hasBody ? '✅' : '❌'}`);
      console.log();
    }
  });
}

// 预览模板
function previewTemplate(templateName) {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ 模板不存在: ${templateName}`);
    process.exit(1);
  }
  
  console.log(`\n📋 模板预览: ${templateName}\n`);
  
  const subjectFile = path.join(templatePath, 'subject.txt');
  const bodyFile = path.join(templatePath, 'body.md');
  
  if (fs.existsSync(subjectFile)) {
    const subject = fs.readFileSync(subjectFile, 'utf8');
    console.log('📌 标题 (替换前):');
    console.log(`   ${subject}`);
    console.log('📌 标题 (替换后):');
    console.log(`   ${replaceVariables(subject)}`);
    console.log();
  }
  
  if (fs.existsSync(bodyFile)) {
    const body = fs.readFileSync(bodyFile, 'utf8');
    console.log('📝 正文 (Markdown 替换后 前15行):');
    console.log(replaceVariables(body).split('\n').slice(0, 15).map(l => `   ${l}`).join('\n'));
    if (body.split('\n').length > 15) {
      console.log('   ... (更多内容省略)');
    }
    console.log();
    
    // 生成 HTML 预览文件
    const htmlPreview = wrapHtmlContent(markdownToHtml(replaceVariables(body)), '预览');
    const previewFile = `/tmp/preview-${templateName}.html`;
    fs.writeFileSync(previewFile, htmlPreview);
    console.log(`🌐 HTML 预览文件已生成: ${previewFile}`);
    console.log();
  }
  
  console.log('🔄 可用变量:');
  const vars = getVariables();
  for (const [key, value] of Object.entries(vars)) {
    console.log(`   {{${key}}} → ${value}`);
  }
  console.log();
  console.log('💡 发送邮件时会自动将 Markdown 转换为带样式的 HTML!');
  console.log();
}

// 使用模板发送邮件
async function sendWithTemplate(templateName, toEmail, customVars = {}) {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ 模板不存在: ${templateName}`);
    process.exit(1);
  }
  
  const subjectFile = path.join(templatePath, 'subject.txt');
  const bodyFile = path.join(templatePath, 'body.md');
  
  if (!fs.existsSync(subjectFile) || !fs.existsSync(bodyFile)) {
    console.error('❌ 模板缺少 subject.txt 或 body.md 文件');
    process.exit(1);
  }
  
  let subject = fs.readFileSync(subjectFile, 'utf8').trim();
  let body = fs.readFileSync(bodyFile, 'utf8');
  
  // 变量替换
  subject = replaceVariables(subject, customVars);
  body = replaceVariables(body, customVars);
  
  // Markdown 转 HTML
  const bodyHtml = markdownToHtml(body);
  const fullHtml = wrapHtmlContent(bodyHtml, subject);
  
  // 创建临时 HTML 文件
  const tempHtml = `/tmp/template-body-${Date.now()}.html`;
  fs.writeFileSync(tempHtml, fullHtml);
  
  console.log(`\n📧 使用模板发送邮件 (HTML 格式)...`);
  console.log(`   收件人: ${toEmail}`);
  console.log(`   标题: ${subject}`);
  console.log(`   格式: Markdown → HTML 渲染`);
  console.log();
  
  // 调用 smtp.js 发送（使用 HTML 格式）
  const smtpScript = path.join(__dirname, 'smtp.js');
  const cmd = `node "${smtpScript}" send --to "${toEmail}" --subject "${subject}" --html-file "${tempHtml}"`;
  
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n✅ 邮件发送成功!');
    // 记录发送日志（标记模板名称）
    try {
      recordSend(toEmail, subject, templateName, process.env.AGENT_NAME);
    } catch (e) {}
  } catch (error) {
    console.error('\n❌ 邮件发送失败');
    process.exit(1);
  } finally {
    // 清理临时文件
    if (fs.existsSync(tempHtml)) {
      fs.unlinkSync(tempHtml);
    }
  }
}

// 主命令处理
function main() {
  const [command, arg1, arg2] = process.argv.slice(2);
  
  switch (command) {
    case 'list':
    case 'ls':
      listTemplates();
      break;
      
    case 'preview':
    case 'show':
      if (!arg1) {
        console.error('❌ 请指定模板名称');
        process.exit(1);
      }
      previewTemplate(arg1);
      break;
      
    case 'send':
      if (!arg1 || !arg2) {
        console.error('❌ 用法: template.js send <模板名称> <收件人邮箱>');
        process.exit(1);
      }
      sendWithTemplate(arg1, arg2);
      break;
      
    default:
      console.log(`
📧 邮件模板管理工具

用法:
  node template.js list           列出所有可用模板
  node template.js ls             同上
  node template.js preview <名称> 预览指定模板
  node template.js show <名称>    同上
  node template.js send <名称> <邮箱> 使用模板发送邮件

示例:
  node template.js list
  node template.js preview daily-report
  node template.js send daily-report kaveri.xu@huawei.com
`);
  }
}

main();
