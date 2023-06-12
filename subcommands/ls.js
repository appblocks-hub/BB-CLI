/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const path = require('path')
const Table = require('cli-table3')
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
  const { name, type, directory } = g
  const blockDir = path.relative(path.resolve(), directory)

  if (!isLive) return [whiteBright(name), type, 'Null', 'Null', '...', '...', red('OFF')]

  let url = `localhost:${g.port}`

  if (type === 'shared-fn') url = ''
  if (type === 'function') url = `localhost:${g.port}/${blockDir}`
  if (type === 'job') url = `localhost:${g.port}/${blockDir}`

  const outPath = path.relative(path.resolve(), g.log.out)

  return [whiteBright(name), type, g.pid, g.port, { content: url, href: `http://${url}` }, outPath, green('LIVE')]
}

const ls = async () => {
  /**
   * If global is true, for each package block, iterate through its dependencies, get the live status, and create table
   * else get details from appConfig and get live details and build
   */
  const head = ['Block Name', 'Type', 'PID', 'Port', 'Url', 'Log', 'Status']
  // if (isGlobal) head.unshift('Package')
  const table = new Table({
    head: head.map((v) => chalk.cyanBright(v)),
  })

  const configPath = path.resolve(BB_CONFIG_NAME)
  const { manager } = await ConfigFactory.create(configPath)
  if (manager instanceof PackageConfigManager) {
    const allMemberBlocks = await manager.getAllLevelMemberBlock()
    for (const blockManager of allMemberBlocks) {
      table.push(
        rowGenerate(blockManager.isLive, {
          ...blockManager.liveDetails,
          ...blockManager.config,
          directory: blockManager.directory,
        })
      )
    }
  }

  console.log(table.toString())
}

module.exports = ls
