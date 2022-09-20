/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const Table = require('cli-table')
const { appConfig } = require('../utils/appconfigStore')

const ls = async () => {
  await appConfig.init()
  const table = new Table({
    head: ['Block Name', 'Type', 'PID', 'Port', 'Log', 'Status'].map((v) => chalk.cyanBright(v)),
  })
  for (const block of appConfig.allBlockNames) {
    const g = appConfig.getBlockWithLive(block)
    if (appConfig.isLive(block)) {
      table.push([chalk.whiteBright(block), g.meta.type, g.pid, g.port, g.log.out, chalk.green('LIVE')])
    } else {
      table.push([chalk.whiteBright(block), g.meta.type, 'Null', 'Null', '...', chalk.red('OFF')])
    }
  }
  console.log(table.toString())
}

module.exports = ls
