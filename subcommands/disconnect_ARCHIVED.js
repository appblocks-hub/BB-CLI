const { configstore } = require('../configstore')
const { feedback } = require('../utils/cli-feedback')

const disconnect = async (service) => {
  if (service !== 'github') {
    feedback({ type: 'error', message: 'Only github is supported' })
    return
  }
  configstore.delete('githubUserId')
  configstore.delete('githubUserToken')
  feedback({ type: 'success', message: 'removed git' })
}

module.exports = disconnect
