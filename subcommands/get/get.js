const { nanoid } = require('nanoid')
const { writeFile } = require('fs/promises')
const decompress = require('decompress')
const { execSync } = require('child_process')
const path = require('path')
const { createWriteStream } = require('fs')
const { tmpdir } = require('os')
const { Logger } = require('../../utils/loggerV2')
const { getBlockFromStoreFn } = require('../../utils/registryUtils')
const { axiosGet } = require('../../utils/axios')
const { readJsonAsync } = require('../../utils')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const { configstore } = require('../../configstore')

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
  constructor(name, versionId, dest, url, childBlocks, parent, logger) {
    this.versionId = versionId
    this.destination = dest
    this.sourceS3Url = url
    this.config = null
    this.childBlocks = childBlocks
    this.name = name
    this.childPromiseArray = []
    this.parent = parent
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
    const { data: conf, err: errorReadindConfig } = await readJsonAsync(path.join(this.destination, BB_CONFIG_NAME))
    if (errorReadindConfig) {
      this.logger.error(`Error reading config of ${this.name} from ${path.join(this.destination, BB_CONFIG_NAME)}`)
      this.logger.error(`${errorReadindConfig.message}`)
      return { err: true, msg: `Error reading config of ${this.name}` }
    }
    this.config = conf

    /**
     * Update the config with new details
     */

    // eslint-disable-next-line dot-notation
    this.config['variantOf'] = this.versionId
    this.config.blockId = nanoid()
    this.config.isPublic = this.parent?.isPublic || false
    this.config.source.branch = `block_${this.name}`
    this.config.parentBlockIDs = this.parent ? [...this.parent.parentBlockIDs, this.parent.blockId] : []

    /**
     * Write the newly generated config to file
     */
    try {
      await writeFile(path.join(this.destination, BB_CONFIG_NAME), JSON.stringify(this.config, null, 2))
    } catch (err) {
      this.logger.error(
        `Error writing updated config of ${this.name} of ${this.parent.name} at ${path.join(
          this.destination,
          BB_CONFIG_NAME
        )}`
      )
      this.logger.error(`${err.message}`)
      return { err: true, msg: `Error writing config of ${this.name}` }
    }

    /**
     * If not a package block return
     */
    if (!this.childBlocks?.length) return { err: false, msg: `${this.name} has been added to ${this.parent.name}` }

    console.log(`setting up child blocks of ${this.name} `)

    const loopFn = (child) => {
      /**

       * Details of parent (this) to be passed to child as "parent"
       */
      const m = {
        name: this.name,
        isPublic: this.config.isPublic,
        blockId: this.config.blockId,
        parentBlockIDs: this.config.parentBlockIDs,
      }
      /**
       * Initialize a new child
       */
      const p = new Bootstrap(
        child.child_block_name,
        child.child_version_id,
        path.join(this.destination, this.config.dependencies[child.child_block_name].directory),
        signed_urls[child.child_version_id],
        child.child_blocks,
        m,
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
    res.forEach(({ value: { err, msg } }) => {
      console.log(`${err ? `ERROR:${msg}` : msg}`)
    })
    return { err: false, msg: '' }
  }
}

async function get(blockname) {
  const { logger } = new Logger('get')

  // eslint-disable-next-line prefer-const
  let [spacename, name] = blockname.split('/')
  if (spacename) {
    spacename = spacename.replace('@', '')
  }
  if (!name) {
    spacename = configstore.get('currentSpaceName')
  }

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
  } = await getBlockFromStoreFn(name, spacename)
  if (err) {
    console.log(err.message)
    logger.error(err.message)
    process.exit(1)
  }

  const { err: error, msg, data: blockData } = data

  if (error) {
    console.log(msg)
    logger.error(`Error from server: ${msg}`)
    process.exit(1)
  }

  const { block_version_id, block_name, block_type, child_blocks, signed_urls } = blockData
  const p = new Bootstrap(
    block_name,
    block_version_id,
    path.resolve(block_name),
    signed_urls[block_version_id],
    child_blocks,
    manager
      ? {
          name: manager.config.name,
          blockId: manager.config.blockId,
          isPublic: manager.config.isPublic || false,
          parentBlockIDs: [],
        }
      : null,
    logger
  )

  if (block_type === 1) {
    logger.info(`block type is package`)
    packages.push(p)
  }

  if (block_type !== 1) {
    logger.info(`block type is not pacakage`)
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
      [block_name]: { directory: path.relative(path.resolve(), path.resolve(block_name)) },
    },
  })
}

module.exports = get
