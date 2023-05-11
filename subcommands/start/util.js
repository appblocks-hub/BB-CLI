/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const chalk = require('chalk')
const { existsSync, readFileSync, writeFileSync, cpSync } = require('fs')
const { getAbsPath } = require('../../utils/path-helper')
const emulateNode = require('../emulate')
const { spinnies } = require('../../loader')
const { runBash, runBashLongRunning } = require('../bash')
const watchCompilation = require('./watchCompilation')
const { convertToEnv } = require('../../utils/env')
const { configstore } = require('../../configstore')
const { removeSync } = require('../upload/onPrem/awsS3/util')

/**
 *
 * @param {String} name
 * @param {Number} port One port number
 * @returns
 */
async function startBlock(name, port, appConfig) {
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
    spinnies.succeed(name, { text: `${name} started at http://localhost:${block.data.port}` })
    return block
  }
  if (block.status === 'compiledwitherror') {
    appConfig.startedBlock = block.data
    const { errors } = block.compilationReport
    spinnies.succeed(name, {
      text: `${name} started at http://localhost:${block.data.port} with ${errors.length} errors`,
      succeedColor: 'yellow',
    })
    return block
  }
  spinnies.fail(name, { text: `${name} failed to start ${chalk.gray(`${block.msg}`)}` })
  return block
}

/**
 * @typedef {Object} dataInStartReturn
 * @property {String} name
 * @property {Number} pid
 * @property {Number} port
 * @property {Boolean} isOn
 */
/**
 * @typedef {Object} startReturn
 * @property {String} status
 * @property {String} msg
 * @property {dataInStartReturn} data
 * @property {Object} compilationReport
 */
/**
 *
 * @param {} block
 * @param {*} name
 * @param {*} port
 * @return {startReturn}
 */
async function startNodeProgram(block, name, port) {
  const emData = await emulateNode([port], { dependencies: block })
  const { status, msg, data } = emData
  return {
    status,
    msg,
    data: { name, pid: data.pid, port: data.port[block.meta.type], isOn: status === 'success' },
    compilationReport: {},
  }
}
/**
 *
 * @param {*} block
 * @param {*} name
 * @param {*} port
 * @returns {startReturn}
 */
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

const buildBlock = async (block, envData, env) => {
  const envType = ['ui-elements', 'ui-container'].includes(block.meta.type) ? 'view' : 'function'

  let envPath = path.resolve(`.env.${envType}.${env}`)
  if (!existsSync(envPath)) {
    envPath = path.resolve(`.env.${envType}`)
  } else {
    // eslint-disable-next-line no-param-reassign
    envData = {}
  }

  const existingEnvDataFile = await readFileSync(envPath).toString()
  const updatedEnv = convertToEnv(envData, existingEnvDataFile)

  const nodePackageManager = configstore.get('nodePackageManager')
  global.usePnpm = nodePackageManager === 'pnpm'

  const blockDir = path.resolve(block.directory)
  const blockBuildEnvPath = path.join(blockDir, '.env')
  const blockBuildTmpEnvPath = path.join(blockDir, '.env_ab_tmp')

  if (existsSync(blockBuildEnvPath)) {
    cpSync(blockBuildEnvPath, blockBuildTmpEnvPath, { overwrite: true, recursive: true })
  }

  await writeFileSync(blockBuildEnvPath, updatedEnv)

  const i = await runBash(global.usePnpm ? 'pnpm install' : block.meta.postPull, blockDir)
  if (i.status === 'failed') return { error: i.msg }

  const bashRes = await runBash(`npm run build`, blockDir)
  if (bashRes.status !== 'success') return { error: bashRes.msg }

  if (existsSync(blockBuildTmpEnvPath)) {
    cpSync(blockBuildTmpEnvPath, blockBuildEnvPath, { overwrite: true, recursive: true })
  } else {
    removeSync([blockBuildEnvPath])
  }

  return {
    blockBuildFolder: path.join(blockDir, 'dist'),
  }
}

module.exports = {
  startBlock,
  buildBlock,
}
