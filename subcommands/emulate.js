/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { existsSync, mkdirSync } = require('fs')
const { runBash, runBashLongRunning } = require('./bash')
const { copyEmulatorCode, addEmulatorProcessData } = require('../utils/emulator-manager')
const { createFileSync } = require('../utils/fileAndFolderHelpers')

global.rootDir = process.cwd()

/**
 * @typedef {Object} emData
 * @property {('success' | 'failed')} msg
 * @property {String} status
 * @property {Object}
 */

/**
 *
 * @param {Array<Number>} ports
 * @param {Record<'dependencies',import('../utils/jsDoc/types').dependencies>} dependencies
 * @returns {Promise<emData>}
 */
const emulateNode = async (ports, dependencies) => {
  try {
    const emulatorData = await copyEmulatorCode(ports, dependencies)
    const i = await runBash('cd ./._ab_em/ && npm i')
    if (i.status === 'failed') {
      throw new Error(i.msg)
    }

    const logOutPath = path.resolve('./logs/out/functions.log')
    const logErrPath = path.resolve('./logs/err/functions.log')

    if (!existsSync(logErrPath)) {
      mkdirSync(path.join('./logs', 'err'), { recursive: true })
      createFileSync(logErrPath, '')
    }
    if (!existsSync(logOutPath)) {
      mkdirSync(path.join('./logs', 'out'), { recursive: true })
      createFileSync(logOutPath, '')
    }

    const child = runBashLongRunning('node index.js', { out: logOutPath, err: logErrPath }, './._ab_em')
    // console.log('pid - ', child.pid)
    addEmulatorProcessData({ pid: child.pid })

    return { status: 'success', msg: '', data: { emulatorData, port: emulatorData, pid: child.pid } }
  } catch (err) {
    return { status: 'failed', msg: err.message, data: { emulatorData: null, port: null, pid: null } }
  }
}

module.exports = emulateNode
