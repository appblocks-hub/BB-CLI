/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { rename, readdir } = require('fs/promises')
const path = require('path')
const create = require('../subcommands/create')
const { CreateError } = require('./errors/createError')
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

      const c = await confirmationPrompt({
        name: `block-${i}`,
        message: `Should i register ${ele}`,
        default: false,
      })

      if (c) {
        const blockName = await readInput({ name: 'blockName', message: 'Enter a block name' })

        try {
          const { clonePath, cloneDirName, blockDetails } = await create(blockName, { type: null }, null, true, '.')
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

          const c1 = await confirmationPrompt({
            message: 'Should I move all files to new location',
            default: true,
            name: 'moveBlockCode',
          })

          if (c1) {
            const errorInMoving = []

            try {
              const files = await readdir(ele)
              for (let j = 0; j < files.length; j += 1) {
                if (!ignoreList.includes(files[j])) {
                  const oldname = path.resolve(ele, files[j])
                  const newname = path.resolve(newPath, files[j])
                  try {
                    await rename(oldname, newname)
                  } catch (err) {
                    console.log(`Error in moving ${oldname} to ${newname}`)
                    errorInMoving.push(oldname)
                  }
                }
              }

              if (errorInMoving.length !== files.length) {
                // If some of the files have been moved, then return false
                report[i].copied = true
              }
            } catch (err) {
              console.log(`Error reading ${ele}`)
              console.log(err.message.split('\n')[0])
              report[i].copied = false
            }
          } else {
            console.log(`Please move the necessary files ${ele} to ${newPath}`)
            console.log(`In ${newPath} checkout to a main git branch and commit, then push`)
            console.log(`Using "yah push" will run into error as ${newPath} does not have a HEAD set`)
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
