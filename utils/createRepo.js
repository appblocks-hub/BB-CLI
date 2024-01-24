const path = require('path')
const chalk = require('chalk')
const {
  getBlockName,
  getGitTarget,
  getGitRepoDescription,
  getGitRepoVisibility,
  getOrgId,
} = require('./questionPrompts')
const { CreateRepoError } = require('./errors/createRepoError')
const { headLessConfigStore } = require('../configstore')
const GitConfigFactory = require('./gitManagers/gitConfigFactory')
const { spinnies } = require('../loader')

async function createRepo(originalRepoName) {
  let repoName = originalRepoName
  const inputs = {}

  const { manager, error } = await GitConfigFactory.init()
  if (error) throw error

  const SHOULD_RUN_WITHOUT_PROMPTS = process.env.BB_CLI_RUN_HEADLESS !== 'false'
  global.HEADLESS_CONFIGS = headLessConfigStore().store
  const { gitTarget, gitDescription, gitVisibility } = SHOULD_RUN_WITHOUT_PROMPTS ? global.HEADLESS_CONFIGS : {}

  inputs.gitTarget = gitTarget || (await getGitTarget())

  let orgData = {}
  if (inputs.gitTarget === 'org git') {
    const [name, id] = await getOrgId()
    orgData = { name, id }
  }

  inputs.ownerId = orgData.id || manager.config.userId
  inputs.ownerName = orgData.name || manager.config.userName
  inputs.description = gitDescription ?? (await getGitRepoDescription())
  inputs.visibility = gitVisibility || (await getGitRepoVisibility())

  let repository
  let newName = true

  while (newName) {
    try {
      spinnies.add('cr', { text: `Creating new ${manager.gitVendor} repository` })
      repository = await manager.createRepository({
        name: repoName.toString(),
        description: inputs.description,
        visibility: inputs.visibility,
        ownerId: inputs.ownerId,
      })
      spinnies.remove('cr')
      newName = false
    } catch (err) {
      spinnies.remove('cr')
      if (err[0]?.type !== 'UNPROCESSABLE') {
        newName = false
        throw new CreateRepoError(err, 1)
      }

      console.log(chalk.dim(`Repository (${repoName}) already exists for ${inputs.ownerName} `))
      repoName = await getNewName(originalRepoName, repoName)
    }
  }

  return { blockFinalName: repoName, ...repository }
}

function prefixMyString(original, lastTried) {
  let i = 0
  if (original !== lastTried) i = parseInt(lastTried.split('_').pop(), 10)
  return `${original}_${i + 1}`
}

async function getNewName(originalBlockName, lastTriedName) {
  let newNameToTry
  let renameFn = prefixMyString
  if (process.env.BB_CLI_RUN_HEADLESS === 'true') {
    if (global.HEADLESS_CONFIGS) {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const ex = require(path.resolve(global.HEADLESS_CONFIGS.blockNamingStrategy))
      if (typeof ex === 'function') renameFn = ex
    }
    newNameToTry = renameFn(originalBlockName, lastTriedName)
  } else {
    newNameToTry = await getBlockName('Enter name of repository')
  }

  return newNameToTry
}

module.exports = { createRepo }
