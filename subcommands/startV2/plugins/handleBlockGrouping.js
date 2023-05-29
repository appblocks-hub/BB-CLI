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
      }
    )
  }
}
module.exports = HandleBlockGrouping
