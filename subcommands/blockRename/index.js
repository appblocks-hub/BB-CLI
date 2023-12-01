/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const chalk = require('chalk')
const { renameSync } = require('fs')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { readInput } = require('../../utils/questionPrompts')
const { spinnies } = require('../../loader')
const { updateRepoName } = require('./util')
const { updateAllMemberConfig } = require('../connectRemote/util')

const blockRename = async (blockName, newBlockName, cmdOptions) => {
  const { blockPath } = cmdOptions || {}

  try {
    spinnies.add('rn', { text: 'Initialising config manager' })


    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager: cm, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      throw new Error('Please run the command inside package context ')
    }

    const { rootManager } = await cm.findMyParents()

    if (!rootManager) {
      throw new Error(`Error reading root manager`)
    }

    const blocks = await rootManager.getAllLevelAnyBlock()
    const renameBlocks = [rootManager, ...blocks].filter((b) => b?.config.name === blockName)

    if (renameBlocks?.length < 1) throw new Error(`No block found!`)

    let renameBlock = renameBlocks[0]

    const blockChoices = renameBlocks.map((m) => {
      const name = `${m.config.name} (${path.relative(path.dirname(rootManager.directory), m.directory)})`
      return { name, value: m }
    })

    spinnies.remove('rn')

    if (blockPath) {
      renameBlock = blockChoices.find(({ name }) => name.includes(`(${blockPath.trim()})`))?.value
    } else if (renameBlocks.length > 1) {
      renameBlock = await readInput({
        type: 'list',
        name: 'renameBlock',
        message: `Duplicate blocks found. Select a block to rename`,
        choices: blockChoices,
      })
    }

    if (!renameBlock) throw new Error(`No block found!`)

    spinnies.add('rn', { text: `Renaming ${blockName} block` })

    const isRootRename = renameBlock.config.blockId === rootManager.config.blockId
    const rootGitUrl = renameBlock.config.source.https
    const isMono = renameBlock.config.repoType === 'mono'
    let newSource = renameBlock.config.source

    if (isRootRename && rootGitUrl) {
      // rename root package
      const updatedRes = await updateRepoName(rootGitUrl, newBlockName)
      const { url, sshUrl } = updatedRes.data.data.updateRepository.repository
      newSource = { https: url, ssh: sshUrl }
    }

    const newBlockPath = path.join(path.dirname(renameBlock.directory), newBlockName)
    renameSync(renameBlock.directory, newBlockPath)

    const { manager, error: rErr } = await ConfigFactory.create(path.join(newBlockPath, BB_CONFIG_NAME))
    if (rErr) throw error

    renameBlock = manager
    let parentManager = null

    if (!isRootRename) {
      const { parentManagers, err } = await renameBlock.findMyParents()
      if (err) throw new Error('Error reading parent package of given block ')
      parentManager = parentManagers?.[0]
    }

    if (!isMono && !isRootRename) {
      // handle rename repo
      const updatedRes = await updateRepoName(rootGitUrl, newBlockName)
      const { url, sshUrl } = updatedRes.data.data.updateRepository.repository
      newSource = { https: url, ssh: sshUrl }
    }

    // rename package/block
    renameBlock.updateConfig({
      name: newBlockName,
      source: { ...newSource, branch: `block_${newBlockName}` },
    })

    if (parentManager) {
      const deps = Object.entries(parentManager.config.dependencies ?? {}).reduce((acc, [name, config]) => {
        if (name === blockName) {
          acc[newBlockName] = { ...config, directory: newBlockName }
        } else acc[name] = config
        return acc
      }, {})

      parentManager.updateConfig({ dependencies: deps })
    }

    if (isRootRename && isMono) {
      // update all blocks source
      await updateAllMemberConfig(renameBlock, newSource)
    }

    spinnies.succeed('rn', { text: `Successfully renamed ${blockName} to ${newBlockName}` })
  } catch (error) {
    spinnies.stopAll()
    spinnies.add('rn')
    spinnies.fail('rn', { text: chalk.red(error.message) })
  }
}

// const blockRename = require('./blockRename')

module.exports = blockRename
