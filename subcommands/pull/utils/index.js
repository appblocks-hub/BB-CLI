/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { mkdirSync, existsSync, cpSync, rmSync } = require('fs')
const { spinnies } = require('../../../loader')
const { headLessConfigStore } = require('../../../configstore')
const { BB_CONFIG_NAME } = require('../../../utils/constants')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const { readJsonAsync } = require('../../../utils')
const GitConfigFactory = require('../../../utils/gitManagers/gitConfigFactory')

const checkOutAllBlocks = async ({
  git,
  tmpClonePath,
  blockClonePath,
  blockName,
  blockVersion,
  createCustomVariant,
  isOutOfContext,
}) => {
  const releaseBranch = `block_${blockName}@${blockVersion}`
  await git.fetch([`origin ${releaseBranch}`])
  await git.checkoutBranch(releaseBranch)

  const configPath = path.join(tmpClonePath, BB_CONFIG_NAME)

  const { data, err } = await readJsonAsync(configPath)
  if (err) throw err

  const cpOpts = { recursive: true }

  if (createCustomVariant || !isOutOfContext) {
    // filter for variant creations only
    cpOpts.filter = (s) => path.basename(s) !== '.git'
  }

  cpSync(tmpClonePath, blockClonePath, cpOpts)
  await git.undoCheckout()

  const dependencies = Object.entries(data.dependencies ?? {})
  if (dependencies?.length > 0) {
    const members = dependencies.map(([name, dt]) => ({
      name,
      directory: dt.directory,
      version: dt.version,
    }))

    await Promise.all(
      members.map(async ({ name, directory, version }) => {
        await checkOutAllBlocks({
          git,
          tmpClonePath,
          blockClonePath: path.join(blockClonePath, directory),
          blockName: name,
          blockVersion: version,
          createCustomVariant,
          isOutOfContext,
        })
        return true
      })
    )
  }
}

const cloneBlock = async (cloneParams) => {
  const {
    blockName,
    blockClonePath,
    blockVersion,
    gitUrl,
    rootPath,
    isRoot,
    tmpPath,
    createCustomVariant,
    isOutOfContext,
  } = cloneParams
  spinnies.add(blockName, { text: `Pulling ${blockName}` })

  const { manager: git, error: gErr } = await GitConfigFactory.init({
    cwd: rootPath,
    gitUrl,
  })
  if (gErr) throw gErr

  let tmpClonePath = blockVersion ? path.join(tmpPath, blockName) : blockClonePath
  if (isRoot) {
    await git.clone(tmpClonePath)

    if (blockVersion) {
      git.cd(tmpClonePath)
      await checkOutAllBlocks({
        git,
        tmpClonePath,
        blockName,
        blockClonePath,
        blockVersion,
        createCustomVariant,
        isOutOfContext,
      })
      rmSync(tmpClonePath, { recursive: true })
    }

    spinnies.succeed(blockName, { text: `Pulled ${blockName} ` })
    return { cloneFolder: blockClonePath }
  }

  tmpClonePath = path.join(tmpPath, blockName)

  if (!existsSync(path.dirname(tmpClonePath))) {
    mkdirSync(path.dirname(tmpClonePath), { recursive: true })
  }

  if (existsSync(tmpClonePath)) {
    rmSync(tmpClonePath, { recursive: true })
  }

  await git.clone(tmpClonePath)

  git.cd(tmpClonePath)

  if (blockVersion) {
    // if mono repo
    await checkOutAllBlocks({ git, tmpClonePath, blockName, blockClonePath, blockVersion, createCustomVariant })

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
    if (configManager.isBlockConfigManager) {
      throw new Error(`Couldn't find package config in root. Pull aborted!`)
    }

    const pk = await configManager.getAnyBlock(blockName)

    cpSync(pk.directory, blockClonePath, {
      recursive: true,
      filter: (s) => path.basename(s) !== '.git',
    })
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
