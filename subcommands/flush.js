/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { execSync } = require('child_process')
const { readdirSync } = require('fs')
const path = require('path')
const { BB_FOLDERS } = require('../utils/bbFolders')

const extensionOf = (fname) =>
  // eslint-disable-next-line no-bitwise
  fname.slice(((fname.lastIndexOf('.') - 1) >>> 0) + 2)

const flush = () => {
  const filesToDelete = readdirSync('.').reduce((acc, curr) => {
    if (extensionOf(curr) === 'log') return acc.concat(path.resolve(curr))
    if (curr === BB_FOLDERS.LOGS) return acc.concat(path.resolve(curr))
    return acc
  }, [])

  filesToDelete.forEach((p) => {
    execSync(`rm -r ${p}`)
  })
}

module.exports = flush
