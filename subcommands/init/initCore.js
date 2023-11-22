const { AsyncSeriesHook } = require('tapable')
const path = require('path')
const { writeFile, mkdir } = require('fs/promises')
const chalk = require('chalk')

const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { generateFunctionReadme } = require('../../templates/createTemplates/function-templates')
const { headLessConfigStore } = require('../../configstore')

/**
 * @class
 */
class InitCore {
  /**
   * @param {string} appBlockName
   * @param {} options
   */
  constructor(packageName, options, logger) {
    this.cwd = process.cwd()

    this.cmdArgs = [packageName]
    this.cmdOpts = options
    this.logger = logger

    this.packageName = packageName
    this.appblockVersions = [{ version: '1.0.0' }]
    this.useTemplate = false
    this.templateOptions = {}
    this.packageConfig = {}
    
    this.hooks = {
      setTemplate: new AsyncSeriesHook(['context', 'logger']),
      beforeInit: new AsyncSeriesHook(['context', 'logger']),
      afterInit: new AsyncSeriesHook(['context', 'logger']),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async initializeConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      return
    }

    throw new Error('command can be used only outside package/block context')
  }

  async init() {
    this.logger.info('init command')

    await this.hooks.beforeInit?.promise(this, this.logger)

    /**
     * Create a new package directory, assume there is no name conflict for dir name
     */
    const DIR_PATH = path.join(path.resolve(this.packageName))
    mkdir(DIR_PATH, { recursive: true })

    headLessConfigStore(DIR_PATH).set('gitVisibility', this.packageConfig.isPublic ? 'PUBLIC' : 'PRIVATE')

    writeFile(path.join(DIR_PATH, 'block.config.json'), JSON.stringify(this.packageConfig, null, 2))

    const readmeString = generateFunctionReadme(this.packageName)
    writeFile(`${DIR_PATH}/README.md`, readmeString)

    this.templateOptions = { DIR_PATH, packageConfig: this.packageConfig }

    await this.hooks.setTemplate?.promise(this, this.logger)

    console.log('\nExcellent!! You are good to start.')
    console.log(`New Appblocks project ${this.packageName} is created.`)
    console.log(chalk.dim(`\ncd ${this.packageName} and start hacking\n`))

    await this.hooks.afterInit?.promise(this, this.logger)
  }
}

module.exports = InitCore
