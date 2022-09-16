/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const Spinnies = require('spinnies')
const { createReadStream, watchFile } = require('fs')
const { Stream } = require('stream')
const readline = require('readline')
const path = require('path')
const chalk = require('chalk')
const { runBash, runBashLongRunning } = require('./bash')
const { getFreePorts } = require('./port-check')
const { getAbsPath } = require('../utils/path-helper')
const emulateNode = require('./emulate')
const { setupEnv } = require('../utils/env')
const { appConfig } = require('../utils/appconfigStore')
const { checkPnpm } = require('../utils/pnpmUtils')

global.rootDir = process.cwd()

const watchCompilation = (logPath, errPath) =>
  new Promise((resolve, reject) => {
    let ERROR = false
    const report = { errors: [] }
    const outStream = new Stream()
    watchFile(path.resolve(logPath), { persistent: false }, (currStat, prevStat) => {
      const inStream = createReadStream(path.resolve(logPath), {
        autoClose: false,
        encoding: 'utf8',
        start: prevStat.size,
        end: currStat.size,
      })
      const onLine = (line) => {
        if (line.includes('ERROR')) {
          ERROR = true
        } else if (ERROR) {
          report.errors.push(line)
          ERROR = false
        }
      }
      const onError = (err) => {
        report.errors.push(err.message.split('\n')[0])
        reject(report)
      }
      const onClose = () => {
        inStream.destroy()
        resolve(report)
      }
      const rl = readline.createInterface(inStream, outStream)
      rl.on('line', onLine)
      rl.on('error', onError)
      rl.on('close', onClose)
    })
    watchFile(path.resolve(errPath), { persistent: false }, (currStat, prevStat) => {
      const inStream = createReadStream(path.resolve(errPath), {
        autoClose: false,
        encoding: 'utf8',
        start: prevStat.size,
        end: currStat.size,
      })
      const onLine = (line) => {
        if (line.includes('[webpack-cli]')) {
          report.errors.push(line)
        }
      }
      const onError = (err) => {
        report.errors.push(err.message.split('\n')[0])
        reject(report)
      }
      const onClose = () => {
        inStream.destroy()
        report.message = 'Webpack failed'
        resolve(report)
      }
      const rl = readline.createInterface(inStream, outStream)
      rl.on('line', onLine)
      rl.on('error', onError)
      rl.on('close', onClose)
    })
  })
const spinnies = new Spinnies()
const start = async (blockname, { usePnpm }) => {
  global.usePnpm = false
  if (!usePnpm) {
    console.info('We recommend using pnpm for package management')
    console.info('Start command might install dependencies before starting blocks')
    console.info('For faster block start, pass --use-pnpm')
  } else if (!checkPnpm()) {
    console.info('Seems like pnpm is not installed')
    console.warn(`pnpm is recommended`)
    console.info(`Visit https://pnpm.io for more info`)
  } else {
    global.usePnpm = true
  }

  await appConfig.init()
  // Setup env from appblock.config.json data
  const configData = appConfig.appConfig
  await setupEnv(configData)

  if (!blockname) {
    let c = 0
    // eslint-disable-next-line no-unused-vars
    for (const _ of appConfig.nonLiveBlocks) {
      c += 1
    }
    if (c === 0) {
      console.log('\nAll blocks are already live!\n')
    } else {
      await startAllBlock()
    }
  } else {
    if (!appConfig.has(blockname)) {
      console.log('Block not found')
      process.exit(1)
    }
    const port = await getFreePorts(appConfig, blockname)
    await startBlock(blockname, port)
  }
}

