const { AsyncSeriesHook } = require('tapable')
const path = require('path')

const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const { DownloadBootstrap } = require('./downloadBootstrap')

/**
 * @class
 */
class GetCore {
  /**
   * @param {string} appBlockName
   * @param {} options
   */
  constructor(component, options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = [component]
    this.cmdOpts = options
    this.logger = logger

    /**
     * @type {spinnies}
     */
    this.spinnies = spinnies

    this.manager = {}
    this.pullPackages = []

    this.hooks = {
      beforeGet: new AsyncSeriesHook(['context', 'logger']),
      afterGet: new AsyncSeriesHook(['context', 'logger']),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async initializeConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { error, manager } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      // throw new Error('command can be used only inside package context')
    }

    if (manager instanceof BlockConfigManager) {
      throw new Error('command cannot be used inside block context')
    }

    this.manager = manager
  }

  async get() {
    this.logger.info('get command')

    await this.hooks.beforeGet?.promise(this, this.logger)

    // get block
    const bootstrap = new DownloadBootstrap({
      name: this.pullBlockData.block_name,
      versionId: this.pullBlockData.block_version_id,
      dest: path.resolve(this.pullBlockData.block_name),
      url: this.pullBlockData.signed_urls[this.pullBlockData.block_version_id],
      childBlocks: this.pullBlockData.child_blocks,
      parentManager: this.manager,
      rootParentManager: this.pullBlockData.rootParentManager,
      logger: this.logger,
      spinnies: this.spinnies,
    })

    if (this.pullBlockData.block_type === 1) {
      this.logger.info(`block type is package`)
      this.pullPackages.push(bootstrap)
    } else {
      this.logger.info(`block type is not package`)
      await bootstrap.getBlock()
    }

    /**
     * Loop till not more packages to get
     */
    while (this.pullPackages.length > 0) {
      const currentPackage = this.pullPackages.pop()
      this.spinnies.add(currentPackage.name, { text: `bootstrapping ${currentPackage.name} for download` })
      console.log(`Bootstrapping ${currentPackage.name}`)
      await currentPackage.getBlock(this.pullPackages, this.pullBlockData.signed_urls)
    }

    await this.hooks.afterGet?.promise(this, this.logger)
  }
}

module.exports = GetCore
