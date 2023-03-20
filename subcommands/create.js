/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable consistent-return */
const path = require('path')
const { readFileSync, writeFileSync, mkdirSync } = require('fs')
const chalk = require('chalk')
const checkBlockNameAvailability = require('../utils/checkBlockNameAvailability')
const createBlock = require('../utils/createBlock')
const { createFileSync, createDirForType, isDirEmpty } = require('../utils/fileAndFolderHelpers')
const {
  getBlockType,
  getBlockName,
  getGitConfigNameEmail,
  readInput,
  confirmationPrompt,
} = require('../utils/questionPrompts')
const { blockTypeInverter } = require('../utils/blockTypeInverter')
const { checkAndSetGitConfigNameEmail } = require('../utils/gitCheckUtils')
const { appConfig } = require('../utils/appconfigStore')

const {
  generateIndex,
  generateGitIgnore,
  generatePackageJson,
  generateFunctionReadme,
} = require('../templates/createTemplates/function-templates')
const {
  generateUiContainerIndexHtml,
  generateUiContainerWebpack,
  generateUiContainerIndexJs,
  generateUiContainerBootstrapJs,
  generateUiContainerAppJs,
  generateUiContainerPackageJson,
  generateUiContainerReadme,
  generateUiContainerAppRoute,
  generateUiContainerLayout,
} = require('../templates/createTemplates/uiContainer-templates')
const {
  generateUiElementIndexHtml,
  generateUiElementWebpack,
  generateUiElementIndexJs,
  generateUiElementBootstrapJs,
  generateUiElementAppJs,
  generateUiElementPackageJson,
  generateUiElementJs,
  generateUiElementsReadme,
  generateUiElementFederationExpose,
} = require('../templates/createTemplates/uiElement-templates')
const { GitManager } = require('../utils/gitmanager')
const { configstore } = require('../configstore')
const { CreateError } = require('../utils/errors/createError')
const { isValidBlockName } = require('../utils/blocknameValidator')
const { feedback } = require('../utils/cli-feedback')
const { getJobConfig, generateJobBlock } = require('../utils/job')
const initializePackageBlock = require('./init/initializePackageBlock')
const getRepoUrl = require('../utils/noRepo')
const { Logger } = require('../utils/loggerV2')

const { logger } = new Logger('create')
/**
 * @typedef createCommandOptions
 * @property {string} type
 * @property {boolean} autoRepo If false, should prompt user for repo url
 */

/**
 *
 * @param {String} userPassedName Commander passes the first argument value to this
 * @param {createCommandOptions} options The options
 * @param {import('commander').Command} _ This is the Command object, if calling from anywhere else, pass empty object
 * @param {Boolean} returnBeforeCreatingTemplates
 * @param {import('fs').PathLike} cwd
 * @param {Boolean} skipConfigInit to Skip fn from trying to read config
 * @returns
 */
