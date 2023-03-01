const { SyncHook, AsyncSeriesBailHook, AsyncSeriesHook } = require('tapable')
const { readFile } = require('fs/promises')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')
const chalk = require('chalk')
const { feedback } = require('../../utils/cli-feedback')
const { confirmationPrompt, readInput } = require('../../utils/questionPrompts')
const { getConfigFromRegistry, getBlockDetails } = require('../../utils/registryUtils')

/**
 * Gets a name from user and checks against the registry and returns block details or
 * if user types 'exit' returns null
 * @returns {Promise<import('../utils/jsDoc/types').blockMetaData?>}
 */
async function getPackageNameAndPullDetails() {
  let blockDetails
  await readInput({
    name: 'cablxnm',
    message: `Enter the appname ${chalk.dim('(enter "exit" to quit)')}`,
    validate: async function test(ans) {
      if (!ans) return 'Should not be empty'
      if (ans === 'exit') return true
      const r = await getBlockDetails(ans)
        .then((res) => {
          if (res.status === 204) {
            return `${ans} not found in registry.`
          }
          if (res.data.err) {
            return `Error getting details..`
          }
          // Make sure it is registered as package, else unregistered
          if (res.data.data.BlockType !== 1) {
            return `${ans} is not registered as appblock`
          }
          // eslint-disable-next-line no-param-reassign
          blockDetails = { ...res.data.data }
          return true
        })
        .catch(() => 'Something went terribly wrong...')
      return r
    },
  })
  return blockDetails || null
}

async function handleNoPackageConfig() {
  let isRegistered = false
  let metaData = null
  const alreadyregistered = await confirmationPrompt({
    name: 'alreadyregistered',
    message: 'Are you trying to rebuild an already registered app',
  })
  if (alreadyregistered) {
    /** @type {import('../utils/jsDoc/types').blockMetaData?} */
    let packageDetails = await getPackageNameAndPullDetails()

    // Loop until user enters "exit" or gives a block name that is registered
    // as package and has a valid config in registry
    for (; packageDetails !== null; ) {
      metaData = { ...packageDetails }
      isRegistered = true
      feedback({ type: 'info', message: `${packageDetails.BlockName} is registered` })
      const config = await getConfigFromRegistry(packageDetails.ID)
      if (config) {
        this.packageConfigFromRegistry = config
        feedback({ type: 'info', message: `${packageDetails.BlockName} has a config in registry` })
        break
      }
      feedback({ type: 'info', message: `${packageDetails.BlockName} has no config in registry` })
      packageDetails = await getPackageNameAndPullDetails()
    }
  }
  return { metaData, isRegistered }
}

function scanHelper() {
  let r = ''
  switch (os.platform()) {
    case 'darwin':
      r = ''
      break
    case 'win32':
      r = ''
      break
    case 'linux':
      try {
        r = execSync(
          'find "$(pwd)" -mindepth 2 -type d -name node_modules -prune -false -o -name .git -prune -false -o -name "block.config.json" -print0 | xargs -0 --replace={} bash -c  "dirname {}"'
        )
          .toString()
          .trimEnd()
          .split('\n')
      } catch (err) {
        r = ''
      }
      break
    default:
      console.log(`OS not supported...`)
      break
  }
  return r
}

/**
 * The basic sync class completes in 3 steps
 * 1. Scan through all the sub directories for block.config.json
 * 2. Prepare the package config
 * 3. Write the package config
 */
class SyncCore {
  constructor() {
    this.hooks = {
      beforeEnv: new SyncHook(['arg1']),
      afterEnv: new SyncHook(['arg1']),
      /**
       * Called just after loading local config
       */
      onLocalConfigLoad: new AsyncSeriesBailHook(),
      onRegistryConfigLoad: new AsyncSeriesBailHook(),
      beforeWalk: new AsyncSeriesHook(['core']),
      afterWalk: new AsyncSeriesHook(['core']),
      beforeGenerateConfig: new AsyncSeriesHook(['core']),
      afterGenerateConfig: new AsyncSeriesHook(),
      beforeConfigWrite: '',
      afterConfigWrite: '',
    }

    /**
     *
     * @type {string}
     */
    this.packageConfigFileName = 'block.config.json'

    /**
     * Type of context to work in
     * @type {string}
     */
    this.packageTypeName = 'package'

    /**
     * package block in context is registered as package block
     * @type {boolean}
     */
    this.IsRegistered = false

    /**
     * Block details from regisrtry
     * @type {import("../utils/jsDoc/types").blockMetaData | null}
     */
    this.metaData = null

    /**
     *
     * @type {boolean}
     */
    this.isInsidePackage = false

    /**
     * Config of package block pulled from registry, if present
     * @type {import("../utils/jsDoc/types").appblockConfigShape | null}
     */
    this.packageConfigFromRegistry = null

    /**
     * Config of pacakge present locally
     * @type {import("../utils/jsDoc/types").appblockConfigShape | null}
     */
    this.packageConfigInLocal = null

    /**
     * Sub directories with <packageConfigFileName> file present
     * blocks from this list that are used will be removed
     * @type {Array<string>?}
     */
    this.blockDirectoriesFound = null

    /**
     * Block directories that failed <packageConfigFileName> validation
     * To keep the blocks that are untouched and discarded
     * @type {Array<string>}
     */
    this.discardedBlockDirectories = null

    /**
     * List of blocks to be written to the config file
     * @type {Array<string>}
     */
    this.dependencies = null
  }

  /**
   * Read the json with name in this.packageConfigFileName
   * parse and set this.packageConfigInLocal
   * @returns {Promise<undefined>}
   */
  async readConfig() {
    try {
      this.packageConfigInLocal = await readFile(this.packageConfigFileName, { encoding: 'utf8' }).then((_d) =>
        JSON.parse(_d)
      )
    } catch (err) {
      console.log(err)
      this.packageConfigInLocal = null
    }
  }

  async setEnvironment() {
    this.hooks.beforeEnv.call('sed')
    await this.readConfig()
    if (this.packageConfigInLocal) {
      feedback({ type: 'info', message: 'Found block.config.json' })
      // this.hooks.onLocalConfigLoad.callAsync()
    } else {
      const { metaData, isRegistered } = await handleNoPackageConfig.call(this)
      this.metaData = metaData
      this.IsRegistered = isRegistered
    }
    this.hooks.afterEnv.call('tata')
  }

  async scanDirs() {
    await this.hooks.beforeWalk?.promise(this)
    this.blockDirectoriesFound = scanHelper() || null

    if (this.blockDirectoriesFound.length) {
      console.log(`Found ${this.blockDirectoriesFound.length} child directories with block.config.json`)
    }
    await this.hooks.afterWalk?.promise(this)
  }

  async loadBlockConfigs() {
    this.dependencyList = this.blockDirectoriesFound.reduce(async (acc, curr) => {
      const configPath = path.resolve(curr, this.packageConfigFileName)
      try {
        const parsedConfig = await readFile(configPath).then((_d) => JSON.parse(_d))
        return acc.concat(parsedConfig)
      } catch (err) {
        // console.log(err.message)
        return acc
      }
    }, [])
  }

  async buildDepList() {
    const core = this
    this.hooks.beforeGenerateConfig?.callAsync(core, () => {})
    console.log('build step')
    console.log(this.blockDirectoriesFound)
  }
}

module.exports = SyncCore