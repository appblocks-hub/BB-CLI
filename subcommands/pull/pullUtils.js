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
const { BB_CONFIG_NAME } = require('../../utils/constants')

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
      if (!isValidBlockName(input)) return ` ${input} is not valid name`
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
async function pullBlock(da, appConfig, cwd, componentName) {
  /**
   * To try and run postPull script
   */
  let pulledBlockPath = ''
  const metaData = { ...da }

  try {
    // get the version id of the latest verion of parent

    const dx = await getAllBlockVersions(metaData.ID)
    // console.log('DX:', dx, dx.data, dx.status)
    if (dx.data.err) {
      throw new Error(dx.data.msg).message
    }

    if (dx.status === 204) {
      throw new Error('No version found for the block to pull').message
    }

    // get the latest version of parent
    const c = await getBlockMetaData(metaData.ID)
    if (c.data.err) {
      throw new Error(c.data.msg).message
    }
    console.log('C:', c.data, c.status)
    const PV = c.data.data.version

    const fil = dx.data.data?.filter((v) => v.version_number === PV)

    const version_id = fil?.[0].id

    metaData.version_id = version_id
    metaData.parent_id = metaData.ID
    if (!metaData.version_id) {
      feedback({ type: 'info', message: 'No version found for the block to pull' })
    }

    const createCustomVersion = await wantToCreateNewVersion(metaData.BlockName)
    if (createCustomVersion) {
      const availableName = await checkBlockNameAvailability(metaData.BlockName, true)
      let newVariantType = 1 // clone
      if (metaData.BlockType !== 1) {
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

      let clonePath
      let cloneDirName
      let blockFinalName

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
          cwd
        )

        clonePath = createBlockRes.clonePath
        cloneDirName = createBlockRes.cloneDirName
        blockFinalName = createBlockRes.blockFinalName
      }

      // TODO -- store new block details in two branches and run addBlock way dow
      // n, so this code is only once!!
      // Maybe update config from createBlock itself
      if (appConfig.isOutOfContext) {
        appConfig.addBlock({
          directory: path.relative(cwd, path.resolve(clonePath, cloneDirName)),
          meta: JSON.parse(readFileSync(path.resolve(clonePath, cloneDirName, BB_CONFIG_NAME))),
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
      const rt = await addANewBlockVariant({ block_id, version_id: metaData.version_id, parent_id: metaData.parent_id })
      if (rt.data.err === false) {
        feedback({ type: 'success', message: rt.data.msg })
      } else {
        feedback({ type: 'error', message: 'Variant creation failed' })
        feedback({ type: 'error', message: rt.data.msg })
      }

      pulledBlockPath = path.resolve(clonePath, cloneDirName)
    } else {
      const existingBlock = appConfig.getBlock(componentName)
      if (existingBlock) {
        throw new Error(`${componentName} already exists at ${existingBlock.directory}`).message
      }

      const clonePath = appConfig.isOutOfContext ? '.' : createDirForType(metaData.BlockType, cwd || '.')

      const localDirName = `${metaData.BlockName}`

      const prefersSsh = configstore.get('prefersSsh')
      const originUrl = prefersSsh ? metaData.GitUrl : convertGitSshUrlToHttps(metaData.GitUrl)
      const Git = new GitManager(path.resolve(), localDirName, originUrl, prefersSsh)

      await Git.clone(path.resolve(clonePath, localDirName))

      // execSync(`git clone ${metaData.GitUrl} ${path.resolve(clonePath, localDirName)}`, {
      //   stdio: 'ignore',
      // })

      console.log(chalk.dim('Succefully cloned'))

      // -------------------------------------------------
      // -------------------------------------------------
      // -------------BELOW CODE IS REPEATED--------------
      // -------------------------------------------------
      // -------------------------------------------------

      // Try to update block config of pulled block,
      // if not present add a new one

      // This is code also present on createBlock
      let blockConfig
      try {
        blockConfig = JSON.parse(readFileSync(path.resolve(clonePath, localDirName, BB_CONFIG_NAME)))
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
      blockConfig.source = { https: convertGitSshUrlToHttps(metaData.GitUrl), ssh: metaData.GitUrl }
      writeFileSync(path.resolve(clonePath, localDirName, BB_CONFIG_NAME), JSON.stringify(blockConfig))

      console.log(chalk.dim('Succesfully updated block config..'))

      // -------------------------------------------------
      // -------------------------------------------------
      // -------------ABOVE CODE IS REPEATED--------------
      // -------------------------------------------------
      // -------------------------------------------------
      // go to pulled block and add the block config to appblo config

      appConfig.addBlock({
        directory: path.relative(cwd, path.resolve(clonePath, localDirName)),
        meta: JSON.parse(readFileSync(path.resolve(clonePath, localDirName, BB_CONFIG_NAME))),
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
