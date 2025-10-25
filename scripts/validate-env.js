/**
 * 环境变量验证脚本
 * 用途：在应用启动前验证必要的环境变量是否存在
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 定义必需的环境变量
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'REDIS_HOST',
  'REDIS_PORT',
];

// 定义可选但推荐的环境变量
const recommendedVars = [
  'LOG_LEVEL',
  // 'JWT_SECRET', // 如果需要认证功能，取消注释
];

// 获取当前环境
const nodeEnv = process.env.NODE_ENV || 'development';

// 确定要检查的环境变量文件
const envFiles = [
  `.env.${nodeEnv}.local`,
  `.env.${nodeEnv}`,
  '.env',
];

console.log('========================================');
console.log('Environment Variables Validation');
console.log('========================================');
console.log('');
console.log(`Environment: ${nodeEnv}`);
console.log('');

// 查找第一个存在的环境变量文件
let envFilePath = null;
let envFileName = null;

for (const file of envFiles) {
  const filePath = resolve(process.cwd(), file);
  if (existsSync(filePath)) {
    envFilePath = filePath;
    envFileName = file;
    break;
  }
}

if (!envFilePath) {
  console.error('❌ Error: No environment file found');
  console.error('');
  console.error('Searched for:');
  envFiles.forEach(file => console.error(`  - ${file}`));
  console.error('');
  console.error('Please run: npm run env:setup');
  console.error('');
  process.exit(1);
}

console.log(`✓ Found environment file: ${envFileName}`);
console.log('');

// 读取环境变量文件内容
const envContent = readFileSync(envFilePath, 'utf-8');

// 验证必需的环境变量
console.log('Checking required variables...');
const missingVars = requiredVars.filter(
  varName => !new RegExp(`^${varName}=`, 'm').test(envContent)
);

if (missingVars.length > 0) {
  console.error('');
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(v => console.error(`  - ${v}`));
  console.error('');
  console.error(`Please edit ${envFileName} and add the missing variables.`);
  console.error('');
  process.exit(1);
}

console.log('✓ All required variables present');
console.log('');

// 检查推荐的环境变量
console.log('Checking recommended variables...');
const missingRecommended = recommendedVars.filter(
  varName => !new RegExp(`^${varName}=`, 'm').test(envContent)
);

if (missingRecommended.length > 0) {
  console.log('');
  console.log('⚠️  Missing recommended variables (optional):');
  missingRecommended.forEach(v => console.log(`  - ${v}`));
  console.log('');
} else {
  console.log('✓ All recommended variables present');
  console.log('');
}

// 检查占位符值
console.log('Checking for placeholder values...');
const placeholders = [
  'REPLACE_WITH_REAL_PASSWORD',
  'REPLACE_USER',
  'REPLACE_PASSWORD',
  'username:password@localhost',
  'your-super-secret',
];

const foundPlaceholders = placeholders.filter(
  placeholder => envContent.includes(placeholder)
);

if (foundPlaceholders.length > 0 && nodeEnv !== 'development') {
  console.log('');
  console.log('⚠️  Warning: Placeholder values detected:');
  foundPlaceholders.forEach(p => console.log(`  - ${p}`));
  console.log('');
  console.log('Please replace these with actual values.');
  console.log('');
}

// 特定环境的额外检查
if (nodeEnv === 'production') {
  console.log('Production environment checks...');

  // 检查数据库 SSL
  if (!envContent.includes('sslmode=require') && !envContent.includes('sslmode=prefer')) {
    console.log('⚠️  Warning: DATABASE_URL should include sslmode=require for production');
  }

  // 检查 Redis 密码
  if (/^REDIS_PASSWORD=\s*$/m.test(envContent)) {
    console.log('⚠️  Warning: REDIS_PASSWORD is empty in production');
  }

  console.log('');
}

console.log('========================================');
console.log('✓ Environment validation passed!');
console.log('========================================');
console.log('');
