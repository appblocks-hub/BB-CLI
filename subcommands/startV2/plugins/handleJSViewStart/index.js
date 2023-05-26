const { startJsProgram, handleReportLog } = require('./utils')
const singleBuild = require('./singleBuild')
// eslint-disable-next-line no-unused-vars
const PackageConfigManager = require('../../../../utils/configManagers/packageConfigManager')
// eslint-disable-next-line no-unused-vars
const StartCore = require('../../startCore')

class HandleJSViewStart {
  constructor() {
    this.elementsBlocks = []
    this.containerBlocks = []
    this.depLibBlocks = []
    this.blocksData = {}
    this.elementsPort = 3000
    this.containerPort = 4000
  }

  /**
   *
   * @param {StartCore} StartCore
   */
  apply(startCore) {
    startCore.hooks.beforeStart.tapPromise('HandleJSViewStart', async (/** @type {StartCore} */ core) => {
      /**
       * Filter js view blocks
       */
      for (const { type, blocks } of core.blockStartGroups) {
        if (type === 'ui-elements') {
          this.elementsBlocks = blocks.filter((b) => b.config.language === 'js')
        } else if (type === 'ui-container') {
          this.containerBlocks = blocks.filter((b) => b.config.language === 'js')
        } else if (type === 'ui-dep-lib') {
          this.depLibBlocks = blocks.filter((b) => b.config.language === 'js')
        }
      }

      /**
       * singe instance start
       */
      if (core.cmdOpts.singleInstance && !core.cmdArgs.blockName) {
        // setup port
        this.elementsPort = this.elementsBlocks[0].availablePort
        this.containerPort = this.containerBlocks[0].availablePort

        // Release port before server start
        this.elementsBlocks[0].key.abort()
        this.containerBlocks[0].key.abort()

        await singleBuild({
          core,
          blocks: {
            elementsBlocks: this.elementsBlocks,
            containerBlocks: this.containerBlocks,
            depLibBlocks: this.depLibBlocks,
          },
          ports: {
            emElements: [this.elementsPort],
            container: [this.containerPort],
          },
          env: core.cmdOpts.environment,
        })
        return
      }

      /**
       * separate instance for block level start
       */
      let promiseArray = []
      if (this.depLibBlocks.length > 0) {
        for (const block of this.depLibBlocks) {
          promiseArray.push(startJsProgram(core, block, block.availablePort))
          // handle env
        }
        const depLibReportRaw = await Promise.allSettled(promiseArray)
        handleReportLog(depLibReportRaw)
      }

      if (this.elementsBlocks.length > 0) {
        promiseArray = []
        for (const block of this.elementsBlocks) {
          promiseArray.push(startJsProgram(core, block, block.availablePort))
          // handle env
        }
        const eleReportRaw = await Promise.allSettled(promiseArray)
        console.log(eleReportRaw)
        handleReportLog(eleReportRaw)
      }

      if (this.containerBlocks > 0) {
        promiseArray = []
        for (const block of this.containerBlocks) {
          promiseArray.push(startJsProgram(core, block, block.availablePort))
          // handle env
        }
        const reportRaw = await Promise.allSettled(promiseArray)
        handleReportLog(reportRaw)
      }
    })
  }
}

module.exports = HandleJSViewStart
