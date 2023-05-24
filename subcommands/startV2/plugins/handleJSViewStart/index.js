const chalk = require('chalk')
const { startJsProgram } = require('./utils')
const singleBuild = require('./singleBuild')
// eslint-disable-next-line no-unused-vars
const PackageConfigManager = require('../../../../utils/configManagers/packageConfigManager')
// eslint-disable-next-line no-unused-vars
const StartCore = require('../../startCore')

class handleJSViewStart {
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
    startCore.hooks.beforeStart.tapPromise(
      'SingleBuild',
      async (/** @type {StartCore} */ core, /** @type {PackageConfigManager} */ packageConfigManager) => {
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
        if (core.cmdOpts.singleInstance) {
          // setup port
          this.elementsPort = this.elementsBlocks[0].availablePort
          this.containerPort = this.containerBlocks[0].availablePort

          // Release port before server start
          this.elementsBlocks[0].key.abort()
          this.containerBlocks[0].key.abort()

          await singleBuild({
            core,
            packageConfigManager,
            blocks: {
              elementsBlocks: this.elementsBlocks,
              containerBlocks: this.containerBlocks,
              depLibBlocks: this.depLibBlocks,
            },
            ports: {
              emElements: [this.elementsPort],
              container: [this.containerPort],
            },
          })
          return
        }

        /**
         * separate instance for block level start
         */
        const promiseArray = []
        for (const block of this.elementsBlocks) {
          promiseArray.push(startJsProgram(block.config.name, block.availablePort))
          // handle env
        }

        const reportRaw = await Promise.allSettled(promiseArray)
        const reducedReport = reportRaw.reduce(
          (acc, curr) => {
            const { data } = curr.value
            const { name } = data
            switch (curr.value.status) {
              case 'success':
                acc.success.push({ name, reason: [] })
                break
              case 'failed':
                acc.failed.push({ name, reason: [curr.value.msg] })
                break
              case 'compiledWithError':
                acc.startedWithError.push({ name, reason: curr.value.compilationReport.errors })
                break

              default:
                break
            }
            return acc
          },
          { success: [], failed: [], startedWithError: [], startedWithWarning: [] }
        )

        for (const key in reducedReport) {
          if (Object.hasOwnProperty.call(reducedReport, key)) {
            const status = reducedReport[key]
            if (status.length > 0) {
              console.log(`${chalk.whiteBright(key)}`)
              status.forEach((b) => {
                console.log(`-${b.name}`)
                b.reason.forEach((r) => console.log(`--${r}`))
              })
            }
          }
        }
      }
    )
  }
}

module.exports = handleJSViewStart
