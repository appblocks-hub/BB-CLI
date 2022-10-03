/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const fs = require('fs')
const { readdir, readFile, rm } = require('fs/promises')
const path = require('path')
const { blockTypes } = require('../utils/blockTypes')
const { getBlockDirsIn, moveFiles } = require('../utils/fileAndFolderHelpers')
const { getBlockDetails, getConfigFromRegistry } = require('../utils/registryUtils')
const { confirmationPrompt, getBlockName, readInput } = require('../utils/questionPrompts')
const { isValidBlockName } = require('../utils/blocknameValidator')
const checkBlockNameAvailability = require('../utils/checkBlockNameAvailability')
const registerBlock = require('../utils/registerBlock')
const { blockTypeInverter } = require('../utils/blockTypeInverter')
const { diffObjects } = require('../utils/diff')
const { diffShower, manualMerge } = require('../utils/syncUtils')
const convertGitSshUrlToHttps = require('../utils/convertGitUrl')
const createBlock = require('../utils/createBlock')
const { offerAndCreateBlock } = require('../utils/sync-utils')
const { appblockConfigSchema } = require('../utils/schema')
const { feedback } = require('../utils/cli-feedback')

/*
 *
 *  HANDLE ->
 *  1. found blocks without config files, REMOVE - DONE
 *  2. found unregistered blocks, should i register?
 *  3. found blocks with registered name but different source
 *  4. would you like to register the app?(register then..if yes)
 *  5. create block.config.json
 *  6. Validate block.config.json with YUP, so it has all expected fields
 */

/**
 *
 * @param {[nrbt]} list
 * @returns
 */
const offerAndRegisterBlocks = async (list) => {
  if (list.length === 0) return []
  const ans = await confirmationPrompt({
    name: 'registerDirs',
    message: 'Should I register directories',
  })
  const report = []
  if (ans) {
    for (let i = 0; i < list.length; i += 1) {
      const block = list[i].data.localBlockConfig
      // report.push({ name: list[i].name, registered: list[i].registered, ...list[i].data })
      report.push({ ...list[i] }) // all are pushed so that below i can use report[i]
      // console.log(block)
      const regIndBlock = await confirmationPrompt({
        name: `register-${block.name}`,
        message: `Should I register ${block.name}${list[i].sourcemismatch ? chalk.dim(`(source mismatch)`) : ``}`,
      })
      if (regIndBlock) {
        if (!isValidBlockName(block.name)) {
          block.name = await getBlockName()
          // console.log(block.name)
        }
        block.name = await checkBlockNameAvailability(block.name)
        console.log(`available block name to register - ${block.name}`)

        const isPublic = await confirmationPrompt({
          name: 'ispublic',
          message: `Is ${block.source.ssh} a public repository`,
        })
        const blockDesc = await readInput({
          name: 'blockdesc',
          message: 'Add a description for new block..(optional)',
          default: block.name,
        })
        try {
          await registerBlock(
            blockTypeInverter(block.type),
            block.name,
            block.name,
            isPublic,
            block.source.ssh,
            blockDesc
          )
          report[i].newName = block.name
          report[i].registered = true
        } catch (err) {
          console.log(err.message)
          report[i].registered = false
        }
      }
    }
  }
  console.log('Report:')
  report.forEach((v) => {
    if (v.registered) {
      console.log(chalk.green(`${chalk.greenBright(v.name)} is registered as ${chalk.cyanBright(v.newName)} `))
    }
  })
  console.log()
  console.log(chalk.whiteBright('Please make the necessary changes in source files'))
  return report
}

const offerAndDeleteStaleDirectories = async (list) => {
  if (list.length === 0) return
  const ans = await confirmationPrompt({
    name: 'delstale',
    message: 'Should I delete all stale directories',
    default: false,
  })
  if (ans) {
    const promiseArray = []
    list.forEach((dir) => {
      promiseArray.push(rm(dir, { recursive: true, force: true }))
    })
    await Promise.allSettled(promiseArray).then((v) => console.log(v))
  }
}

