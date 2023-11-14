/* eslint-disable */
const { readdir } = require('fs/promises')
const path = require('path')
const InitCore = require('../initCore')
const { githubGraphQl } = require('../../../utils/api')
const { isRepoNameAvailable } = require('../../../utils/Queries')
const { configstore } = require('../../../configstore')
const { axios } = require('../../../utils/axiosInstances')
const { getGitHeader } = require('../../../utils/getHeaders')
const { getBlockName } = require('../../../utils/questionPrompts')

/**
 * @implements {apply}
 * @property {boolean} nameIsAvailableLocally
 */
class IdentifyUniqueBlockName {
  constructor() {
    this.nameIsAvailableLocally = false
    this.availableName = null
    this.lastTriedRepoName = ''
    this.newNameToTry = ''
    this.maxTries = 5
    this.nameUpdateStrategies = {
      prefixMyString: (original, lastTried) => {
        let i = 0
        if (original !== lastTried) i = parseInt(lastTried.split('_').pop(), 10)
        return `${original}_${i + 1}`
      },
    }
  }

  async getNewName() {
    let renameFn = this.nameUpdateStrategies.prefixMyString
    if (process.env.BB_CLI_RUN_HEADLESS === 'true') {
      if (global.HEADLESS_CONFIGS) {
        const ex = require(path.resolve(global.HEADLESS_CONFIGS.blockNamingStrategy))
        console.log(typeof ex)
        if (typeof ex === 'function') renameFn = ex
      }
      this.newNameToTry = renameFn(this.requestedBlockName, this.lastTriedRepoName)
      return
    }
    this.newNameToTry = await getBlockName()
  }

  apply(initCore) {
    initCore.hooks.beforeCreateRepo.tapPromise('IdentifyUniqueBlockName', async (/** @type {InitCore} */ core) => {
      const files = await readdir(core.cwd)
      this.requestedBlockName = core.requestedBlockName
      this.lastTriedRepoName = core.requestedBlockName
      this.newNameToTry = core.requestedBlockName

      for (
        let i = 0;
        !this.availableName && i < this.maxTries;
        this.lastTriedRepoName = this.newNameToTry, i += 1, await this.getNewName()
      ) {
        console.log('NEW NAME:', this.newNameToTry)
        this.nameIsAvailableLocally = !files.includes(this.newNameToTry)
        console.log(this.nameIsAvailableLocally)
        if (!this.nameIsAvailableLocally) continue

        let nameAvailable = false
        try {
          const { error, manager } = await GitConfigFactory.init({ gitVendor: service })
          if (error) throw error

          nameAvailable = await manager.checkRepositoryNameAvailability()
          feedback({ type: 'success', message: 'Disconnected git user' })
        } catch (err) {
          feedback({ type: 'error', message: err.message })
        }

        if (nameAvailable) this.availableName = this.newNameToTry
      }
    })
  }
}

module.exports = IdentifyUniqueBlockName
