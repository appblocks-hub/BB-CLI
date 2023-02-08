/* eslint-disable no-use-before-define */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const { rename, rm } = require('fs/promises')
const path = require('path')
const { configstore } = require('../configstore')
const create = require('../subcommands/create')
const { blockTypeInverter } = require('./blockTypeInverter')
const { CreateError } = require('./errors/createError')
const { moveFiles, prepareFileListForMoving, ensureDirSync } = require('./fileAndFolderHelpers')
const { GitManager } = require('./gitmanager')
const { confirmationPrompt, readInput, getGitConfigNameEmail } = require('./questionPrompts')

/**
 *
 * @param {Array} list A List of absolute paths
 * @returns
 */
const offerAndCreateBlock = async (list) => {
  const report = []
  if (list.length === 0) return report

  // console.log('\n-------------------------')
  // console.log(list)
  // console.log('--------------------------\n')

  const ans = await confirmationPrompt({
    name: 'createBlockFromstale',
    message: `Should I create blocks from above ${list.length} ${list.length > 1 ? `directories` : `directory`}`,
    default: false,
  })

  /**
   * @typedef report
   * @property {String} oldPath
   * @property
   */
  if (ans) {
    for (let i = 0; i < list.length; i += 1) {
      const ele = list[i]
      report[i] = { oldPath: ele }
      const hasGitFolder = existsSync(path.resolve(ele, '.git'))

      let name = ''
      let type = ''
      let existingConfig = ''

      try {
        const config = JSON.parse(readFileSync(path.join(ele, 'block.config.json')))
        name = config.name
        type = config.type
        existingConfig = config
      } catch (err) {
        console.log(`Error reading config from ${ele}`)
        report[i].registered = false
        report[i].copied = false
        // eslint-disable-next-line no-continue
        continue
      }

      const c = await confirmationPrompt({
        name: `block-${i}`,
        message: `Should i register ${ele}`,
        default: false,
      })

      if (c) {
        /**
         * If user has decided to register the contents of the directory as a block,
         * copy the contents of the folder to a temp directory,
         * this is to avoid the case where user register the directory in the same name
         * as the directory itself, in which case 'create' will run into error,
         * as git complains during cloning.
         */

        ensureDirSync(path.normalize('./.temp'))

        if (hasGitFolder) {
          console.log(`Copying ${ele} to a temp folder`)
          const f2 = await prepareFileListForMoving(ele, `./.temp`, [])
          await moveFiles(false, f2)
          console.log(`files in ${ele} copied`)
        }

        // rename the original directory
        await rename(ele, `${ele}_old_`)

        let blockName = name
        if (!name) {
          blockName = await readInput({ name: 'blockName', message: 'Enter a block name' })
        }

        try {
          const { clonePath, cloneDirName, blockDetails } = await create(
            blockName,
            { type: blockTypeInverter(type) || null, autoRepo: true },
            null,
            true,
            path.resolve(ele, '../'),
            false
          )

          const newPath = path.join(clonePath, cloneDirName)

          report[i] = {
            ...report[i],
            directory: newPath,
            registered: true,
            sourcemismatch: false,
            name: blockName,
            newName: blockDetails.name,
            data: {
              detailsInRegistry: blockDetails,
              localBlockConfig: blockDetails,
            },
          }

          /**
           * If user wants git history, they can copy the git folder to new location, but don't replace the git config file
           */
          const ignoreList = ['.git', 'block.config.json']

          /**
           * Moving cases:
           * one: user registstered in a new name ( localname-fn1, newname-fn1_1),
           *      now create creates a new folder fn1_1 with a new .git and new block.config.json,
           *      merge the config file and merge .git in such a way that history is maintained
           * two: user registered in same name, and local folder has .git ->
           *        merge block config, move all the files back to the new folder (the folder with same name created by create),
           *        prompt the user for confirmation on copying git history.
           *      user registered in same name, and local folder does not have a .git -> move all files back.
           *
           */

          const newConfig = {
            ...existingConfig,
            name: blockDetails.name,
            source: blockDetails.source,
          }
          // console.log('newconfig')
          // console.log(newConfig)
          console.log(`Writing new config to ${newPath}`)
          writeFileSync(`${newPath}/block.config.json`, JSON.stringify(newConfig))
          // ////////////////////////////////////////
          /**
           * @type {Boolean}
           */
          let c1 = false
          let c2 = false
          /**
           * Check if initial directory name and newly registered name is same
           * @type {Boolean}
           */
          const hasSameName = path.basename(ele) === newConfig.name
          const tempPath = path.normalize('./.temp')

          /**
           * If the new directory has same name, copy all files with back from .temp, without prompting
           */
          if (hasSameName) {
            if (existsSync(tempPath)) {
              const files = await prepareFileListForMoving(tempPath, newPath, ignoreList)
              if (files.length) {
                moveFiles(false, files)
              }
            }
          }

          /**
           *
           * If the initial directory was the same name as the newly registered one,
           * there is no need for the prompts, if it had a .git, prompt if history has to be
           * copied.
           */
          if (!hasSameName) {
            c1 = await confirmationPrompt({
              message: 'Should I move all files to new location',
              default: true,
              name: 'moveBlockCode',
            })
          }

          /**
           * If new block has same name as initial directory, and later had a git directory -> prompt.
           * If user wants to move all files ( if registered in a new name ), and initial had a
           *  git directory -> prompt
           */
          if ((hasGitFolder && !hasSameName && c1) || (hasGitFolder && hasSameName)) {
            c2 = await confirmationPrompt({
              message: 'Should i copy the git history',
              default: false,
              name: 'copyGitHistory',
            })
          }

          // TODO: make GitManager handle the url set
          const url = configstore.get('prefersSsh') ? blockDetails.source.ssh : blockDetails.source.https
          const Git = new GitManager(path.normalize(`${newPath}`), cloneDirName, url, configstore.get('prefersSsh'))

          if (c1 && c2) {
            const f1 = await prepareFileListForMoving(tempPath, newPath, ignoreList)
            if (f1.length) {
              await moveFiles(false, f1)
            }
            report[i].copied = true
            const f2 = await prepareFileListForMoving(
              path.normalize(`${tempPath}/.git`),
              path.normalize(`${newPath}/.git`),
              ['config']
            )
            if (f2.length) {
              await moveFiles(true, f2)
            }
            await Git.setUpstreamAndPush('main')
          } else if (c1) {
            const files = await prepareFileListForMoving(tempPath, newPath, ignoreList)
            if (files.length) {
              await moveFiles(false, files)
            }
            report[i].copied = true

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
            await Git.setUpstreamAndPush('main')
          } else if (c2) {
            const target = path.normalize(`${newPath}/.git`)
            const source = path.normalize(`${tempPath}/.git`)
            const files = await prepareFileListForMoving(source, target, ['config'])
            if (files.length) await moveFiles(files)
            report[i].copied = true
            await Git.setUpstreamAndPush()
          } else {
            console.log(`Please move the necessary files ${ele} to ${newPath}`)
            console.log(`In ${newPath} checkout to a main git branch and commit, then push`)
            console.log(`Using "bb push" will run into error as ${newPath} does not have a HEAD set`)
            report[i].copied = false
          }
          await rm('./.temp', { recursive: true })
        } catch (err) {
          if (err instanceof CreateError) {
            console.log(`Creation of ${blockName} with data from ${ele} failed`)
            report[i].registered = false
            report[i].copied = false
          } else {
            console.log(err)
            // writeFileSync(path.normalize('./logs/sync.log'), JSON.stringify(err.message))
            // console.log(`Renaming of ${ele} to ${blockName} failed`)
            report[i].copied = false
          }
        }
      }
    }
  }
  return report
}

module.exports = { offerAndCreateBlock }
