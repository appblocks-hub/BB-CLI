const chalk = require('chalk')
const decompress = require('decompress')
const { execSync } = require('child_process')
const path = require('path')
const { createWriteStream, mkdirSync, writeFileSync } = require('fs')
const { tmpdir } = require('os')
const { Logger } = require('../../utils/loggerV2')
const { getBlockFromStoreFn } = require('../../utils/registryUtils')
const { axiosGet } = require('../../utils/axios')

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

class PackageBootstrap {
  constructor(name,dest, url,config,childBlocks) {
    this.destination = dest
    this.sourceS3Url = url
    this.config = config
    this.childBlocks = childBlocks
    this.name = name
  }

  async bootstrap() {
    await downloadSourceCode(this.sourceS3Url, this.destination,this.name )
    if(!this.childBlocks?.length) return;
    this.childBlocks.forEach(child=>)
  }


}

async function get(blockname) {
  const { logger } = new Logger('get')
  const [spacename, name] = blockname.split('@')
  const {
    status,
    data: { err, data },
  } = await getBlockFromStoreFn(name, spacename)
  console.log(data.data)

  const packageBlockVersionId = data.data.block_version_id

  const packageDownloadUrl = data.data.signed_urls[packageBlockVersionId]

  await downloadSourceCode(packageDownloadUrl, path.resolve(data.data.block_name), data.data.block_name)

  const packagePath = path.resolve(data.data.app_config.name)

  // const deps = packageConfig.dependencies
  // const urls = []
  // Object.values(data.data.signed_urls).forEach((v) => {
  //   console.log(v)
  //   urls.push(v)
  // })

  // for (let i = 0; i < urls.length; i += 1) {
  //   const url = urls[i]
  //   await downloadSourceCode(url, '.', `a${i}`)
  // }
  // if (err) return
  // if (status === 204) {
  //   console.log(`${chalk.whiteBright(blockname)} doesn't exists in block repository`)
  // }
  // logger.info('blah')
}

module.exports = get
