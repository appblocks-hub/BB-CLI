/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { runBash, runBashLongRunning } = require('./bash')
const { copyEmulatorCode, addEmulatorProcessData } = require('../utils/emulator-manager')

global.rootDir = process.cwd()

const emulateNode = async (ports, appConfig) => {
  try {
    const emulatorData = await copyEmulatorCode(ports, appConfig)
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
    return { status: 'failed', msg: err.message, data: { port: null, pid: null } }
  }
}

module.exports = emulateNode
