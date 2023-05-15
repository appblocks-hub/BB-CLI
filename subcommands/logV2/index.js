/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { existsSync, createReadStream, watchFile } = require('fs')
const path = require('path')
const { appConfig } = require('../../utils/appconfigStore')

const log = async (blockName, { err, out }) => {
  await appConfig.init()
  if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
    blockName = appConfig.allBlockNames.next().value
  }

  const logOutRoot = path.resolve('logs', 'out')
  const fnOutLogs = path.join(logOutRoot, 'functions.log')
  const eleOutLogs = path.join(logOutRoot, 'elements.log')

  const logErrRoot = path.resolve('logs', 'err')
  const fnErrLogs = path.join(logErrRoot, 'functions.log')
  const eleErrLogs = path.join(logErrRoot, 'elements.log')

  const filesToWatch = []

  if (blockName) {
    if (!appConfig.has(blockName)) {
      console.log(`Block doesn't exist`)
      return
    }
    if (!appConfig.isLive(blockName)) {
      console.log(`${blockName} is not live.`)
      console.log(`Run bb start ${blockName} to start the block.`)
      return
    }

    console.log(`Showing log of ${blockName}`)
    const appLiveData = appConfig.getBlockWithLive(blockName)
    const logOutPath = appLiveData.meta.type === 'function' ? fnOutLogs : appLiveData.log.out
    const logErrPath = appLiveData.meta.type === 'function' ? fnErrLogs : appLiveData.log.err

    if (err) {
      filesToWatch.push(logErrPath)
    }
    if (out) {
      filesToWatch.push(logErrPath)
    }

    if (!err && !out) {
      filesToWatch.push(logOutPath, logErrPath)
    }
  } else {
    const containerData = [...appConfig.uiBlocks].find(({ meta }) => meta.type === 'ui-container')
    const containerLiveData = appConfig.getBlockWithLive(containerData?.meta?.name)

    if (err) {
      if (containerLiveData?.log) filesToWatch.push(containerLiveData.log.err)
      filesToWatch.push(fnOutLogs, eleOutLogs, fnErrLogs, eleErrLogs)
    }
    if (out) {
      if (containerLiveData?.log) filesToWatch.push(containerLiveData.log.out)
      filesToWatch.push(fnOutLogs, eleOutLogs, fnErrLogs, eleErrLogs)
    }
    if (!err && !out) {
      if (containerLiveData?.log) filesToWatch.push(containerLiveData.log.err, containerLiveData.log.out)
      filesToWatch.push(fnOutLogs, eleOutLogs, fnErrLogs, eleErrLogs)
    }
  }

  const readLog = (logPath, start, end) => {
    const stream = createReadStream(logPath, { encoding: 'utf8', autoClose: false, start, end })
    stream.on('data', (d) => {
      const logType = logPath.includes('/err/') ? 'Error' : 'Log'
      const logMsg = `${new Date().toLocaleString()} - ${path.basename(logPath)} - ${logType}: ${d}`
      if (logType === 'Error') console.log(chalk.red(logMsg))
      else console.log(logMsg)
    })
  }

  // watch each file for changes
  filesToWatch.forEach((filePath) => {
    if (!existsSync(filePath)) return

    watchFile(filePath, { persistent: true, interval: 500 }, (currStat, prevStat) => {
      if (currStat.size === prevStat.size) return
      readLog(filePath, prevStat.size, currStat.size)
    })
  })

  console.log(`...watching logs...\n`)
}

module.exports = log
