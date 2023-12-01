const path = require('path')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const { headLessConfigStore, configstore } = require('../../configstore')
const { promptAndSetSpace } = require('./utils')
const { feedback } = require('../../utils/cli-feedback')

/**
 * @class
 */
class UseCore {
  /**
   * @param {} options
   */
  constructor(spaceName, options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = [spaceName]
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.manager = {}
    this.isOutOfContext = false
    this.spaceData = []
    this.currentSpaceName =
      headLessConfigStore(null, true).get('currentSpaceName') || configstore.get('currentSpaceName')

    this.hooks = {
      beforeUse: new AsyncSeriesHook(['context']),
      afterUse: new AsyncSeriesHook(['context']),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async initializeConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      this.isOutOfContext = true
    } else if (manager instanceof BlockConfigManager) {
      throw new Error('Please run the command inside package context ')
    }

    this.manager = manager
  }

  async use() {
    this.logger.info('use command')

    await this.hooks.beforeUse?.promise(this)

    const [spaceName] = this.cmdArgs || []
    if (!spaceName) {
      await promptAndSetSpace(this.spaceData, this.isOutOfContext)
    } else {
      const spaceDetails = this.spaceData.filter((v) => v.spaceName === spaceName)[0]
      if (!spaceDetails) {
        // if User given space name is not present, prompt the user with available space names
        feedback({ type: 'error', message: `${spaceName} doesn't exist` })
        await promptAndSetSpace(this.spaceData, this.isOutOfContext)
      } else {
        configstore.set('currentSpaceName', spaceDetails.spaceName)
        configstore.set('currentSpaceId', spaceDetails.space_id)
        headLessConfigStore(null, this.isOutOfContext).set('currentSpaceName', spaceDetails.spaceName)
        headLessConfigStore(null, this.isOutOfContext).set('currentSpaceId', spaceDetails.space_id)
        feedback({ type: 'success', message: `${spaceName} set` })
      }
    }

    await this.hooks.afterUse?.promise(this)
  }
}

module.exports = UseCore
