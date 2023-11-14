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
  let progressData = `${payload.block} ${bar} ${Math.floor(params.progress * 100)}% | ${payload.status} `

  switch (payload.status) {
    case 'failed':
      progressData = chalk.red(progressData)
      break
    case 'success':
      progressData = chalk.green(progressData)
      break
    case 'warning':
      progressData = chalk.yellow(progressData)
      break
    default:
      break
  }

  return progressData
}

const multiBar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    stopOnComplete: true,
    hideCursor: true,
    format: formatFn,
  },
  cliProgress.Presets.rect
)

module.exports = { multiBar }
