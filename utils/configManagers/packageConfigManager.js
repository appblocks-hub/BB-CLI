const path = require('path')
const chalk = require('chalk')
const ConfigManager = require('./configManager')

class PackageConfigManager extends ConfigManager {
  constructor(config, cwd) {
    super(config, cwd)
    this.isPackageConfigManager = true
  }

  async liveBlocks() {
    const filter = ({ liveDetails }) => liveDetails.isOn
    const res = []
    for await (const name of this.getDependencies(filter)) res.push(name)
    return res
  }

  async nonLiveBlocks() {
    const filter = ({ liveDetails }) => !liveDetails.isOn
    const res = []
    for await (const name of this.getDependencies(filter)) res.push(name)
    return res
  }

  async uiBlocks() {
    const filter = ({ config }) => ['ui-container', 'ui-elements', 'ui-dep-lib'].includes(config.type)
    const res = []
    for await (const name of this.getDependencies(filter)) res.push(name)
    return res
  }

  async fnBlocks() {
    const filter = ({ config }) => ['function'].includes(config.type)
    const res = []
    for await (const name of this.getDependencies(filter)) res.push(name)
    return res
  }

  async sharedFnBlocks() {
    const filter = ({ config }) => ['shared-fn'].includes({ config }.type)
    const res = []
    for await (const name of this.getDependencies(filter)) res.push(name)
    return res
  }

  async allBlockNames() {
    const picker = ({ config }) => config.name
    const res = []
    for await (const name of this.getDependencies(null, picker)) res.push(name)
    return res
  }

  async getAllBlockLanguages() {
    const picker = ({ config }) => config.language
    const res = []
    for await (const name of this.getDependencies(null, picker)) res.push(name)
    return res
  }

  async addBlock(configPath) {
    // Dynamic import to avoid circular dependency error
    // eslint-disable-next-line import/extensions
    const { default: _DYNAMIC_CONFIG_FACTORY } = await import('./configFactory.js')
    const { error, manager } = await _DYNAMIC_CONFIG_FACTORY.create(configPath)

    if (error) {
      const addBlockError = new Error(error.message)
      addBlockError.name = error.name || error.type
      return { manager: null, err: error }
    }

    if (!this.config.dependencies) this.config.dependencies = {}

    this.config.dependencies[manager.config.name] = {
      directory: path.relative(this.directory, path.resolve(path.dirname(configPath))),
    }
    this.events.emit('write')
    return { manager, err: null }
  }

  async removeBlock(name) {
    if (!this.config.dependencies[name]) {
      return this.config
    }
    delete this.config.dependencies[name]
    this.events.emit('write')
    return this.config
  }

  /**
   * To check if App has a block registered in given name
   * @param {String} block A block name
   * @returns {Boolean} True if block exists, else False
   */
  has(block) {
    return !!this.config.dependencies?.[block]
  }

  async getBlock(name) {
    const filter = ({ config }) => config.name === name
    const res = []
    for await (const block of this.getDependencies(filter)) res.push(block)
    return res[0]
  }

  async *getDependencies(filter, picker) {
    if (!this.config?.dependencies) return []
    // Dynamic import to avoid circular dependency error
    // eslint-disable-next-line import/extensions
    const { default: _DYNAMIC_CONFIG_FACTORY } = await import('./configFactory.js')
    for (const block in this.config.dependencies) {
      if (Object.hasOwnProperty.call(this.config.dependencies, block)) {
        const relativeDirectory = this.config.dependencies[block].directory
        const configPath = path.join(this.directory, relativeDirectory, 'block.config.json')
        const { manager: c, error } = await _DYNAMIC_CONFIG_FACTORY.create(configPath)
        if (error) console.warn(chalk.yellow(`Error getting block config for ${block}`))
        const f = filter || (() => true)
        const p = picker || ((b) => b)
        if (f(c)) yield p(c)
      }
    }
    return []
  }
}
module.exports = PackageConfigManager
