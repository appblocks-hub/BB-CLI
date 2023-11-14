/* eslint-disable no-param-reassign */
const path = require('path')
const chalk = require('chalk')
const readline = require('readline')
const { Stream } = require('stream')
const { createReadStream, watchFile, existsSync, rmSync } = require('fs')
const { runBash, runBashLongRunning } = require('../../../../utils/bash')
const { getNodePackageInstaller } = require('../../../../utils/nodePackageManager')
const { generateOutLogPath, generateErrLogPath } = require('../../../../utils/bbFolders')

/**
 * @typedef watchCompilationReport
 * @property {[string]} errors
 * @property {string} message
 */
/**
 *
 * @param {} logPath Log file path to watch for
 * @param {*} errPath Log file path to watch for
 * @returns {Promise<watchCompilationReport>}
 */
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
        if (line.includes('[webpack-cli]') || line.includes('Error')) {
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

/**
 *
 * @param {*} block
 * @param {*} name
 * @param {*} port
 * @returns {startReturn}
 */
async function startJsProgram(core, blockManager, port) {
  const { name } = blockManager.config
  core.spinnies.add(name, { text: `Starting ${name}` })

  const logOutPath = generateOutLogPath(`${name}.log`)
  const logErrPath = generateErrLogPath(`${name}.log`)

  blockManager.log = { err: logErrPath, out: logOutPath }

  try {
    core.spinnies.update(name, { text: `Installing dependencies in ${name}` })

    if (core.cmdOpts?.force) {
      if (existsSync('./node_modules')) rmSync('./node_modules', { recursive: true })
    }

    const { installer } = getNodePackageInstaller()
    const i = await runBash(installer, path.resolve(blockManager.directory))
    if (i.status === 'failed') throw new Error(i.msg)
    core.spinnies.update(name, { text: `Dependencies installed in ${name}` })

    core.spinnies.update(name, { text: `Assigned port ${chalk.whiteBright(port)} for ${name}` })
    const startCommand = `${blockManager.config.start} --port=${port}`

    const childProcess = runBashLongRunning(startCommand, blockManager.log, blockManager.directory)

    core.spinnies.update(name, { text: `Compiling ${name} ` })
    const updatedBlock = { name, pid: childProcess.pid, port, isOn: true }
    const compilationReport = await watchCompilation(blockManager.log.out, blockManager.log.err)
    core.spinnies.update(name, { text: `${name} Compiled with ${compilationReport.errors.length}  ` })

    const status = compilationReport.errors.length > 0 ? 'compiledWithError' : 'success'

    if (status === 'success') {
      blockManager.updateLiveConfig(updatedBlock)
      core.spinnies.succeed(name, { text: `${name} started at http://localhost:${updatedBlock.port}` })
    }

    if (status === 'compiledWithError') {
      blockManager.updateLiveConfig(updatedBlock)
      const { errors } = compilationReport
      core.spinnies.succeed(name, {
        text: `${name} started at http://localhost:${updatedBlock.port} with ${errors.length} errors`,
        succeedColor: 'yellow',
      })
    }

    return { status, msg: '', data: updatedBlock, compilationReport }
  } catch (err) {
    const errMsg = err.message.split('\n')[0]
    core.spinnies.fail(name, { text: `${name} failed to start ${chalk.gray(`${errMsg}`)}` })
    return {
      status: 'failed',
      msg: errMsg,
      data: { name, pid: null, port: null, isOn: false },
      compilationReport: {},
    }
  }
}

const handleReportLog = (reportData) => {
  const reducedReport = reportData.reduce(
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
        case 'compiledWithError':
          acc.startedWithError.push({ name, reason: curr.value.compilationReport.errors })
          break

        default:
          break
      }
      return acc
    },
    { success: [], failed: [], startedWithError: [], startedWithWarning: [] }
  )

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
}

module.exports = { startJsProgram, handleReportLog }
