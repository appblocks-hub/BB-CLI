/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable consistent-return */
const path = require('path')
const { readFileSync, writeFileSync, mkdirSync } = require('fs')
// const { execSync } = require('child_process')
// const { transports } = require('winston')
const chalk = require('chalk')
const checkBlockNameAvailability = require('../utils/checkBlockNameAvailability')
const createBlock = require('../utils/createBlock')
const { createFileSync, createDirForType, isDirEmpty } = require('../utils/fileAndFolderHelpers')
const {
  getBlockType,
  // getBlockShortName,
  getBlockName,
  getGitConfigNameEmail,
  confirmationPrompt,
  readInput,
  sourceUrlOptions,
} = require('../utils/questionPrompts')
const { blockTypeInverter } = require('../utils/blockTypeInverter')
const { checkAndSetGitConfigNameEmail } = require('../utils/gitCheckUtils')
// const { logger } = require('../utils/logger')
const { appConfig } = require('../utils/appconfigStore')

const {
  generateIndex,
  generateGitIgnore,
  generatePackageJson,
} = require('../templates/createTemplates/function-templates')
const {
  generateUiContainerIndexHtml,
  generateUiContainerWebpack,
  generateUiContainerIndexJs,
  generateUiContainerStoreJs,
  generateUiContainerBootstrapJs,
  generateUiContainerAppJs,
  generateUiContainerPackageJson,
  generateUiContainerSystemJs,
} = require('../templates/createTemplates/uiContainer-templates')
const {
  generateUiElementIndexHtml,
  generateUiElementWebpack,
  generateUiElementIndexJs,
  generateUiElementBootstrapJs,
  generateUiElementAppJs,
  generateUiElementPackageJson,
  generateUiElementJs,
} = require('../templates/createTemplates/uiElement-templates')
const { GitManager } = require('../utils/gitmanager')
const { configstore } = require('../configstore')
const convertGitSshUrlToHttps = require('../utils/convertGitUrl')
const { CreateError } = require('../utils/errors/createError')
const { isValidBlockName } = require('../utils/blocknameValidator')
const { feedback } = require('../utils/cli-feedback')

// logger.add(new transports.File({ filename: 'create.log' }))

