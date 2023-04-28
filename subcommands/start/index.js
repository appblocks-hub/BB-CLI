/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readFileSync } = require('fs')
const path = require('path')
const chalk = require('chalk')
const { noop } = require('rxjs')
const isRunning = require('is-running')
const treeKill = require('tree-kill')
const { promisify } = require('util')
const { getFreePorts } = require('../port-check')
const emulateNode = require('../emulate')
const { setupEnv, updateEnv } = require('../../utils/env')
const { spinnies } = require('../../loader')
const { checkPnpm } = require('../../utils/pnpmUtils')
const { appConfig } = require('../../utils/appconfigStore')
const { runBash } = require('../bash')
const envToObj = require('./envToObj')
const { feedback } = require('../../utils/cli-feedback')
const { checkLanguageVersionExistInSystem } = require('../languageVersion/util')
const { startBlock } = require('./util')
const singleBuild = require('./singleBuild')
const { configstore } = require('../../configstore')

global.rootDir = process.cwd()

const start = async (blockName, { usePnpm, multiInstance = false, blockType }) => {
  const singleInstance = !multiInstance
  const startBlockType = blockType

  const nodePackageManager = configstore.get('nodePackageManager')

  if (!usePnpm && nodePackageManager !== 'pnpm') {
    console.info('We recommend using pnpm for package management')
    console.info('Start command might install dependencies before starting blocks')
    console.info('For faster block start, pass --use-pnpm')
  } else if (!checkPnpm()) {
    console.info('Seems like pnpm is not installed')
    console.warn(`pnpm is recommended`)
    console.info(`Visit https://pnpm.io for more info`)
  } else if (!nodePackageManager) {
    global.usePnpm = true
  }

  await appConfig.init()
  // Setup env from block.config.json data
  if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
    // eslint-disable-next-line no-param-reassign
    blockName = appConfig.allBlockNames.next().value
  }
  const configData = appConfig.config
  await setupEnv(configData)

  const supportedAppblockVersions = appConfig.config?.supportedAppblockVersions

  const blockLanguages = blockName
    ? [appConfig.getBlock(blockName).meta?.language]
    : [...new Set([...appConfig.getAllBlockLanguages])]

  try {
    await checkLanguageVersionExistInSystem({ supportedAppblockVersions, blockLanguages })
  } catch (error) {
    console.log(error)
    process.exit()
  }

  if (blockName && !appConfig.has(blockName)) {
    console.log('Block not found')
    return
  }

  if (blockName) {
    const blockToStart = appConfig.getBlockWithLive(blockName)
    const treeKillPromise = promisify(treeKill)
    /**
     * If the block is already running, kill the process & restart
     */
    if (isRunning(blockToStart.pid)) {
      try {
        await treeKillPromise(blockToStart.pid)
      } catch (_) {
        feedback({
          type: 'muted',
          message: `${blockToStart.meta.name} was live with pid:${blockToStart.pid}, couldn't kill it`,
        })
      }
    }
    const port = await getFreePorts(appConfig, blockName)
    await startBlock(blockName, port, appConfig)
    return
  }

  // If no block name given

  if ([...appConfig.allBlockNames].length <= 0) {
    console.log('\nNo blocks to start!\n')
    // process.exit(1)
    return
  }

  if ([...appConfig.nonLiveBlocks].length === 0) {
    console.log('\nAll blocks are already live!\n')
    return
  }

  /**
   * If some blocks are already running, kill them before
   * starting them again to avoid unkilled processes
   */
  // for (const block of appConfig.liveBlocks) {
  //   if (isRunning(block?.pid)) {
  //     treeKill(block.pid, (err) => {
  //       if (err) {
  //         feedback({ type: 'muted', message: `${block.meta.name} was live with pid:${block.pid}, couldn't kill it` })
  //       }
  //     })
  //   }
  // }

  await startAllBlock({ singleInstance, startBlockType })
}

