/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { existsSync, mkdirSync } = require('fs')
const { getBBFolderPath, BB_FOLDERS } = require('../bbFolders')

const checkLogDirs = () => {
  try {
    const logsPath = getBBFolderPath(BB_FOLDERS.LOGS)
    const outLogPath = path.join(logsPath, BB_FOLDERS.OUT)
    const errLogPath = path.join(logsPath, BB_FOLDERS.ERR)

    if (!existsSync(outLogPath)) {
      mkdirSync(outLogPath, { recursive: true })
    }
    if (!existsSync(errLogPath)) {
      mkdirSync(errLogPath, { recursive: true })
    }
  } catch (err) {
    console.log('Error in creating log dirs', err.message)
  }
}

module.exports = { checkLogDirs }
