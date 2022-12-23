const chalk = require('chalk')
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

const { forkRepo } = require('./forkUtil')

const initializePackageBlock = require('../init/initializePackageBlock')
const { runBash } = require('../bash')

const { configstore } = require('../../configstore')
const { spinnies } = require('../../loader')
const { isValidBlockName } = require('../../utils/blocknameValidator')
const checkBlockNameAvailability = require('../../utils/checkBlockNameAvailability')
const { feedback } = require('../../utils/cli-feedback')
const convertGitSshUrlToHttps = require('../../utils/convertGitUrl')
const createBlock = require('../../utils/createBlock')
const { createDirForType } = require('../../utils/fileAndFolderHelpers')
const { GitManager } = require('../../utils/gitmanager')
const { confirmationPrompt, readInput, wantToCreateNewVersion } = require('../../utils/questionPrompts')
const {
  getBlockDetails,
  addANewBlockVariant,
  getAllBlockVersions,
  getBlockMetaData,
} = require('../../utils/registryUtils')
const { checkPnpm } = require('../../utils/pnpmUtils')
// eslint-disable-next-line no-unused-vars
const { AppblockConfigManager } = require('../../utils/appconfig-manager')
const { pullSourceCodeFromAppblock } = require('./sourceCodeUtil')
const createComponent = require('../../utils/createComponent')
const registerBlock = require('../../utils/registerBlock')
const { post } = require('../../utils/axios')
const { setInUseStatusForBlock, checkBlockAssignedToApp, assignBlockToApp } = require('../../utils/api')
const deployConfigManager = require('../deploy/manager')

const handleOutOfContextCreation = async () => {
  const goAhead = await confirmationPrompt({
    message: `You are trying to create a block outside appblock package context. Want to create new package context ?`,
    name: 'seperateBlockCreate',
  })

  if (!goAhead) {
    feedback({ type: 'error', message: `Block should be created under package context` })
    return
  }

  const packageBlockName = await readInput({
    name: 'appName',
    message: 'Enter the package name',
    validate: (input) => {
      if (!isValidBlockName(input)) return ` ${input} is not valid name (Only snake case with numbers is valid)`
      return true
    },
  })

  const { DIRPATH } = await initializePackageBlock(packageBlockName)
  // chdir(DIRPATH)
  console.log(`cd to ${DIRPATH} and continue`)
  // Init for new
  // await appConfig.init(null, null, 'create', { reConfig: true })

  // feedback({ type: 'info', message: `\nContinuing ${componentName} block creation \n` })
}

/**
 *
 * @param {import('../../utils/jsDoc/types').blockDetailsdataFromRegistry & {version_id:string,parent_id:string}} da
 * @param {AppblockConfigManager} appConfig
 * @param {String} cwd
 * @param {String} componentName
 * @returns
 */
