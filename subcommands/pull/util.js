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
const { purchasedPull, checkIsBlockAppAssinged } = require('./purchasedPull')
const { post } = require('../../utils/axios')
const { getBlockPersmissionsApi } = require('../../utils/api')

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

const updateBlockConfig = async (options) => {
  const { blockConfigPath, metaData, createCustomVersion } = options
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
      const language = metaData.BlockType < 4 ? 'js' : 'nodejs'
      blockConfig = {
        type: metaData.BlockType,
        language,
        start: language === 'js' ? 'npx webpack-dev-server' : 'node index.js',
        build: language === 'js' ? 'npx webpack' : '',
        postPull: 'npm i',
      }
    }
  }

  if (createCustomVersion) {
    if (metaData.purchased_parent_block_id) {
      spinnies.add('pbu', { text: 'Getting parent block meta data ' })
      const parentBlockRes = await getBlockMetaData(metaData.purchased_parent_block_id)
      spinnies.remove('pbu')
      if (parentBlockRes.data.err) throw new Error(parentBlockRes.data.msg)
      const pbmd = parentBlockRes.data.data

      blockConfig.parent = {
        block_name: metaData.purchased_parent_block_id,
        block_id: pbmd.block_name,
        block_version: metaData.block_version,
        block_version_id: metaData.block_version_id,
      }
    } else {
      blockConfig.parent = {
        block_name: metaData.ID,
        block_id: metaData.BlockName,
        block_version: metaData.block_version,
        block_version_id: metaData.block_version_id,
      }
    }
  }

  blockConfig.name = metaData.BlockName
  blockConfig.version = metaData.version_number
  blockConfig.source =
    metaData.has_access || metaData.block_visibility === 4
      ? { https: convertGitSshUrlToHttps(metaData.GitUrl), ssh: metaData.GitUrl }
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

    metaData.parent_id = compMetaData.purchased_parent_block_id || metaData.ID
    metaData = { ...compMetaData, ...metaData }

    spinnies.add('pab', { text: 'checking block permission ' })
    const { data: pData, error: pErr } = await post(getBlockPersmissionsApi, {
      block_id: metaData.ID,
    })
    spinnies.remove('pab')
    if (pErr) throw pErr

    metaData = { ...metaData, ...pData.data }

    const {
      has_access: hasBlockAccess,
      has_pull_access: hasPullBlockAccess,
      block_visibility: blockVisibility,
      is_purchased_variant: isPurcahsedVariant,
    } = metaData

    if (!hasPullBlockAccess && [1, 2, 3].includes(blockVisibility)) {
      feedback({ type: 'info', message: `Access denied for block ${componentName}` })
      return
    }

    let statusFilter = hasBlockAccess ? undefined : [4]
    let versionOf = metaData.ID
    if (isPurcahsedVariant && blockVisibility === 5) {
      statusFilter = [4] // approved versions
      versionOf = compMetaData.purchased_parent_block_id
    }
    const bv = await getAllBlockVersions(versionOf, {
      status: statusFilter,
    })

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
        feedback({ type: 'info', message: `${componentVersion} version not found ` })
        return
      }
    }

    const { addVariant, variant, variantType } = args

    let createCustomVersion
    if (isPurcahsedVariant && blockVisibility !== 5) {
      createCustomVersion = false
    } else if (addVariant === true || (isPurcahsedVariant && blockVisibility === 5)) {
      createCustomVersion = true
    } else if (variant === false) createCustomVersion = false
    else {
      createCustomVersion = await wantToCreateNewVersion(metaData.BlockName)
    }

    if (pullWithoutVersion && createCustomVersion) {
      throw new Error('Variant can be only be created under block with version').message
    }

    if (createCustomVersion) {
      let clonePath
      let cloneDirName
      let blockFinalName

      if (isPurcahsedVariant && blockVisibility === 5) {
        const {
          cloneDirName: cDN,
          clonePath: cP,
          blockFinalName: bFN,
        } = await purchasedPull({ metaData, appConfig, cwd })

        clonePath = cP
        blockFinalName = bFN
        cloneDirName = cDN
      } else if (hasBlockAccess || blockVisibility === 4) {
        const availableName = await checkBlockNameAvailability(metaData.BlockName, true)
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
        if (isPurcahsedVariant) {
          const checkData = await checkIsBlockAppAssinged({ metaData })
          if (!checkData.exist) {
            feedback({ type: 'error', message: `Block is not assinged with ${checkData.appName} app` })
            return
          }
        }

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
      } else if (blockVisibility === 4) {
        console.log(chalk.dim('No access to clone or fork the repository. Pulling code from appblocks'))
        spinnies.add('pab', { text: 'Pulling block source code' })
        await pullSourceCodeFromAppblock({ blockFolderPath, metaData, blockId: metaData.parent_id })
        spinnies.remove('pab')
        // console.log(chalk.dim('Block pulled successfully'))
      } else {
        feedback({ type: 'error', message: `Access denied for block ${metaData.block_name}` })
        return
      }

      // execSync(`git clone ${metaData.GitUrl} ${path.resolve(clonePath, localDirName)}`, {
      //   stdio: 'ignore',
      // })

      // -------------------------------------------------
      const blockConfigPath = path.resolve(blockFolderPath, 'block.config.json')

      await updateBlockConfig({ blockConfigPath, metaData, createCustomVersion })

      appConfig.addBlock({
        directory: path.relative(cwd, path.resolve(clonePath, localDirName)),
        meta: JSON.parse(readFileSync(path.resolve(clonePath, localDirName, 'block.config.json'))),
      })

      console.log(chalk.green(`${metaData.BlockName} pulled Successfully!`))

      pulledBlockPath = path.resolve(clonePath, localDirName)
    }
  } catch (err) {
    spinnies.remove('pab')

    let message = err.response?.data?.msg || err.message || err

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
    console.log({ ireport })
    spinnies.fail('npmi', { text: ireport.msg })
  } else {
    spinnies.succeed('npmi', { text: 'Dependencies installed' })
  }
  spinnies.remove('npmi')
}

module.exports = { pullBlock, handleOutOfContextCreation }
