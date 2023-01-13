const chalk = require('chalk')
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

const { configstore } = require('../../configstore')
const { spinnies } = require('../../loader')
const convertGitSshUrlToHttps = require('../../utils/convertGitUrl')
const { createDirForType } = require('../../utils/fileAndFolderHelpers')
const { confirmationPrompt, readInput } = require('../../utils/questionPrompts')
const { pullSourceCodeFromAppblock } = require('./sourceCodeUtil')
const createComponent = require('../../utils/createComponent')
const { post } = require('../../utils/axios')
const {
  setInUseStatusForBlock,
  checkBlockAssignedToApp,
  assignBlockToApp,
  updateBlockApi,
  appBlockCheckBlockNameAvailability,
  trackBlockUpdatePull,
} = require('../../utils/api')
const deployConfigManager = require('../deploy/manager')
const { isValidBlockName } = require('../../utils/blocknameValidator')

const checkIsBlockAppAssinged = async (options) => {
  const { metaData, appData: ap } = options

  let appData = ap

  if (!ap) {
    await deployConfigManager.init()

    appData = deployConfigManager.deployAppConfig

    if (!appData?.app_id) {
      console.log(chalk.red(`App does not exist to pull into\n`))
      process.exit(1)
    }
  }

  spinnies.add('bp', { text: 'Checking if block is assinged with app' })
  const { error: checkErr, data: checkD } = await post(checkBlockAssignedToApp, {
    block_id: metaData.ID,
    app_id: appData.app_id,
    space_id: configstore.get('currentSpaceId'),
  })
  spinnies.remove('bp')
  if (checkErr) throw checkErr

  const data = checkD.data || {}
  data.appName = appData.app_name
  data.appData = appData

  return data
}

/**
 *
 * @returns
 */
async function purchasedPull(options) {
  const { metaData, appConfig, cwd } = options

  // Pulling purchased block code
  await deployConfigManager.init()

  const appData = deployConfigManager.deployAppConfig

  if (!appData?.app_id) {
    console.log(chalk.red(`App does not exist to pull into\n`))
    process.exit(1)
  }

  const checkData = await checkIsBlockAppAssinged({ metaData, appData })

  if (!checkData.exist) {
    if (checkData.can_assign) {
      const assignAndContinue = await confirmationPrompt({
        name: 'assignAndContinue',
        message: `Block is not assigned. Do you wish to assign ${metaData.BlockName} block with ${appData.app_name}`,
        default: false,
      })

      if (!assignAndContinue) throw new Error('Cancelled').message

      spinnies.add('bp', { text: 'assinging block with app' })
      const { error: assignErr } = await post(assignBlockToApp, {
        block_id: metaData.ID,
        app_id: appData.app_id,
        space_id: configstore.get('currentSpaceId'),
      })
      spinnies.remove('bp')
      if (assignErr) throw assignErr
    } else {
      console.log(chalk.red(`Block is not assigned with ${appData.app_name} \n`))
      process.exit(1)
    }
  }

  const availableName = await readInput({
    name: 'blockName',
    message: 'Enter the block name',
    default: metaData.BlockName,
    validate: async (ans) => {
      if (!isValidBlockName(ans)) return 'Only snake case with numbers is valid'
      try {
        const res = await post(appBlockCheckBlockNameAvailability, {
          block_name: ans,
          block_id: metaData.block_id,
        })

        return !res.data.err
      } catch (err) {
        return 'Something went wrong in blocknameavailability check'
      }
    },
  })

  const clonePath = appConfig.isOutOfContext ? cwd : createDirForType(metaData.BlockType, cwd || '.')
  const {
    description,
    // visibility,
    sshUrl,
    name: cdName,
    blockFinalName: bfName,
  } = await createComponent(availableName, false, clonePath, true)
  const blockFinalName = bfName

  const blockFolderPath = path.resolve(clonePath, blockFinalName)

  spinnies.add('pab', { text: 'pulling block source code' })
  await pullSourceCodeFromAppblock({
    blockFolderPath,
    metaData,
    blockId: metaData.parent_id,
    variantBlockId: metaData.ID,
    appId: appData.app_id,
    spaceId: configstore.get('currentSpaceId'),
  })
  spinnies.remove('pab')

  if (!checkData.in_use) {
    spinnies.add('pab', { text: 'updating block assinged' })
    const { error } = await post(setInUseStatusForBlock, {
      block_id: metaData.ID,
      app_id: appData.app_id,
      space_id: configstore.get('currentSpaceId'),
    })
    spinnies.remove('pab')
    if (error) throw error
  }

  // update the block details
  spinnies.add('pab', { text: 'updating block' })
  const { error: upErr } = await post(updateBlockApi, {
    block_id: metaData.ID,
    block_name: blockFinalName,
    block_short_name: blockFinalName,
    description,
    block_visibility: 2,
    git_url: sshUrl,
  })
  spinnies.remove('pab')

  if (upErr) throw upErr

  // update track of pulled parent block
  const { error } = await post(trackBlockUpdatePull, {
    block_id: metaData.parent_id,
    block_version_id: metaData.version_id,
    app_id: appData.app_id,
  })

  if (error) throw error

  const blockConfigPath = path.resolve(blockFolderPath, 'block.config.json')

  let blockConfig
  try {
    blockConfig = JSON.parse(readFileSync(blockConfigPath))
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(chalk.dim('Pulled block has no config file, adding a new one'))

      const isViewType = [2, 3].includes(metaData.BlockType)
      blockConfig = {
        type: metaData.BlockType,
        language: isViewType ? 'js' : 'nodejs',
        start: isViewType ? 'npx webpack-dev-server' : 'node index.js',
        build: isViewType ? 'npx webpack' : '',
        postPull: 'npm i',
      }
    }
    console.log('err blockConfig', err)
  }
  blockConfig.name = blockFinalName
  blockConfig.source = { https: convertGitSshUrlToHttps(sshUrl), ssh: sshUrl }
  writeFileSync(blockConfigPath, JSON.stringify(blockConfig, null, 2))

  return {
    cloneDirName: cdName,
    clonePath,
    blockFinalName,
  }
}

module.exports = { purchasedPull, checkIsBlockAppAssinged }
