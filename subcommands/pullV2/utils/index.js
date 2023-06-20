/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { path } = require('path')
const { tmpdir } = require('os')
const { mkdirSync, existsSync, cpSync, rmSync } = require('fs')
const { spinnies } = require('../../../loader')
const { GitManager } = require('../../../utils/gitManagerV2')
const { headLessConfigStore } = require('../../../configstore')
const { BB_CONFIG_NAME } = require('../../../utils/constants')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const { readJsonAsync } = require('../../../utils')

const checkOutAllBlocks = async ({ git, tmpClonePath, clonePath, blockName, blockVersion }) => {
  git.checkoutBranch(`block_${blockName}@${blockVersion}`)

  const configPath = path.join(tmpClonePath, BB_CONFIG_NAME)
  const { data, err } = await readJsonAsync(configPath)
  if (err) throw err

  const members = Object.entries(data.dependencies).map(([name, dt]) => ({
    name,
    directory: dt.directory,
    version: dt.version,
  }))

  if (members?.length) {
    await Promise.all(
      members.map(async ({ name, directory, version }) => {
        await checkOutAllBlocks({
          git,
          tmpClonePath: path.join(tmpClonePath, directory),
          clonePath: path.join(clonePath, directory),
          blockName: name,
          blockVersion: version,
        })
        return true
      })
    )
  }

  cpSync(tmpClonePath, clonePath, { recursive: true })
}

const cloneBlock = async ({ blockName, blockClonePath, blockVersion, gitUrl, rootPath, isRoot }) => {
  spinnies.add(blockName, { text: `Pulling ${blockName}` })
  const git = new GitManager(rootPath, gitUrl)

  let tmpClonePath = blockVersion ? `${path.resolve(tmpdir(), '_appblocks_', blockName)}_latest` : blockClonePath
  if (isRoot) {
    await git.clone(tmpClonePath)
    
    if (blockVersion) {
      await checkOutAllBlocks({ git, tmpClonePath, blockName, blockClonePath, blockVersion })
      rmSync(tmpClonePath, { recursive: true })
    }

    spinnies.succeed(blockName, { text: `Pulled ${blockName} ` })
    return { cloneFolder: blockClonePath }
  }

  tmpClonePath = path.resolve(tmpdir(), '_appblocks_', blockName)

  if (existsSync(path.dirname(tmpClonePath))) mkdirSync(path.dirname(tmpClonePath), { recursive: true })
  await git.clone(tmpClonePath)

  if (blockVersion) {
    // if mono repo
    await checkOutAllBlocks({ git, tmpClonePath, blockName, blockClonePath, blockVersion })

    // TODO handle multi
    // await git.fetch('--all --tags')
    // await git.checkoutTag(core.blockDetails.version_number)
  } else {
    const configPath = path.join(tmpClonePath, BB_CONFIG_NAME)
    const { manager: configManager, error } = await ConfigFactory.create(configPath)
    if (error) {
      throw new Error('Pulling block is not in appblock standard structure. Pull aborted!')
    }
    // TODO multi repo

    // if mono repo
    if (configManager instanceof PackageConfigManager) {
      throw new Error(`Couldn't find package config in root. Pull aborted!`)
    }

    const pk = configManager.getAnyBlock(blockName)

    cpSync(pk.directory, blockClonePath, { recursive: true })
    rmSync(tmpClonePath, { recursive: true })
  }

  spinnies.succeed(blockName, { text: `Pulled ${blockName} ` })

  return { cloneFolder: blockClonePath }
}

const getBlockPullKeys = (pullBlock) => {
  const blockPullKeys = {}

  let bpArg = pullBlock.split('/')

  if (bpArg.length === 3) {
    const [sp, ...rest] = bpArg
    blockPullKeys.spaceName = sp.replace('@', '')
    bpArg = rest
  }

  if (bpArg.length === 2) {
    const [rp, ...rest] = bpArg
    if (rp.startsWith('@')) blockPullKeys.spaceName = rp.replace('@', '')
    else blockPullKeys.rootPackageName = rp
    bpArg = rest
  }

  if (bpArg.length === 1) {
    const [bN, bV] = bpArg[0].split('@')
    blockPullKeys.blockName = bN
    blockPullKeys.blockVersion = bV
  }

  if (!blockPullKeys.spaceName) {
    blockPullKeys.spaceName = headLessConfigStore().get('currentSpaceName')
  }

  return blockPullKeys
}

// eslint-disable-next-line no-unused-vars
const pullByConfigSetup = async (core, metaData) => {
  // if (!existsSync(core.blockConfigName)) {
  //   throw new Error('Block name or Block config not found')
  // }
  // const config = JSON.parse(readFileSync(core.blockConfigName))
  // if (!config.blockId) throw new Error('Block ID not found in block config')
  // core.pullBlockName = config.name
  // const goAhead = await confirmationPrompt({
  //   message: `You are trying to pull ${core.pullBlockName} by config ?`,
  //   default: false,
  //   name: 'goAhead',
  // })
  // if (!goAhead) {
  //   core.feedback({ type: 'error', message: `Process cancelled` })
  //   throw new Error('Process cancelled')
  // }
  // let pullId = config.blockId
  // metaData.pull_by_config = true
  // metaData.block_config = config
  // const pullByConfigFolderName = path.basename(path.resolve())
  // metaData.pull_by_config_folder_name = pullByConfigFolderName
  // core.blockDetails = metaData
  // process.chdir('../')
  // cp(
  //   pullByConfigFolderName,
  //   path.join(core.tempAppblocksFolder, pullByConfigFolderName),
  //   { recursive: true },
  //   (err) => {
  //     if (err) throw err
  //     rm(pullByConfigFolderName, { recursive: true, force: true }, () => {})
  //   }
  // )
  // core.pullBlockVersion = config.version
  // core.cwd = path.resolve('.')
  // re-init packageConfig
  // await core.PackageManage.init(core.cwd, null, 'pull', { reConfig: true })
  // return { pullId, metaData }
}

module.exports = { cloneBlock, getBlockPullKeys, pullByConfigSetup }
