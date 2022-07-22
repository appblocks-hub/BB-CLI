/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { createReadStream, watchFile } = require('fs')
const path = require('path')
const { appConfig } = require('../utils/appconfigStore')

const log = async (blockname) => {
  await appConfig.init()
  if (!appConfig.has(blockname)) {
    console.log('Block Doesnt exists')
    return
  }
  if (!appConfig.isLive(blockname)) {
    console.log(`${blockname} is not live.`)
    console.log(`Run block start ${blockname} to start the block.`)
    return
  }
  console.log(`Showing log of ${blockname}`)

  const appLiveData = appConfig.getBlockWithLive(blockname)
  // console.log(appLiveData)
  // TODO : avoid using .meta.type, write a func like typeof() so,
  // even if data shape changes, it can be fixed easily
  const logPath = appLiveData.meta.type === 'function' ? path.resolve('logs/out/functions.log') : appLiveData.log.out

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

  // const res = readFileSync(appConfig.getBlockWithLive(blockname).log.out, (v) => {
  //   console.log(v)
  // })
  // console.log(res)
}

module.exports = log
