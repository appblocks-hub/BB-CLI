/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// #!/usr/bin/env node
const { runBash, runBashLongRunning } = require('./bash')
const { copyEmulatorCode, addEmulatorProcessData } = require('../utils/emulator-manager')

global.rootDir = process.cwd()
// program.argument('<project-directory>', 'name of project')
// INFO - adding a directory argument would want the program
// to change directory midway before starting to create folder
// structure..
// program.argument('[name]', 'name ofa block')

const emulateNode = async (port) => {
  try {
    await copyEmulatorCode(port)
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

    return { status: 'success', msg: '', data: { port, pid: child.pid } }
  } catch (err) {
    return { status: 'failed', msg: err.message, data: { port: null, pid: null } }
  }
}

// emulateNode()
// To avoid calling Init twice on tests
// if (process.env.NODE_ENV !== 'test') Init(process.argv)

// module.exports = Init
module.exports = emulateNode
