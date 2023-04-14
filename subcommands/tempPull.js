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

    const Git = new GitManager(rootPath, 'Git instance for migrate', rootConfig.source.ssh, false)

    console.log('rootpath inside pull is \n', rootPath)
    console.log('appconfig inside pull is  \n', rootConfig)

    const currentBranch = await Git.currentBranch()

    console.log('current branch is \n', currentBranch)

    await Git.pull(currentBranch)

  } catch (e) {
    console.log(e.message)
  }
}

module.exports = tempPull
