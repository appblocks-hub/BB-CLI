/* eslint-disable prefer-const */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const { writeFileSync, readFileSync, existsSync, mkdirSync, rmdirSync } = require('fs')
const path = require('path')
const { configstore } = require('../../../configstore')
const { spinnies } = require('../../../loader')
const { copyEmulatorCode } = require('../../../utils/emulator-manager')
const { pexec } = require('../../../utils/execPromise')
const { getNodePackageInstaller } = require('../../../utils/nodePackageManager')
const { readInput, getGitConfigNameEmail } = require('../../../utils/questionPrompts')
const { updatePackageVersionIfNeeded } = require('../../start/singleBuild/mergeDatas')
const { GitManager } = require('../../../utils/gitManagerV2')
const { checkAndSetGitConfigNameEmail } = require('../../../utils/gitCheckUtils')
const { execSync } = require('child_process')
const { getLatestCommits } = require('../createBBModules/util')

const generateOrphanBranch = async (options) => {
  try {
    const { bbModulesPath, latestWorkSpaceCommitHash, block, repoUrl } = options

    const orphanBranchName = 'block_' + block.name
    const orphanBranchPath = path.resolve(bbModulesPath, orphanBranchName)
    const orphanBranchExists = existsSync(orphanBranchPath)
    let exclusions = ['.git', '._ab_em', '._ab_em_elements', 'cliruntimelogs', 'logs']

    if (block.type === 'package') {
      block?.dependencies?.map((item) => {
        const directoryPathArray = item?.directory?.split('/')
        const directoryRelativePath = directoryPathArray[directoryPathArray.length - 1]
        exclusions.push(directoryRelativePath)
      })
    }

    const Git = new GitManager(orphanBranchPath, repoUrl)

    if (!orphanBranchExists) {
      try {
        mkdirSync(orphanBranchPath)

        await Git.init()

        const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()
        await checkAndSetGitConfigNameEmail(orphanBranchPath, { gitUserEmail, gitUserName })
        // console.log(`Git local config updated with ${gitUserName} & ${gitUserEmail}`)

        await Git.addRemote('origin', repoUrl)

        await Git.fetch()

        // await Git.checkoutBranch(defaultBranch)
      } catch (err) {
        console.log('error is', err)
        rmdirSync(orphanBranchPath, { recursive: true, force: true })
        throw err
      }
    }

    const remoteBranchData = await Git.checkRemoteBranch(orphanBranchName, 'origin')

    const remoteBranchExists = remoteBranchData?.out ?? ''.includes(orphanBranchName)

    if (!remoteBranchExists) {
      console.log('entered if case orphan branch doesnt exists\n')

      console.log('remote branch exists is\n', remoteBranchExists)

      console.log('remote branch data is\n', remoteBranchData)

      await Git.newOrphanBranch(orphanBranchName)

      copyDirectory(block.directory, orphanBranchPath, exclusions)

      await Git.stageAll()

      await Git.commit(buildCommitMessage(latestWorkSpaceCommitHash, ''))

      await Git.setUpstreamAndPush(orphanBranchName)
    } else {
      console.log('entered else case orphan branch exists\n')

      let commits = await getLatestCommits(orphanBranchName, 1)

      const [latestWorkSpaceCommitHash, latestworkSpaceCommitMessage] = commits[0].split(' ', 2)

      const orphanBranchCommitHash = retrieveCommitHash(latestworkSpaceCommitMessage)

      console.log('orphan branch commit hash is \n', orphanBranchCommitHash)

      console.log('latest workspace commit hash is\n', latestWorkSpaceCommitHash)
    }
  } catch (err) {
    console.log('error in orphan branch creation is', err)
  }
}

const copyDirectory = (sourceDir, destinationDir, excludedDirs) => {
  const copyCommandWithExclusions = `rsync -av --exclude={${excludedDirs.join(',')}} ${sourceDir}/ ${destinationDir}/`

  console.log('copy command with exclusions is', copyCommandWithExclusions)
  execSync(copyCommandWithExclusions)
}
const buildCommitMessage = (commitHash, commitMesage) => {
  return `[commitHash:${commitHash}] ${commitMesage}`
}

const retrieveCommitHash = (commitMessage) => {
  const pattern = /\[commitHash:(\w+)\]/
  const matches = commitMessage.match(pattern)
  if (matches && matches.length > 1) {
    return matches[1]
  }
  return ''
}
module.exports = {
  generateOrphanBranch,
}
