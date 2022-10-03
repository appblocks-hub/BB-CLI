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

const stop = async (name) => {
  await appConfig.init()
  if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
    // eslint-disable-next-line no-param-reassign
    name = appConfig.allBlockNames.next().value
  }
  if (!name) {
    stopAllBlock()
  } else if (appConfig.has(name)) {
    if (appConfig.isLive(name)) {
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

async function stopAllBlock() {
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
  stopEmulator()
  // If Killing emulator is successfull, update all function block configs..
  for (const {
    meta: { name },
  } of appConfig.fnBlocks) {
    appConfig.stopBlock = name
  }
}
async function stopBlock(name) {
  const liveDetails = appConfig.getLiveDetailsof(name)
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