async function pullBlock(da, appConfig, cwd, componentName, options) {
  /**
   * To try and run postPull script
   */
  let pulledBlockPath = ''
  let metaData = { ...da }
  const { args, componentVersion } = options

  try {
    // get the version id of the latest verion of parent
    const c = await getBlockMetaData(metaData.ID)
    if (c.data.err) {
      throw new Error(c.data.msg).message
    }
    const compMetaData = c.data.data
    metaData.parent_id = metaData.ID
    metaData = { ...compMetaData, ...metaData }

    const {
      has_access: hasBlockAccess,
      has_purchased_access: hasPurchasedBlockAccess,
      block_visibility: blockVisibility,
    } = metaData

    if ((!hasBlockAccess && [1, 2].includes(blockVisibility)) || (!hasPurchasedBlockAccess && blockVisibility === 3)) {
      console.log({ hasBlockAccess, blockVisibility, hasPurchasedBlockAccess })
      feedback({ type: 'info', message: `Access denied for block ${componentName}` })
      return
    }

    let statusFilter = hasBlockAccess ? undefined : [4]
    if (hasPurchasedBlockAccess && !hasBlockAccess) statusFilter = [3, 4]
    const bv = await getAllBlockVersions(metaData.ID, { status: statusFilter })

    if (bv.data.err) {
      throw new Error(bv.data.msg).message
    }

    if (bv.status === 204 && !hasBlockAccess) {
      throw new Error('No version found for the block to pull').message
    }

    const blockVersions = bv.data.data
    const latestVersion = blockVersions?.[0]
    let pullWithoutVersion = false
    if (!latestVersion && hasBlockAccess) {
      const continueWithLatest = await confirmationPrompt({
        name: 'continueWithLatest',
        message: `Block version not specified. Do you want to pull the latest code?`,
      })

      if (!continueWithLatest) throw new Error('Pulling cancelled').message
      pullWithoutVersion = true
    }

    if (!pullWithoutVersion) {
      if (!componentVersion || componentVersion === 'latest') {
        if (!latestVersion) {
          feedback({ type: 'info', message: 'Versions not found for the block to pull' })
          return
        }

        if (componentVersion !== 'latest') {
          const continueWithLatest = await confirmationPrompt({
            name: 'continueWithLatest',
            message: `Block version not specified. Do you want to pull the latest versions ${latestVersion.version_number}?`,
          })

          if (!continueWithLatest) throw new Error('No version specified').message
        }
        // get the latest version of parent
        metaData.version_id = latestVersion?.id
        metaData.version_number = latestVersion?.version_number
      } else {
        metaData.version_id = blockVersions.find((v) => v.version_number === componentVersion)?.id
        metaData.version_number = componentVersion
      }

      if (!metaData.version_id) {
        feedback({ type: 'info', message: 'Version not found' })
        return
      }
    }

    const { addVariant, variant, variantType } = args

    let createCustomVersion
    if (addVariant === true || (hasPurchasedBlockAccess && blockVisibility === 3)) {
      createCustomVersion = true
    } else if (variant === false) createCustomVersion = false
    else {
      createCustomVersion = await wantToCreateNewVersion(metaData.BlockName)
    }

    if (pullWithoutVersion && createCustomVersion) {
      throw new Error('Variant can be only be created under block with version').message
    }

    if (createCustomVersion) {
      const availableName = await checkBlockNameAvailability(metaData.BlockName, true)

      let clonePath
      let cloneDirName
      let blockFinalName

      if (hasPurchasedBlockAccess && blockVisibility === 3) {
        // Pulling purchased block code
        await deployConfigManager.init()

        const appData = deployConfigManager.deployAppConfig

        if (!appData?.app_id) {
          console.log(chalk.red(`App does not exist\n`))
          process.exit(1)
        }

        spinnies.add('bp', { text: 'checking if block is assinged with app' })
        const { error: checkErr, data: checkD } = await post(checkBlockAssignedToApp, {
          block_id: metaData.parent_id,
          app_id: appData.app_id,
          space_id: configstore.get('currentSpaceId'),
        })
        spinnies.remove('bp')
        if (checkErr) throw checkErr

        const checkData = checkD.data || {}

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
              block_id: metaData.parent_id,
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

        clonePath = appConfig.isOutOfContext ? cwd : createDirForType(metaData.BlockType, cwd || '.')
        const {
          description,
          visibility,
          sshUrl,
          name: cdName,
          blockFinalName: bfName,
        } = await createComponent(availableName, false, clonePath, true)
        blockFinalName = bfName

        const blockFolderPath = path.resolve(clonePath, blockFinalName)

        spinnies.add('pab', { text: 'pulling block source code' })
        await pullSourceCodeFromAppblock({
          blockFolderPath,
          metaData,
          appId: appData.app_id,
          spaceId: configstore.get('currentSpaceId'),
        })
        spinnies.remove('pab')

        if (!checkData.in_use) {
          spinnies.add('bp', { text: 'updating block assinged' })
          const { error } = await post(setInUseStatusForBlock, {
            block_id: metaData.parent_id,
            app_id: appData.app_id,
            space_id: configstore.get('currentSpaceId'),
          })
          spinnies.remove('bp')
          if (error) throw error
        }

        spinnies.remove('pab')
        await registerBlock(
          metaData.BlockType,
          blockFinalName,
          blockFinalName,
          visibility === 'PUBLIC',
          sshUrl,
          description,
          metaData.jobConfig
        )

        clonePath = blockFolderPath
        cloneDirName = cdName
      } else if (hasBlockAccess || blockVisibility === 4) {
        let newVariantType = variantType === 'fork' ? 0 : 1
        if (metaData.BlockType !== 1 && !variantType) {
          newVariantType = await readInput({
            type: 'list',
            name: 'isFork',
            message: 'Choose variant type',
            choices: ['Fork', 'Clone'].map((v, i) => ({
              name: v,
              value: i,
            })),
            // 0-fork 1-clone
          })
        }

        // IF FORK

        if (newVariantType === 0) {
          try {
            clonePath = appConfig.isOutOfContext ? cwd : createDirForType(metaData.BlockType, cwd || '.')
            const { sshUrl, name, blockFinalName: bf } = await forkRepo(metaData, availableName, clonePath)

            metaData.GitUrl = sshUrl
            cloneDirName = name
            blockFinalName = bf
          } catch (error) {
            console.log(chalk.red(error.message || error))
            process.exit(1)
          }
        } else {
          const createBlockRes = await createBlock(
            availableName,
            availableName,
            metaData.BlockType,
            metaData.GitUrl,
            appConfig.isOutOfContext,
            cwd,
            false,
            null,
            metaData
          )

          clonePath = createBlockRes.clonePath
          cloneDirName = createBlockRes.cloneDirName
          blockFinalName = createBlockRes.blockFinalName
        }
      }

      // TODO -- store new block details in two branches and run addBlock way dow
      // n, so this code is only once!!
      // Maybe update config from createBlock itself
      if (appConfig.isOutOfContext) {
        appConfig.addBlock({
          directory: path.relative(cwd, path.resolve(clonePath, cloneDirName)),
          meta: JSON.parse(readFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json'))),
        })
      }

      // Inform registry about the new variant
      // TODO: change too many network calls

      // get the id of new variant
      const d = await getBlockDetails(blockFinalName)
      if (d.status === 204) {
        spinnies.add('blockExistsCheck')
        spinnies.fail('blockExistsCheck', { text: `${blockFinalName} doesn't exists in block repository` })
        return
      }
      if (d.data.err) {
        throw new Error(d.data.msg).message
      }
      const block_id = d.data.data.ID

      // request registry for new variant creation
      const rt = await addANewBlockVariant({
        block_id,
        version_id: metaData.version_id,
        parent_id: metaData.parent_id,
      })
      if (rt.data.err === false) {
        feedback({ type: 'success', message: rt.data.msg })
      } else {
        feedback({ type: 'error', message: 'Variant creation failed' })
        feedback({ type: 'error', message: rt.data.msg })
      }
      console.log(chalk.green(`${metaData.BlockName} pulled to ${blockFinalName} successfully!`))
      pulledBlockPath = path.resolve(clonePath, cloneDirName)
    } else {
      const existingBlock = appConfig.getBlock(componentName)
      if (existingBlock) {
        throw new Error(`${componentName} already exists at ${existingBlock.directory}`).message
      }

      const clonePath = appConfig.isOutOfContext ? '.' : createDirForType(metaData.BlockType, cwd || '.')

      const localDirName = `${metaData.BlockName}`
      const blockFolderPath = path.resolve(clonePath, localDirName)

      if (hasBlockAccess) {
        spinnies.add('pab', { text: 'Pulling block ' })
        const prefersSsh = configstore.get('prefersSsh')
        const originUrl = prefersSsh ? metaData.GitUrl : convertGitSshUrlToHttps(metaData.GitUrl)
        const Git = new GitManager(path.resolve(), localDirName, originUrl, prefersSsh)
        await Git.clone(blockFolderPath)
        if (metaData.version_number) {
          await Git.cd(blockFolderPath)
          await Git.fetch('--all --tags')
          // Not compatible with windows since using $() and pipe. Need to find another solution
          await Git.revListTag(metaData.version_number)
        }
        spinnies.remove('pab')
        // console.log(chalk.dim('Block cloned successfully '))
      } else {
        console.log(chalk.dim('No access to clone or fork the repository. Pulling code from appblocks'))
        spinnies.add('pab', { text: 'Pulling block source code' })
        await pullSourceCodeFromAppblock({ blockFolderPath, metaData })
        spinnies.remove('pab')
        // console.log(chalk.dim('Block pulled successfully'))
      }

      // execSync(`git clone ${metaData.GitUrl} ${path.resolve(clonePath, localDirName)}`, {
      //   stdio: 'ignore',
      // })

      // -------------------------------------------------
      const blockConfigPath = path.resolve(blockFolderPath, 'block.config.json')
      // -------------------------------------------------
      // -------------BELOW CODE IS REPEATED--------------
      // -------------------------------------------------
      // -------------------------------------------------

      // Try to update block config of pulled block,
      // if not present add a new one

      // This is code also present on createBlock
      let blockConfig
      try {
        blockConfig = JSON.parse(readFileSync(blockConfigPath))
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(chalk.dim('Pulled block has no config file, adding a new one'))
          blockConfig = {
            type: metaData.BlockType,
            language: metaData.BlockType < 4 ? 'js' : 'nodejs',
            start: 'npx webpack-dev-server',
            build: 'npx webpack',
            postPull: 'npm i',
          }
        }
      }
      blockConfig.name = metaData.BlockName
      blockConfig.version = metaData.version_number
      blockConfig.source = hasBlockAccess
        ? { https: convertGitSshUrlToHttps(metaData.GitUrl), ssh: metaData.GitUrl }
        : {}
      writeFileSync(blockConfigPath, JSON.stringify(blockConfig, null, 2))

      // console.log(chalk.dim('Succesfully updated block config..'))

      // -------------------------------------------------
      // -------------------------------------------------
      // -------------ABOVE CODE IS REPEATED--------------
      // -------------------------------------------------
      // -------------------------------------------------
      // go to pulled block and add the block config to appblo config

      appConfig.addBlock({
        directory: path.relative(cwd, path.resolve(clonePath, localDirName)),
        meta: JSON.parse(readFileSync(path.resolve(clonePath, localDirName, 'block.config.json'))),
      })

      console.log(chalk.green(`${metaData.BlockName} pulled Successfully!`))

      pulledBlockPath = path.resolve(clonePath, localDirName)
    }
  } catch (err) {
    let message = err.message || err

    if (err.response?.status === 401) {
      message = `Access denied for block ${componentName}`
    }

    feedback({ type: 'info', message })
    // console.log('Something went wrong, please try again.\n')
    // console.log(err)
    // console.log(chalk.red(err))
    if (!pulledBlockPath) return
  }

  // RUN the post pull script here
  // execSync(`cd ${pulledBlockPath} `)
  // TODO: use pnpm

  spinnies.add('npmi', { text: 'Checking for pnpm binary' })
  let usePnpm = false
  if (checkPnpm()) {
    usePnpm = true
  } else {
    spinnies.update('npmi', { text: 'pnpm is not installed', status: 'stopped' })
    console.log(`pnpm is recommended`)
    console.log(`Visit https://pnpm.io for more info`)
  }
  spinnies.add('npmi', { text: `Installing dependencies with ${usePnpm ? `pnpm` : 'npm'}` })
  const ireport = await runBash(usePnpm ? `pnpm install` : 'npm i', pulledBlockPath)
  if (ireport.status === 'failed') {
    spinnies.fail('npmi', { text: ireport.msg })
  } else {
    spinnies.succeed('npmi', { text: 'Dependencies installed' })
  }
  spinnies.remove('npmi')
}

module.exports = { pullBlock, handleOutOfContextCreation }
