const chalk = require('chalk')
const path = require('path')

const lsColors = [
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
const lsHead = ['Block Name', 'Type', 'PID', 'Port', 'Url', 'Log', 'Status', 'Sync-status']

const getSyncStatus = (syncedBlockIds, manager) => {
  if (!syncedBlockIds) return '...'
  return syncedBlockIds.includes(manager.config.blockId) ? chalk.green('synced') : chalk.red('not synced')
}

/**
 * Generate the raw for cli-table
 * @param {Boolean} isLive running status of block
 * @param {import('../../utils/jsDoc/types').blockDetailsWithLive} blockData Block details with live data
 * @returns {Array<String>}
 */
const rowGenerate = (isLive, blockData, synced, colorMap) => {
  const { red, whiteBright, green } = chalk
  const { name, type, directory, blockId, liveUrl } = blockData
  const blockDir = path.relative(path.resolve(), directory)
  if (type === 'package') {
    return [chalk.hex(colorMap.get(blockId)).bold(name), type, '...', '...', '...', '...', '...', synced]
  }
  if (!isLive) return [whiteBright(name), type, 'Null', 'Null', '...', '...', red('OFF'), synced]

  let url = `localhost:${blockData.port}`

  if (type === 'shared-fn') url = ''
  if (type === 'function') url = liveUrl || `localhost:${blockData.port}/${blockDir}`
  if (type === 'job') url = `localhost:${blockData.port}/${blockDir}`

  const outPath = path.relative(path.resolve(), blockData.log.out)

  return [
    whiteBright(name),
    type,
    blockData.pid,
    blockData.port,
    { content: url, href: `http://${url}` },
    outPath,
    green('LIVE'),
    synced,
  ]
}

module.exports = { lsColors, lsHead, getSyncStatus, rowGenerate }
