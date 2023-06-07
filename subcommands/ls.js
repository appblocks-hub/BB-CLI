/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const path = require('path')
const Table = require('cli-table3')
const { appConfig } = require('../utils/appconfigStore')
const PackageConfigManager = require('../utils/configManagers/packageConfigManager')
const ConfigFactory = require('../utils/configManagers/configFactory')
const { BB_CONFIG_NAME } = require('../utils/constants')

/**
 * @typedef {object} _p1
 * @property {string} pckName
 * @property {import('../utils/jsDoc/types').dependencies} dependencies
 */

/**
 * Generate the raw for cli-table
 * @param {Boolean} isLive running status of block
 * @param {import('../utils/jsDoc/types').blockDetailsWithLive} g Block details with live data
 * @returns {Array<String>}
 */
const rowGenerate = (isLive, g) => {
  const { red, whiteBright, green } = chalk
  const { name, type } = g

  if (!isLive) return [whiteBright(name), type, 'Null', 'Null', '...', '...', red('OFF')]

  let url = `localhost:${g.port}`

  if (type === 'shared-fn') url = ''
  if (type === 'function') url = `localhost:${g.port}/${name}`
  if (type === 'job') url = `localhost:${g.port}/${name}`

  return [whiteBright(name), type, g.pid, g.port, { content: url, href: `http://${url}` }, g.log.out, green('LIVE')]
}

const ls = async (options) => {
  const { global: isGlobal } = options
  await appConfig.init(null, null, null, {
    isGlobal,
  })

  /**
   * If global is true, for each package block, iterate throuh its dependencies, get the live status, and create table
   * else get details from appConfig and get live details and build
   */
  const head = ['Block Name', 'Type', 'PID', 'Port', 'Url', 'Log', 'Status']
  // if (isGlobal) head.unshift('Package')
  const table = new Table({
    head: head.map((v) => chalk.cyanBright(v)),
  })

  // const { localRegistryData } = appConfig.lrManager

  // if (isGlobal) {
  //   for (const pck in localRegistryData) {
  //     if (Object.hasOwnProperty.call(localRegistryData, pck)) {
  //       const tableData = []
  //       let rowSpan = 0
  //       const { rootPath } = localRegistryData[pck]

  //       await appConfig.init(rootPath, null, null, { isGlobal: false, reConfig: true })

  //       for (const block of appConfig.getDependencies(true)) {
  //         rowSpan += 1
  //         tableData.push(rowGenerate(block.isOn, block))
  //       }

  //       // Get the count and insert it to first array
  //       const _d = { rowSpan, content: pck, vAlign: 'center' }
  //       if (tableData.length) {
  //         tableData[0].unshift(_d)
  //       }
  //       table.push(...tableData)
  //     }
  //   }
  //   console.log(table.toString())
  //   return
  // }

  const configPath = path.resolve(BB_CONFIG_NAME)
  const { manager: configManager } = await ConfigFactory.create(configPath)
  if (configManager instanceof PackageConfigManager) {
    for await (const blockManager of configManager.getDependencies()) {
      table.push(rowGenerate(blockManager.isLive, { ...blockManager.liveDetails, ...blockManager.config }))
    }
  }

  console.log(table.toString())

  // handle the case without -g option
  // only display the blocks in current package
  // const allBlocks = [...appConfig.allBlockNames]
  // console.log(allBlocks1, allBlocks)
  // console.log(allBlocks.length)
  // for (const block of allBlocks) {
  //   const g = appConfig.getBlockWithLive(block)
  //   table.push(rowGenerate(appConfig.isLive(block), g))
  // }
  // console.log(table.toString())
}

module.exports = ls
