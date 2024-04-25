const { nanoid } = require('nanoid')
const path = require('path')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { downloadSourceCode } = require('./utils')

class DownloadBootstrap {
  constructor(options) {
    const { name, versionId, dest, url, childBlocks, parentManager, rootParentManager, logger, spinnies } = options
    this.versionId = versionId
    this.destination = dest
    this.sourceS3Url = url
    this.config = null
    this.childBlocks = childBlocks
    this.name = name
    this.childPromiseArray = []
    this.parentManager = parentManager
    this.rootParentManager = rootParentManager
    this.logger = logger
    this.spinnies = spinnies
  }

  async getBlock(packages, signed_urls) {
    this.spinnies.add(this.name, { text: `downloading ${this.name}` })

    /**
     * Download and extract zip
     */
    try {
      await downloadSourceCode(this.sourceS3Url, this.destination, this.name)
    } catch (err) {
      const errMsg = `downloading source code of ${this.name} failed`
      this.logger.error(`${errMsg} ${err.message}`)
      this.spinnies.fail(this.name, { text: errMsg })
      return { err: true, msg: errMsg }
    }

    /**
     * Read the config from newly downloaded source code for editing
     */
    const { manager: configManager, error: configCreateError } = await ConfigFactory.create(
      path.join(this.destination, BB_CONFIG_NAME)
    )
    if (configCreateError) {
      this.logger.error(`Error reading config of ${this.name} from ${path.join(this.destination, BB_CONFIG_NAME)}`)
      this.logger.error(`${configCreateError.message}`)
      this.spinnies.fail(this.name, { text: `Error reading config of ${this.name}` })
      return { err: true, msg: `Error reading config of ${this.name}` }
    }
    this.config = { ...configManager.config }

    /**
     * Update the config with new details
     */

    // if versionId is present, remove it
    if (this.config?.versionId) delete this.config.versionId
    this.config.name = this.name
    this.config.variantOf = this.versionId
    this.config.blockId = nanoid()
    this.config.isPublic = this.rootParentManager?.config.isPublic || false
    this.config.source = this.rootParentManager
      ? { ...this.rootParentManager.config.source }
      : { ssh: null, https: null }
    this.config.parentBlockIDs = this.parentManager
      ? [...this.parentManager.config.parentBlockIDs, this.parentManager.config.blockId]
      : []
    this.config.source.branch = `block_${this.name}`
    /**
     * Write the newly generated config to file
     */

    configManager.updateConfig(this.config)

    /**
     * If not a package block return
     */

    if (!this?.childBlocks?.length) {
      let message = `${this?.name} has been added to ${this?.parentManager?.config?.name}`
      if (!this.parentManager) {
        message = `${this?.name} has been downloaded`
      }
      this.spinnies.succeed(this.name, { text: message })
      return {
        err: false,
        msg: message,
        name: this.name,
      }
    }

    this.spinnies.update(this.name, { text: `setting up child blocks of  ${this.name}` })

    /**
     * Details of parent (this) to be passed to child as "parent"
     */

    if (!this.parentManager) {
      this.parentManager = configManager
    }
    if (!this.rootParentManager) {
      this.rootParentManager = configManager
    }

    const loopFn = async (child) => {
      const modifiedChildName = child.child_block_name
      const modifiedChildPath = this.config.dependencies[child.child_block_name].directory

      /**
       * Initialize a new child
       */
      const bootstrap = new DownloadBootstrap({
        name: modifiedChildName,
        versionId: child.child_version_id,
        dest: path.join(this.destination, modifiedChildPath),
        url: signed_urls[child.child_version_id],
        childBlocks: child.child_blocks,
        parentManager: configManager,
        rootParentManager: this.rootParentManager,
        logger: this.logger,
        spinnies: this.spinnies,
      })

      if (child.child_blocks) {
        /**
         * If child is a package block, create a package downloadBootstrap
         * and push to packages promise array
         */
        packages.push(bootstrap)
      } else {
        /**
         * Else create a BlockDownloadBootstrap and push to childPromise array
         */
        await bootstrap.getBlock()
      }

      return true
    }

    /**
     * If there are child blocks, loops and get each of them
     */

    const res = await Promise.allSettled(this.childBlocks.map(loopFn))
    res.forEach(({ value: { err, name } }) => {
      if (err) {
        configManager.removeBlock(name)
      }
    })

    if (this.parentManager.id !== configManager.id) {
      const originalName = this.name
      const newPath = this.parentManager.has(originalName)
        ? this.parentManager.config.dependencies[originalName].directory.replace(originalName, this.name)
        : path.relative(path.resolve(), path.resolve(this.name))
      this.parentManager?.updateConfigDependencies({
        [this.name]: {
          directory: newPath,
        },
      })
      // this.parentManager.removeBlock(originalName)
    }

    if (this.parentManager.id) {
      this.spinnies.succeed(this.name, { text: `${this?.name} has been added to ${this?.parentManager?.config?.name}` })
    } else {
      this.spinnies.succeed(this.name, { text: `${this?.name} has been downloaded` })
    }

    return { err: false, msg: '', name: this.name }
  }
}

module.exports = { DownloadBootstrap }
