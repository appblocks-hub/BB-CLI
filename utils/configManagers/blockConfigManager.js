const ConfigManager = require('./configManager')

class BlockConfigManager extends ConfigManager {
  constructor(config, cwd) {
    super(config, cwd)
    this.isBlockConfigManager = true
  }

  get isLive() {
    return this.liveDetails?.isOn
  }

  updateLiveConfig(newConfig) {
    this.liveDetails = { ...this.liveDetails, ...newConfig }
    this.events.emit('writeLive')
    return this.liveDetails
  }

  updatePortConfig(newConfig) {
    Object.entries(newConfig).forEach(([name, value]) => {
      this[name] = value
    })
  }
}

module.exports = BlockConfigManager
