/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { runBash, runBashLongRunning } = require('./bash')
const { copyEmulatorCode, addEmulatorProcessData } = require('../utils/emulator-manager')

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
    const child = runBashLongRunning(
      'node index.js',
      { out: './logs/out/functions.log', err: './logs/err/functions.log' },
      './._ab_em'
    )
    // console.log('pid - ', child.pid)
    addEmulatorProcessData({ pid: child.pid })

    return { status: 'success', msg: '', data: { emulatorData, port: emulatorData, pid: child.pid } }
  } catch (err) {
    return { status: 'failed', msg: err.message, data: { emulatorData: null, port: null, pid: null } }
  }
}

module.exports = emulateNode
