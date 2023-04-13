/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')
const { configstore } = require('../configstore')
const { blockTypeInverter } = require('./blockTypeInverter')
const convertGitSshUrlToHttps = require('./convertGitUrl')
const createComponentV2 = require('./createComponentV2')
const { GitManager } = require('./gitmanager')
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
  const { cwd, metaData, blockTypeNo, blockName, createFromExistingURL, callingFromPull } = options

  const clonePath = cwd
  // callingFromPullNoCreateNewRefactorMeLater
  if (callingFromPull) return { clonePath }

  const createCompRes = await createComponentV2(blockName, createFromExistingURL, clonePath)
  const { name: cloneDirName, blockFinalName, sshUrl, url } = createCompRes

  if (createFromExistingURL) {
    try {
      // git username try
      const prefersSsh = configstore.get('prefersSsh')
      const parentRepoUrl = prefersSsh ? createFromExistingURL : convertGitSshUrlToHttps(createFromExistingURL)
      const sourceUrl = prefersSsh ? sshUrl : url
      const Git = new GitManager(`${clonePath}/${cloneDirName}`, cloneDirName, sourceUrl, prefersSsh)
      try {
        await Git.getGobalUsername()
      } catch (err) {
        console.log(chalk.dim('Git username and email not set!'))

        const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()
        await Git.setLocalUsername(gitUserName)
        await Git.setLocalUseremail(gitUserEmail)

        console.log(
          chalk.dim(`\nGit local config updated with ${chalk.bold(gitUserName)} & ${chalk.bold(gitUserEmail)}\n`)
        )
      }

      await Git.newBranch('main')
      await Git.commit('happy hacking from appblock team!', '--allow-empty')
      await Git.push('main')

      // Create a temp remote and fetch and merge it to local main to get data from parent repo
      await Git.checkoutbranch('main')
      await Git.addRemote('tempRemote', parentRepoUrl)
      await Git.fetch('tempRemote')
      await Git.merge('tempRemote/main', '--allow-unrelated-histories')
      if (metaData?.version_number) {
        try {
          // Not compatible with windows since using $() and pipe. Need to find another solution
          // await Git.revListTag(metaData.version_number)
          await Git.checkoutTagWithNoBranch(metaData.version_number)
          await Git.removeRemote('tempRemote')
          await Git.removeTags('$(git tag -l)')
        } catch {
          await Git.removeRemote('tempRemote')
        }
      } else {
        await Git.removeRemote('tempRemote')
      }

      console.log(chalk.dim('Successfully copied block code to local..'))

      // Try to update block config of pulled block,
      // if not present add a new one
      let blockConfig
      try {
        blockConfig = JSON.parse(readFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json')))
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(chalk.dim('Pulled block has no config file, adding a new one'))
          blockConfig = {
            type: blockTypeInverter(blockTypeNo),
            language: 'js',
            start: 'npx webpack-dev-server',
            build: 'npx webpack',
            postPull: 'npm i',
          }
        }
      }
      blockConfig.name = blockFinalName
      blockConfig.source = { https: url, ssh: sshUrl }
      writeFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json'), JSON.stringify(blockConfig))

      console.log(chalk.dim('Successfully updated block config..'))

      await Git.stageAll()
      await Git.commit('initial commit')
      await Git.push('main')

      console.log(chalk.dim('Successfully pushed new version code to git..'))
    } catch (err) {
      console.log('Something went wrong while pulling\n')
      process.exit(1)
    }
  }

  return {
    blockSource: { https: url, ssh: sshUrl },
    cloneDirName,
    clonePath,
    blockFinalName,
  }
}

module.exports = createBlockV2
