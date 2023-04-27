/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { existsSync, mkdirSync, unlinkSync, lstat, rmSync, symlinkSync } = require('fs')
const { runBashLongRunning } = require('./bash')
const { copyEmulatorCode, addEmulatorProcessData } = require('../utils/emulator-manager')
const { createFileSync } = require('../utils/fileAndFolderHelpers')
const { updateEmulatorPackageSingleBuild, emPackageInstall } = require('./upload/onPrem/awsECR/util')
const { pexec } = require('../utils/execPromise')
const { configstore, headLessConfigStore } = require('../configstore')
const { checkPnpm } = require('../utils/pnpmUtils')

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

    const emulatorPath = '._ab_em'

    if (singleInstance) {
      await updateEmulatorPackageSingleBuild({ dependencies: depBlocks, emulatorPath })
      await emPackageInstall(emulatorPath)

      const src = path.resolve(emulatorPath, 'node_modules')
      for (const bk of Object.values(depBlocks)) {
        try {
          const dest = path.resolve(bk.directory, 'node_modules')
          lstat(dest, (err, stats) => {
            if (err && err.code !== 'ENOENT') throw err

            if (stats?.isSymbolicLink()) unlinkSync(dest)
            if (stats?.isDirectory()) rmSync(dest, { recursive: true })

            // cpSync(src, dest, { recursive: true })
            symlinkSync(src, dest)
          })
        } catch (e) {
          if (e.code !== 'ENOENT' && e.code !== 'EEXIST') {
            console.log(e.message, '\n')
          }
        }
      }
    } else {
      let installer = 'npm i'
      const nodePackageManager = configstore.get('nodePackageManager')
      global.usePnpm = nodePackageManager === 'pnpm' || (!nodePackageManager && checkPnpm())
      if (global.usePnpm) installer = 'pnpm i'

      const i = await pexec(installer, { cwd: emulatorPath })
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

    const headlessConfig = headLessConfigStore.store
    if (headlessConfig.prismaSchemaFolderPath) {
      const ie = await pexec('npx prisma generate', { cwd: headlessConfig.prismaSchemaFolderPath })
      if (ie.err) throw new Error(ie.err)
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
