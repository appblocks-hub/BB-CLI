const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const LoginCore = require('./loginCore')
const HandleBeforeLogin = require('./plugins/handleBeforeLogin')

async function login(options) {
  const { logger } = new Logger('bb-login')
  try {
    const core = new LoginCore(options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeLogin().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)

    /**
     * Start operations
     */
    await core.login()
  } catch (error) {
    logger.error(error)
    spinnies.add('lg', { text: 'Error' })
    spinnies.fail('lg', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = login