const offerAndMoveBlocks = async (list) => {
  // console.log(list)
  if (list.length === 0) return
  const ans = await confirmationPrompt({
    name: 'moveblocks',
    message: 'Should I move all blocks to correct directories based on type',
    default: false,
  })
  if (!ans) return
  const promiseArray = list.map((v) => readFile(path.resolve(v, 'block.config.json'), { encoding: 'utf8' }))
  const summary = await Promise.allSettled(promiseArray)
    .then((a) =>
      a.reduce(
        (acc, curr, idx) => {
          if (curr.status === 'rejected') {
            acc.failedReads = [...acc.failedReads, list[idx]]
          }
          acc.successfulReads = [
            ...acc.successfulReads,
            { foldername: path.relative('.', list[idx]), currentLocation: list[idx], ...JSON.parse(curr.value) },
          ]
          return acc
        },
        { failedReads: [], successfulReads: [] }
      )
    )
    .then((a) => {
      if (a.failedReads.length !== 0) {
        console.log('Failed to reads:')
        console.log(a.failedReads)
      }
      return a.successfulReads
    })
    .then((a) =>
      a.map(({ currentLocation, name, type, foldername }) => ({
        name,
        type,
        currentLocation,
        expectedLocation: `${blockTypes[blockTypes.findIndex((t) => t[0] === type)][2]}/${foldername}`,
      }))
    )

  console.log(summary)
  const t = await moveFiles(
    true,
    summary.map((v) => {
      // make the directories beforehand to prevent moveFiles Fn from running
      // into issues.
      fs.mkdirSync(path.resolve(v.expectedLocation), { recursive: true })
      return { oldPath: v.currentLocation, newPath: path.resolve(v.expectedLocation), name: v.name }
    })
  )
  console.log(t)
}

function cb(acc, v) {
  // console.log(this, acc, v)
  console.log()
  return this.findIndex((p) => p === v) === -1 ? acc.concat(v) : acc
}

/**
 * Gets a name from user and checks against the registry and returns block details or
 * if user types 'exit' returns null
 * @returns {import('../utils/jsDoc/types').blockMetaData?}
 */
