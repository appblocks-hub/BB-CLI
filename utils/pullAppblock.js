/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { pullBlock } = require('../subcommands/pull/pullUtils')
const { appConfig } = require('./appconfigStore')
const { createFileSync } = require('./fileAndFolderHelpers')
const { checkAndSetGitConfigNameEmail, tryGitInit } = require('./gitCheckUtils')
const { confirmationPrompt } = require('./questionPrompts')
const { getBlockDetails, getConfigFromRegistry } = require('./registryUtils')

const pullAppblock = async (name) => {
  const ID = await getBlockDetails(name)
    .then((res) => {
      if (res.status === 204) {
        throw new Error(`${name} not found in registry.`)
      }
      if (res.data.err) {
        throw new Error(`Error getting details of ${name}`)
      }
      // Make sure it is registered as appBlock, else unregistered
      if (res.data.data.BlockType !== 1) {
        throw new Error(`${name} is not registered as appblock`)
      }
      // eslint-disable-next-line no-param-reassign
      return res.data.data.ID
    })
    .catch((err) => {
      console.log(err.message)
      return null
    })

  if (!ID) {
    return false
  }

  const config = await getConfigFromRegistry(ID)

  if (!config) {
    return false
  }

  //   const { blockFinalName, blockSource } = await createBlock(availableName, availableName, 1, '', false, '.')

  const [dir] = [config.name]
  const DIRPATH = path.resolve(dir)

  const CONFIGPATH = path.join(DIRPATH, 'block.config.json')
  // createFileSync(CONFIGPATH, {
  //   name: config.name,
  //   type: 'appBlock',
  //   source: config.source,
  //   blockPrefix: config.blockPrefix,
  // })

  createFileSync(CONFIGPATH, config)
  appConfig.init(DIRPATH)

  tryGitInit()
  await checkAndSetGitConfigNameEmail(config.name)

  const reduced = { function: [], 'ui-elements': [], 'ui-container': [], 'shared-fn': [], data: [] }
  if (config.dependencies) {
    for (let index = 0; index < Object.keys(config.dependencies).length; index += 1) {
      const element = Object.keys(config.dependencies)[index]
      // console.log(element)
      const { meta } = config.dependencies[element]
      switch (meta.type) {
        case 'function':
          reduced.function.push({ ...config.dependencies[element] })
          break
        case 'ui-elements':
          reduced['ui-elements'].push({ ...config.dependencies[element] })
          break
        case 'ui-container':
          reduced['ui-container'].push({ ...config.dependencies[element] })
          break
        case 'data':
          reduced.data.push({ ...config.dependencies[element] })
          break
        case 'shared-fn':
          reduced['shared-fn'].push({ ...config.dependencies[element] })
          break
        default:
          break
      }
    }
  }

  for (let i = 0; i < Object.keys(reduced).length; i += 1) {
    const element = Object.keys(reduced)[i]
    const d = reduced[element]
    // console.log(d)
    if (d.length > 0) {
      const y = await confirmationPrompt({
        name: `pull-${element}`,
        message: `Found ${d.length} ${element} blocks, Do you want to pull them `,
      })
      //   console.log(y)
      if (y) {
        for (let j = 0; j < d.length; j += 1) {
          const blockData = d[j]
          const blockMeta = blockData.meta
          const z = await confirmationPrompt({
            name: `pull-${blockMeta.name}`,
            message: `Do you want to pull ${blockMeta.name} `,
          })
          if (z) {
            // eslint-disable-next-line global-require
            // const pull = require('../subcommands/pull')
            await pullBlock()
          }
        }
      }
    }
  }

  return true
}
module.exports = pullAppblock
