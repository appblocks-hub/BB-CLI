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
const { readInput } = require('../utils/questionPrompts')


const tempPush = async (options) => {
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

    await Git.stageAll()

    let changedFiles = (await Git.diff()).msg.split('\n').filter((item) => item)

    if (changedFiles.length > 0) {
      const commitMessage = await readInput({
        name: 'commitMessage',
        message: 'Enter the commit message',
        validate: (input) => {
          if (!input || input?.length < 3) return `Please enter the commit message with atleast 3 characters`
          return true
        },
      })

      await Git.commit(commitMessage)
      await Git.push(currentBranch)
      console.log('PUSHED SUCCESSFULLY')
    }
    else{
      console.log("No Files changed to push")
    }
  } catch (e) {
    console.log(e)
  }
}

module.exports = tempPush
