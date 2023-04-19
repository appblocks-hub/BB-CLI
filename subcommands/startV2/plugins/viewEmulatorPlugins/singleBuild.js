/* eslint-disable class-methods-use-this */
const singleBuild = require('../../../start/singleBuild')

class SingleBuild {
  constructor() {
    this.elementsBlocks = []
    this.blocksData = {}
    this.containerBlocks = []
    this.port = 0
    this.pid = 0
  }

  /**
   *
   * @param {} StartCore
   */
  apply(StartCore) {
    StartCore.hooks.singleBuildForView.tapPromise(
      'SingleBuild',
      async (/** @type {StartCore} */ core, /** @type {AppblockConfigManager} */ config) => {
        if (!core.cmdOpts.singleInstance) return

        /**
         * Filter js view blocks
         */
        for (const { type, blocks } of core.blockGroups) {
          if (type === 'ui-elements') {
            this.elementsBlocks = blocks.filter((b) => b.meta.language === 'js')
          } else if (type === 'ui-container') {
            this.containerBlocks = blocks.filter((b) => b.meta.language === 'js')
          }
        }

        /**
         * Get port
         */
        this.elementsPort = this.elementsBlocks[0].availablePort
        this.containerPort = this.containerBlocks[0].availablePort

        /**
         * Release port before server start
         */
        this.elementsBlocks[0].key.abort()
        this.containerBlocks[0].key.abort()

        await singleBuild({
          appConfig: config,
          ports: {
            emElements: [this.elementsPort],
            container: [this.containerPort],
          },
        })
      }
    )
  }
}

module.exports = SingleBuild
