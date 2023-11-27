const { Logger } = require('../../utils/logger')
const { readBBConfigFile } = require('../../utils/plugins')
const CreateVersionCore = require('./createVersionCore')
const HandleBeforeCreateVersion = require('./plugins/handleBeforeCreateVersion')
const HandleMemberBlock = require('./plugins/handleMemberBlock')
const HandlePackageBlock = require('./plugins/handlePackageBlock')
const HandleAfterCreateVersion = require('./plugins/handleAfterCreateVersion')
const { spinnies } = require('../../loader')

async function createVersion(component, options) {
  const { logger } = new Logger('bb-createVersion')
  try {
    const core = new CreateVersionCore(component, options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeCreateVersion().apply(core)
    new HandleMemberBlock().apply(core)
    new HandlePackageBlock().apply(core)
    new HandleAfterCreateVersion().apply(core)

    /**
     * Read and register plugins from bb config
     */
    const bbConfig = await readBBConfigFile(options.configPath)
    if (bbConfig.plugins) {
      bbConfig.plugins.forEach((plugin) => plugin.apply(core))
    }

    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.createVersion()
  } catch (err) {
    logger.error(err)
    const errMsg = err.response?.data?.msg || err.message
    spinnies.add('cv', { text: 'Error' })
    spinnies.fail('cv', { text: `${errMsg} ${err.path ? `(${err.path})` : ''} ` })
  }
  spinnies.stopAll()
}

module.exports = createVersion
