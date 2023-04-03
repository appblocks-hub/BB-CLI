/* eslint-disable arrow-body-style */
const { execSync } = require('child_process')
const decompress = require('decompress')
const { createWriteStream } = require('fs')
const { tmpdir } = require('os')
const path = require('path')
const { getSourceCodeSignedUrl } = require('../../utils/api')
const { post, axiosGet } = require('../../utils/axios')

const downloadSourceCode = async (url, blockFolderPath, blockName) => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
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
}

const getSignedSourceCodeUrl = async ({ metaData, appId, spaceId, blockId, variantBlockId }) => {
  const postData = {
    block_id: blockId,
    block_version_id: metaData.version_id,
  }

  if (appId) postData.app_id = appId
  if (spaceId) postData.space_id = spaceId
  if (variantBlockId) postData.variant_block_id = variantBlockId

  const { data, error } = await post(getSourceCodeSignedUrl, postData)

  if (error) throw error

  const resData = data.data

  if (resData?.member_blocks_url) {
    return { download_url: resData.download_url, member_blocks_url: resData.member_blocks_url }
  }

  return resData?.download_url
}

const pullSourceCodeFromAppblock = async (options) => {
  const { blockFolderPath, metaData } = options || {}

  const signedSourceCodeUrl = await getSignedSourceCodeUrl(options)
  if (!signedSourceCodeUrl) throw new Error('Error getting source code from appblocks')

  await downloadSourceCode(signedSourceCodeUrl, blockFolderPath, metaData.block_name)
}

module.exports = { pullSourceCodeFromAppblock, downloadSourceCode, getSignedSourceCodeUrl }
