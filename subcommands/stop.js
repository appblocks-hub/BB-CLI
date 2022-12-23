/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { execSync } = require('child_process')
const { stopEmulator } = require('../utils/emulator-manager')
const { appConfig } = require('../utils/appconfigStore')

global.rootDir = process.cwd()

const stop = async (name, options) => {
  const { global: isGlobal } = options

  await appConfig.init(null, null, null, { isGlobal })

  if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
    // eslint-disable-next-line no-param-reassign
    name = appConfig.allBlockNames.next().value
  }
  if (!name) {
    if ([...appConfig.allBlockNames].length <= 0) {
      console.log('\nNo blocks to stop!\n')
      process.exit(1)
    }

    // let localRegistry
    if (isGlobal) {
      // localRegistry = appConfig.lrManager.localRegistry

      const { localRegistryData } = appConfig.lrManager
      for (const pck in localRegistryData) {
        if (Object.hasOwnProperty.call(localRegistryData, pck)) {
          // console.log(`---Stopping blocks in ${pck}---`)
          const { rootPath } = localRegistryData[pck]
          await appConfig.init(rootPath, null, null, { isGlobal: false, reConfig: true })
          stopAllBlock(rootPath)
        }
      }
      return
    }
    stopAllBlock('.')
  } else if (appConfig.has(name)) {
    if (appConfig.isLive(name)) {
      for (const blck of appConfig.fnBlocks) {
        if (blck.meta.name === name) {
          console.log(`${name} is a function block`)
          console.log(`All functions will be stopped`)
        }
      }
      stopBlock(name)
    } else {
      console.log(`${chalk.whiteBright(name)} is not a live block.`)
      console.log(`Use ${chalk.italic(`block start ${name}`)} to start the block`)
    }
  } else {
    // TODO -- throw a no block found error and handle it in index by displaying all availbale live blocks
    console.log(chalk.red(`No block named ${chalk.bold(name)} found!`))
    console.log(`Currently live blocks are:`)
    for (const {
      meta: { name: blockname },
    } of appConfig.liveBlocks) {
      console.log(blockname)
    }
  }
}

async function stopAllBlock(rootPath) {
  if ([...appConfig.liveJobBlocks].length !== 0) {
    console.log('\nJob blocks are live! Please stop jobs and try again\n')
    process.exit(1)
  }

  if ([...appConfig.liveBlocks].length === 0) {
    console.log('\nNo blocks are live!\n')
    process.exit(1)
  }

  for (const {
    meta: { name },
  } of appConfig.uiBlocks) {
    if (appConfig.isLive(name)) {
      await stopBlock(name)
    }
  }

  stopEmulator(rootPath)
  // If Killing emulator is successfull, update all function block configs..
  for (const {
    meta: { name },
  } of appConfig.fnBlocks) {
    appConfig.stopBlock = name
  }
  // If Killing emulator is successfull, update all job block configs..
  for (const {
    meta: { name },
  } of appConfig.jobBlocks) {
    appConfig.stopBlock = name
  }
}

async function stopBlock(name) {
  const liveDetails = appConfig.getLiveDetailsof(name)
  if (liveDetails.isJobOn) {
    console.log('\nLive Job found for this block! Please stop job and try again\n')
    process.exit(1)
  }
  try {
    // process.kill(blockToStart.pid, 'SIGKILL')
    execSync(`pkill -s ${liveDetails.pid}`)
    appConfig.stopBlock = name
  } catch (e) {
    console.log('Error in stopping block process with pid ', liveDetails.pid)
    console.log(e)
  }

  console.log(`${name} stopped successfully!`)
}

module.exports = stop
