const chalk = require('chalk')
const { readFileSync, writeFileSync, cp, existsSync, rm } = require('fs')
const path = require('path')
const { tmpdir } = require('os')

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
const { purchasedPull, checkIsBlockAppAssigned } = require('./purchasedPull')
const { post } = require('../../utils/axios')
const { getBlockPermissionsApi } = require('../../utils/api')
const { getAllAppblockVersions } = require('../publish/util')

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

  const { DIRPATH } = await initializePackageBlock(packageBlockName, { autoRepo: true })
  // chdir(DIRPATH)
  console.log(`cd to ${DIRPATH} and continue`)
  // Init for new
  // await appConfig.init(null, null, 'create', { reConfig: true })

  // feedback({ type: 'info', message: `\nContinuing ${componentName} block creation \n` })
}

const updateBlockConfig = async (options) => {
  const { blockConfigPath, metaData, createCustomVariant } = options
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
      const language = metaData.block_type < 4 ? 'js' : 'nodejs'
      blockConfig = {
        type: metaData.block_type,
        language,
        start: language === 'js' ? 'npx webpack-dev-server' : 'node index.js',
        build: language === 'js' ? 'npx webpack' : '',
        postPull: 'npm i',
      }
    }
  }

  if (createCustomVariant) {
    if (metaData.purchased_parent_block_id) {
      spinnies.add('pbu', { text: 'Getting parent block meta data ' })
      const parentBlockRes = await getBlockMetaData(metaData.purchased_parent_block_id)
      spinnies.remove('pbu')
      if (parentBlockRes.data.err) throw new Error(parentBlockRes.data.msg)
      const pbmd = parentBlockRes.data.data

      blockConfig.parent = {
        block_id: metaData.purchased_parent_block_id,
        block_name: pbmd.block_name,
        block_version: metaData.block_version,
        block_version_id: metaData.block_version_id,
      }
    } else {
      blockConfig.parent = {
        block_id: metaData.block_id,
        block_name: metaData.block_name,
        block_version: metaData.block_version,
        block_version_id: metaData.block_version_id,
      }
    }
  }

  blockConfig.name = metaData.block_name
  blockConfig.version = metaData.version_number
  blockConfig.source =
    metaData.has_access || metaData.block_visibility === 4
      ? { https: convertGitSshUrlToHttps(metaData.git_url), ssh: metaData.git_url }
      : {}
  writeFileSync(blockConfigPath, JSON.stringify(blockConfig, null, 2))

  // -------------------------------------------------
  // -------------------------------------------------
  // -------------ABOVE CODE IS REPEATED--------------
  // -------------------------------------------------
  // -------------------------------------------------
  // go to pulled block and add the block config to appblo config

  return true
}

/**
 *
 * @param {import('../../utils/jsDoc/types').blockDetailsdataFromRegistry & {version_id:string,parent_id:string}} da
 * @param {AppblockConfigManager} appConfig
 * @param {String} cwd
 * @param {String} componentName
 * @returns
 */
