/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { unlinkSync, lstat, rmSync, symlinkSync } = require('fs')
const { runBashLongRunning } = require('./bash')
const { copyEmulatorCode, addEmulatorProcessData } = require('../utils/emulator-manager')
const { updateEmulatorPackageSingleBuild, emPackageInstall } = require('./upload/onPrem/awsECR/util')
const { pexec } = require('../utils/execPromise')
const { configstore, headLessConfigStore } = require('../configstore')
const { checkPnpm } = require('../utils/pnpmUtils')
const { getBBFolderPath, BB_FILES, BB_FOLDERS, generateOutLogPath, generateErrLogPath } = require('../utils/bbFolders')

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

    const emulatorPath = getBBFolderPath(BB_FOLDERS.FUNCTIONS_EMULATOR, '.')

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

    const { FUNCTIONS_LOG } = BB_FILES
    const logOutPath = generateOutLogPath(FUNCTIONS_LOG)
    const logErrPath = generateErrLogPath(FUNCTIONS_LOG)

    const headlessConfig = headLessConfigStore().store
    if (headlessConfig.prismaSchemaFolderPath) {
      const ie = await pexec('npx prisma generate', { cwd: headlessConfig.prismaSchemaFolderPath })
      if (ie.err) throw new Error(ie.err)
    }

    const child = runBashLongRunning('node index.js', { out: logOutPath, err: logErrPath }, emulatorPath)
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