async function startAllBlock({ singleInstance, startBlockType }) {
  // Build env for all blocks
  const PORTS = await getFreePorts(appConfig)

  // IF FUNCTION BLOCK EXIST
  if (
    ([...appConfig.fnBlocks]?.length || [...appConfig.jobBlocks]?.length) &&
    (!startBlockType || startBlockType === 'function')
  ) {
    // let containerBlock = null
    const emulateLang = 'nodejs'
    let emData
    spinnies.add('emulator', { text: 'Starting function emulator' })
    switch (emulateLang) {
      case 'nodejs':
        emData = await emulateNode(PORTS.emulatorPorts, [...appConfig.dependencies], singleInstance)
        break
      default:
        emData = await emulateNode(PORTS.emulatorPorts, [...appConfig.dependencies], singleInstance)
        break
    }
    if (emData.status === 'success') {
      const installArray = []

      // install deps in sharedBlocks
      for (const { meta, directory } of appConfig.sharedFnBlocks) {
        if (!singleInstance) {
          installArray.push(runBash(global.usePnpm ? 'pnpm install' : meta.postPull, path.resolve(directory)))
        }
        const _ = await envToObj(path.resolve(directory, '.env'))
        await updateEnv('function', _)

        appConfig.startedBlock = {
          name: meta.name,
          pid: emData.data.pid || null,
          isOn: true,
          port: null,
          log: {
            out: `./logs/out/functions.log`,
            err: `./logs/err/functions.log`,
          },
        }
      }

      // install deps in fnBlocks
      for (const { meta, directory } of appConfig.fnBlocks) {
        if (!singleInstance) {
          installArray.push(runBash(global.usePnpm ? 'pnpm install' : meta.postPull, path.resolve(directory)))
        }

        // if (i.status === 'failed') {
        //   throw new Error(i.msg)
        // }
        const _ = await envToObj(path.resolve(directory, '.env'))
        await updateEnv('function', _)

        appConfig.startedBlock = {
          name: meta.name,
          pid: emData.data.pid || null,
          isOn: true,
          port: emData.data.port[meta.type] || emData.data.port || null,
          log: {
            out: `./logs/out/functions.log`,
            err: `./logs/err/functions.log`,
          },
        }
      }

      // install deps in jobBlocks
      for (const { meta, directory } of appConfig.jobBlocks) {
        if (!singleInstance) {
          installArray.push(runBash(global.usePnpm ? 'pnpm install' : meta.postPull, path.resolve(directory)))
        }
        // if (i.status === 'failed') {
        //   throw new Error(i.msg)
        // }
        const _ = await envToObj(path.resolve(directory, '.env'))
        await updateEnv('function', _)

        appConfig.startedBlock = {
          name: meta.name,
          pid: emData.data.pid || null,
          isOn: true,
          port: emData.data.port[meta.type] || emData.data.port || null,
          log: {
            out: `./logs/out/functions.log`,
            err: `./logs/err/functions.log`,
          },
        }
      }

      if (!singleInstance) {
        console.log(' Installing dependencies for blocks ')
        await Promise.allSettled(installArray)
      }
      // console.log(rep)
      if (emData.data.emulatorData) {
        const dt = Object.entries(emData.data.emulatorData).reduce(
          (acc, [type, port]) => `${acc} ${type} emulator started at ${port}\n`,
          '\n'
        )
        spinnies.succeed('emulator', { text: dt })
      } else {
        spinnies.succeed('emulator', { text: `emulator started at ${emData.data.port}` })
      }
    } else {
      spinnies.fail('emulator', { text: `emulator failed to start ${chalk.gray(`(${emData.msg})`)}` })
    }
  }

  // IF VIEW BLOCK EXIST
  const viewBlocks = [...appConfig.uiBlocks]
  if (viewBlocks?.length && (!startBlockType || startBlockType === 'ui')) {
    if (singleInstance) {
      await singleBuild({ appConfig, ports: PORTS })
      return
    }

    const promiseArray = []
    for (const block of appConfig.uiBlocks) {
      promiseArray.push(startBlock(block.meta.name, PORTS[block.meta.name], appConfig))
      if (block.meta.type === 'ui-container') {
        // containerBlock = block
      }
      try {
        // TODO: copy this to a function, code repeated above twice
        const _e = readFileSync(path.join(block.directory, '.env')).toString().trim()
        const _b = _e.split('\n').reduce((acc, curr) => {
          const [k, v] = curr.split('=')
          const _n = `${block.meta.name.toLocaleUpperCase()}_${k}`
          acc[_n] = v
          return acc
        }, {})
        await updateEnv('view', _b)
      } catch (_) {
        noop()
      }
    }
    const reportRaw = await Promise.allSettled(promiseArray)
    // console.log(JSON.stringify(reportRaw))
    const reducedReport = reportRaw.reduce(
      (acc, curr) => {
        const { data } = curr.value
        const { name } = data
        switch (curr.value.status) {
          case 'success':
            acc.success.push({ name, reason: [] })
            break
          case 'failed':
            acc.failed.push({ name, reason: [curr.value.msg] })
            break
          case 'compiledwitherror':
            acc.startedWithError.push({ name, reason: curr.value.compilationReport.errors })
            break

          default:
            break
        }
        return acc
      },
      { success: [], failed: [], startedWithError: [], startedWithWarning: [] }
    )
    // console.log(reducedReport)
    for (const key in reducedReport) {
      if (Object.hasOwnProperty.call(reducedReport, key)) {
        const status = reducedReport[key]
        if (status.length > 0) {
          console.log(`${chalk.whiteBright(key)}`)
          status.forEach((b) => {
            console.log(`-${b.name}`)
            b.reason.forEach((r) => console.log(`--${r}`))
          })
        }
      }
    }

    // if (containerBlock) {
    //   console.log(`Visit url http://localhost:${containerBlock.port} to view the app`)
    // }
  }
}

module.exports = start
