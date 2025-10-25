import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class EnvManager {
  constructor() {
    this.envLayers = this.loadEnvLayers()
    this.scriptsRoot = dirname(__dirname)
    this.projectRoot = dirname(this.scriptsRoot)
  }

  loadEnvLayers() {
    try {
      const configPath = join(__dirname, '../config/env-layers.json')
      return JSON.parse(readFileSync(configPath, 'utf8'))
    } catch (error) {
      return {
        development: ['.env.development', '.env.development.local'],
        production: ['.env.production', '.env.production.local'],
        test: ['.env.test', '.env.test.local'],
        e2e: ['.env.e2e', '.env.e2e.local'],
      }
    }
  }

  detectEnvironment(flags = {}) {
    if (flags.prod || flags.production) return 'production'
    if (flags.dev || flags.development) return 'development'
    if (flags.test) return 'test'
    if (flags.e2e) return 'e2e'
    return process.env.NODE_ENV || 'development'
  }

  getEnvironmentFiles(environment) {
    return this.envLayers[environment] || []
  }

  getEnvironmentDescription(environment) {
    const descriptions = {
      development: '开发环境',
      production: '生产环境',
      test: '测试环境',
      e2e: 'E2E测试环境'
    }
    return descriptions[environment] || environment
  }

  collectEnvFromLayers(environment) {
    const files = this.getEnvironmentFiles(environment)
    const env = { ...process.env }

    for (const file of files) {
      const fullPath = join(this.projectRoot, file)
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, 'utf8')
        const parsed = this.parseEnvFile(content)
        Object.assign(env, parsed)
      }
    }

    return env
  }

  parseEnvFile(content) {
    const result = {}
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()

        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }

        result[key] = value
      }
    }

    return result
  }
}

export const envManager = new EnvManager()