const create = async (userPassedName, options, _, returnBeforeCreatingTemplates, cwd, skipConfigInit = false) => {
  const { autoRepo } = options
  logger.log({ level: 'emerg', messgae: 'sdosem' })
  let standAloneBlock = false
  let blockName = userPassedName
  let { type } = options

  let packageName

  /**
   * To prevent create from trying to init with config,
   * This is useful when calling create from sync etc..where
   * reading a local config is not necessary as it is not guaranteed
   * to be present.Which will force create to move to outofContext flow
   * which is not necessary for sync.
   */
  if (!skipConfigInit) {
    await appConfig.init(null, null, 'create')
  }

  /**
   * The imported appConfig is an instance of configmanager and it will have not have isOutOfContext value..
   * It is only set during init
   * This won't cause problem to calls with skipConfigInit=ture
   */
  if (appConfig.isOutOfContext) {
    const goAhead = await confirmationPrompt({
      message: `You are trying to create a block outside appblock package context. Want to create new package context ?`,
      name: 'seperateBlockCreate',
    })

    if (!goAhead) {
      feedback({ type: 'error', message: `Block should be created under package context` })
      return
    }

    /** **************** */
    const validate = (input) => {
      if (!isValidBlockName(input)) return ` ${input} is not valid name (Only snake case with numbers is valid)`
      return true
    }
    const packageBlockName = await readInput({
      name: 'appName',
      message: 'Enter the package name',
      validate,
    })
    /** **************** */

    const { DIRPATH, blockFinalName: bfn } = await initializePackageBlock(packageBlockName, { autoRepo })
    packageName = bfn

    console.log(`block final name from initializePackageBlock in create : ${bfn}`)
    // eslint-disable-next-line no-param-reassign
    cwd = DIRPATH
    // Init for new
    await appConfig.init(DIRPATH, null, 'create', { reConfig: true })

    feedback({ type: 'info', message: `\nContinuing ${blockName} block creation \n` })
  }

  logger.info(`Create called with ${blockName} and ${type || 'no type'}`)
  try {
    if (!isValidBlockName(blockName)) {
      feedback({
        type: 'warn',
        message: `${blockName} is not a valid name (Only snake case with numbers is valid)`,
      })
      blockName = await getBlockName()
    }
    logger.info(`changed name to ${blockName}`)
    if (!type) {
      type = await getBlockType()
      logger.info(`Prompted user for a type and got back ${type}`)
    }

    let jobConfig = {}
    if (type === 7) jobConfig = await getJobConfig()

    const availableName = await checkBlockNameAvailability(blockName)
    logger.info(`${blockName} checked against registry and ${availableName} is finalized`)

    if (appConfig.isOutOfContext) {
      standAloneBlock = false
    }

    if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
      feedback({ type: 'info', message: 'We are not inside an Appblock' })
      feedback({ type: 'error', message: 'Cannot create block inside another block' })
    }

    // If user is giving a url then no chance of changing this name
    let blockFinalName = availableName
    let blockSource
    let blockId
    let cloneDirName
    let clonePath
    let userHasProvidedRepoUrl = false

    if (!autoRepo) {
      blockSource = await getRepoUrl()
    }

    if (!autoRepo && !blockSource.ssh) {
      process.exitCode = 0
      return
    }

    if (!autoRepo && blockSource.ssh) {
      userHasProvidedRepoUrl = true
      clonePath = standAloneBlock ? '.' : createDirForType(type, cwd || '.')
      cloneDirName = blockFinalName
    }

    const packageBlockName = appConfig.config?.name
    const supportedAppblockVersions = appConfig.config?.supportedAppblockVersions
    const package_block_id = appConfig.packageBlockId

    if (!supportedAppblockVersions) {
      throw new Error('No supported appblock version set for package block. Please use set-appblock-version command')
    }

    if (!packageBlockName && type !== 1) {
      throw new Error('Cannot create block without package block')
    }

    if (autoRepo) {
      // const shortName = await getBlockShortName(availableName)
      const d = await createBlock(
        availableName,
        availableName,
        type,
        '',
        false,
        cwd || '.',
        standAloneBlock,
        jobConfig,
        null,
        package_block_id
      )
      blockFinalName = d.blockFinalName
      blockId = d.blockId
      blockSource = d.blockSource
      cloneDirName = d.cloneDirName
      clonePath = d.clonePath
    }

    logger.info(`${blockName} created and registered as ${availableName}`)

    logger.info(`blockSource - ${blockSource}`)
    logger.info(`cloneDirName - ${cloneDirName}`)
    logger.info(`clonePath - ${clonePath}`)
    logger.info(`blockFinalName - ${blockFinalName}`)
    // const [dir] = [blockFinalName]
    // const DIRPATH = path.resolve(dir)

    const prefersSsh = configstore.get('prefersSsh')
    const originUrl = prefersSsh ? blockSource.ssh : blockSource.https
    // INFO - Git is set in current directory, it could be having other git, might cause issue
    //        user is adviced to run in a new directory
    const Git = new GitManager('.', blockFinalName, originUrl, prefersSsh)
    if (userHasProvidedRepoUrl) {
      await Git.clone(path.resolve(clonePath, cloneDirName))
      const emptyDir = await isDirEmpty(path.resolve(clonePath, cloneDirName), '.git')
      if (!emptyDir) {
        console.log(`${chalk.bgRed('ERROR')}: Expected to find an empty repo`)
        process.exit(1)
      }
    }

    const blockDetails = {
      name: blockFinalName,
      blockId,
      type: blockTypeInverter(type),
      source: {
        ...blockSource,
      },
      language: 'nodejs',
      start: 'node index.js',
      build: '',
      postPull: 'npm i',
      standAloneBlock,
      supportedAppblockVersions,
    }

    if (type === 2 || type === 3) {
      blockDetails.language = 'js'
      blockDetails.start = 'npx webpack-dev-server'
      blockDetails.build = 'npx webpack'
    } else if (type === 7) {
      // job block
      blockDetails.job = jobConfig
    }

    // execSync(`cd ${cloneDirName}`)
    createFileSync(path.resolve(clonePath, cloneDirName, `block.config.json`), blockDetails)

    logger.info(`block config created at ${path.resolve(clonePath, cloneDirName, `block.config.json`)}`)
    logger.info(blockDetails)

    console.log(chalk.dim('Block config created'))

    if (returnBeforeCreatingTemplates) return { clonePath, cloneDirName, blockDetails }

    // if (!standAloneBlock) {
    appConfig.addBlock({
      directory: path.relative('.', path.resolve(clonePath, cloneDirName)),
      meta: JSON.parse(readFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json'))),
    })
    // }

    // This is a temp setup
    // This is to avoid pushing empty repo, which will cause issues on
    // pulling the same and trying to create new with it

    const entry = path.resolve(clonePath, cloneDirName)

    logger.info(`Entry path - ${entry}`)

    try {
      console.log('Please enter git username and email')
      console.log(
        chalk.dim.italic(
          `If i can't find name and email in global git config,\nI'll use these values on making commits..`
        )
      )
      const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()
      await checkAndSetGitConfigNameEmail(entry, { gitUserEmail, gitUserName })
      console.log(`Git local config updated with ${gitUserName} & ${gitUserEmail}`)

      /**
       * -------------------------------------------------------------------------
       */
      if (type === 4) {
        // function
        const indexString = generateIndex(blockFinalName)
        writeFileSync(`${entry}/index.js`, indexString)
        const packageJsonString = generatePackageJson(blockFinalName)
        writeFileSync(`${entry}/package.json`, packageJsonString)
        const gitIgnoreString = generateGitIgnore()
        writeFileSync(`${entry}/.gitignore`, gitIgnoreString)
        const readmeString = generateFunctionReadme(blockFinalName)
        writeFileSync(`${entry}/README.md`, readmeString)
      } else if (type === 2) {
        // ui-container
        createUiContainerFolders(entry, blockFinalName)
      } else if (type === 3) {
        // ui-element
        createUiElementFolders(entry, blockFinalName)
      } else if (type === 7) {
        // job
        generateJobBlock(entry, blockFinalName)
      }

      /**
       * -------------------------------------------------------------------------
       */

      // const prefersSsh = configstore.get('prefersSsh')
      // const originUrl = prefersSsh ? blockSource.ssh : blockSource.https
      // const Git = new GitManager(entry, cloneDirName, originUrl, prefersSsh)

      Git.cd(entry)

      await Git.newBranch('main')
      await Git.stageAll()
      await Git.commit('initial commit')
      // await Git.push('main')
      await Git.setUpstreamAndPush('main')

      if (packageName) console.log(chalk.dim(`\ncd ${packageName} and start hacking.\n`))
    } catch (err) {
      console.log('err:', err)
    }
  } catch (err) {
    console.log('Something went wrong while creating!')
    logger.error(err.message)
    throw new CreateError('create failed')
  }
}

