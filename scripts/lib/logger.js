import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 处理输出管道被关闭导致的 EPIPE 错误
try {
  const handleBrokenPipe = err => {
    if (err && (err.code === 'EPIPE' || err.code === 'ERR_STREAM_WRITE_AFTER_END')) {
      try {} catch {}
    }
  }
  if (process?.stdout?.on) process.stdout.on('error', handleBrokenPipe)
  if (process?.stderr?.on) process.stderr.on('error', handleBrokenPipe)
} catch {}

export class Logger {
  constructor(options = {}) {
    this.logLevel = options.level || 'info'
    this.enableFile = options.enableFile || false
    this.logDir = options.logDir || join(dirname(__dirname), 'logs')

    if (this.enableFile) {
      this.ensureLogDir()
    }
  }

  ensureLogDir() {
    try {
      mkdirSync(this.logDir, { recursive: true })
    } catch (error) {}
  }

  formatTimestamp() {
    return new Date().toLocaleString('zh-CN')
  }

  info(message, prefix = '🚀') {
    const output = `${prefix} ${message}`
    console.log(output)
    this.writeLog('info', message)
  }

  success(message) {
    const output = `✅ ${message}`
    console.log(output)
    this.writeLog('success', message)
  }

  warn(message) {
    const output = `⚠️  ${message}`
    console.warn(output)
    this.writeLog('warn', message)
  }

  error(message) {
    const output = `❌ ${message}`
    console.error(output)
    this.writeLog('error', message)
  }

  debug(message) {
    if (this.logLevel === 'debug' || process.env.DEBUG) {
      const output = `🐛 ${message}`
      console.log(output)
      this.writeLog('debug', message)
    }
  }

  step(message) {
    const separator = '===================================='
    console.log(`\n${separator}`)
    console.log(`🚀 ${message}`)
    console.log(separator)
    this.writeLog('step', message)
  }

  writeLog(level, message) {
    if (!this.enableFile) return

    try {
      const timestamp = this.formatTimestamp()
      const logFile = join(this.logDir, `dx-${new Date().toISOString().split('T')[0]}.log`)
      const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`
      writeFileSync(logFile, logLine, { flag: 'a' })
    } catch (error) {}
  }
}

export const logger = new Logger()
