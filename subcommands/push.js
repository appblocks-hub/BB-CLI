/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { getCommitMessage, getGitConfigNameEmail } = require('../utils/questionPrompts')
const { pushBlocks } = require('../utils/pushBlocks')
const { appConfig } = require('../utils/appconfigStore')

const push = async (blockname, options) => {
  const { force } = options
  let { message } = options

  await appConfig.init()

  if (!force && !blockname) {
    console.log(chalk.red(`\nPlease provide a block name or use -f to push all..`))
    process.exit(1)
  }

  if (!force && !appConfig.has(blockname)) {
    console.log(chalk.red(`${chalk.italic(blockname)} not found in dependencies`))
    console.log(`List of present blocks:\n${chalk.gray(...appConfig.allBlockNames)}`)
    process.exit(1)
  }

  if (!message) {
    message = await getCommitMessage()
  }

  console.log('Please enter git username and email')
  console.log(
    chalk.dim.italic(`If i can't find name and email in global git config,\nI'll use these values on making commits..`)
  )
  // TODO-- store these values in config and dont ask everytime, can be used in pull aswell
  const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()

  const blocksToPush = force ? [...appConfig.dependencies] : [appConfig.getBlock(blockname)]

  // console.log(blocksToPush)

  console.log('\n')
  try {
    await pushBlocks(gitUserName, gitUserEmail, message, blocksToPush)
    process.exit(0)
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}

module.exports = push
