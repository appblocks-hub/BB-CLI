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

const { wantToCreateNewVersion, readInput } = require('../utils/questionPrompts')
const checkBlockNameAvailability = require('../utils/checkBlockNameAvailability')
const { appConfig } = require('../utils/appconfigStore')
const convertGitSshUrlToHttps = require('../utils/convertGitUrl')
const { configstore } = require('../configstore')
const { GitManager } = require('../utils/gitmanager')
const { runBash } = require('./bash')
const { checkPnpm } = require('../utils/pnpmUtils')
const pullAppblock = require('../utils/pullAppblock')
const { spinnies } = require('../loader')
const {
  getBlockDetails,
  getBlockMetaData,
  getAllBlockVersions,
  addANewBlockVariant,
} = require('../utils/registryUtils')
const { createDirForType } = require('../utils/fileAndFolderHelpers')
const { feedback } = require('../utils/cli-feedback')
const { forkRepo } = require('./pull/forkUtil')

const pull = async (componentName, { cwd = '.' }) => {
  /**
   * @type {import('../utils/jsDoc/types').blockMetaData}
   */
  let metaData

  spinnies.add('blockExistsCheck', { text: `Searching for ${componentName}` })

  try {
    const resp = await getBlockDetails(componentName)

    if (resp.status === 204) {
      spinnies.fail('blockExistsCheck', { text: `${componentName} doesn't exists in block repository` })
      return
    }
    const { data } = resp
    if (data.err) {
      throw new Error(data.msg).message
    }

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
    } else {
      // get the version id of the latest verion of parent
      const dx = await getAllBlockVersions(metaData.ID)
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
      const PV = c.data.data.version

      const fil = dx.data.data?.filter((v) => v.version_number === PV)

      const version_id = fil?.[0].id

      metaData.version_id = version_id
      metaData.parent_id = metaData.ID
    }
  } catch (err) {
    // console.log('Something went wrong while getting block details..')

    let message = err.message || err

    if (err.response?.status === 401) {
      message = `Access denied for block ${componentName}`
    }

    spinnies.fail('blockExistsCheck', { text: `Something went wrong` })
    feedback({ type: 'info', message })
    spinnies.remove('blockExistsCheck')
    // process.exit(1)
    return
  }

  if (!metaData.version_id) {
    spinnies.fail('blockExistsCheck', { text: `No version found for the block to pull` })
    return
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
          meta: JSON.parse(readFileSync(path.resolve(clonePath, cloneDirName, 'block.config.json'))),
        })
      }

      // Inform registry about the new variant
      // TODO: change too many network calls

      // get the id of new variant
      const d = await getBlockDetails(blockFinalName)
      if (d.status === 204) {
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
        blockConfig = JSON.parse(readFileSync(path.resolve(clonePath, localDirName, 'block.config.json')))
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
    console.log('Something went wrong, please try again.\n')
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