async function startAllBlock() {
  // let containerBlock = null
  const emulateLang = 'nodejs'
  let emData

  // Build env for all blocks
  const PORTS = await getFreePorts(appConfig)

  spinnies.add('emulator', { text: 'Staring emulator' })
  switch (emulateLang) {
    case 'nodejs':
      emData = await emulateNode(PORTS.emulator)
      break
    default:
      emData = await emulateNode(PORTS.emulator)
      break
  }
  if (emData.status === 'success') {
    const pary = []
    for (const fnBlock of appConfig.fnBlocks) {
      pary.push(runBash(global.usePnpm ? 'pnpm install' : fnBlock.meta.postPull, path.resolve(fnBlock.directory)))
      // if (i.status === 'failed') {
      //   throw new Error(i.msg)
      // }
      appConfig.startedBlock = {
        name: fnBlock.meta.name,
        pid: emData.data.pid || null,
        isOn: true,
        port: emData.data.port || null,
        log: {
          out: `./logs/out/functions.log`,
          err: `./logs/err/functions.log`,
        },
      }
    }
    await Promise.allSettled(pary)
    // console.log(rep)
    spinnies.succeed('emulator', { text: `emulator started at ${emData.data.port}` })
  } else {
    spinnies.fail('emulator', { text: `emulator failed to start ${chalk.gray(`(${emData.msg})`)}` })
  }
  const promiseArray = []
  for (const block of appConfig.uiBlocks) {
    promiseArray.push(startBlock(block.meta.name, PORTS[block.meta.name]))
    if (block.meta.type === 'ui-container') {
      // containerBlock = block
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
async function startBlock(name, port) {
  spinnies.add(name, { text: `Starting ${name}` })
  if (!appConfig.has(name)) {
    // console.log('Block not found!')
    spinnies.fail(name, { text: 'Block not found!' })
    process.exit()
  }
  const blockToStart = appConfig.getBlockWithLive(name)
  let block
  switch (blockToStart.meta.language) {
    case 'nodejs': {
      block = await startNodeProgram(blockToStart, name, port)
      break
    }
    case 'js': {
      block = await startJsProgram(blockToStart, name, port)
      break
    }
    case 'go': {
      block = await startGoProgram(blockToStart, name, port)
      break
    }
    default:
      console.log('Do not support the configured language!')
      process.exit()
  }
  if (block.status === 'success') {
    appConfig.startedBlock = block.data
    spinnies.succeed(name, { text: `${name} started at ${block.data.port}` })
    return block
  }
  if (block.status === 'compiledwitherror') {
    appConfig.startedBlock = block.data
    const { errors } = block.compilationReport
    spinnies.succeed(name, {
      text: `${name} started at ${block.data.port} with ${errors.length} errors`,
      succeedColor: 'yellow',
    })
    return block
  }
  spinnies.fail(name, { text: `${name} failed to start ${chalk.gray(`${block.msg}`)}` })
  return block
}
async function startNodeProgram(block, name, port) {
  try {
    const directory = getAbsPath(block.directory)
    spinnies.update(name, { text: `Installing dependencies in ${name}` })
    // await runBash(block.meta.postPull, directory)
    const i = await runBash(global.usePnpm ? 'pnpm install' : block.meta.postPull, path.resolve(block.directory))
    if (i.status === 'failed') {
      throw new Error(i.msg)
    }
    spinnies.update(name, { text: `Dependencies installed in ${name}` })
    spinnies.update(name, { text: `Assigning port for ${name}` })
    // const port = await validateAndAssignPort(block.port)
    spinnies.update(name, { text: `Assigned port ${chalk.whiteBright(port)} for ${name}` })

    spinnies.update(name, { text: `Starting ${name} with ${chalk.whiteBright(block.meta.start)}` })
    const startCommand = `${block.meta.start} --port=${port}`
    const childProcess = runBashLongRunning(startCommand, block.log, directory)
    spinnies.update(name, { text: `Compiling ${name} ` })
    const updatedBlock = { name, pid: childProcess.pid, port, isOn: true }
    const compilationReport = await watchCompilation(block.log.out, block.log.err)
    spinnies.update(name, { text: `${name} Compiled with ${compilationReport.errors.length}  ` })

    const status = compilationReport.errors.length > 0 ? 'compiledwitherror' : 'success'

    return { status, msg: '', data: updatedBlock, compilationReport }
  } catch (err) {
    // console.error(err)
    // console.log(`${name} start failed!`)
    return {
      status: 'failed',
      msg: err.message.split('\n')[0],
      data: { name, pid: null, port: null, isOn: false },
      compilationReport: {},
    }
  }
}
async function startJsProgram(block, name, port) {
  try {
    const directory = getAbsPath(block.directory)
    spinnies.update(name, { text: `Installing dependencies in ${name}` })
    // const i = await runBash(block.meta.postPull, directory)
    const i = await runBash(global.usePnpm ? 'pnpm install' : block.meta.postPull, path.resolve(block.directory))
    if (i.status === 'failed') {
      throw new Error(i.msg)
    }
    spinnies.update(name, { text: `Dependencies installed in ${name}` })
    spinnies.update(name, { text: `Assigning port for ${name}` })
    spinnies.update(name, { text: `Assigned port ${chalk.whiteBright(port)} for ${name}` })
    const startCommand = `${block.meta.start} --port=${port}`
    const childProcess = runBashLongRunning(startCommand, block.log, directory)
    spinnies.update(name, { text: `Compiling ${name} ` })
    const updatedBlock = { name, pid: childProcess.pid, port, isOn: true }
    const compilationReport = await watchCompilation(block.log.out, block.log.err)
    spinnies.update(name, { text: `${name} Compiled with ${compilationReport.errors.length}  ` })
    const status = compilationReport.errors.length > 0 ? 'compiledwitherror' : 'success'
    return { status, msg: '', data: updatedBlock, compilationReport }
  } catch (err) {
    return {
      status: 'failed',
      msg: err.message.split('\n')[0],
      data: { name, pid: null, port: null, isOn: false },
      compilationReport: {},
    }
  }
}
async function startGoProgram(block) {
  try {
    getAbsPath(block.directory)
    // await blockPostPull();
    // const isDefaultPortAvailable = await checkPort(block.port);
    // // ask, the configured port is busy, do you want start in another port and if yes
    // if (!isDefaultPortAvailable) {
    //   const [port] = await findFreePort(3000);
    //   const startCommand = `${block.start} --port=${port}`;
    //   await blockStart(startCommand);
    //   console.log(`${block.name} started successfully!`)
    // }
    // await blockStart();
  } catch (err) {
    console.error(err)
  }
}

module.exports = start
