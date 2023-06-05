#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { BlockPushError } = require('../../../utils/errors/blockPushError')
const { GitError } = require('../../../utils/errors/gitError')
const { ensureReadMeIsPresent } = require('../../../utils/fileAndFolderHelpers')
const { checkAndSetGitConfigNameEmail, gitCommitWithMsg, gitStageAllIn } = require('../../../utils/gitCheckUtils')
const { GitManager } = require('../../../utils/gitManagerV2')
const { Logger } = require('../../../utils/loggerV2')

const blockPushProcess = async (options) => {
  const {
    blockName,
    blockPath,
    blockSource,
    commitMessage,
    gitUserName,
    gitUserEmail,
    repoType,
    blockParentPath,
    gitAddIgnore,
  } = options

  try {
    process.send({ failed: false, message: 'Starting to push..' })
    const { logger } = new Logger('pushProcess')
    if (!blockSource.ssh) throw new BlockPushError(blockPath, blockName, 'no source url', false, 1)

    // setup GitManager
    const Git = new GitManager(repoType === 'mono' ? blockParentPath : blockPath, blockSource.ssh)

    const staged = await gitStageAllIn(blockPath, repoType, gitAddIgnore)

    if (staged.length === 0) {
      logger.info('No files to stage')
      throw new BlockPushError(blockPath, blockName, 'No Files to Stage', false, 2)
    }
    process.send({ failed: false, message: 'Staging complete..' })
    logger.info({ stagedFiles: staged })

    // ------------------------------------------ //

    if (repoType !== 'mono') {
      await checkAndSetGitConfigNameEmail(blockPath, { gitUserEmail, gitUserName })
      logger.info(`Git local config updated with ${gitUserName} & ${gitUserEmail}`)
    }

    // ------------------------------------------ //

    await gitCommitWithMsg(blockPath, commitMessage, repoType)
    process.send({ failed: false, message: 'Commit complete' })

    // ------------------------------------------ //
    ensureReadMeIsPresent(blockPath, blockName, false)

    // ------------------------------------------ //

    process.send({ failed: false, message: 'Pushing..' })
    // await gitPushAllIn(blockPath)
    await Git.push('main')
    logger.info('Commits pushed successfully')
    process.send({ failed: false, message: 'Commits pushed..' })

    process.exitCode = 0
  } catch (err) {
    // console.log(err)
    if (err instanceof GitError) {
      // if errorCode=0 don't reset
      // if errorCode=1 reset head
      process.send({ failed: true, message: err.message, errorCode: Number(err.resetHead) })
      process.exitCode = err.processExitCode
    } else if (err instanceof BlockPushError) {
      logger.info(err.message)
      process.send({ failed: true, message: err.message, errorCode: Number(err.resetHead) })
      process.exitCode = err.processExitCode
    } else {
      process.send({ failed: true, message: err.message, errorCode: 0 })
      process.exitCode = 1
    }
  }
}

process.once('message', (args) => {
  blockPushProcess(args)
})
