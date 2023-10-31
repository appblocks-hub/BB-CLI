/* eslint-disable prefer-destructuring */
const { nanoid } = require('nanoid')
const decompress = require('decompress')
const { execSync } = require('child_process')
const path = require('path')
const { createWriteStream } = require('fs')
const { tmpdir } = require('os')
const chalk = require('chalk')
const { Logger } = require('../../utils/loggerV2')
const { getBlockFromStoreFn } = require('../../utils/registryUtils')
const { axiosGet } = require('../../utils/axios')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const { feedback } = require('../../utils/cli-feedback')
// const { headLessConfigStore } = require('../../configstore')

const downloadSourceCode = async (url, blockFolderPath, blockName) =>
  // eslint-disable-next-line no-async-promise-executor
  new Promise(async (resolve, reject) => {
    const tempPath = path.join(tmpdir(), `${blockName}.zip`)
    const writer = createWriteStream(tempPath)

    const { data, error } = await axiosGet(url, {
      responseType: 'stream',
      noHeaders: true,
    })

    if (error) {
      reject(error)
      return
    }

    if (!data) {
      reject(new Error('No source code found'))
      return
    }

    data.pipe(writer)
    writer.on('error', (err) => reject(err))
    writer.on('finish', async () => {
      writer.close()
      await decompress(tempPath, blockFolderPath)
      execSync(`rm -r ${tempPath}`)
      return resolve(true)
    })
  })

class Bootstrap {
  constructor(name, versionId, dest, url, childBlocks, parentManager, rootParentManager, logger) {
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
  }

