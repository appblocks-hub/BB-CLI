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
 * @property {boolean} nameIsavailabelocally
 */
class IdentifyUniqueBlockName {
  constructor() {
    this.nameIsavailabelocally = false
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
        this.nameIsavailabelocally = !files.includes(this.newNameToTry)
        console.log(this.nameIsavailabelocally)
        if (!this.nameIsavailabelocally) continue
        const nameAvailable = await axios
          .post(
            githubGraphQl,
            {
              query: isRepoNameAvailable.Q,
              variables: {
                user: configstore.get('githubUserName'),
                search: this.newNameToTry,
              },
            },
            { headers: getGitHeader() }
          )
          .then((data) => isRepoNameAvailable.Tr(data))
          .catch((err) => {
            console.log(err)
            return false
          })

        if (nameAvailable) this.availableName = this.newNameToTry
      }
    })
  }
}

module.exports = IdentifyUniqueBlockName
