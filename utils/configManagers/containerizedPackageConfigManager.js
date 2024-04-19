const ConfigManager = require('./configManager')

class ContainerizedPackageConfigManager extends ConfigManager {
  constructor(config, cwd) {
    super(config, cwd)
    this.isContainerizedPackageConfigManager = true
  }

  get isLive() {
    return this.liveDetails?.isOn
  }

  updateLiveConfig(newConfig) {
    this.liveDetails = { ...this.liveDetails, ...newConfig }
    this.events.emit('writeLive')
    return this.liveDetails
  }

  updatePortConfig(portConfig) {
    this.availablePort = portConfig.availablePort
    this.portKey = portConfig.key
  }
}

module.exports = ContainerizedPackageConfigManager
