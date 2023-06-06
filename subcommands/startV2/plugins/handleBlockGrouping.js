/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */

// eslint-disable-next-line no-unused-vars
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
// eslint-disable-next-line no-unused-vars
const StartCore = require('../startCore')

class HandleBlockGrouping {
  async getAllBlocksToStart(core, packageManager) {
    const { blockType } = core.cmdArgs
    for await (const blockManager of packageManager.getDependencies()) {
      if (!blockManager?.config) continue
      const { name, type } = blockManager.config
      if (type === 'package') {
        await this.getAllBlocksToStart(core, blockManager)
        core.subPackages[name] = blockManager
        continue
      }
      if (blockType && blockType !== type) continue
      core.blocksToStart[name] = blockManager
    }
  }

  apply(startCore) {
    startCore.hooks.beforeStart.tapPromise(
      'HandleBlockGrouping',
      async (
        /**
         * @type {StartCore}
         */
        core
      ) => {
        const { blockName } = core.cmdArgs
        core.blocksToStart = {}

        if (blockName) {
          const blockManager = await core.packageManager.getBlock(blockName)

          if (blockManager.config.type !== 'package') {
            core.blocksToStart = {
              [blockName]: blockManager,
              *[Symbol.iterator]() {
                for (const block in this) {
                  if (Object.hasOwnProperty.call(this, block)) {
                    yield { block, blockManager: this[block] }
                  }
                }
              },
            }
            core.blockStartGroups = {
              [blockManager.config.type]: [blockManager],
              *[Symbol.iterator]() {
                for (const type in this) {
                  if (Object.hasOwnProperty.call(this, type)) {
                    yield { type, blocks: this[type] }
                  }
                }
              },
            }
            return
          }

          core.packageManager = blockManager
        }

        await this.getAllBlocksToStart(core, core.packageManager)

        core.blocksToStart = {
          ...core.blocksToStart,
          *[Symbol.iterator]() {
            for (const block in this) {
              if (Object.hasOwnProperty.call(this, block)) {
                yield { block, blockManager: this[block] }
              }
            }
          },
        }

        for (const { blockManager } of core.blocksToStart) {
          if (!core.blockStartGroups[blockManager.config.type]) core.blockStartGroups[blockManager.config.type] = []
          core.blockStartGroups[blockManager.config.type].push(blockManager)
        }

        core.blockStartGroups = {
          ...core.blockStartGroups,
          *[Symbol.iterator]() {
            for (const type in this) {
              if (Object.hasOwnProperty.call(this, type)) {
                yield { type, blocks: this[type] }
              }
            }
          },
        }

        // grouping middleware for blocks
        this.middlewares = []
        for (const { type, blocks } of core.blockStartGroups) {
          if (type !== 'function') continue

          const packageConfigMiddlewares = core.packageConfig.middlewares || []

          const blockLevelPack = {}
          for (const { middlewaresList, executeOnBlocks } of packageConfigMiddlewares) {
            if (Array.isArray(middlewaresList)) {
              this.middlewares = [...new Set(this.middlewares.concat(middlewaresList))]
            }

            for (const blockManager of blocks) {
              const bName = blockManager.config.name
              if (middlewaresList?.length <= 0) continue
              if (!blockLevelPack[bName]) blockLevelPack[bName] = []
              if (Array.isArray(executeOnBlocks) && executeOnBlocks.length > 0 && !executeOnBlocks.includes(bName)) {
                continue
              }
              blockLevelPack[bName] = blockLevelPack[bName].concat(middlewaresList)
            }
          }

          for (const blockManager of blocks) {
            const blockMiddlewaresList = blockManager.config.middlewares
            const bName = blockManager.config.name

            let newMiddlewares = blockLevelPack[bName] || []
            if (Array.isArray(blockMiddlewaresList) && blockMiddlewaresList.length) {
              this.middlewares = [...new Set(this.middlewares.concat(blockMiddlewaresList))]
              newMiddlewares = newMiddlewares.concat(blockMiddlewaresList)
            }

            blockManager.config.middlewares = newMiddlewares
          }
        }

        // filter middleware  blocks
        if (this.middlewares.length <= 0) return

        const filteredFnBlocks = []
        for (const { type, blocks } of core.blockStartGroups) {
          if (type !== 'function') continue

          for (const blockManager of blocks) {
            if (this.middlewares.includes(blockManager.config.name)) {
              core.middlewareBlockList.push(blockManager)
              continue
            }

            filteredFnBlocks.push(blockManager)
          }

          core.blockStartGroups[type] = filteredFnBlocks
        }
      }
    )
  }
}
module.exports = HandleBlockGrouping
