const { configstore } = require('../../../../../configstore')

const handleDisconnect = async (options, config) => {
  if (!config.userId && !config.userToken) {
    throw new Error('No connected user found for github')
  }

  configstore.delete('githubUserId')
  configstore.delete('githubUserToken')
}

module.exports = handleDisconnect
