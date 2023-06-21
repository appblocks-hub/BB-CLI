/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
// const { execSync } = require('child_process')
const { spinnies } = require('../../loader')

const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { getBlockVersions, sellFreeBlock } = require('./util')
const { readInput } = require('../../utils/questionPrompts')


const publish = async (bkName,cmdOptions) => {
  const configPath = path.resolve(BB_CONFIG_NAME)
  const { manager: cm, error } = await ConfigFactory.create(configPath)
  if (error) {
    if (error.type !== 'OUT_OF_CONTEXT') throw error
    throw new Error('Please run the command inside package context ')
  }

  const manager = cm
  const blockName = bkName || manager.config.name
  let blockManager
  let versionData

  try {
    if (blockName===manager.config.name){
      blockManager=cm
    }else{
      blockManager = await manager.getAnyBlock(blockName)
      if (!blockManager)  throw new Error(`${blockName} block not found`)
    }

    if (manager.config.repoType === 'mono') {
      versionData = await getBlockVersions(blockManager.config.blockId, cmdOptions.version)



      const blockDisplayName = await readInput({
        name: 'blockDisplayName',
        message: 'Enter the block display name',
        validate: (input) => {
          if (!input?.length > 0) return `Please enter a non empty block display name`
          return true
        },
      })

      const blockDevelopmentCost=await readInput({
        name: 'blockDevelopmentCost',
        message: 'Enter the block development cost in USD (optional)',
      })

      const blockDevelopmentEffort=await readInput({
        name: 'blockDevelopmentCost',
        message: 'Enter the block development effort in hours (optional)',
      })


     const submissionData= await sellFreeBlock({block_id:blockManager.config.blockId,item_name:blockDisplayName,development_cost:parseFloat(blockDevelopmentCost),development_effort:parseFloat(blockDevelopmentEffort),block_version:versionData.id})
  
    console.log(`Block published to store successfully.Submission ID is ${submissionData}`)
     
    }else throw new Error(`Please check repoType is mono or multi`)


    spinnies.stopAll()
  } catch (err) {
    spinnies.add('p1', { text: 'Error' })
    spinnies.fail('p1', { text: err.message })
    spinnies.stopAll()
  }
}

module.exports = publish
