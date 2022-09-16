/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const { appRegistryAssignCategories } = require('../utils/api')
const { getShieldHeader } = require('../utils/getHeaders')
const { readInput } = require('../utils/questionPrompts')
const { spinnies } = require('../loader')
const { appConfig } = require('../utils/appconfigStore')
const { getCategories } = require('../utils/categoriesUtil')

const addCategories = async (options) => {
  try {
    await appConfig.init()

    const { all } = options
    const { dependencies } = appConfig.getAppConfig()
    const { name: appBlockName, categories: appBlockCategories } = appConfig.getAppConfig()

    const appBlockId = await appConfig.getBlockId(appBlockName)

    const blocksList = await Promise.all(
      Object.values(dependencies).map(async (depVal) => {
        const {
          meta: { name, categories },
        } = depVal

        const blockId = await appConfig.getBlockId(name)
        return {
          block_name: name,
          block_id: blockId,
          categories: categories || [],
        }
      })
    )

    blocksList.unshift({
      block_name: appBlockName,
      block_id: appBlockId,
      categories: appBlockCategories || [],
    })

    if (!blocksList.length) {
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
              categories: block.categories,
            },
          })),
          validate: (input) => {
            if (!input || input?.length < 1) return `Please select a block`
            return true
          },
        })

    const categoriesList = await getCategories()

    const categoryIds = await readInput({
      type: 'customSelect',
      name: 'categoryIds',
      message: 'Select the categories',
      customChoices: categoriesList,
      validate: (input) => {
        if (!input || input?.length < 1) return `Please select a category`
        return true
      },
      getSubChoice: async (value) => {
        const cL = await getCategories(value)
        return cL
      },
      customDefaultChoices: [],
    })

    spinnies.add('at', { text: 'Adding categories ' })

    const categoriesData = selectedBlocks.reduce((acc, { block_id }) => {
      const categoryLists = categoryIds.map((categoryId) => ({
        block_id,
        category_id: categoryId,
      }))

      return acc.concat(categoryLists)
    }, [])

    const addCategoriesRes = await axios.post(
      appRegistryAssignCategories,
      { blocks: categoriesData },
      {
        headers: getShieldHeader(),
      }
    )

    const { data } = addCategoriesRes.data

    await Promise.all[
      selectedBlocks.forEach(async ({ block_name, block_id }) => {
        const updateCategoriesValue = data[block_id]?.split(',')
        if (block_id === appBlockId) {
          appConfig.updateAppBlock({ categories: updateCategoriesValue })
        } else {
          await appConfig.updateBlock(block_name, { categories: updateCategoriesValue })
        }
      })
    ]

    spinnies.succeed('at', { text: 'Categories added successfully' })
  } catch (err) {
    spinnies.add('at')
    spinnies.fail('at', { text: err.message })
    console.error(err)
  }
}

module.exports = addCategories
