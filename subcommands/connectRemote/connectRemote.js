const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const ConnectRemoteCore = require('./connectRemoteCore')
const HandleBeforeConnectRemote = require('./plugins/handleBeforeConnectRemote')
const HandleAfterConnectRemote = require('./plugins/handleAfterConnectRemote')

async function connectRemote(options) {
  const { logger } = new Logger('bb-connectRemote')
  try {
    const core = new ConnectRemoteCore(options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeConnectRemote().apply(core)
    new HandleAfterConnectRemote().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)

    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.connectRemote()
  } catch (error) {
    logger.error(error)
    spinnies.add('cr', { text: 'Error' })
    spinnies.fail('cr', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = connectRemote
