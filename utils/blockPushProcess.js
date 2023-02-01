#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { transports } = require('winston')
const { configstore } = require('../configstore')
const convertGitSshUrlToHttps = require('./convertGitUrl')
const { BlockPushError } = require('./errors/blockPushError')
const { GitError } = require('./errors/gitError')
const { ensureReadMeIsPresent } = require('./fileAndFolderHelpers')
const { checkAndSetGitConfigNameEmail, gitCommitWithMsg, gitStageAllIn } = require('./gitCheckUtils')
const { GitManager } = require('./gitmanager')
const { logger } = require('./logger')

const start = async ({ blockName, blockPath, blockSource, commitMessage, gitUserName, gitUserEmail }) => {
  try {
    process.send({ failed: false, message: 'Starting to push..' })
    logger.add(new transports.File({ filename: `./pushlogs/${blockName}.log` }))

    if (!blockSource.ssh) throw new BlockPushError(blockPath, blockName, 'no source url', false, 1)
    // setup GitManager
    const prefersSsh = configstore.get('prefersSsh')
    const repoUrl = prefersSsh ? blockSource.ssh : convertGitSshUrlToHttps(blockSource.ssh)
    const Git = new GitManager(blockPath, blockName, repoUrl, prefersSsh)

    // ------------------------------------------ //

    // TODO -- write a wrapper for process.send and reduce code
    const staged = await gitStageAllIn(blockPath)
    // const staged2 = await Git.stageAll()
    // console.log(staged)
    // console.log('----')
    // console.log(staged2)
    if (staged.length === 0) {
      logger.info('No files to stage')
      throw new BlockPushError(blockPath, blockName, 'No Files to Stage', false, 2)
    }
    process.send({ failed: false, message: 'Staging complete..' })
    logger.info({ stagedFiles: staged })

    // ------------------------------------------ //

    await checkAndSetGitConfigNameEmail(blockPath, { gitUserEmail, gitUserName })
    logger.info(`Git local config updated with ${gitUserName} & ${gitUserEmail}`)

    // ------------------------------------------ //

    await gitCommitWithMsg(blockPath, commitMessage)
    process.send({ failed: false, message: 'Commit complete' })

    // ------------------------------------------ //
    const [readmePath] = ensureReadMeIsPresent(blockPath, blockName, false)
    if (!readmePath) {
      logger.error('Make sure to add a README.md in your block before pushing..')
      // process.send('No readme found..')
      throw new BlockPushError(blockPath, blockName, 'No readme found..', true, 1)
    }

    // ------------------------------------------ //

    process.send({ failed: false, message: 'Pushing..' })
    // await gitPushAllIn(blockPath)
    await Git.push('main')
    logger.info('Commits pushed succesfully')
    process.send({ failed: false, message: 'Commits pushed..' })

    process.exitCode = 0
  } catch (err) {
    if (err instanceof GitError) {
      // if errorCode=0 dont reset
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
  //   console.log(args)
  start(args)
})