async function getAndCheckAppName() {
  let blockDetails
  await readInput({
    name: 'cablxnm',
    message: `Enter the appname ${chalk.dim('(enter "exit" to quit)')}`,
    validate: async function test(ans) {
      if (!ans) return 'Should not be empty'
      if (ans === 'exit') return true
      const r = await getBlockDetails(ans)
        .then((res) => {
          if (res.status === 204) {
            return `${ans} not found in registry.`
          }
          if (res.data.err) {
            return `Error getting details..`
          }
          // Make sure it is registered as appBlock, else unregistered
          if (res.data.data.BlockType !== 1) {
            return `${ans} is not registered as appblock`
          }
          // eslint-disable-next-line no-param-reassign
          blockDetails = { ...res.data.data }
          return true
        })
        .catch(() => 'Something went terribly wrong...')
      return r
    },
  })
  return blockDetails || null
}
const sync = async () => {
  // INFO -- only surface level scanning, not recursively finding directories
  // If there are appblocks as a dependency,
  // then they might contain blocks and those would be needing a sync as well,
  // but this only deals with top layer of dependencies,
  // move to inner appblock directory and run sync to do the above

  // get details of app from user entered name if config missing
  // check if it is appblock type if show log and continue
  // if can't find ask till user exists..TODO
  // if exists get config and continue
  // finally once the local appblock config is built, compare
  // config from registry and make changes

  let appblockIsRegistered = false
  /**
   * @type {blockMetaData}
   */
  let appblockDetails = ''
  let insideAppblock = false
  let appConfigFromRegistry = {}
  let appConfiginLocal = {}
  const validationData = { isErrored: false, summary: [], detailedReport: [] }

  try {
    appConfiginLocal = await readFile('block.config.json', { encoding: 'utf8' }).then((d) => JSON.parse(d))
    feedback({ type: 'info', message: 'Found block.config.json' })
    if (appConfiginLocal.type !== 'appBlock') {
      throw new Error(`We are inside a ${appConfiginLocal.type} type block`)
    }
    try {
      appblockConfigSchema.validateSync(appConfiginLocal, { abortEarly: false })
    } catch (err) {
      validationData.summary = err.errors
      validationData.isErrored = true
      err.inner.forEach((e) =>
        validationData.detailedReport.push({
          path: e.path,
          type: e.type,
          value: e.value,
          params: e.params,
          inner: e.inner,
          errors: e.errors,
        })
      )
    }
    if (appConfiginLocal.name && appConfiginLocal.type === 'appBlock') {
      insideAppblock = true
      const appid = await getBlockDetails(appConfiginLocal.name)
        .then((res) => {
          if (res.status === 204) {
            appblockIsRegistered = false
            return null
          }
          if (res.data.err) {
            appblockIsRegistered = false
            return null
          }
          // Make sure it is registered as appBlock, else unregistered
          if (res.data.data.BlockType !== 1) {
            return null
          }

          appblockIsRegistered = true
          appblockDetails = { ...res.data.data } // will change to actual config later
          return res.data.data.ID
        })
        .catch((err) => {
          console.log(err)
          feedback({ type: 'warn', message: 'Cannot moved forward with operation' })
          process.exit(1)
        })
      if (appblockIsRegistered) {
        feedback({ type: 'info', message: `${appConfiginLocal.name} is registered as an AppBlock.\n` })

        const config = await getConfigFromRegistry(appid)
        if (!config) {
          /**
           * Here it is okay to move forward without a config as we have a local valid config
           * to work with. As opposed to case where user is providing the appBlock name, where
           * it is necessary to get a config to move forward with the operation.
           */
          feedback({
            type: 'info',
            message: `Couldn't find a config associated with your app..Try pushing config first`,
          })
        }

        appblockIsRegistered = true
        appConfigFromRegistry = config
      } else {
        feedback({ type: 'info', message: `${appConfiginLocal.name}` })
        console.log(`\n${appConfiginLocal.name} is not registered.\n`)
      }
    } else {
      feedback({ type: 'error', message: `${validationData.summary.join('\n')}` })
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      const ar = await confirmationPrompt({
        name: 'alreadyregistered',
        message: 'Are you trying to rebuild an already registered app',
      })
      if (ar) {
        /** @type {import('../utils/jsDoc/types').blockMetaData?} */
        let findAppBlockWithName = await getAndCheckAppName()

        // Loop until user enters "exit" or gives a block name that is registered
        // as appBlock and has a valid config in registry
        for (; findAppBlockWithName !== null; ) {
          appblockDetails = { ...findAppBlockWithName }
          appblockIsRegistered = true
          feedback({ type: 'info', message: `${findAppBlockWithName.BlockName} is registered` })
          const config = await getConfigFromRegistry(findAppBlockWithName.ID)
          if (config) {
            appConfigFromRegistry = config
            feedback({ type: 'info', message: `${findAppBlockWithName.BlockName} has a config in registry` })
            break
          }
          findAppBlockWithName = await getAndCheckAppName()
        }
      }
    } else {
      feedback({ type: 'error', message: err.message })
      console.log(err)
      process.exit(1)
    }
  }

  const report = []

  const view = './view'
  const viewEl = './view/elements'
  const viewCo = './view/container'
  const fns = './functions'
  const sFns = './functions/shared-fn'

  const vi = fs.existsSync(view)
  const vE = fs.existsSync(viewEl)
  const vC = fs.existsSync(viewCo)
  const f = fs.existsSync(fns)
  const sF = fs.existsSync(sFns)

  /**
   * @callback PathGenerator
   * @param  {Array<String>} args
   * @returns {String} A path string
   */
  /**
   *
   * @callback PartialGenerator
   * @param {String} p root of path
   * @returns {PathGenerator}
   */

  /**
   * @type {PathGenerator}
   */
  const pr = (...args) => path.resolve(args[0], args[1])

  /**
   *  @type {PartialGenerator}
   */
  const fm = (p) => pr.bind(null, p)

  if (!vi || !vE || !vC || !f) {
    if (!vi) {
      feedback({ type: 'warn', message: './view missing' })
    }
    if (!vC) {
      feedback({ type: 'warn', message: './view/container missing' })
    }
    if (!vE) {
      feedback({ type: 'warn', message: './view/elements missing' })
    }
    if (!f) {
      feedback({ type: 'warn', message: './functions missing./functions missing' })
    }
    if (!sF) {
      feedback({ type: 'warn', message: './functions/shared-fn missing' })
    }
  }
  /**
   * List of all directories in root that could be blocks
   * @type {Array<String>}
   */
  const allDirsInRoot = await readdir('.').then((l) => l.map(fm('.')))

  /**
   * List of all block directories inside the root ( i.e where the sync command is being run )
   * @type {Array<String>}
   */
  const blockDirectoriesInWrongLocation = getBlockDirsIn(allDirsInRoot)

  await offerAndMoveBlocks(blockDirectoriesInWrongLocation)

  // INFO : find dirs inside /functions,/view/elements,/view/container only after
  //        offering to move block dirs found in root, so no blocks are missed.

  const pa = []
  if (vi && vE) pa.push(readdir(viewEl).then((l) => l.map(fm(viewEl))))
  if (vi && vC) pa.push(readdir(viewCo).then((l) => l.map(fm(viewCo))))
  if (f) pa.push(readdir(fns).then((l) => l.map(fm(fns))))
  if (f && sF) pa.push(readdir(sFns).then((l) => l.map(fm(sFns))))
  /**
   * List of all directories that could be blocks in paths -
   *  functions/* , view/container/* , and view/elements/*
   * @type {Array<String>}
   */
  const allDirectories = await Promise.all(pa)
    .then((l) => l.flatMap((v) => v))
    .catch((err) => {
      console.log(err)
      process.exit(1)
    })

  const blockDirectories = getBlockDirsIn(allDirectories)

  // If blocks count is not same as the number of directories found, then
  // there are some stale directories..

  // INFO : /function , /view/container , /view/elements are only expected to contain
  //        block dirs, so all other dirs without block config can be considered stale,
  //        not the case with root as it can contain valid other dirs..so staleDirsInRoot is wrong.
  // const staleDirsInRoot = allDirsInRoot.length - blockDirectoriesInWrongLocation.length

  const staleDirsInsideApp = allDirectories.length - blockDirectories.length

  if (staleDirsInsideApp > 0 || staleDirsInsideApp > 0) {
    // const cb = (b, acc, v) => (b.findIndex((p) => p === v) === -1 ? acc.concat(v) : acc)
    const staleDirectories = [
      ...allDirectories.reduce(cb.bind(blockDirectories), []),
      // ...allDirsInRoot.reduce(cb.bind(blockDirectoriesInWrongLocation), []),
    ]
    report.push({
      message: `Found ${staleDirectories.length} directories without block.config.json`,
      data: staleDirectories,
    })
    console.log(report)
    const res = await offerAndCreateBlock(staleDirectories)
    res.forEach((v, i) => {
      // offerAndCreateBlock return an array with exact same length and order as the passed staleDirectories
      // NOTE: if return of offerAndCreateBlock is altered, might need to use find/findIndex and use that index value
      if (v.registered) {
        blockDirectories.push(v.directory)
        if (v.oldPath === staleDirectories[i]) staleDirectories.splice(i, 1)
      }
    })

    await offerAndDeleteStaleDirectories(staleDirectories)
  }

  const localBlocks = blockDirectories.reduce((acc, cur) => {
    const b = JSON.parse(fs.readFileSync(path.resolve(cur, 'block.config.json')))
    return acc.concat(b)
  }, [])

  const promiseArray = localBlocks.map((v, i) =>
    getBlockDetails(v.name)
      .then((res) => {
        if (res.status === 204) {
          return {
            name: v.name,
            directory: path.relative('.', blockDirectories[i]),
            registered: false,
            sourcemismatch: false,
            data: { localBlockConfig: v, detailsInRegistry: null },
          }
        }
        if (res.data.err) {
          return {
            name: v.name,
            directory: path.relative('.', blockDirectories[i]),
            registered: false,
            sourcemismatch: false,
            data: { detailsInRegistry: res.data.err, localBlockConfig: v },
          }
        }
        return {
          name: v.name,
          directory: path.relative('.', blockDirectories[i]),
          registered: true,
          sourcemismatch: false,
          data: { detailsInRegistry: res.data.data, localBlockConfig: v },
        }
      })
      .catch((err) => {
        console.log(err)
      })
  )

  /**
   * @typedef dinob
   * @type {Object}
   * @property {blockMetaData} detailsInRegistry
   * @property {import('../utils/jsDoc/types').appblockConfigShape} localBlockConfig
   */

  /**
   * @typedef nrbt
   * @type {Object}
   * @property {String} name
   * @property {Boolean} registered
   * @property {dinob} data
   * @property {Boolean} sourcemismatch
   */
  /**
   * @type {[nrbt]}
   */
  const res = await Promise.all(promiseArray)
  // console.log(res)

  const { nonRegisteredBlocks, alreadyRegisteredBlocks } = res.reduce(
    (acc, curr) => {
      if (!curr.registered) acc.nonRegisteredBlocks.push(curr)
      else if (curr.data.localBlockConfig.source.ssh !== curr.data.detailsInRegistry.GitUrl) {
        acc.nonRegisteredBlocks.push({ ...curr, sourcemismatch: true })
      } else {
        acc.alreadyRegisteredBlocks.push({ ...curr })
      }
      return acc
    },
    { nonRegisteredBlocks: [], alreadyRegisteredBlocks: [] }
  )

  report.push({
    message: `Found ${nonRegisteredBlocks.length} non registered blocks..`,
    data: nonRegisteredBlocks,
  })

  console.log(report)
  const t = await offerAndRegisterBlocks(nonRegisteredBlocks)

  const newlyRegisteredBlocks = t.filter((v) => v.registered)
  const deps = [...alreadyRegisteredBlocks, ...newlyRegisteredBlocks].reduce((acc, curr) => {
    acc[curr.name] = { ...acc[curr.name], directory: curr.directory, meta: curr.data.localBlockConfig }
    return acc
  }, {})
  console.log()
  console.log('New dependencies')
  console.log(deps)

  // await handleAppblockSync();
  // syncing logic starts here
  // 4 cases - (no config,config) && not (registered,not registered)
  if (insideAppblock && appblockIsRegistered) {
    // INFO : Found an block.config.json and also the app is registered
    if (!appConfigFromRegistry) {
      // INFO : Local config is present but couldn't find app config in the registry
      console.log(`${chalk.bgYellow('INFO')} Config not found in  Registry for ${appblockDetails.BlockName}`)
      // Create a full config mixing newly created dependencies and other details from present local config
      const possibleNewConfig = { ...appConfiginLocal, dependencies: { ...deps } }
      const diffed_newlyCreatedConfig_with_PresentConfig = diffObjects(possibleNewConfig, appConfiginLocal)
      diffShower(diffed_newlyCreatedConfig_with_PresentConfig)
      // TODO : Provide automatic merge options
      // TODO : Inform the user to push the config once it is written in local
      // const c1 = await getMergeConfirmation()
      //   if (c1) {
      //   }
      const co = await manualMerge(diffed_newlyCreatedConfig_with_PresentConfig)
      fs.writeFileSync('block.config.json', JSON.stringify(co, null, 2))

      console.log(`${chalk.bgCyan('WARN')} Appblock config not pushed.`)
      console.log('DONE')
    } else {
      // INFO : Local config is present and so is config in registry,
      //        pull config from registry and compare with newly created config,
      //        also comapre with local config, display diffs,
      //        if a new config is created, push the same and write it loocally
      // compare applocal config dependencies with newly created dependencies
      // if matches -> display msg and exit
      // else display diffs and write new config
      // if user has access, push the new config or Display msg to push
      feedback({ type: 'info', message: `Config in found Registry for ${appblockDetails.BlockName}` })
      const diffed_configinlocal_with_newlybuilt = diffObjects(
        {
          ...appConfiginLocal,
          dependencies: { ...deps },
        },
        appConfiginLocal
      )
      diffShower(diffed_configinlocal_with_newlybuilt)
      // const c1 = await getMergeConfirmation()
      // if (c1) {
      // }

      const co1 = await manualMerge(diffed_configinlocal_with_newlybuilt)
      const diffed_FromRegistry_with_Merge_of_newlyBuilt_and_LocalConfig = diffObjects(appConfigFromRegistry, co1)
      // TODO : accept incoming changes -> if there is a removal of block, delete the local dir for that block also
      // TODO : If there are dependencies present in local config, which the user needs to be merged with new config,
      //        Make an effort to pull the dependecy
      diffShower(diffed_FromRegistry_with_Merge_of_newlyBuilt_and_LocalConfig)
      /**
       * @type {import('../utils/jsDoc/types').appblockConfigShape}
       */
      const co2 = await manualMerge(diffed_configinlocal_with_newlybuilt)

      fs.writeFileSync('block.config.json', JSON.stringify(co2, null, 2))

      feedback({ type: 'warn', message: 'block.config.json is pushed' })
      feedback({ type: 'success', message: 'DONE' })
    }
  } else if (insideAppblock && !appblockIsRegistered) {
    // INFO : Has a local config file, but no config in registtry.
    //        Compare newly created config with present local config and display diffs,
    //        write diffs, Register app and push config
    // register appblock and push new config

    // Same as above case one, but also prompt to register app and push config
    // TODO::
    const possibleNewConfig = { ...appConfiginLocal, dependencies: { ...deps } }
    const diffed_newlyCreatedConfig_with_PresentConfig = diffObjects(possibleNewConfig, appConfiginLocal)
    diffShower(diffed_newlyCreatedConfig_with_PresentConfig)
    const co = await manualMerge(diffed_newlyCreatedConfig_with_PresentConfig)
    fs.writeFileSync('block.config.json', JSON.stringify(co, null, 2))

    console.log(`${chalk.bgCyan('WARN')} Appblock config not pushed.`)
    console.log('DONE')
  } else if (!insideAppblock && appblockIsRegistered) {
    // INFO : we don't have local config but we pulled an appblock which could or could not have config.
    if (appConfigFromRegistry) {
      // INFO : We don't have a local config, but a new dpendency list we built, and a config from
      //        Registry, compare both.
      console.log(`${chalk.bgYellow('INFO')} Config found Registry for ${appblockDetails.BlockName}`)
      const possibleNewConfig = { dependencies: { ...deps } }
      // INFO : always compare incoming with present, so diffShower works properly
      //        Passing possibleNewConfig first to diffObjects will result in showing incoming new
      //        addition in red colour opposed to being correctly shown in green colour
      const diffed_newlyCreatedPartialConfig_with_ConfigFromRegistry = diffObjects(
        appConfigFromRegistry,
        possibleNewConfig
      )

      diffShower(diffed_newlyCreatedPartialConfig_with_ConfigFromRegistry)

      const co = await manualMerge(diffed_newlyCreatedPartialConfig_with_ConfigFromRegistry)
      fs.writeFileSync('block.config.json', JSON.stringify(co, null, 2))

      console.log(`${chalk.bgCyan('WARN')} Appblock config not pushed.`)
      console.log('DONE')
    } else {
      console.log(`${chalk.bgYellow('INFO')} No config found in Registry`)
      // INFO : At this point we have a dependency list we created and details of the registered app,
      //        So create a new appblock config with those.

      const { BlockName, GitUrl } = appblockDetails
      const source = { ssh: GitUrl, https: convertGitSshUrlToHttps(GitUrl) }
      const newAppblockConfig = { name: BlockName, type: 'appBlock', source, dependencies: { ...deps } }

      console.log(`${chalk.bgYellow('INFO')} Writing new config`)
      console.log(newAppblockConfig)
      fs.writeSync('block.config.json', JSON.stringify(newAppblockConfig))
      console.log('New config written')
      console.log(`${chalk.bgCyan('WARN')} Appblock config not pushed.`)
      console.log('Please push the new config, If you have access')
      console.log('DONE')
    }
  } else if (!insideAppblock && !appblockIsRegistered) {
    // INFO : Not registered so no cofig present in registry,
    //        need to register first, write newly created config,
    //        push newly created config
    console.log(`${chalk.bgYellow('INFO')} No Registered app, register one to continue..`)
    const componentName = await getBlockName()
    const availableName = await checkBlockNameAvailability(componentName)
    const { blockFinalName, blockSource } = await createBlock(availableName, availableName, 1, '', false, '.')

    fs.writeFileSync(
      'block.config.json',
      JSON.stringify(
        {
          name: blockFinalName,
          type: 'appBlock',
          source: blockSource,
          dependencies: { ...deps },
        },
        null,
        2
      )
    )

    console.log(`${chalk.bgCyan('WARN')} Appblock config not pushed.`)
    console.log('DONE')
  } else {
    console.log('OOPS!!')
  }
}

module.exports = sync
