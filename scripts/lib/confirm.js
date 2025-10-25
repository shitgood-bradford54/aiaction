import readline from 'node:readline'

export class ConfirmManager {
  shouldAutoConfirm() {
    return (
      process.env.CI === 'true' ||
      process.env.AI_CLI_YES === '1' ||
      process.env.YES === '1'
    )
  }

  async confirm(question, defaultAnswer = false, forceFlag = false) {
    if (forceFlag || this.shouldAutoConfirm()) {
      return true
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise((resolve) => {
      const suffix = defaultAnswer ? ' [Y/n] ' : ' [y/N] '
      rl.question(question + suffix, (answer) => {
        rl.close()

        if (!answer.trim()) {
          resolve(defaultAnswer)
          return
        }

        const normalized = answer.trim().toLowerCase()
        resolve(normalized === 'y' || normalized === 'yes')
      })
    })
  }

  async confirmDatabaseOperation(action, environment, forceFlag = false) {
    if (forceFlag || this.shouldAutoConfirm()) {
      return true
    }

    const question = `\n⚠️  即将执行数据库操作: ${action}\n环境: ${environment}\n\n这是一个危险操作,可能导致数据丢失。\n确认继续吗?`
    return this.confirm(question, false, forceFlag)
  }

  async confirmDangerous(operation, environment, forceFlag = false) {
    if (forceFlag || this.shouldAutoConfirm()) {
      return true
    }

    const question = `\n⚠️  危险操作: ${operation}\n环境: ${environment}\n\n确认继续吗?`
    return this.confirm(question, false, forceFlag)
  }
}

export const confirmManager = new ConfirmManager()
