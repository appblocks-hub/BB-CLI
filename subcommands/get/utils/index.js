const path = require('path')
const decompress = require('decompress')
const { execSync } = require('child_process')
const { createWriteStream } = require('fs')
const { tmpdir } = require('os')
const { axiosGet } = require('../../../utils/axios')

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

module.exports = { downloadSourceCode }
