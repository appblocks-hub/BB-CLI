/**
 * If the index has a ts extension, ans the deps are installed
 * and ts is locally available, set a watcher and on any file change
 * in the block dir, for now, re compile ti index.js
 *  Later prepare list of files to watch, based on the imports in
 *  index.ts

*/

const path = require('path')
const { log } = require('console')
const { updateEnv } = require('../../../../../utils/env')
const envToObj = require('../../../envToObj')

class TSWatcherPlugin {
  /**
   *
   * @param {StartCore} startcore
   */
  apply(startcore) {
    startcore.hooks.buildFnEmulator.tapPromise('TSWatcherPlugin', async (core, config, buildFnEmulatorCore) => {
      const logOutPath = path.join(config.cwd, './logs/out/functions.log')
      const logErrPath = path.resolve(config.cwd, './logs/err/functions.log')
      const _r = buildFnEmulatorCore.depsInstallReport
      log(buildFnEmulatorCore, this)
      for (const _v of _r) {
        log(_v)
        if (!_v.value.err) {
          /**
           * If dependencies were properly installed,
           * Load the env's from block to global function.env
           */
          const _ = await envToObj(path.resolve(_v.value.data.directory, '.env'))
          await updateEnv('function', _)

          // eslint-disable-next-line no-param-reassign
          config.startedBlock = {
            name: _v.value.data.meta.name,
            pid: this.pid || null,
            isOn: true,
            port: this.port || null,
            log: {
              out: logOutPath,
              err: logErrPath,
            },
          }
          continue
        }
        // console.log(`✓ installed deps in ${this.fnBlocks[i].meta.name}`)
        console.log(`✗ error installing deps in ${_v.value.data.meta.name}`)
      }
    })
  }
}

module.exports = TSWatcherPlugin
