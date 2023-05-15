const chalk = require('chalk')
const { exec } = require('child_process')
const { readFile } = require('fs/promises')
const path = require('path')

const logFail = (msg) => console.log(chalk.red(msg))

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const isEmptyObject = (obj) => obj == null || typeof obj !== 'object' || Object.keys(obj).length === 0

const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-.]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/

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

/**
 * TODO: this should happen in appConfig.init()
 * Finds a package for the current block by moving up the dir tree
 * @param {string} name block name
 * @param {string} dirPath block path
 */
const findMyParentPackage = async (name, myPath, filename) => {
  let parentPackageFound = false
  let parentPackageConfig
  let currentPath = myPath
  let parent = path.dirname(currentPath)
  while (parent !== currentPath && !parentPackageFound) {
    try {
      const { data } = await readJsonAsync(path.join(parent, filename)) // Use destructuring to get 'data' from the result
      if (
        data.type === 'package' &&
        data.dependencies &&
        Object.prototype.hasOwnProperty.call(data.dependencies, name)
      ) {
        parentPackageFound = true
        parentPackageConfig = JSON.parse(JSON.stringify(data)) // Use deep copy to create a new object
      }
      break
    } catch (err) {
      // Handle readJsonAsync() errors, e.g., log the error message
    }
    currentPath = parent
    parent = path.dirname(parent)
  }

  return {
    data: { parent: parentPackageFound ? parent : null, parentPackageConfig },
    err: parent === currentPath ? `Path exhausted! Couldn't find a package block with "${name}" in dependencies` : null,
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

module.exports = { readJsonAsync, logFail, sleep, isEmptyObject, domainRegex, findMyParentPackage, pExec, logErr }