async function pullBlock(da, appConfig, cwdValue, componentName, options) {
  /**
   * To try and run postPull script
   */
  let pulledBlockPath = ''
  let metaData = { ...da }
  const { args, componentVersion: cm } = options
  let componentVersion = cm
  const tempPath = tmpdir()
  const pullByConfigFolderName = metaData.pull_by_config_folder_name
  const tempPullByConfigFolder = `${tempPath}/appblocks_${pullByConfigFolderName}/`

  let cwd = cwdValue

  try {
    if (!metaData.block_id) {
      // get the version id of the latest version of parent
      const c = await getBlockMetaData(metaData.id)
      if (c.data.err) {
        throw new Error(c.data.msg)
      }
      const compMetaData = c.data.data
      metaData = { ...compMetaData, ...metaData }
      metaData.parent_id = compMetaData.purchased_parent_block_id || metaData.block_id
    } else {
      metaData.parent_id = metaData.purchased_parent_block_id || metaData.block_id
    }

    if (metaData.pull_by_config) {
      process.chdir('../')
      cp(`${pullByConfigFolderName}/`, tempPullByConfigFolder, { recursive: true }, (err) => {
        if (err) throw err
        rm(pullByConfigFolderName, { recursive: true, force: true }, () => {})
      })
      componentVersion = metaData.version
      cwd = '.'
      await appConfig.init(cwd, null, 'pull', { reConfig: true })
    }

    spinnies.add('pab', { text: 'checking block permission ' })
    const { data: pData, error: pErr } = await post(getBlockPermissionsApi, {
      block_id: metaData.block_id,
    })

    spinnies.remove('pab')
    if (pErr) throw pErr

    delete pData.data?.id

    metaData = { ...metaData, ...pData.data }

    const {
      has_access: hasBlockAccess,
      has_pull_access: hasPullBlockAccess,
      block_visibility: blockVisibility,
      is_purchased_variant: isPurchasedVariant,
    } = metaData

    if (!hasPullBlockAccess && [1, 2, 3].includes(blockVisibility)) {
      feedback({ type: 'error', message: `Access denied for block ${componentName}` })
      return
    }

    let statusFilter = hasBlockAccess ? undefined : [4]
    let versionOf = metaData.block_id
    if (isPurchasedVariant && blockVisibility === 5) {
      statusFilter = [4] // approved versions
      versionOf = metaData.purchased_parent_block_id
    }
    const bv = await getAllBlockVersions(versionOf, {
      status: statusFilter,
    })

    if (bv.data.err) {
      throw new Error(bv.data.msg)
    }

    if (bv.status === 204 && (!hasBlockAccess || !hasPullBlockAccess)) {
      throw new Error('No version found for the block to pull')
    }

    const blockVersions = bv.data.data
    const latestVersion = blockVersions?.[0]
    let pullWithoutVersion = false
    if (!latestVersion && hasBlockAccess) {
      const continueWithLatest = await confirmationPrompt({
        name: 'continueWithLatest',
        message: `Block version not specified. Do you want to pull the latest code?`,
      })

      if (!continueWithLatest) throw new Error('Cancelled Pulling block with latest code')
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

          if (!continueWithLatest) throw new Error('No version specified')
        }
        // get the latest version of parent
        metaData.version_id = latestVersion?.id
        metaData.version_number = latestVersion?.version_number
      } else {
        metaData.version_id = blockVersions.find((v) => v.version_number === componentVersion)?.id
        metaData.version_number = componentVersion
      }

      if (!metaData.version_id) {
        feedback({ type: 'info', message: `${componentVersion} version not found ` })
        return
      }

      spinnies.add('at', { text: `Getting linked appblock versions` })
      const abVers = await getAllAppblockVersions({ block_version_id: metaData.version_id })
      spinnies.remove('at')
      const bSab = abVers.data?.map(({ version }) => version) || []
      const pbSab = appConfig.config?.supportedAppblockVersions

      if (bSab?.length && pbSab?.length) {
        const isSupported = bSab.some((version) => pbSab.includes(version))

        if (!isSupported) {
          console.log(
            chalk.yellow(
              `${appConfig.config.name} supported versions : ${pbSab}\n${metaData.block_name} supported versions : ${bSab}`
            )
          )
          const goAhead = await confirmationPrompt({
            name: 'goAhead',
            message: `Found non-compatible appblock version in pulling block. Do you want to continue ?`,
            default: false,
          })

          if (!goAhead) throw new Error('Cancelled pulling non-compatible block')
        }
      }
    }

    const { addVariant, variant, variantType } = args

    let createCustomVariant
    if (isPurchasedVariant && blockVisibility !== 5) {
      // FOR NOW: No variant allowed for purchased variant
      createCustomVariant = false
    } else if (addVariant === true || (isPurchasedVariant && blockVisibility === 5)) {
      createCustomVariant = true
    } else if (variant === false) createCustomVariant = false
    else {
      createCustomVariant = await wantToCreateNewVersion(metaData.block_name)
    }

    if (pullWithoutVersion && createCustomVariant) {
      throw new Error(`Variant can't be created under block without version`)
    }

    if (createCustomVariant) {
      let clonePath
      let cloneDirName
      let blockFinalName

      if (isPurchasedVariant && blockVisibility === 5) {
        const {
          cloneDirName: cDN,
          clonePath: cP,
          blockFinalName: bFN,
        } = await purchasedPull({ metaData, appConfig, cwd })

        clonePath = cP
        blockFinalName = bFN
        cloneDirName = cDN
      } else if (hasBlockAccess || blockVisibility === 4) {
        const availableName = await checkBlockNameAvailability(
          pullByConfigFolderName || metaData.block_name,
          !pullByConfigFolderName
        )
        let newVariantType = variantType === 'fork' ? 1 : 0
        if (metaData.block_type !== 1 && !variantType) {
          newVariantType = await readInput({
            type: 'list',
            name: 'isFork',
            message: 'Choose variant type',
            choices: ['Clone', 'Fork'].map((v, i) => ({
              name: v,
              value: i,
            })),
            // 0-clone,  1-fork
          })
        }

        // IF FORK

        if (newVariantType === 1) {
          try {
            clonePath = appConfig.isOutOfContext ? cwd : createDirForType(metaData.block_type, cwd || '.')
            const { sshUrl, name, blockFinalName: bf } = await forkRepo(metaData, availableName, clonePath)

            metaData.git_url = sshUrl
            cloneDirName = name
            blockFinalName = bf
          } catch (error) {
            console.log(chalk.red(error.message || error))
            process.exit(1)
          }
        } else {
          const packageBlockName = appConfig.config?.name
          const package_block_id = appConfig.packageBlockId

          if (!packageBlockName && metaData.block_type !== 1) {
            throw new Error('Cannot create block without package block')
          }

          const createBlockRes = await createBlock(
            availableName,
            availableName,
            metaData.block_type,
            metaData.git_url,
            appConfig.isOutOfContext,
            cwd,
            false,
            null,
            metaData,
            package_block_id
          )

          clonePath = createBlockRes.clonePath
          cloneDirName = createBlockRes.cloneDirName
          blockFinalName = createBlockRes.blockFinalName

          const bcPath = path.resolve(clonePath, cloneDirName, 'block.config.json')
          const bc = JSON.parse(readFileSync(bcPath))
          bc.blockId = createBlockRes.blockId
          writeFileSync(bcPath, JSON.stringify(bc, null, 2))
        }
      }

      // TODO -- store new block details in two branches and run addBlock way dow
      // n, so this code is only once!!
      // Maybe update config from createBlock itself
      appConfig.addBlock({
        directory: path.relative(cwd, path.resolve(clonePath, cloneDirName)),
        meta: JSON.parse(readFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json'))),
      })

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
        throw new Error(d.data.msg)
      }
      const block_id = d.data.data.id

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
      console.log(chalk.green(`${metaData.block_name} pulled to ${blockFinalName} successfully!`))
      pulledBlockPath = path.resolve(clonePath, cloneDirName)
    } else {
      if (metaData.pull_by_config) {
        const goAhead = await confirmationPrompt({
          name: 'goAhead',
          message: `Block name and folder name should be same. Do you want to rename ${pullByConfigFolderName} to ${metaData.block_name} ?`,
        })

        if (!goAhead) throw new Error('Cannot proceed with different name')
      }

      const existingBlock = appConfig.getBlock(componentName)
      if (existingBlock) {
        throw new Error(`${componentName} already exists at ${existingBlock.directory}`)
      }

      const clonePath = appConfig.isOutOfContext ? '.' : createDirForType(metaData.block_type, cwd || '.')

      const localDirName = `${metaData.block_name}`
      const blockFolderPath = path.resolve(clonePath, localDirName)

      if (hasPullBlockAccess) {
        if (isPurchasedVariant) {
          const checkData = await checkIsBlockAppAssigned({ metaData })
          if (!checkData.exist) {
            feedback({ type: 'error', message: `Block is not assigned with ${checkData.appName} app` })
            return
          }
        }

        spinnies.add('pab', { text: 'Pulling block ' })
        const prefersSsh = configstore.get('prefersSsh')
        const originUrl = prefersSsh ? metaData.git_url : convertGitSshUrlToHttps(metaData.git_url)
        const Git = new GitManager(path.resolve(), localDirName, originUrl, prefersSsh)
        await Git.clone(blockFolderPath)
        if (metaData.version_number) {
          Git.cd(blockFolderPath)
          await Git.fetch('--all --tags')
          // Not compatible with windows since using $() and pipe. Need to find another solution
          // await Git.revListTag(metaData.version_number)
          Git.checkoutTagWithNoBranch(metaData.version_number)
        }
        spinnies.remove('pab')
        // console.log(chalk.dim('Block cloned successfully '))
      } else if (blockVisibility === 4) {
        console.log(chalk.dim('No access to clone or fork the repository. Pulling code from appblocks'))
        spinnies.add('pab', { text: 'Pulling block source code' })
        await pullSourceCodeFromAppblock({ blockFolderPath, metaData, blockId: metaData.block_id })
        spinnies.remove('pab')
        // console.log(chalk.dim('Block pulled successfully'))
      } else {
        feedback({ type: 'error', message: `Access denied for block ${metaData.block_name}` })
        return
      }

      // execSync(`git clone ${metaData.git_url} ${path.resolve(clonePath, localDirName)}`, {
      //   stdio: 'ignore',
      // })

      // -------------------------------------------------
      const blockConfigPath = path.resolve(blockFolderPath, 'block.config.json')

      await updateBlockConfig({ blockConfigPath, metaData, createCustomVariant })

      appConfig.addBlock({
        directory: path.relative(cwd, path.resolve(clonePath, localDirName)),
        meta: JSON.parse(readFileSync(path.resolve(clonePath, localDirName, 'block.config.json'))),
      })

      console.log(chalk.green(`${metaData.block_name} pulled Successfully!`))

      pulledBlockPath = path.resolve(clonePath, localDirName)
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
      console.log({ ireport })
      spinnies.fail('npmi', { text: ireport.msg })
    } else {
      spinnies.succeed('npmi', { text: 'Dependencies installed' })
    }
    spinnies.remove('npmi')

    if (metaData.pull_by_config && existsSync(`${tempPath}/appblocks_${pullByConfigFolderName}`)) {
      rm(`${tempPath}/appblocks_${pullByConfigFolderName}`, { recursive: true, force: true }, () => {})
    }
  } catch (err) {
    if (metaData.pull_by_config && existsSync(`${tempPath}/appblocks_${pullByConfigFolderName}`)) {
      cp(tempPullByConfigFolder, `${pullByConfigFolderName}/`, { recursive: true }, (error) => {
        if (error) feedback({ type: 'info', error })
        rm(`${tempPath}/appblocks_${pullByConfigFolderName}`, { recursive: true, force: true }, () => {})
      })
    }

    spinnies.remove('pab')

    let message = err.response?.data?.msg || err.message

    if (err.response?.status === 401) {
      message = `Access denied for block ${componentName}`
    }

    feedback({ type: 'info', message })
  }
}

module.exports = { pullBlock, handleOutOfContextCreation }
