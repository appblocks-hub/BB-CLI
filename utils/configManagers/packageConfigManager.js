const ConfigManager = require('./configManager')

/**
 * @type {}
 */
class PackageConfigManager extends ConfigManager {
  constructor(config, cwd) {
    super(config, cwd)
    this.isPackageConfigManager = true
  }

  get liveBlocks() {
    const filter = (block) => block.isOn
    return this.getDependencies(true, filter)
  }

  get liveJobBlocks() {
    const filter = (block) => block.isJobOn
    return this.getDependencies(true, filter)
  }

  get nonLiveBlocks() {
    const filter = (block) => !block.isOn
    return this.getDependencies(true, filter)
  }

  get uiBlocks() {
    const filter = (block) => ['ui-container', 'ui-elements', 'ui-dep-lib'].includes(block.meta.type)
    return this.getDependencies(false, filter)
  }

  get fnBlocks() {
    const filter = (block) => ['function'].includes(block.meta.type)
    return this.getDependencies(false, filter)
  }

  get sharedFnBlocks() {
    const filter = (block) => ['shared-fn'].includes(block.meta.type)
    return this.getDependencies(false, filter)
  }

  get jobBlocks() {
    const filter = (block) => ['job'].includes(block.meta.type)
    return this.getDependencies(false, filter)
  }

  get allBlockNames() {
    const picker = (block) => block.meta.name
    return this.getDependencies(false, null, picker)
  }

  get getAllBlockLanguages() {
    const picker = (block) => block.meta.language
    return this.getDependencies(false, null, picker)
  }

  get env() {
    if (this.config.env) return this.config.env
    return null
  }

  *getDependencies(includeLive, filter, picker) {
    if (!this.config?.dependencies) return []
    for (const block in this.config.dependencies) {
      if (Object.hasOwnProperty.call(this.config.dependencies, block)) {
        const d = includeLive ? this.getBlockWithLive(block) : this.getBlock(block)
        const f = filter || (() => true)
        const p = picker || ((b) => b)
        if (f(d(block))) yield p(d(block))
      }
    }
    return []
  }
}
module.exports = PackageConfigManager
