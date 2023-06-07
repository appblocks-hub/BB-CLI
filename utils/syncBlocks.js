/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable camelcase */
const { writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } = require('fs')
const path = require('path')
const axios = require('axios')
const { blocksSync } = require('./api')
const { getShieldHeader } = require('./getHeaders')
const { feedback } = require('./cli-feedback')

/**
 *
 * @param {Number} block_type 1 or 2 or 3
 * @param {String} block_name Long name of block
 * @param {String} block_short_name Preferred short name of block
 * @param {Boolean} is_public Visibility of repo
 * @param {String} github_url Github repo url
 * @param {String} block_desc Description same as github repo description
 * @param {String} job_config Configuration for job
 */
// eslint-disable-next-line consistent-return
async function syncBlocks(block_name_array, block_meta_data_map, currentSpaceID, returnOnError) {
  //   spinnies.add('syncBlocks', { text: `Creating Blocks ` })
try{
  const postData = {
    block_meta_data_map,
    block_name_array,
  }

  const shieldHeader = getShieldHeader()

  shieldHeader.space_id = currentSpaceID

  const res = await axios.post(blocksSync, postData, {
    headers: shieldHeader,
  })

  if (res.data.err) {
    feedback({ type: 'error', message: res.data.msg })
    process.exit(1)
  }

  const resData = res.data.data

  const logOutRoot = path.resolve('logs', 'out')
  const syncLogDirectory = path.join(logOutRoot, 'sync-logs')

  createSyncLogs(syncLogDirectory, resData?.non_available_block_names ?? [], returnOnError)
}catch(err){
  if (returnOnError){
    throw err
  }

}
  // spinnies.succeed('syncBlocks', { text: `Blocks Created Successfully` })
  // spinnies.remove('syncBlocks')
}

function createSyncLogs(directoryPath, fileNames,returnOnError) {
  // Create the directory if it doesn't exist
  if (!existsSync(directoryPath)) {
    mkdirSync(directoryPath, { recursive: true })
    console.log('sync logs created:', directoryPath)
  }


  // Get the list of files in the directory
  const files = readdirSync(directoryPath)

  // Delete files that are not present in the fileNames array
  files.forEach((file) => {
    const filePath = path.join(directoryPath, file)

    if (!fileNames.includes(file)) {
      unlinkSync(filePath)
    }
  })

  // Iterate over the file names and create the files if they don't exist
  fileNames.forEach((fileName) => {
    const filePath = path.join(directoryPath, fileName)

    if (!existsSync(filePath)) {
      writeFileSync(filePath, '', 'utf8')
    } 
  })
  if ( fileNames.length > 0 && returnOnError) {
    throw new Error("BB Sync failed.")
    }
}

module.exports = syncBlocks
