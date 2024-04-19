const { readJsonAsync } = require('..')
const BlockConfigManager = require('./blockConfigManager')
const PackageConfigManager = require('./packageConfigManager')
const ContainerizedPackageConfigManager = require('./containerizedPackageConfigManager')

class ConfigFactory {
  static cache = {}

  static async create(configPath) {
    if (this.cache[configPath]) return this.cache[configPath]
    const { data, err: _err } = await readJsonAsync(configPath)
    if (_err) {
      return {
        manager: null,
        error: {
          ..._err,
          message: _err.message,
          name: _err.name,
          code: _err.code,
          type: _err.code === 'ENOENT' ? 'OUT_OF_CONTEXT' : _err.code || _err.name,
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
    } else if (config.type === 'containerized') {
      manager = new ContainerizedPackageConfigManager(config, configPath)
    } else {
      manager = new BlockConfigManager(config, configPath)
    }

    await manager.init()

    return { manager, error: null }
  }
}

module.exports = ConfigFactory
