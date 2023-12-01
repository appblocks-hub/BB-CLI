const chalk = require('chalk')
const Table = require('cli-table3')
const { AsyncSeriesHook } = require('tapable')
const { configstore } = require('../../configstore')

/**
 * @class
 */
class ConfigCore {
  /**
   * @param {} options
   */
  constructor(options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = []
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.store = configstore.store

    this.hooks = {
      beforeConfig: new AsyncSeriesHook(['context']),
      afterConfig: new AsyncSeriesHook(['context']),
    }
  }

  async config() {
    this.logger.info('config command')

    await this.hooks.beforeConfig?.promise(this)

    const configTable = new Table({
      head: ['Key', 'Value'].map((v) => chalk.cyanBright(v)),
    })

    for (const key in this.store) {
      if (Object.hasOwnProperty.call(this.store, key)) {
        let value = this.store[key]

        try {
          const jsonValue = JSON.parse(value)
          value = JSON.stringify(jsonValue, null, 2)
        } catch (error) {
          if (typeof value === 'string' && value.length > 80) {
            // Split string values exceeding 80 characters
            value = value.match(/.{1,80}/g).join('\n')
          }
        }

        configTable.push([key, value])
      }
    }

    console.log(configTable.toString())

    await this.hooks.afterConfig?.promise(this)
  }
}

module.exports = ConfigCore
