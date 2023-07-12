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
const { readJsonAsync } = require('../utils')
const { getBBFolderPath, BB_FOLDERS } = require('../utils/bbFolders')

const colors = [
  '#FFB6C1',
  '#FF69B4',
  '#FF1493',
  '#DB7093',
  '#C71585',
  '#E6E6FA',
  '#D8BFD8',
  '#DDA0DD',
  '#EE82EE',
  '#DA70D6',
  '#FF00FF',
  '#BA55D3',
  '#9370DB',
  '#8A2BE2',
  '#9400D3',
  '#9932CC',
  '#8B008B',
  '#800080',
  '#4B0082',
  '#6A5ACD',
  '#483D8B',
  '#ADFF2F',
  '#7FFF00',
  '#7CFC00',
  '#00FF00',
  '#32CD32',
  '#98FB98',
  '#90EE90',
  '#00FA9A',
  '#00FF7F',
  '#3CB371',
  '#2E8B57',
  '#228B22',
  '#008000',
  '#006400',
  '#9ACD32',
  '#6B8E23',
  '#556B2F',
  '#66CDAA',
  '#8FBC8F',
  '#20B2AA',
  '#008B8B',
  '#008080',
  '#00FFFF',
  '#00FFFF',
  '#E0FFFF',
  '#AFEEEE',
  '#7FFFD4',
  '#40E0D0',
  '#48D1CC',
  '#00CED1',
  '#5F9EA0',
  '#4682B4',
  '#6495ED',
  '#87CEEB',
  '#87CEFA',
  '#191970',
  '#000080',
  '#00008B',
  '#0000CD',
  '#0000FF',
  '#1E90FF',
  '#ADD8E6',
  '#B0C4DE',
  '#6495ED',
  '#4169E1',
  '#778899',
  '#708090',
  '#2F4F4F',
  '#00FF7F',
  '#FFA07A',
  '#FA8072',
  '#E9967A',
  '#F08080',
  '#CD5C5C',
  '#DC143C',
  '#FF0000',
  '#B22222',
  '#8B0000',
  '#FFA500',
  '#FF4500',
  '#FF6347',
  '#FF7F50',
  '#FFD700',
  '#FFFF00',
  '#808000',
  '#556B2F',
  '#ADFF2F',
  '#7CFC00',
  '#7FFF00',
  '#006400',
]
const colorMap = new Map()
const head = ['Block Name', 'Type', 'PID', 'Port', 'Url', 'Log', 'Status', 'Sync-status']

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
const rowGenerate = (isLive, g, synced) => {
  const { red, whiteBright, green } = chalk
  const { name, type, directory, blockId, liveUrl } = g
  const blockDir = path.relative(path.resolve(), directory)
  if (type === 'package') {
    return [chalk.hex(colorMap.get(blockId)).bold(name), type, '...', '...', '...', '...', '...', synced]
  }
  if (!isLive) return [whiteBright(name), type, 'Null', 'Null', '...', '...', red('OFF'), synced]

  let url = `localhost:${g.port}`

  if (type === 'shared-fn') url = ''
  if (type === 'function') url = liveUrl || `localhost:${g.port}/${blockDir}`
  if (type === 'job') url = `localhost:${g.port}/${blockDir}`

  const outPath = path.relative(path.resolve(), g.log.out)

  return [
    whiteBright(name),
    type,
    g.pid,
    g.port,
    { content: url, href: `http://${url}` },
    outPath,
    green('LIVE'),
    synced,
  ]
}

async function singleTableFn(manager, syncFailList) {
  const table = new Table({
    head: head.map((v) => chalk.cyanBright(v)),
  })
  const allMemberBlocks = await manager.getAllLevelMemberBlock()
  for (const blockManager of allMemberBlocks) {
    table.push(
      rowGenerate(
        blockManager.isLive,
        {
          ...blockManager.liveDetails,
          ...blockManager.config,
          directory: blockManager.directory,
        },
        syncFailList[blockManager.config.name] ? 'not synced' : 'synced'
      )
    )
  }
  console.log(table.toString())
}

async function multiTableFn(manager, syncFailList) {
  const roots = []
  roots.push(manager)
  for (; roots.length > 0; ) {
    const root = roots.pop()
    const table = new Table({})
    const myColour = colorMap.get(root.config.blockId)
    /**
     * Set the header
     */
    table.push(
      [
        {
          colSpan: head.length,
          content: myColour ? chalk.hex(myColour).bold(root.config.name) : `${root.config.name}`,
        },
      ],
      head.map((v) => chalk.cyanBright(v))
    )
    for await (const m of root.getDependencies()) {
      if (m instanceof PackageConfigManager) {
        /**
         * Refresh config to remove any referencees to non existent folders
         */
        await m.refreshConfig()
        roots.push(m)
        /**
         * Set a colour for the package from the list
         */
        colorMap.set(m.config.blockId, colors[Math.floor(Math.random() * colors.length)])
      }
      table.push(
        rowGenerate(
          m.isLive,
          {
            ...m.liveDetails,
            ...m.config,
            directory: m.directory,
          },
          syncFailList[m.config.name] ? 'not synced' : 'synced'
        )
      )
    }

    /**
     * Print table for each root (Package)
     */
    console.log(table.toString())
  }
}

const ls = async ({ multi }) => {
  const multiTable = multi
  const configPath = path.resolve(BB_CONFIG_NAME)
  const { manager } = await ConfigFactory.create(configPath)
  const { rootManager } = await manager.findMyParents()

  // try reading the sync logs
  const { LOGS, OUT, SYNC_LOGS } = BB_FOLDERS
  const logsPath = getBBFolderPath(LOGS, rootManager.directory)
  const { data } = await readJsonAsync(path.join(logsPath, OUT, SYNC_LOGS, LOGS))
  const syncFailList = data?.apiLogs?.non_available_block_names || {}

  if (manager instanceof PackageConfigManager) {
    await manager.refreshConfig()
    if (!multiTable) {
      await singleTableFn(manager, syncFailList)
      return
    }

    await multiTableFn(manager, syncFailList)
  }
}

module.exports = ls
