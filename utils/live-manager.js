/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// const fs = require('fs')
// const fsPromise = require('fs/promises')

// const liveDataFile = '/.appblock.live.json'
// const configManager = require('./config-manager')

// async function checkLive() {
//   console.log('checking live....')
//   await validateLogsDir()
//   await validateLiveData()
// }
// async function validateLogsDir() {
//   console.log('checking if logs dir are there....')
//   if (fs.existsSync('./logs')) {
//     console.log('logs dir exist')
//     // enter the code to excecute after the folder is there.
//   } else {
//     console.log('creating logs.dirs....')
//     // Below code to create the folder, if its not there
//     fs.mkdirSync('logs/out', { recursive: true })
//     fs.mkdirSync('logs/err', { recursive: true })
//   }
// }
// async function getLiveBlockData(rootDir) {
//   console.log('getting live block data.......')
//   let liveBlockData = null
//   try {
//     liveBlockData = JSON.parse(
//       await fsPromise.readFile(rootDir + liveDataFile, 'utf8')
//     )
//   } catch (e) {
//     console.log('error in getting live block data...', e)
//     liveBlockData = null
//   }

//   return liveBlockData
// }
// async function validateLiveData() {
//   console.log('validating live data.....')
//   const liveData = await getLiveBlockData('.')
//   if (liveData) {
//     console.log('live data found....')
//     let noChange = true
//     let block
//     for (const blockName of Object.keys(liveData)) {
//       block = liveData[blockName]
//       if (!block.log) {
//         console.log('logs dir not configured for', blockName)
//         noChange = false
//         block.log = {
//           out: `./logs/out/${block.meta.name}.log`,
//           err: `./logs/err/${block.meta.name}.log`,
//         }
//       }
//     }
//     if (!noChange) {
//       console.log('updating live data with log configs.....')
//       fs.writeFileSync(`.${liveDataFile}`, JSON.stringify(block), {
//         encoding: 'utf8',
//       })
//     }
//   } else {
//     console.log('not found live data....')
//     await writeLiveData()
//   }
// }
// async function writeLiveData() {
//   console.log('writing livedata from config....')
//   const config = await configManager.getYahConfig('.')
//   if (config) {
//     console.log('found appblock config....')
//     const dependencies = config.dependencies || {}
//     for (const blockName of Object.keys(dependencies)) {
//       const block = dependencies[blockName]
//       if (!block.log) {
//         block.log = {
//           out: `./logs/out/${block.meta.name}.log`,
//           err: `./logs/err/${block.meta.name}.log`,
//         }
//       }
//     }
//     console.log('formed livedata and updating to live data file...')
//     fs.writeFileSync(`.${liveDataFile}`, JSON.stringify(dependencies), {
//       encoding: 'utf8',
//     })
//   }
// }
// async function updateLiveBlock(rootDir, blockName, data) {
//   const liveBlockData = await getLiveBlockData(rootDir)
//   console.log('name = ', blockName)
//   console.log('UPDATE LIVE MANAGE CALLED')
//   let block = liveBlockData[blockName]
//   if (!block) {
//     throw new Error('block not found!', blockName, liveBlockData)
//   }
//   block = { ...liveBlockData, [blockName]: { ...liveBlockData[blockName], ...data } }
//   fs.writeFileSync(rootDir + liveDataFile, JSON.stringify(block), {
//     encoding: 'utf8',
//   })
// }
// module.exports = { getLiveBlockData, updateLiveBlock, checkLive }
