const { readJsonAsync } = require('..')
const BlockConfigManager = require('./blockConfigManager')
const PackageConfigManager = require('./packageConfigManager')

class ConfigFactory {
  constructor() {
    this.cache = {}
  }

  async create(configPath) {
    if (this.cache[configPath]) return this.cache[configPath]
    const { data, err: _err } = await readJsonAsync(configPath)
    /**
     * @type {import('../../types/configs.js').BlockConfig | import('../../types/configs.js').PackageConfig}
     */
    const config = data
    if (config.type === 'package') {
      /**
       * @type {}
       */
      return new PackageConfigManager(config)
    }
    return new BlockConfigManager(config, configPath)
  }
}

module.exports = ConfigFactory
