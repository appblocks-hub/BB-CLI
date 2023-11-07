#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { transports } = require('winston')
const { BlockPushError } = require('../../../utils/errors/blockPushError')
const { GitError } = require('../../../utils/errors/gitError')
const { ensureReadMeIsPresent } = require('../../../utils/fileAndFolderHelpers')
const { checkAndSetGitConfigNameEmail, gitCommitWithMsg, gitStageAllIn } = require('../../../utils/gitCheckUtils')
const { Logger } = require('../../../utils/logger')
const { getBBFolderPath, BB_FOLDERS } = require('../../../utils/bbFolders')
const GitConfigFactory = require('../../../utils/gitManagers/gitConfigFactory')

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

  const { logger } = new Logger('pushProcess')
  const pushLogsPath = getBBFolderPath(BB_FOLDERS.PUSH_LOGS)
  logger.add(new transports.File({ filename: path.join(pushLogsPath, `${blockName}.log`) }))

  try {
    process.send({ failed: false, message: 'Starting to push..' })
    if (!blockSource.ssh) throw new BlockPushError(blockPath, blockName, 'no source url', false, 1)

    // setup GitManager
    const { manager: Git, error: gErr } = await GitConfigFactory.init({
      cwd: repoType === 'mono' ? blockParentPath : blockPath,
      gitUrl: blockSource.ssh,
    })
    if (gErr) throw gErr
  

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
