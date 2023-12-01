const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const DisconnectCore = require('./disconnectCore')
const HandleBeforeDisconnect = require('./plugins/handleBeforeDisconnect')

async function disconnect(service, options) {
  const { logger } = new Logger('bb-disconnect')
  try {
    const core = new DisconnectCore(service, options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeDisconnect().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)

    /**
     * Start operations
     */
    await core.disconnect()
  } catch (error) {
    logger.error(error)
    spinnies.add('disconnect', { text: 'Error' })
    spinnies.fail('disconnect', { text: error.message })
  }
}

module.exports = disconnect
