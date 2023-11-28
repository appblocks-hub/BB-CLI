const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { readBBConfigFile } = require('../../utils/plugins')
const SyncCore = require('./syncCore')
const HandleBeforeSync = require('./plugins/handleBeforeSync')
const HandleCreateBBModules = require('./plugins/handleCreateBBModules')
const HandleSyncOrphanBranches = require('./plugins/handleSyncOrphanBranches')

async function sync(blockName, options) {
  const { logger } = new Logger('bb-sync')
  try {
    const core = new SyncCore(blockName, options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeSync().apply(core)
    new HandleCreateBBModules().apply(core)
    new HandleSyncOrphanBranches().apply(core)

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
    await core.sync()
  } catch (error) {
    logger.error(error)
    
    // returnOnError flag used while calling from other commands
    if (options?.returnOnError) throw new Error('BB Sync failed.')
    
    spinnies.add('sync', { text: 'Error' })
    spinnies.fail('sync', { text: error.message })
    spinnies.stopAll()
  }
}

module.exports = sync
