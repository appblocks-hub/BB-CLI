const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const ConnectCore = require('./connectCore')
const HandleBeforeConnect = require('./plugins/handleBeforeConnect')

async function connect(service, options) {
  const { logger } = new Logger('bb-connect')
  try {
    const core = new ConnectCore(service, options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeConnect().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)

    /**
     * Start operations
     */
    await core.connect()
  } catch (error) {
    logger.error(error)
    spinnies.add('connect', { text: 'Error' })
    spinnies.fail('connect', { text: error.message })
  }
}

module.exports = connect
