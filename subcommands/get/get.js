/* eslint-disable */
const decompress = require('decompress')
const { execSync } = require('child_process')
const path = require('path')
const { createWriteStream, readFileSync } = require('fs')
const { tmpdir } = require('os')
const { Logger } = require('../../utils/loggerV2')
const { getBlockFromStoreFn } = require('../../utils/registryUtils')
const { axiosGet } = require('../../utils/axios')
const { readJsonAsync } = require('../../utils')
const { BB_CONFIG_NAME } = require('../../utils/constants')

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
  constructor(name, dest, url, childBlocks) {
    this.destination = dest
    this.sourceS3Url = url
    this.config = null
    this.childBlocks = childBlocks
    this.name = name
    this.childPromiseArray = []
  }

  async bootstrap(packages, signed_urls) {
    console.log(`Running bootstrap for ${this.name}`)

    /**
     * Download and extract zip
     */
    await downloadSourceCode(this.sourceS3Url, this.destination, this.name)

    /**
     * Read the config from newly downloaded souce code for editing
     */
    const { data: conf, err: _err } = await readJsonAsync(path.join(this.destination, BB_CONFIG_NAME))
    if (_err) {
      console.log('Error reading config from package')
      process.exit(1)
    }
    this.config = conf
    // for testing
    // if (this.name === 'mytester') {
    //   this.config.dependencies['pck2'] = { directory: 'pck2' }
    // }
    // if (this.name === 'pck2') {
    //   this.config.dependencies['mytFn1'] = { directory: 'g/mytFn1' }
    //   this.config.dependencies['mytSharedFn1'] = { directory: 'g/mytSharedFn1' }
    // }
    // use for block

    /**
     * If not a pakage block return
     */
    if (!this.childBlocks?.length) return
    console.log(`setting up child blocks of ${this.name} `)

    const t = (child) => {
      const p = new Bootstrap(
        child.child_block_name,
        path.join(this.destination, this.config.dependencies[child.child_block_name].directory),
        signed_urls[child.child_version_id],
        child.child_blocks
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
    this.childBlocks.forEach(t)
    const res = await Promise.allSettled(this.childPromiseArray.map((v) => v.bootstrap()))
    console.log(res)
  }
}

async function get(blockname) {
  const { logger } = new Logger('get')
  let [spacename, name] = blockname.split('/')
  if (spacename) {
    spacename = spacename.replace('@', '')
  }
  if (!name) {
    spacename = configstore.get('currentSpaceName')
  }
  const packages = []
  logger.info(`User call with ${blockname}`)
  logger.debug(`spacename:${spacename}`)
  logger.debug(`name:${name}`)

  const {
    data: { err, data },
  } = await getBlockFromStoreFn(name, spacename)
  if (err) {
    console.log(err.message)
    logger.error(err.message)
    process.exit(1)
  }
  let { err: error, msg, data: blockData } = data
  // blockData = JSON.parse(readFileSync(path.resolve('zc.json')))
  // console.log(JSON.stringify(blockData, null, 2))
  if (error) {
    console.log(error)
    logger.error(`Error from server: ${msg}`)
    process.exit(1)
  }

  const { block_version_id, block_name, block_type, child_blocks, signed_urls } = blockData

  if (block_type === 1) {
    logger.info(`block type is package`)
    const p = new Bootstrap(block_name, path.resolve(block_name), signed_urls[block_version_id], child_blocks)
    packages.push(p)
  }

  if (block_type !== 1) {
    logger.info(`block type is not pacakage`)
    await new Bootstrap(block_name, path.resolve(block_name), signed_urls[block_version_id]).bootstrap()
  }

  /**
   * Loop till not more packages to get
   */
  for (; packages.length > 0; ) {
    const b = packages.pop()
    console.log(`Bootstrapping ${b.name}`)
    await b.bootstrap(packages, signed_urls)
  }
}

module.exports = get
