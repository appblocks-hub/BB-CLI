/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const Table = require('cli-table3')
const { appConfig } = require('../utils/appconfigStore')
const { GitManager } = require('../utils/gitmanager')

const tempPull = async (options) => {
  try {
    const { global: isGlobal } = options
    await appConfig.init(null, null, null, {
      isGlobal,
    })

    const rootConfig = appConfig.config
    const rootPath = process.cwd()

    console.log(rootConfig)

    const Git = new GitManager(rootPath, '', rootConfig.source.https, false)

    let currentBranch = await Git.currentBranch()

    currentBranch = currentBranch.msg.split('\n')[0]

    await Git.pull(currentBranch)
    console.log('PULLED SUCCESSFULLY')
  } catch (e) {
    console.log(e)
  }
}

module.exports = tempPull
