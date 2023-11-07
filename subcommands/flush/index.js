/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { execSync } = require('child_process')
const { readdirSync } = require('fs')
const path = require('path')
const { BB_FOLDERS } = require('../../utils/bbFolders')

const extensionOf = (fname) =>
  // eslint-disable-next-line no-bitwise
  fname.slice(((fname.lastIndexOf('.') - 1) >>> 0) + 2)

const getLogFiles = (dir = '.') =>
  readdirSync(dir).reduce((acc, curr) => {
    if (curr === BB_FOLDERS.BB) {
      return acc.concat(getLogFiles(path.resolve(dir, curr)))
    }
    if (extensionOf(curr) === 'log') return acc.concat(path.resolve(dir, curr))
    if (curr === BB_FOLDERS.LOGS) return acc.concat(path.resolve(dir, curr))
    return acc
  }, [])

const flush = () => {
  try {
    const filesToDelete = getLogFiles()
    filesToDelete.forEach((p) => {
      execSync(`rm -r ${p}`)
    })
  } catch (error) {
    console.log(error.message)
  }
}

module.exports = flush
