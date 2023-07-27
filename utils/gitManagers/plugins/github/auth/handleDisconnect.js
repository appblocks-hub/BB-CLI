const { configstore } = require('../../../../../configstore')
const { GITHUB_KEYS } = require('../utils/constant')

const handleDisconnect = async (options, config) => {
  if (!config.userId && !config.userToken) {
    throw new Error('No connected user found for github')
  }

  configstore.delete(GITHUB_KEYS.userId)
  configstore.delete(GITHUB_KEYS.userToken)
}

module.exports = handleDisconnect
