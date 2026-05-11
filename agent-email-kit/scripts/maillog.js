#!/usr/bin/env node

/**
 * 邮件发送日志管理工具
 * 功能：记录发送历史、查看日志、统计发送量
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_FILE = path.join(os.homedir(), '.config/agent-mail-kit/mail-log.json');

// 确保目录存在
function ensureLogDir() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 读取日志
function readLog() {
  ensureLogDir();
  if (!fs.existsSync(LOG_FILE)) {
    return { logs: [], stats: { total: 0, byAgent: {}, byTemplate: {} } };
  }
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch (e) {
    return { logs: [], stats: { total: 0, byAgent: {}, byTemplate: {} } };
  }
}

// 写入日志
function writeLog(logData) {
  ensureLogDir();
  fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2));
}

// 记录发送
function recordSend(to, subject, template, agent) {
  const logData = readLog();
  const now = new Date();
  const timestamp = now.toISOString();
  const datetime = now.toLocaleString('zh-CN');
  
  const record = {
    id: Date.now(),
    timestamp,
    datetime,
    to,
    subject,
    template: template || 'direct',
    agent: agent || process.env.AGENT_NAME || 'Unknown'
  };
  
  logData.logs.unshift(record);
  logData.stats.total++;
  logData.stats.byAgent[record.agent] = (logData.stats.byAgent[record.agent] || 0) + 1;
  logData.stats.byTemplate[record.template] = (logData.stats.byTemplate[record.template] || 0) + 1;
  
  // 只保留最近 100 条
  if (logData.logs.length > 100) {
    logData.logs = logData.logs.slice(0, 100);
  }
  
  writeLog(logData);
  return record;
}

// 列出日志
function listLogs(limit = 20) {
  const logData = readLog();
  const logs = logData.logs.slice(0, limit);
  
  console.log(`\n📋 最近 ${logs.length} 封邮件发送记录:\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   ${'时间'.padEnd(19)}  ${'发件人'.padEnd(18)}  ${'收件人'.padEnd(25)}  ${'主题'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  logs.forEach((log, i) => {
    const subject = log.subject.length > 30 ? log.subject.slice(0, 30) + '...' : log.subject;
    const agent = log.agent.length > 15 ? log.agent.slice(0, 15) + '...' : log.agent;
    const to = log.to.length > 22 ? log.to.slice(0, 22) + '...' : log.to;
    console.log(`${String(i + 1).padStart(2)}  ${log.datetime}  ${agent.padEnd(18)}  ${to.padEnd(25)}  ${subject}`);
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 总计: ${logData.stats.total} 封邮件`);
}

// 显示统计
function showStats() {
  const logData = readLog();
  
  console.log(`\n📊 邮件发送统计:\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  总发送量: ${logData.stats.total} 封`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  console.log(`\n🤖 按智能体统计:`);
  Object.entries(logData.stats.byAgent)
    .sort((a, b) => b[1] - a[1])
    .forEach(([agent, count]) => {
      const percent = ((count / logData.stats.total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.min(Math.floor(count / 2), 30));
      console.log(`  ${agent.padEnd(25)} ${String(count).padStart(3)} 封 (${percent}%) ${bar}`);
    });
  
  console.log(`\n📑 按模板统计:`);
  Object.entries(logData.stats.byTemplate)
    .sort((a, b) => b[1] - a[1])
    .forEach(([template, count]) => {
      const percent = ((count / logData.stats.total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.min(Math.floor(count / 2), 30));
      console.log(`  ${template.padEnd(25)} ${String(count).padStart(3)} 封 (${percent}%) ${bar}`);
    });
  
  console.log();
}

// 主命令处理
function main() {
  const [command, arg1] = process.argv.slice(2);
  
  switch (command) {
    case 'list':
    case 'ls':
      listLogs(parseInt(arg1) || 20);
      break;
      
    case 'stats':
      showStats();
      break;
      
    case 'record':
      // 内部使用：smtp.js 发送后自动记录
      // 用法: node maillog.js record <to> <subject> <template> <agent>
      recordSend(process.argv[3], process.argv[4], process.argv[5], process.argv[6]);
      break;
      
    default:
      console.log(`
📧 邮件发送日志管理工具

用法:
  node maillog.js list [数量]    列出最近的发送记录 (默认20条)
  node maillog.js ls [数量]        同上
  node maillog.js stats             显示发送统计数据

示例:
  node maillog.js list
  node maillog.js list 50
  node maillog.js stats
`);
  }
}

// 如果是被 require 调用，导出函数；否则执行主函数
if (require.main === module) {
  main();
} else {
  module.exports = { recordSend, readLog };
}
