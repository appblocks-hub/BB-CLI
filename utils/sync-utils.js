/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { existsSync } = require('fs')
const path = require('path')
const { configstore } = require('../configstore')
const create = require('../subcommands/create')
const { CreateError } = require('./errors/createError')
const { moveFiles, prepareFileListForMoving } = require('./fileAndFolderHelpers')
const { GitManager } = require('./gitmanager')
const { confirmationPrompt, readInput } = require('./questionPrompts')

const offerAndCreateBlock = async (list) => {
  const report = []
  if (list.length === 0) return report
  const ans = await confirmationPrompt({
    name: 'createBlockFromstale',
    message: 'Should I create blocks from stale directories',
    default: false,
  })
  if (ans) {
    for (let i = 0; i < list.length; i += 1) {
      const ele = list[i]
      report[i] = { oldPath: ele }
      const hasGitFolder = existsSync(path.resolve(ele, '.git'))
      const c = await confirmationPrompt({
        name: `block-${i}`,
        message: `Should i register ${ele}`,
        default: false,
      })

      if (c) {
        const blockName = await readInput({ name: 'blockName', message: 'Enter a block name' })

        try {
          const { clonePath, cloneDirName, blockDetails } = await create(
            blockName,
            { type: null },
            null,
            true,
            '.',
            true
          )
          const newPath = path.join(clonePath, cloneDirName)
          report[i] = {
            ...report[i],
            directory: newPath,
            registered: true,
            sourcemismatch: false,
            name: blockName,
            newName: blockName,
            data: {
              detailsInRegistry: blockDetails,
              localBlockConfig: blockDetails,
            },
          }

          /**
           * If user wants git history, they can copy the git folder to new location, but don't replace the git config file
           */

          const ignoreList = ['.git']

          /**
           * @type {Boolean}
           */
          let c1 = false
          let c2 = false

          c1 = await confirmationPrompt({
            message: 'Should I move all files to new location',
            default: true,
            name: 'moveBlockCode',
          })

          if (hasGitFolder && c1) {
            c2 = await confirmationPrompt({
              message: ' Should i copy the git history',
              default: false,
              name: 'copyGitHistory',
            })
          }

          const url = configstore.get('prefersSsh') ? blockDetails.source.ssh : blockDetails.source.https
          const Git = new GitManager(path.normalize(`${newPath}`), cloneDirName, url, configstore.get('prefersSsh'))
          if (c1 && c2) {
            const f1 = await prepareFileListForMoving(ele, newPath, ['.git'])
            await moveFiles(true, f1)
            report[i].copied = true
            const f2 = await prepareFileListForMoving(
              path.normalize(`${ele}/.git`),
              path.normalize(`${newPath}/.git`),
              ['config']
            )
            await moveFiles(true, f2)
            await Git.setUpstreamAndPush('main')
          } else if (c1) {
            const files = await prepareFileListForMoving(ele, newPath, ignoreList)
            const res = await moveFiles(true, files)
            console.log(res)
            report[i].copied = true
            await Git.setUpstreamAndPush('main')
          } else {
            console.log(`Please move the necessary files ${ele} to ${newPath}`)
            console.log(`In ${newPath} checkout to a main git branch and commit, then push`)
            console.log(`Using "bb push" will run into error as ${newPath} does not have a HEAD set`)
            report[i].copied = false
          }
        } catch (err) {
          if (err instanceof CreateError) {
            console.log(`Creation of ${blockName} with data from ${ele} failed`)
            report[i].registered = false
            report[i].copied = false
          } else {
            console.log(`Renaming of ${ele} to ${blockName} failed`)
            report[i].copied = false
          }
        }
      }
    }
  }
  return report
}

module.exports = { offerAndCreateBlock }
