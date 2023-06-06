const chalk = require('chalk')
const { exec } = require('child_process')
const { readFile } = require('fs/promises')

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

module.exports = { readJsonAsync, logFail, sleep, isEmptyObject, domainRegex, pExec, logErr }
