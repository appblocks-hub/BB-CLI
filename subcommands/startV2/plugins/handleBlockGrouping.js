/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */

// eslint-disable-next-line no-unused-vars
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
// eslint-disable-next-line no-unused-vars
const StartCore = require('../startCore')

class HandleBlockGrouping {
  async getAllBlocksToStart(core, packageManager, packageMiddleware = []) {
    const { blockType } = core.cmdArgs
    packageMiddleware = packageMiddleware.concat(packageManager.config.middlewares || [])

    for await (const blockManager of packageManager.getDependencies()) {
      if (!blockManager?.config) continue
      const { name, type } = blockManager.config
      if (type === 'package') {
        await this.getAllBlocksToStart(core, blockManager, packageMiddleware)
        core.subPackages[name] = blockManager
        continue
      }
      if (blockType && blockType !== type) continue

      if (blockManager.config.type === 'function') {
        let blockMiddlewares = blockManager.config.middlewares || []
        packageMiddleware.forEach(({ executeOnBlocks, middlewaresList }) => {
          if (!executeOnBlocks?.length || executeOnBlocks.includes(blockManager.config.name)) {
            blockMiddlewares = blockMiddlewares.concat(middlewaresList)
          }
        })
        core.middlewareBlockNames = [...new Set([...core.middlewareBlockNames, ...blockMiddlewares])]
        blockManager.config.middlewares = [...new Set(blockMiddlewares)]
      }

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

        await this.getAllBlocksToStart(core, core.packageManager, [])

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

        core.subPackages = {
          ...core.subPackages,
          *[Symbol.iterator]() {
            for (const packageBlock in this) {
              if (Object.hasOwnProperty.call(this, packageBlock)) {
                yield { packageBlock, packageManager: this[packageBlock] }
              }
            }
          },
        }

        if (!core.middlewareBlockNames?.length) return

        const filteredFnBlocks = []
        for (const { type, blocks } of core.blockStartGroups) {
          if (type !== 'function') continue

          for (const blockManager of blocks) {
            if (core.middlewareBlockNames.includes(blockManager.config.name)) {
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