  async bootstrap(packages, signed_urls) {
    console.log(`downloading ${this.name}`)

    /**
     * Download and extract zip
     */
    try {
      await downloadSourceCode(this.sourceS3Url, this.destination, this.name)
    } catch (err) {
      this.logger.error(`downloading source code of ${this.name} failed ${err.message}`)
      return { err: true, msg: `downloading source code of ${this.name} failed` }
    }

    /**
     * Read the config from newly downloaded souce code for editing
     */
    const { manager: configmanager, error: configCreateError } = await ConfigFactory.create(
      path.join(this.destination, BB_CONFIG_NAME)
    )
    if (configCreateError) {
      this.logger.error(`Error reading config of ${this.name} from ${path.join(this.destination, BB_CONFIG_NAME)}`)
      this.logger.error(`${configCreateError.message}`)
      return { err: true, msg: `Error reading config of ${this.name}` }
    }
    this.config = { ...configmanager.config }

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
    configmanager.updateConfig(this.config)

    /**
     * If not a package block return
     */
    if (!this.childBlocks?.length)
      return { err: false, msg: `${this.name} has been added to ${this.parentManager.config.name}`, name: this.name }

    console.log(`setting up child blocks of ${this.name} `)

    /**
     * Details of parent (this) to be passed to child as "parent"
     */

    if (!this.parentManager) {
      this.parentManager = configmanager
    }
    if (!this.rootParentManager) {
      this.rootParentManager = configmanager
    }

    const m = configmanager

    const loopFn = (child) => {
      /**
       * All block name should be prependend with the root package block name
       */
      // const modifiedChildName = `${this.rootParentManager.config.name}_${child.child_block_name}`
      // const modifiedChildPath = this.config.dependencies[child.child_block_name].directory.replace(
      //   child.child_block_name,
      //   modifiedChildName
      //   )
      const modifiedChildName = child.child_block_name
      const modifiedChildPath = this.config.dependencies[child.child_block_name].directory

      /**
       * Initialize a new child
       */
      const p = new Bootstrap(
        modifiedChildName,
        child.child_version_id,
        path.join(this.destination, modifiedChildPath),
        signed_urls[child.child_version_id],
        child.child_blocks,
        m,
        this.rootParentManager,
        this.logger
      )
      /**
       * If child is a package block, create a package bootstrap
       * and push to packages promise array
       */
      if (child.child_blocks) {
        packages.push(p)
        return
      }
      /**
       * Else create a BlockBootstrap and push to childPromise array
       */
      this.childPromiseArray.push(p)
    }

    /**
     * If there are child blocks, loops and get each of them
     */
    this.childBlocks.forEach(loopFn)
    const res = await Promise.allSettled(this.childPromiseArray.map((v) => v.bootstrap()))
    res.forEach(({ value: { err, msg, name } }) => {
      console.log(`${err ? `ERROR:${msg}` : msg}`)
      if (!err) {
        // const [_, ...originalNameArray] = name.split('_')
        // const originalName = originalNameArray.join('_')
        // const originalName = name
        // configmanager.updateConfigDependencies({
        //   [name]: {
        //     directory: this.config.dependencies[originalName].directory.replace(originalName, name),
        //   },
        // })
        // configmanager.removeBlock(originalName)
      }
      if (err) {
        console.log(`Error getting ${name}, removing from config`)
        configmanager.removeBlock(name)
      }
    })

    if (this.parentManager.id !== configmanager.id) {
      // const [_, ...originalNameArray] = this.name.split('_')
      // const originalName = originalNameArray.join('_')
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
    return { err: false, msg: '', name: this.name }
  }
}

async function get(blockname) {
  const { logger } = new Logger('get')
  try {
    // eslint-disable-next-line prefer-const
    const s = blockname.split('/')
    let rootBlockName = ''
    let spacename = ''
    let name = ''
    if (s.length === 1) {
      // rootname and blockname is same
      name = s[0]
      rootBlockName = s[0]
    } else if (s.length >= 2) {
      if (s[0][0] === '@') {
        spacename = s[0]
        rootBlockName = s[1]
        name = s[s.length - 1]
      } else {
        rootBlockName = s[0]
        name = s[s.length - 1]
      }
    }
    if (spacename) {
      spacename = spacename.replace('@', '')
    }
    if (!spacename) {
      console.log(`Must provide a space name`)
      console.log(chalk.dim('bb get @<spacename>/blockname'))
      return
      // spacename = headLessConfigStore().get('currentSpaceName')
    }

    // console.log({ spacename })
    // console.log({ rootBlockName })
    // console.log({ name })

    /**
     * To store the inner root nodes of tree
     */
    const packages = []
    logger.info(`User call with ${blockname}`)
    logger.debug(`spacename:${spacename}`)
    logger.debug(`name:${name}`)

    const { manager, error: managerError } = await ConfigFactory.create(path.resolve(BB_CONFIG_NAME))

    /**
     * OUT_OF_CONTEXT can be ignored, as user can get blocks outside of block context
     */
    if (managerError && managerError.type !== 'OUT_OF_CONTEXT') {
      console.log(managerError.message)
      return
    }
    if (manager instanceof BlockConfigManager) {
      console.log('Move out to a package block context')
      return
    }

    const {
      data: { err, data },
    } = await getBlockFromStoreFn(name, spacename, rootBlockName)
    if (err) {
      logger.error(err?.message || err)
      process.exit(1)
    }

    const { err: error, msg, data: blockData } = data

    if (error) {
      logger.error(`Error from server: ${msg}`)
      process.exit(1)
    }

    const { block_version_id, block_name, block_type, child_blocks, signed_urls } = blockData

    let rootParentManager = null
    if (manager) {
      const { rootManager } = await manager.findMyParents()
      rootParentManager = rootManager
    }

    if (manager && block_type === 9) {
      console.log('Move out to non package context')
      return
    }

    if (!manager && block_type === 1) {
      // we are not inside a package context
    }
    if (!manager && block_type !== 1) {
      // todo
    }

    const p = new Bootstrap(
      block_name,
      block_version_id,
      path.resolve(block_name),
      signed_urls[block_version_id],
      child_blocks,
      manager,
      rootParentManager,
      logger
    )

    if (block_type === 1) {
      logger.info(`block type is package`)
      packages.push(p)
    }

    if (block_type !== 1) {
      logger.info(`block type is not package`)
      await p.bootstrap()
    }

    /**
     * Loop till not more packages to get
     */
    for (; packages.length > 0; ) {
      const b = packages.pop()
      console.log(`Bootstrapping ${b.name}`)
      const { err: _error, msg: _message } = await b.bootstrap(packages, signed_urls)
      console.log(`${err ? `ERROR:${_message}` : _message}`)
    }

    /**
     * Update the block config
     */
    manager?.updateConfig({
      dependencies: {
        ...manager.config.dependencies,
        [block_name]: {
          directory: path.relative(path.resolve(), path.resolve(block_name)),
        },
      },
    })

    feedback({ message: 'SUCCESS', type: 'success' })
  } catch (error) {
    logger.error(error.message || error)
  }
}

module.exports = get
