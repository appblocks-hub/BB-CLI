const ConfigManager = require('./configManager')

class BlockConfigManager extends ConfigManager {
  constructor(config, cwd) {
    super(config, cwd)
    this.isBlockConfigManager = true
  }
}

module.exports = BlockConfigManager
