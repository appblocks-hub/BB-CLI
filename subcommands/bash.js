/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const util = require('util')
const fs = require('fs')
const execPromise = util.promisify(require('child_process').exec)
const cp = require('child_process')
const { getAbsPath } = require('../utils/path-helper')

function runScript(scriptPath) {
  // console.log('running script', scriptPath)
  return new Promise((resolve, reject) => {
    // keep track of whether callback has been invoked to prevent multiple invocations
    let invoked = false

    const process = cp.fork(scriptPath)
    process.on('data', (log) => {
      console.log(log)
    })
    resolve()
    // listen for errors as they may prevent the exit event from firing
    process.on('error', (err) => {
      if (invoked) return
      invoked = true
      reject(err)
    })

    // execute the callback once the process has finished running
    process.on('exit', (code) => {
      if (invoked) return
      invoked = true
      const err = code === 0 ? null : new Error(`exit code ${code}`)
      reject(err)
    })
  })
}
async function runBash(command, dir) {
  try {
    // eslint-disable-next-line no-unused-vars
    const { stdout, stderr } = await execPromise(command, { cwd: dir })
    // console.log('stdout:', stdout)
    // console.log('stderr:', stderr)
    return { status: 'success', msg: '' }
  } catch (err) {
    // console.error(err)
    return { status: 'failed', msg: err.message.split('\n')[0] }
  }
}

function runBashLongRunning(command, loggers, dir) {
  try {
    // const bashOut = exec(command);
    // console.log('directory for child is =', dir)
    // console.log('loggesrs are ', loggers)
    const out = fs.openSync(getAbsPath(loggers.out), 'w')
    const err = fs.openSync(getAbsPath(loggers.err), 'w')
    const commandArr = command.split(' ')
    const com = commandArr[0]
    commandArr.shift()
    const child = cp.spawn(com, commandArr, {
      cwd: dir,
      detached: true,
      stdio: ['ignore', out, err],
      env: { ...process.env, parentPath: global.rootDir },
    })
    child.unref()
    // console.log('child unreffed....', child.pid)
    return child
  } catch (err) {
    console.error(err)
    return null
  }
}

module.exports = { runBashLongRunning, runBash, runScript }
