/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const { dim, bold } = require('chalk')
const { createRepo } = require('./createRepoV2')
const { GitManager } = require('./gitManagerV2')
const { getGitConfigNameEmail } = require('./questionPrompts')

/**
 * @typedef returnObject
 * @type {Object}
 * @property {blockSource} blockSource URL to repository
 * @property {String} cloneDirName Name of the local cloned directory,(_prefix_blockName)
 * @property {String} clonePath Path to local cloned directory
 * @property {String} blockFinalName Name of the directory created in source control
 */

/**
 * @typedef InputOption
 * @type {Object}
 * @param {String} blockName Name of block to be created
 * @param {Number} blockTypeNo Type number of block
 * @param {String} createFromExistingURL If a source is provided, a new repo is created from the source IMP:always should be ssh url
 * @param {Boolean} callingFromPullNoCreateNewRefactorMeLater To stop halfway and return cloned directory path
 * @param {String} cwd To pass to directory creation function
 */

/**
 *
 * @param {Object<InputOption>}
 * @returns {Promise<returnObject>}
 */
async function createBlockV2(options) {
  const { cwd, blockName, callingFromPull } = options

  const clonePath = cwd
  // callingFromPullNoCreateNewRefactorMeLater
  if (callingFromPull) return { clonePath }

  const { name: cloneDirName, blockFinalName, sshUrl, url } = await createRepo(blockName)

  try {
    const Git = new GitManager(`${clonePath}/${cloneDirName}`, sshUrl)
    await Git.init()

    try {
      await Git.getGlobalUsername()
    } catch (err) {
      console.log(dim('Git username and email not set!'))

      const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()
      await Git.setLocalUserName(gitUserName)
      await Git.setLocalUserEmail(gitUserEmail)

      console.log(dim(`\nGit local config updated with ${bold(gitUserName)} & ${bold(gitUserEmail)}\n`))
    }

    await Git.addRemote('origin', sshUrl)
    await Git.renameBranch('main')
  } catch (err) {
    console.log('Something went wrong while pulling\n')
    process.exit(1)
  }

  return {
    blockSource: { https: url, ssh: sshUrl },
    cloneDirName,
    clonePath,
    blockFinalName,
  }
}

module.exports = createBlockV2
