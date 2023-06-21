const chalk = require('chalk')
const semver = require('semver')
const { exec } = require('child_process')
const { readFile } = require('fs/promises')
const isRunning = require('is-running')
const treeKill = require('tree-kill')

const logFail = (msg) => console.log(chalk.red(msg))

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const isEmptyObject = (obj) => obj == null || typeof obj !== 'object' || Object.keys(obj).length === 0

const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-.]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/

/**
 *
 * @param {import('fs').PathLike} s
 * @returns {Promise<{data:object,err:Error}>}
 */
async function readJsonAsync(s) {
  if (typeof s !== 'string') return { data: null, err: true }
  try {
    const file = await readFile(s)
    const data = JSON.parse(file)
    return { data, err: null }
  } catch (err) {
    return { data: null, err }
  }
}

function pExec(cmd, options) {
  return new Promise((resolve) => {
    exec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        resolve({ err: error, out: stderr.toString() })
        return
      }
      resolve({ err: null, out: stdout.toString() })
    })
  })
}

const logErr = (err) => {
  let errMsg = err.response?.data?.msg || err.message || err

  if (err.response?.status === 401 || err.response?.status === 403) {
    errMsg += `: Access denied`
  }

  console.log(chalk.red(errMsg))
}

// eslint-disable-next-line arrow-body-style
const treeKillSync = async (livePid) => {
  return new Promise((resolve, reject) => {
    if (!isRunning(livePid)) resolve(true)
    treeKill(livePid, (err) => {
      if (!err) return resolve(true)
      return reject(err)
    })
  })
}

const checkEngineSupport = async (packageJson) => {
  const { engines } = packageJson

  if (engines.node) {
    const nodeVersion = process.version.slice(1) // Remove the 'v' prefix
    if (!semver.satisfies(nodeVersion, engines.node)) {
      console.log(chalk.dim(`current system node version: ${nodeVersion}`))
      console.log(chalk.red(`bb cli requires nodejs version to be within the range of ${engines.node.replace(' ', ' and ')}`))
      process.exit()
    }
  }

  if (engines.npm) {
    const { err, out } = await pExec('npm -v')
    if (err) throw err
    const currentNpmVersion = out.trim()
    if (!semver.satisfies(currentNpmVersion, engines.node)) {
      console.log(chalk.dim(`current system npm version: ${currentNpmVersion}`))
      console.log(chalk.red(`bb cli requires npm version to be within the range of ${engines.npm.replace(' ', ' and ')}`))
      process.exit()
    }
  }
}

module.exports = {
  readJsonAsync,
  logFail,
  sleep,
  isEmptyObject,
  domainRegex,
  pExec,
  logErr,
  treeKillSync,
  checkEngineSupport,
}
