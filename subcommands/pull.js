/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { readFileSync, writeFileSync } = require('fs')
const chalk = require('chalk')

const createBlock = require('../utils/createBlock')

const { wantToCreateNewVersion } = require('../utils/questionPrompts')
const checkBlockNameAvailability = require('../utils/checkBlockNameAvailability')
const { appConfig } = require('../utils/appconfigStore')
const convertGitSshUrlToHttps = require('../utils/convertGitUrl')
const { configstore } = require('../configstore')
const { GitManager } = require('../utils/gitmanager')
const { runBash } = require('./bash')
const { checkPnpm } = require('../utils/pnpmUtils')
const pullAppblock = require('../utils/pullAppblock')
const { spinnies } = require('../loader')
const { getBlockDetails } = require('../utils/registryUtils')
const { createDirForType } = require('../utils/fileAndFolderHelpers')

const pull = async (componentName, { cwd = '.' }) => {
  /**
   * @type {blockMetaData}
   */
  let metaData

  spinnies.add('blockExistsCheck', { text: `Searching for ${componentName}` })

  try {
    const resp = await getBlockDetails(componentName)
    if (resp.status === 204) {
      spinnies.fail('blockExistsCheck', { text: `${componentName} doesn't exists in block repository` })
      process.exit(1)
    }
    const { data } = resp
    if (data.err) {
      throw new Error('Something went wrong from our side\n', data.msg).message
    }
    /**
     * @type {blockMetaData}
     */
    metaData = data.data

    appConfig.init(cwd, null, 'pull')

    if (metaData.BlockType === 1) {
      if (!appConfig.isOutOfContext) {
        throw new Error(`Cannot pull appBlocks,\n ${chalk.yellow(metaData.BlockName)} is an appBlock`).message
      } else {
        spinnies.succeed('blockExistsCheck', { text: `${componentName} is available` })
        spinnies.remove('blockExistsCheck')
        const res = await pullAppblock(componentName)
        if (res) {
          process.exit(0)
        } else {
          process.exit(1)
        }
      }
    }
  } catch (err) {
    // console.log('Something went wrong while getting block details..')
    spinnies.fail('blockExistsCheck', { text: `${err}` })
    console.log('\n')
    console.log(err)
    process.exit(1)
  }

  spinnies.succeed('blockExistsCheck', { text: `${componentName} is available` })
  spinnies.remove('blockExistsCheck')

  // if not errored continue

  /**
   * To try and run postPull script
   */
  let pulledBlockPath = ''

  try {
    const createCustomVersion = await wantToCreateNewVersion(metaData.BlockName)
    if (createCustomVersion) {
      const availableName = await checkBlockNameAvailability(metaData.BlockName, true)
      const { clonePath, cloneDirName } = await createBlock(
        availableName,
        availableName,
        metaData.BlockType,
        metaData.GitUrl,
        false,
        cwd
      )

      // TODO -- store new block details in two branches and run addBlock way dow
      // n, so this code is only once!!
      // Maybe update config from createBlock itself
      appConfig.addBlock({
        directory: path.relative(cwd, path.resolve(clonePath, cloneDirName)),
        meta: JSON.parse(readFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json'))),
      })
      pulledBlockPath = path.resolve(clonePath, cloneDirName)
    } else {
      const existingBlock = appConfig.getBlock(componentName)
      if (existingBlock) {
        throw new Error(`${componentName} already exists at ${existingBlock.directory}`).message
      }

      const clonePath = createDirForType(metaData.BlockType, cwd)

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
        blockConfig = JSON.parse(readFileSync(path.resolve(clonePath, localDirName, 'block.config.json')))
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(chalk.dim('Pulled block has no config file, adding a new one'))
          blockConfig = {
            type: metaData.BlockType,
            language: 'nodejs',
            start: 'npx webpack-dev-server',
            build: 'npx webpack',
            postPull: 'npm i',
          }
        }
      }
      blockConfig.name = metaData.BlockName
      blockConfig.source = { https: convertGitSshUrlToHttps(metaData.GitUrl), ssh: metaData.GitUrl }
      writeFileSync(path.resolve(clonePath, localDirName, 'block.config.json'), JSON.stringify(blockConfig))

      console.log(chalk.dim('Succesfully updated block config..'))

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
    console.log('Something went wrong while pulling,please try again.\n')
    console.log(chalk.red(err))
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

module.exports = pull
