const path = require('path')
const chalk = require('chalk')
const ConfigManager = require('./configManager')
const { BB_CONFIG_NAME } = require('../constants')

class PackageConfigManager extends ConfigManager {
  constructor(config, cwd) {
    super(config, cwd)
    this.isPackageConfigManager = true
  }

  async liveBlocks(tLevel) {
    const filter = ({ liveDetails }) => liveDetails.isOn
    const res = await this._traverseManager(tLevel)
    return res.filter(filter)
  }

  async nonLiveBlocks(tLevel) {
    const filter = ({ liveDetails }) => !liveDetails.isOn
    const res = await this._traverseManager(tLevel)
    return res.filter(filter)
  }

  async uiBlocks(tLevel) {
    const filter = ({ config }) => ['ui-container', 'ui-elements', 'ui-dep-lib'].includes(config.type)
    const res = await this._traverseManager(tLevel)
    return res.filter(filter)
  }

  async fnBlocks(tLevel) {
    const filter = ({ config }) => ['function'].includes(config.type)
    const res = await this._traverseManager(tLevel)
    return res.filter(filter)
  }

  async sharedFnBlocks(tLevel) {
    const filter = ({ config }) => ['shared-fn'].includes({ config }.type)
    const res = await this._traverseManager(tLevel)
    return res.filter(filter)
  }

  async allBlockNames(tLevel) {
    const picker = ({ config }) => config.name
    const res = await this._traverseManager(tLevel)
    return res.map(picker)
  }

  async getAllBlockLanguages(tLevel) {
    const picker = ({ config }) => config.language
    const res = await this._traverseManager(tLevel)
    return res.map(picker)
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

  updateConfigDependencies(newDependency) {
    this.config.dependencies = { ...this.config.dependencies, ...newDependency }
    this.events.emit('write')
    return this.config
  }

  has(block) {
    return !!this.config.dependencies?.[block]
  }

  async getBlock(name) {
    const filter = ({ config }) => config.name === name
    const res = []
    for await (const block of this.getDependencies(filter)) res.push(block)
    return res[0]
  }

  async getAnyBlock(name, tLevel) {
    const filter = ({ config }) => config.name === name
    const res = await this._traverseManager(tLevel, true)
    return res.filter(filter)[0]
  }

  async getAllLevelAnyBlock() {
    const res = await this._traverseManager(null, true)
    return res
  }

  async getAllLevelMemberBlock() {
    const res = await this._traverseManager(null)
    return res
  }

  async _traverseManager(tLevel, includeSubPack) {
    let res = []
    for await (const manager of this.getDependencies()) {
      const shouldTraverse = tLevel == null || tLevel > 0
      if (manager instanceof PackageConfigManager) {
        if (!shouldTraverse) continue
        const nextTraverseLevel = shouldTraverse != null ? tLevel - 1 : null
        if (includeSubPack) res.push(manager)
        const children = await manager._traverseManager(nextTraverseLevel, includeSubPack)
        res = res.concat(children)
      } else res.push(manager)
    }
    return res
  }

  async *getDependencies(filter, picker) {
    if (!this.config?.dependencies) return []
    // Dynamic import to avoid circular dependency error
    // eslint-disable-next-line import/extensions
    const { default: _DYNAMIC_CONFIG_FACTORY } = await import('./configFactory.js')
    for (const block in this.config.dependencies) {
      if (Object.hasOwnProperty.call(this.config.dependencies, block)) {
        const relativeDirectory = this.config.dependencies[block].directory
        const configPath = path.join(this.directory, relativeDirectory, BB_CONFIG_NAME)
        const { manager: c, error } = await _DYNAMIC_CONFIG_FACTORY.create(configPath)
        c.pathRelativeToParent = relativeDirectory
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
