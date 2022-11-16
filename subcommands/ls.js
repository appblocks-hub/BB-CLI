/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const Table = require('cli-table3')
const { appConfig } = require('../utils/appconfigStore')

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
  if (isLive) {
    const url = ['function', 'job'].includes(g.meta.type) ? `localhost:${g.port}/${g.meta.name}` : `localhost:${g.port}`
    return [
      whiteBright(g.meta.name),
      g.meta.type,
      g.pid,
      g.port,
      { content: url, href: `http://${url}` },
      g.log.out,
      green('LIVE'),
    ]
  }
  return [whiteBright(g.meta.name), g.meta.type, 'Null', 'Null', '...', '...', red('OFF')]
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
  if (isGlobal) head.unshift('Package')
  const table = new Table({
    head: head.map((v) => chalk.cyanBright(v)),
  })

  const { packagedBlockConfigs, localRegistryData } = appConfig.lrManager

  if (isGlobal) {
    for (const pck in packagedBlockConfigs) {
      if (Object.hasOwnProperty.call(packagedBlockConfigs, pck)) {
        /**
         * @type {string} absolute path to package directory
         */
        const { rootPath } = localRegistryData[pck]
        // initialize appconfig with pck directory. This is to use appConfig utility functions
        await appConfig.init(rootPath, null, null, { isGlobal: false, reConfig: true })
        /**
         * @type {_p1}
         */
        const { name: pckName, dependencies } = packagedBlockConfigs[pck]
        let rowSpan = 0
        const tableData = []
        for (const block in dependencies) {
          if (Object.hasOwnProperty.call(dependencies, block)) {
            rowSpan += 1
            const { meta } = dependencies[block]
            const g = appConfig.getBlockWithLive(meta.name)
            tableData.push(rowGenerate(appConfig.isLive(meta.name), g))
          }
        }

        // Get the count and insert it to first array
        const _d = { rowSpan, content: pckName, vAlign: 'center' }
        if (tableData.length) {
          tableData[0].unshift(_d)
        }
        table.push(...tableData)
      }
    }
    console.log(table.toString())
    return
  }

  // handle the case without -g option
  // only display the blocks in current package
  const allBlocks = [...appConfig.allBlockNames]
  for (const block of allBlocks) {
    const g = appConfig.getBlockWithLive(block)
    table.push(rowGenerate(appConfig.isLive(block), g))
  }
  console.log(table.toString())
}

module.exports = ls
