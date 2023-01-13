/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const cliProgress = require('cli-progress')
const { BarFormat } = require('cli-progress').Format

const formatFn = (options, params, payload) => {
  const bar = BarFormat(params.progress, options)

  if (payload.status === 'failed') {
    return chalk.red(`${payload.block} ${bar} ${Math.floor(params.progress * 100)}% | ${payload.status}`)
  }
  if (payload.status === 'success') {
    return chalk.green(`${payload.block} ${bar} ${Math.floor(params.progress * 100)}% | ${payload.status} `)
  }
  if (payload.status === 'warning') {
    return chalk.yellow(`${payload.block} ${bar} ${Math.floor(params.progress * 100)}% | ${payload.status} `)
  }
  return `${payload.block} ${bar} ${Math.floor(params.progress * 100)}% | ${payload.status} `
}

const multibar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    hideCursor: true,
    format: formatFn,
  },
  cliProgress.Presets.rect
)

module.exports = { multibar }
