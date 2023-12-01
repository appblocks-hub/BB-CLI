const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const LogoutCore = require('./logoutCore')
const HandleBeforeLogout = require('./plugins/handleBeforeLogout')

async function logout(options) {
  const { logger } = new Logger('bb-logout')
  try {
    const core = new LogoutCore(options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeLogout().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)

    /**
     * Start operations
     */
    await core.logout()
  } catch (error) {
    logger.error(error)
    spinnies.add('logout', { text: 'Error' })
    spinnies.fail('logout', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = logout