module.exports = create

// ui container
//
function createUiContainerFolders(componentpath, componentname) {
  const indexHtmlString = generateUiContainerIndexHtml(componentname)
  const webpackConfigString = generateUiContainerWebpack(componentname)
  const indexJsString = generateUiContainerIndexJs(componentname)
  const bootstrapString = generateUiContainerBootstrapJs(componentname)
  const appJsString = generateUiContainerAppJs(componentname)
  const packageJsonString = generateUiContainerPackageJson(componentname)
  const gitignore = generateGitIgnore()
  const readmeString = generateUiContainerReadme(componentname)
  const appRouteString = generateUiContainerAppRoute(componentname)
  const layoutString = generateUiContainerLayout(componentname)

  mkdirSync(`${componentpath}/public`)
  mkdirSync(`${componentpath}/common/routes`, { recursive: true })
  mkdirSync(`${componentpath}/components/Layout`, { recursive: true })
  mkdirSync(`${componentpath}/src`)

  writeFileSync(`${componentpath}/public/index.html`, indexHtmlString)

  writeFileSync(`${componentpath}/src/index.js`, indexJsString)
  writeFileSync(`${componentpath}/src/bootstrap.js`, bootstrapString)
  writeFileSync(`${componentpath}/src/App.js`, appJsString)

  writeFileSync(`${componentpath}/common/routes/appRoute.js`, appRouteString)
  writeFileSync(`${componentpath}/components/Layout/index.js`, layoutString)

  writeFileSync(`${componentpath}/package.json`, packageJsonString)
  writeFileSync(`${componentpath}/README.md`, readmeString)
  writeFileSync(`${componentpath}/webpack.config.js`, webpackConfigString)
  writeFileSync(`${componentpath}/.gitignore`, gitignore)
}

// ui element
//
function createUiElementFolders(componentpath, componentname) {
  const indexHtmlString = generateUiElementIndexHtml(componentname)
  const webpackConfigString = generateUiElementWebpack(componentname)
  const indexJsString = generateUiElementIndexJs(componentname)
  const bootstrapString = generateUiElementBootstrapJs(componentname)
  const appJsString = generateUiElementAppJs(componentname)
  const packageJsonString = generateUiElementPackageJson(componentname)
  const uiElementString = generateUiElementJs(componentname)
  const gitignore = generateGitIgnore()
  const readmeString = generateUiElementsReadme(componentname)
  const fedExposeString = generateUiElementFederationExpose(componentname)

  mkdirSync(`${componentpath}/public`)

  writeFileSync(`${componentpath}/public/index.html`, indexHtmlString)

  mkdirSync(`${componentpath}/src/remote`, { recursive: true })

  writeFileSync(`${componentpath}/src/index.js`, indexJsString)
  writeFileSync(`${componentpath}/src/bootstrap.js`, bootstrapString)
  writeFileSync(`${componentpath}/src/App.js`, appJsString)
  writeFileSync(`${componentpath}/src/remote/${componentname}.js`, uiElementString)

  writeFileSync(`${componentpath}/package.json`, packageJsonString)
  writeFileSync(`${componentpath}/README.md`, readmeString)
  writeFileSync(`${componentpath}/webpack.config.js`, webpackConfigString)
  writeFileSync(`${componentpath}/federation-expose.js`, fedExposeString)
  writeFileSync(`${componentpath}/.gitignore`, gitignore)
}
