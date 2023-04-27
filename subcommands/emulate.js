/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { existsSync, mkdirSync, rmSync } = require('fs')
const { symlink } = require('fs/promises')
const { runBashLongRunning } = require('./bash')
const { copyEmulatorCode, addEmulatorProcessData } = require('../utils/emulator-manager')
const { createFileSync } = require('../utils/fileAndFolderHelpers')
const { updateEmulatorPackageSingleBuild } = require('./upload/onPrem/awsECR/util')
const { pexec } = require('../utils/execPromise')

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
const emulateNode = async (ports, dependencies, singleInstance) => {
  try {
    const emulatorData = await copyEmulatorCode(ports, dependencies)

    const depBlocks = Object.entries(dependencies).reduce((acc, [bk, bkDetails]) => {
      if (!['function', 'shared-fn', 'job'].includes(bkDetails.meta.type)) return acc
      acc[bk] = bkDetails
      return acc
    }, {})

    if (singleInstance) {
      await updateEmulatorPackageSingleBuild({ dependencies: depBlocks, emulatorPath: '._ab_em' })
    } else {
      const i = await pexec('cd ./._ab_em/ && npm i')
      if (i.err) throw new Error(i.err)
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

    if (singleInstance) {
      const src = path.resolve('._ab_em', 'node_modules')
      await Promise.all(
        Object.values(depBlocks).map(async (bk) => {
          const dest = path.resolve(bk.directory, 'node_modules')

          try {
            rmSync(dest, { recursive: true, force: true })
          } catch (e) {
            // nothing
          }

          await symlink(src, dest)

          return true
        })
      )
    }

    const child = runBashLongRunning('node index.js', { out: logOutPath, err: logErrPath }, './._ab_em')
    if (child.exitCode !== null) {
      throw new Error('Error starting emulator')
    }
    // console.log('pid - ', child.pid)
    addEmulatorProcessData({ pid: child.pid })
    return { status: 'success', msg: '', data: { emulatorData, port: emulatorData, pid: child.pid } }
  } catch (err) {
    console.log(err)
    return { status: 'failed', msg: err.message, data: { emulatorData: null, port: null, pid: null } }
  }
}

module.exports = emulateNode
