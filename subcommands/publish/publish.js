const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const PublishCore = require('./publishCore')
const HandleBeforePublish = require('./plugins/handleBeforePublish')
const HandlePublishBlock = require('./plugins/handlePublishBlock')
const HandlePublishPackageBlock = require('./plugins/handlePublishPackageBlock')
const HandleAfterPublish = require('./plugins/handleAfterPublish')

async function publish(blockName, options) {
  const { logger } = new Logger('bb-publish')
  try {
    const core = new PublishCore(blockName, options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforePublish().apply(core)
    new HandlePublishBlock().apply(core)
    new HandlePublishPackageBlock().apply(core)
    new HandleAfterPublish().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)


    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.publish()
  } catch (error) {
    logger.error(error)
    spinnies.add('publish', { text: 'Error' })
    spinnies.fail('publish', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = publish