/**
 * @typedef createCommandOptions
 * @property {String} type
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
  let standAloneBlock = false
  let componentName = userPassedName
  let { type } = options
  // logger.info(`Create called with ${componentName} and ${type || 'no type'}`)
  try {
    if (!isValidBlockName(componentName)) {
      feedback({ type: 'warn', message: `${componentName} is not a valid name` })
      componentName = await getBlockName()
    }
    // logger.info(`changed name to ${componentName}`)
    if (!type) {
      type = await getBlockType()
      // logger.info(`Prompted user for a type and got back ${type}`)
    } else {
      type = blockTypeInverter(type)
      // logger.info(`Converted type from name to number-${type}`)
    }
    const availableName = await checkBlockNameAvailability(componentName)
    // logger.info(
    //   `${componentName} checked against registry and ${availableName} is finalized`
    // )
    /**
     * To prevent create from trying to init with config,
     * This is useful when calling create from sync etc..where
     * reading a local config is not necessary as it is not guaranteed
     * to be present.Which will force create to move to outofContext flow
     * which is not necessary for sync.
     */
    if (!skipConfigInit) {
      await appConfig.init(null, null, 'create')
      if (appConfig.isOutOfContext) {
        const goAhead = await confirmationPrompt({
          message: 'You are trying to create a block outside appblock context',
          name: 'seperateBlockCreate',
        })
        if (!goAhead) {
          return
        }
        standAloneBlock = true
      }
    }
    // Check if github user name or id is not set (we need both, if either is not set inform)
    const u = configstore.get('githubUserId', '')
    const t = configstore.get('githubUserToken', '')

    // If user is giving a url then no chance of changing this name
    let blockFinalName = availableName
    let blockSource
    let cloneDirName
    let clonePath
    let userHasProvidedRepoUrl = false

    if (u === '' || t === '') {
      console.log(`${chalk.bgCyan('INFO')}:Seems like you have not connected to any version manager`)
      const o = await sourceUrlOptions()
      // 0 for cancel
      // 2 for go to connect
      // 3 for let me provide url
      if (o === 0) process.exit(1)
      else if (o === 2) {
        // INFO connecting to github from here might cause the same token in memory issue
        console.log('Cant do it now!')
      } else {
        const s = await readInput({ message: 'Enter source ssh url here', name: 'sUrl' })
        blockSource = { ssh: s.trim(), https: convertGitSshUrlToHttps(s.trim()) }
        userHasProvidedRepoUrl = true
        clonePath = standAloneBlock ? '.' : createDirForType(type, cwd || '.')
        cloneDirName = blockFinalName
      }
    } else {
      // const shortName = await getBlockShortName(availableName)
      const d = await createBlock(availableName, availableName, type, '', false, cwd || '.', standAloneBlock)
      blockFinalName = d.blockFinalName
      blockSource = d.blockSource
      cloneDirName = d.cloneDirName
      clonePath = d.clonePath
    }

    // logger.info(`${componentName} created and registered as ${availableName}`)

    // logger.info(`blockSource - ${blockSource}`)
    // logger.info(`cloneDirName - ${cloneDirName}`)
    // logger.info(`clonePath - ${clonePath}`)
    // logger.info(`blockFinalName - ${blockFinalName}`)
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
      type: blockTypeInverter(type),
      source: {
        ...blockSource,
      },
      language: 'nodejs',
      start: 'npx webpack-dev-server',
      build: 'npx webpack',
      postPull: 'npm i',
      standAloneBlock,
    }
    // execSync(`cd ${cloneDirName}`)
    createFileSync(path.resolve(clonePath, cloneDirName, `block.config.json`), blockDetails)

    // logger.info(
    //   `block config created at ${path.resolve(
    //     clonePath,
    //     cloneDirName,
    //     `block.config.json`
    //   )}`
    // )
    // logger.info(blockDetails)

    console.log(chalk.dim('Block config created'))

    if (returnBeforeCreatingTemplates) return { clonePath, cloneDirName, blockDetails }

    if (!standAloneBlock) {
      appConfig.addBlock({
        directory: path.relative('.', path.resolve(clonePath, cloneDirName)),
        meta: JSON.parse(readFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json'))),
      })
    }

    // This is a temp setup
    // This is to avoid pushing empty repo, which will cause issues on
    // pulling the same and trying to create new with it

    const entry = path.resolve(clonePath, cloneDirName)

    // logger.info(`Entry path - ${entry}`)

    try {
      console.log('Please enter git username and email')
      console.log(
        chalk.dim.italic(
          `If i can't find name and email in global git config,\nI'll use these values on making commits..`
        )
      )
      // TODO-- store these values in config and dont ask everytime, can be used in pull aswell
      const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()
      await checkAndSetGitConfigNameEmail(entry, { gitUserEmail, gitUserName })
      console.log(`Git local config updated with ${gitUserName} & ${gitUserEmail}`)

      /**
       * -------------------------------------------------------------------------
       */
      if (type === 4) {
        // function
        const indexString = generateIndex(componentName)
        writeFileSync(`${entry}/index.js`, indexString)
        const packageJsonString = generatePackageJson(componentName)
        writeFileSync(`${entry}/package.json`, packageJsonString)
        const gitIgnoreString = generateGitIgnore()
        writeFileSync(`${entry}/.gitignore`, gitIgnoreString)
      } else if (type === 2) {
        // ui-container
        createUiContainerFolders(entry, componentName)
      } else if (type === 3) {
        // ui-element
        createUiElementFolders(entry, componentName)
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
      // execSync(
      //   `cd ${entry} &&
      //    git checkout -b main &&
      //    git add -A &&
      //    git commit -m "initial commit" &&
      //    git push origin main`
      // )
    } catch (err) {
      console.log('err:', err)
    }
  } catch (err) {
    console.log(err)
    console.log('Something went wrong while creating!')
    // logger.info('ERROR')
    // logger.error(err)
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
  const storeJsString = generateUiContainerStoreJs(componentname)
  const bootstrapString = generateUiContainerBootstrapJs(componentname)
  const appJsString = generateUiContainerAppJs(componentname)
  const packageJsonString = generateUiContainerPackageJson(componentname)
  const systemJsString = generateUiContainerSystemJs(componentname)
  const gitignore = generateGitIgnore()

  mkdirSync(`${componentpath}/public`)
  writeFileSync(`${componentpath}/public/index.html`, indexHtmlString)

  mkdirSync(`${componentpath}/src`)
  mkdirSync(`${componentpath}/src/components`)
  writeFileSync(`${componentpath}/src/index.js`, indexJsString)
  writeFileSync(`${componentpath}/src/bootstrap.js`, bootstrapString)
  writeFileSync(`${componentpath}/src/App.js`, appJsString)
  writeFileSync(`${componentpath}/src/System.js`, systemJsString)
  writeFileSync(`${componentpath}/src/store.js`, storeJsString)

  writeFileSync(`${componentpath}/package.json`, packageJsonString)
  writeFileSync(`${componentpath}/README.md`, `fill this`)
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

  mkdirSync(`${componentpath}/public`)
  writeFileSync(`${componentpath}/public/index.html`, indexHtmlString)

  mkdirSync(`${componentpath}/src`)
  mkdirSync(`${componentpath}/src/components`)
  writeFileSync(`${componentpath}/src/index.js`, indexJsString)
  writeFileSync(`${componentpath}/src/bootstrap.js`, bootstrapString)
  writeFileSync(`${componentpath}/src/App.js`, appJsString)
  writeFileSync(`${componentpath}/src/${componentname}.js`, uiElementString)
  // writeFileSync(`${componentpath}/src/System.js`, '')
  // writeFileSync(`${componentpath}/src/store.js`, '')

  writeFileSync(`${componentpath}/package.json`, packageJsonString)
  writeFileSync(`${componentpath}/README.md`, `fill this`)
  writeFileSync(`${componentpath}/webpack.config.js`, webpackConfigString)
  writeFileSync(`${componentpath}/.gitignore`, gitignore)
}
