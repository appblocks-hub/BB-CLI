const { readJsonAsync } = require('..')
const BlockConfigManager = require('./blockConfigManager')
const PackageConfigManager = require('./packageConfigManager')

class ConfigFactory {
  static cache = {}

  static async create(configPath) {
    if (this.cache[configPath]) return this.cache[configPath]
    const { data, err: _err } = await readJsonAsync(configPath)
    if (_err) {
      return {
        manager: null,
        error: {
          type: _err.name === 'ENOENT' ? 'OUTOFCONTEXT' : _err.name,
          msg: _err.message,
        },
      }
    }
    /**
     * @type {import('../../types/configs.js').BlockConfig | import('../../types/configs.js').PackageConfig}
     */
    const config = data
    let manager = null
    if (config.type === 'package') {
      manager = new PackageConfigManager(config, configPath)
    } else {
      manager = new BlockConfigManager(config, configPath)
    }
    await manager.init()

    return { manager, error: null }
  }
}

module.exports = ConfigFactory
