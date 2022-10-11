/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const { readInput } = require('../utils/questionPrompts')
const { appRegistryAssignTags } = require('../utils/api')
const { getShieldHeader } = require('../utils/getHeaders')
const { spinnies } = require('../loader')
const { appConfig } = require('../utils/appconfigStore')

const addTags = async (options) => {
  await appConfig.init()

  const { all } = options
  const { dependencies } = appConfig.getAppConfig()
  const { name: appBlockName, tags: appBlockTags = [] } = appConfig.getAppConfig()

  try {
    spinnies.add('log', { text: `Getting blocks details` })
    const blocksList = await Promise.all(
      Object.values(dependencies)
        .filter(({ meta: { type } }) => appConfig.isInAppblockContext || type !== 'appBlock')
        .map(async (depVal) => {
          const {
            meta: { name, tags },
          } = depVal

          const blockId = await appConfig.getBlockId(name)
          return {
            block_name: name,
            block_id: blockId,
            tags: tags || [],
          }
        })
    )
    spinnies.succeed('log', { text: `Blocks details retrieved` })

    let appBlockId
    if (appConfig.isInAppblockContext) {
      appBlockId = await appConfig.getBlockId(appBlockName)
      blocksList.unshift({
        block_name: appBlockName,
        block_id: appBlockId,
        tags: appBlockTags || [],
      })
    }

    if (!blocksList.length) {
      spinnies.add('at')
      spinnies.fail('at', { text: 'No blocks found' })
      process.exit(1)
    }

    const selectedBlocks = all
      ? blocksList
      : await readInput({
          name: 'blocks',
          type: 'checkbox',
          message: 'Select the blocks',
          choices: blocksList.map((block) => ({
            name: block.block_name,
            value: {
              block_name: block.block_name,
              block_id: block.block_id,
              tags: block.tags,
            },
          })),
          validate: (input) => {
            if (!input || input?.length < 1) return `Please select a block`
            return true
          },
        })

    let isInitial = true

    if (selectedBlocks.length === 1 && !appBlockId) {
      selectedBlocks[0].tags.forEach((tag) => {
        appBlockTags.push(tag)
      })
    }

    const tagNames = await readInput({
      name: 'tagNames',
      message: 'Enter the tags ( space seperated )',
      default: appBlockTags?.length ? appBlockTags.join(' ') : null,
      validate: (input) => {
        // TODO : Remove once better method is found to set initial values for the input (Like inquirer custom class)
        if (isInitial && input === appBlockTags?.join(' ')) {
          isInitial = false
          return `Edit default tags or press enter to continue ?`
        }

        if (!input || input?.length < 3) return `Tag should containe atleast 3 characters`
        return true
      },
    })
    spinnies.add('at', { text: 'Adding tags' })

    const tagsArray = [...new Set(tagNames.split(' '))]

    const tagsData = tagsArray.reduce((acc, tag) => {
      const tagLists = selectedBlocks.map(({ block_id }) => ({
        block_id,
        tag_name: tag,
      }))

      return acc.concat(tagLists)
    }, [])

    selectedBlocks.forEach(({ block_name, block_id, tags }) => {
      if (block_id === appBlockId) {
        appConfig.updateAppBlock({
          tags: [...new Set(tags.concat(tagsArray))],
        })
      } else {
        appConfig.updateBlock(block_name, {
          tags: [...new Set(tags.concat(tagsArray))],
        })
      }
    })

    await axios.post(
      appRegistryAssignTags,
      { blocks: tagsData },
      {
        headers: getShieldHeader(),
      }
    )

    spinnies.succeed('at', { text: 'Tags added successfully' })
  } catch (err) {
    spinnies.add('at')
    spinnies.fail('at', { text: err.message })
    console.error(err)
  }
}

module.exports = addTags
