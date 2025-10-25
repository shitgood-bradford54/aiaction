import { spawn, exec as nodeExec } from 'node:child_process'
import { promisify } from 'node:util'
import { logger } from './logger.js'
import { envManager } from './env.js'

const execPromise = promisify(nodeExec)

export class ExecManager {
  constructor() {
    this.runningProcesses = new Map()
    this.processCounter = 0
    this.setupSignalHandlers()
  }

  setupSignalHandlers() {
    const safeCleanup = () => {
      try {
        this.cleanup()
      } catch {}
    }
    process.on('SIGINT', safeCleanup)
    process.on('SIGTERM', safeCleanup)
    process.on('exit', safeCleanup)
  }

  async executeCommand(command, options = {}) {
    const {
      flags = {},
      cwd = process.cwd(),
      stdio = 'inherit',
      env: extraEnv = {},
      ports = [],
    } = options

    const environment = envManager.detectEnvironment(flags)
    logger.debug(`执行环境: ${environment}`)

    const layeredEnv = envManager.collectEnvFromLayers(environment)
    const commandEnv = {
      ...process.env,
      ...layeredEnv,
      ...extraEnv,
      NODE_ENV: environment,
    }

    // 处理端口冲突
    if (ports.length > 0) {
      await this.handlePortConflicts(ports)
    }

    logger.debug(`执行命令: ${command}`)

    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, {
        cwd,
        stdio,
        shell: true,
        env: commandEnv,
      })

      const processId = ++this.processCounter
      this.runningProcesses.set(processId, {
        process: childProcess,
        command,
        startTime: Date.now(),
      })

      childProcess.on('close', (code) => {
        this.runningProcesses.delete(processId)

        if (code === 0) {
          resolve(code)
        } else {
          reject(new Error(`命令执行失败，退出码: ${code}`))
        }
      })

      childProcess.on('error', (error) => {
        this.runningProcesses.delete(processId)
        reject(error)
      })
    })
  }

  async handlePortConflicts(ports) {
    for (const port of ports) {
      const inUse = await this.checkPortInUse(port)
      if (inUse) {
        logger.warn(`端口 ${port} 被占用，正在尝试清理...`)
        await this.killProcessOnPort(port)
        await this.sleep(1000)
      }
    }
  }

  async checkPortInUse(port) {
    try {
      const { stdout } = await execPromise(`lsof -i :${port} -t`)
      return Boolean(stdout.trim())
    } catch {
      return false
    }
  }

  async killProcessOnPort(port) {
    try {
      await execPromise(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`)
      logger.success(`已清理端口 ${port}`)
    } catch (error) {
      logger.warn(`清理端口 ${port} 失败: ${error.message}`)
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  cleanup() {
    for (const [id, { process: childProcess }] of this.runningProcesses) {
      try {
        childProcess.kill('SIGTERM')
      } catch {}
    }
    this.runningProcesses.clear()
  }

  getStatus() {
    return {
      runningProcesses: this.runningProcesses.size,
      processes: Array.from(this.runningProcesses.values()).map(({ command, startTime }, id) => ({
        id,
        command,
        duration: Date.now() - startTime,
      })),
    }
  }
}

export const execManager = new ExecManager()
