/* eslint-disable prefer-const */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const { existsSync, mkdirSync, rmdirSync, readdirSync, statSync, copyFileSync } = require('fs')
const path = require('path')

const { GitManager } = require('../../../utils/gitManagerV2')
const { checkAndSetGitConfigNameEmail } = require('../../../utils/gitCheckUtils')
const { getGitConfigNameEmail } = require('../../../utils/questionPrompts')

const generateOrphanBranch = async (options) => {
  const { bbModulesPath, block, repoUrl,blockManager } = options

  let orphanBranchName 

  if (!(block?.source?.branch)){
    orphanBranchName = 'block_' + block.name
    block.source.branch=orphanBranchName
    console.log("new config for block manager is",blockManager.updateConfig({source:block.source}))
  }else{
    orphanBranchName=block.source.branch
  }

  const orphanBranchPath = path.resolve(bbModulesPath, orphanBranchName)
  const orphanBranchFolderExists = existsSync(orphanBranchPath)
  let exclusions = ['.git', '._ab_em', '._ab_em_elements', 'cliruntimelogs', 'logs']
  const orphanRemoteName = 'origin'
  const orphanCommitMessage = ''

  if (block.type === 'package') {
    const memberBlocks=block?.memberBlocks??{}
    Object.keys(memberBlocks)?.map((item) => {
      const memberBlock=memberBlocks[item]
      const directoryPathArray = memberBlock?.directory?.split('/')
      const directoryRelativePath = directoryPathArray[directoryPathArray.length - 1]
      exclusions.push(directoryRelativePath)
    })
  }

  if (!(block?.workSpaceCommitID?.length > 0)) {
    console.log(`Error syncing ${block.name}`)
    return
  }

  const Git = new GitManager(orphanBranchPath, repoUrl)

  if (!orphanBranchFolderExists) {
    try {
      mkdirSync(orphanBranchPath)

      await Git.init()

      const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()

      await checkAndSetGitConfigNameEmail(orphanBranchPath, { gitUserEmail, gitUserName })
      // console.log(`Git local config updated with ${gitUserName} & ${gitUserEmail}`)

      await Git.addRemote(orphanRemoteName, repoUrl)

      await Git.fetch()

      // await Git.checkoutBranch(defaultBranch)
    } catch (err) {
      console.log('error is', err)
      rmdirSync(orphanBranchPath, { recursive: true, force: true })
      throw err
    }
  }

  const remoteBranchData = await Git.checkRemoteBranch(orphanBranchName, orphanRemoteName)

  const remoteBranchExists = remoteBranchData?.out ?? ''.includes(orphanBranchName)

  if (!remoteBranchExists) {
    console.log('entered if case orphan branch doesnt exists on Remote \n')

    await Git.newOrphanBranch(orphanBranchName)

    copyDirectory(blockManager.directory, orphanBranchPath, exclusions)

    await Git.stageAll()

    await Git.commit(buildCommitMessage(block.workSpaceCommitID, orphanCommitMessage))

    await Git.setUpstreamAndPush(orphanBranchName)
  } else {
    console.log('entered if case orphan branch already exists on Remote \n')
    await Git.fetch()

    await Git.checkoutBranch(orphanBranchName)

    await Git.pullBranch(orphanBranchName, orphanRemoteName)

    //compare code from the existing workspace folder and the orphan branch folder

    let orphanBranchCommits = await getLatestCommits(orphanBranchName, 1, Git)

    const orphanBranchCommitMessage = orphanBranchCommits[0].split(' ')[1]

    const orphanBranchCommitHash = retrieveCommitHash(orphanBranchCommitMessage)

    console.log(
      `commit hashes for orphan and workspace for block ${block.name} are\n`,
      orphanBranchCommitHash,
      block.workSpaceCommitID,
      orphanBranchCommitHash !== block.workSpaceCommitID
    )


    if (orphanBranchCommitHash !== block.workSpaceCommitID) {
      copyDirectory(blockManager.directory, orphanBranchPath, exclusions)

      await Git.stageAll()

      await Git.commit(buildCommitMessage(block.workSpaceCommitID, orphanBranchCommitMessage))

      await Git.push(orphanBranchName)
    }
  }
}

// const copyDirectory = (sourceDir, destinationDir, excludedDirs) => {
//   const copyCommandWithExclusions = `rsync -av --exclude={${excludedDirs.join(',')}} ${sourceDir}/ ${destinationDir}/`

//   console.log('copy command with exclusions is', copyCommandWithExclusions)
//   // execSync(copyCommandWithExclusions)
// }

const getLatestCommits = async (branchName, n, Git) => {
  let latestWorkSpaceCommit = await Git.getCommits(branchName, n)

  let commits = latestWorkSpaceCommit?.out?.trim()?.split('\n') ?? []

  return commits
}

function copyDirectory(sourceDir, destinationDir, exclusions) {
  // Create destination directory if it doesn't exist
  if (!existsSync(destinationDir)) {
    mkdirSync(destinationDir, { recursive: true })
  }

  // Get the list of files and directories in the source directory
  const files = readdirSync(sourceDir)

  // Iterate over each file/directory
  files.forEach((file) => {
    // Check if the file/directory should be excluded
    if (!exclusions.includes(file)) {
      const sourcePath = path.join(sourceDir, file)
      const destinationPath = path.join(destinationDir, file)

      // Check if the item is a file or directory
      if (statSync(sourcePath).isFile()) {
        // Copy the file to the destination directory
        copyFileSync(sourcePath, destinationPath)
      } else {
        // Recursively copy the directory to the destination directory
        copyDirectory(sourcePath, destinationPath, exclusions)
      }
    }
  })
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
  getLatestCommits,
}
