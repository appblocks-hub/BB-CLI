const ConfigManager = require('./configManager')

class BlockConfigManager extends ConfigManager {
  constructor(config, cwd) {
    super(config, cwd)
    this.isBlockConfigManager = true
  }

  get isLive() {
    return this.liveDetails?.isOn
  }

  // get  isUiBlock() {
  //   for (const block of this.uiBlocks) {
  //     if (block.meta.name === ) return true
  //   }
  //   return false
  // }
}

module.exports = BlockConfigManager
