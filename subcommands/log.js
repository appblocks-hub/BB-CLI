/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { createReadStream, watchFile } = require('fs')
const { appConfig } = require('../utils/appconfigStore')
const { generateOutLogPath, BB_FILES } = require('../utils/bbFolders')

const log = async (blockName) => {
  await appConfig.init()
  if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
    // eslint-disable-next-line no-param-reassign
    blockName = appConfig.allBlockNames.next().value
  }
  if (!appConfig.has(blockName)) {
    console.log(`Block Doesn't exists`)
    return
  }
  if (!appConfig.isLive(blockName)) {
    console.log(`${blockName} is not live.`)
    console.log(`Run block start ${blockName} to start the block.`)
    return
  }
  console.log(`Showing log of ${blockName}`)

  const appLiveData = appConfig.getBlockWithLive(blockName)
  // console.log(appLiveData)
  // TODO : avoid using .meta.type, write a func like typeof() so,
  // even if data shape changes, it can be fixed easily

  const logPath =
    appLiveData.meta.type === 'function' ? generateOutLogPath(BB_FILES.FUNCTIONS_LOG) : appLiveData.log.out

  const ReadLog = (start, end) => {
    const stream = createReadStream(logPath, {
      encoding: 'utf8',
      autoClose: false,
      start,
      end,
    })
    stream.on('data', (d) => console.log(d))
  }

  watchFile(logPath, (currStat, prevStat) => {
    // console.log(currStat)
    // console.log(prevStat)
    ReadLog(prevStat.size, currStat.size)
  })

  // const res = readFileSync(appConfig.getBlockWithLive(blockName).log.out, (v) => {
  //   console.log(v)
  // })
  // console.log(res)
}

module.exports = log
