const GitConfigFactory = require('../../utils/gitManagers/gitConfigFactory')

async function updateRepoName(repoUrl, newName) {
  try {
    const { manager, error } = await GitConfigFactory.init({ gitUrl: repoUrl })
    if (error) throw error

    await manager.updateRepository({ updateFields: { name: newName } })
  } catch (error) {
    throw new Error(`Error updating repository name`)
  }
}

module.exports = { updateRepoName }
