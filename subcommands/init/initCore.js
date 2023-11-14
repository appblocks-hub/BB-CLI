const { AsyncSeriesHook } = require('tapable')

const { createRepo } = require('../../utils/createRepo')

/**
 * @class
 */
class InitCore {
  /**
   * @param {string} appBlockName
   * @param {} options
   */
  constructor(appBlockName, options, logger) {
    this.cmdArgs = [appBlockName]
    this.cwd = process.cwd()
    this.cmdOpts = options
    this.logger = logger
    // eslint-disable-next-line prefer-destructuring
    this.requestedBlockName = this.cmdArgs[0]
    this.finalBlockName = this.requestedBlockName
    this.config = {}
    this.hooks = {
      /**
       * @type {AsyncSeriesHook}
       */
      beforeCreateRepo: new AsyncSeriesHook(['context', 'logger']),
      /**
       * @type {AsyncSeriesHook}
       */
      afterCreateRepo: new AsyncSeriesHook(),
      /**
       * @type {AsyncSeriesHook}
       */
      beforeAppConfigInit: new AsyncSeriesHook(),
      /**
       * @type {AsyncSeriesHook}
       */
      afterAppConfigInit: new AsyncSeriesHook(),
    }
  }
  /**
   *
   */

  async createPackage() {
    this.logger.info('createPackage called')
    await this.hooks.beforeCreateRepo?.promise(this, this.logger)
    try {
      await createRepo(this.requestedBlockName)
    } catch (/** @type {CreateRepoError} */ err) {
      console.log(err)
      process.exit(1)
    }
    await this.hooks.afterCreateRepo?.promise()
  }

  async appconfigInit() {
    await this.hooks.beforeAppConfigInit?.tapPromise()
    await this.hooks.afterAppConfigInit?.tapPromise()
  }
}

module.exports = InitCore
