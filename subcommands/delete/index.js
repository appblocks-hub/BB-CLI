/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { appConfig } = require('../../utils/appconfigStore')
const { readInput } = require('../../utils/questionPrompts')
const { deleteRegestredBlock, deleteGithubRepos, removeConfigAndFolder } = require('./util')
const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')

const deleteCommand = async (name) => {
  await appConfig.init()

  try {
    let deleteBlocks = []
    let appBlockName
    if (name) {
      const isBlockExist = appConfig.has(name)
      const { name: apName } = appConfig.getAppConfig()

      if (!appConfig.isInAppblockContext && name !== appBlockName && !isBlockExist) {
        throw new Error(`${name} block does not exist`)
      } else if (appConfig.isInAppblockContext && name !== appBlockName) {
        appBlockName = apName
        feedback({ type: 'warn', message: `Deleting ${name} will delete all its dependency blocks` })
        const { dependencies = {} } = appConfig.getAppConfig()
        deleteBlocks = deleteBlocks.concat(Object.keys(dependencies))
      }

      deleteBlocks.push(name)
    } else {
      const { dependencies = {} } = appConfig.getAppConfig()

      const blocksList = Object.values(dependencies).reduce((acc, { meta }) => {
        if (meta.type !== 'appBlock') acc.push(meta.name)
        return acc
      }, [])

      if (blocksList.length < 1) {
        throw new Error(`No blocks found to delete`)
      }

      deleteBlocks = await readInput({
        name: 'blocks',
        type: 'checkbox',
        message: 'Select the blocks',
        choices: blocksList.map((block_name) => ({
          name: block_name,
          value: block_name,
        })),
        validate: (input) => {
          if (!input || input?.length < 1) return `Please select a block`
          return true
        },
      })
    }

    const liveBlocks = [...appConfig.liveBlocks].map(({ meta }) => meta.name)
    const liveJobBlocks = [...appConfig.liveJobBlocks].map(({ meta }) => meta.name)

    if (deleteBlocks.some((bName) => liveJobBlocks.includes(bName))) {
      console.log('Block and its job is live, please stop job and live block before operation')
      process.exit(1)
    } else if (deleteBlocks.some((bName) => liveBlocks.includes(bName))) {
      console.log('Block is live, please stop before operation')
      process.exit(1)
    }

    const confirmDelete = await readInput({
      type: 'confirm',
      name: 'confirmDelete',
      default: false,
      message: `Blocks to delete are listed below\n\n  ${deleteBlocks
        .map((e) => chalk.red(e))
        .join(', ')}\n\n  Confirm deleting these blocks`,
    })

    if (!confirmDelete) {
      spinnies.add('del_block')
      spinnies.succeed('del_block', { text: `Cancelled block deletion` })
      process.exit(0)
    }

    spinnies.add('del_block', { text: `Deleting blocks from registry` })
    await deleteRegestredBlock(deleteBlocks)
    spinnies.succeed('del_block', { text: `Deleted blocks from registry` })

    await removeConfigAndFolder(appConfig, deleteBlocks, appBlockName)

    await deleteGithubRepos(deleteBlocks)
  } catch (error) {
    spinnies.add('del_block')
    spinnies.fail('del_block', { text: `${error.message}` })
  }
}

module.exports = deleteCommand
