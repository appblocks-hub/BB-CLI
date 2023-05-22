const path = require('path')
const ConfigManager = require('./configManager')

class PackageConfigManager extends ConfigManager {
  constructor(config, cwd) {
    super(config, cwd)
    this.isPackageConfigManager = true
  }

  get liveBlocks() {
    const filter = ({ liveDetails }) => liveDetails.isOn
    return this.getDependencies(filter)
  }

  // get liveJobBlocks() {
  //   const filter = (block) => block.isJobOn
  //   return this.getDependencies(true, filter)
  // }

  get nonLiveBlocks() {
    const filter = (liveDetails) => !liveDetails.isOn
    return this.getDependencies(filter)
  }

  get uiBlocks() {
    const filter = ({ config }) => ['ui-container', 'ui-elements', 'ui-dep-lib'].includes(config.type)
    return this.getDependencies(filter)
  }

  get fnBlocks() {
    const filter = ({ config }) => ['function'].includes(config.type)
    return this.getDependencies(false, filter)
  }

  get sharedFnBlocks() {
    const filter = ({ config }) => ['shared-fn'].includes({ config }.type)
    return this.getDependencies(filter)
  }

  get jobBlocks() {
    const filter = ({ config }) => ['job'].includes(config.type)
    return this.getDependencies(filter)
  }

  get allBlockNames() {
    const picker = ({ config }) => config.name
    return this.getDependencies(null, picker)
  }

  get getAllBlockLanguages() {
    const picker = ({ config }) => config.language
    return this.getDependencies(null, picker)
  }

  get env() {
    if (this.config.env) return this.config.env
    return null
  }

  async addBlock(configPath) {
    // Dynamic import to avoid circular dependecy error
    // eslint-disable-next-line import/extensions
    const { default: _DYNAMIC_CONFIG_FACTORY } = await import('./configFactory.js')
    const { error, manager } = await _DYNAMIC_CONFIG_FACTORY.create(configPath)
    if (error) {
      const addBlockError = new Error(error.err.message)
      addBlockError.name = error.err.name
      return { manager: null, err: error }
    }
    this.config.dependencies[manager.config.name] = {
      directory: path.relative(this.directory, path.resolve(path.dirname(configPath))),
    }
    this.events.emit('write')
    return { manager, err: null }
  }

  async removeBlock(name) {
    if (!this.config.dependenciesname[name]) {
      return
    }
    delete this.config.dependencies[name]
    this.events.emit('write')
  }

  async *_getDependencies(filter, picker) {
    if (!this.config?.dependencies) return []
    // Dynamic import to avoid circular dependecy error
    // eslint-disable-next-line import/extensions
    const { default: _DYNAMIC_CONFIG_FACTORY } = await import('./configFactory.js')
    for (const block in this.config.dependencies) {
      if (Object.hasOwnProperty.call(this.config.dependencies, block)) {
        const { manager: c } = await _DYNAMIC_CONFIG_FACTORY.create(
          path.join(this.config.dependencies[block].directory, 'block.config.json')
        )
        const f = filter || (() => true)
        const p = picker || ((b) => b)
        if (f(c)) yield p(c)
      }
    }
    return []
  }
}
module.exports = PackageConfigManager
