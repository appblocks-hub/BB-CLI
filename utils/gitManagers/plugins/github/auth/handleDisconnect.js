const { configstore } = require('../../../../../configstore')

const disconnect = async () => {
  configstore.delete('githubUserId')
  configstore.delete('githubUserToken')
}

module.exports = disconnect
