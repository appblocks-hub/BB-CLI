const { EventEmitter } = require('stream')
const path = require('path')
const os = require('os')
const { readJsonAsync } = require('..')

const CONFIG_NAME = 'block.config.json'
const LIVE_CONFIG_NAME = '.block.live.json'
const LIVE_CONFIG_FILE_ROOT_PATH = os.tmpdir()

class ConfigManager {
  constructor(config) {
    // eslint-disable-next-line no-bitwise
    this.id = Math.floor(Math.random() * 10 ** 18 + (1 << (Math.random() * 90)))
    this.events = new EventEmitter()
    this.configname = CONFIG_NAME
    this.liveConfigname = LIVE_CONFIG_NAME
    this.liveConfigPath = this
    this._writeSignal = null
    this.configPath = ''
    this.directory = ''
    this.config = config

    this.events.on('write', this._write)
  }

  _write(path, data) {
    console.log(path, data)
  }

  findMyParentPackage = async (name, myPath, filename) => {
    let parentPackageFound = false
    let parentPackageConfig
    let currentPath = `${this.cwd}/${this.configname}`
    let parent = path.dirname(currentPath)
    for (; parent !== currentPath && !parentPackageFound; currentPath = parent, parent = path.dirname(parent)) {
      const { data, err } = await readJsonAsync(path.join(parent, filename))
      if (err) continue
      if (data.type !== 'package') continue
      if (!Object.prototype.hasOwnProperty.call(data.dependencies, name)) continue
      parentPackageFound = true
      parentPackageConfig = { ...data }
    }
    return {
      data: { parent, parentPackageConfig },
      err:
        currentPath === parent ? `Path exhausted! Couldn't find a package block with ${name} in dependencies` : false,
    }
  }

  updateConfig(newConfig) {
    this.config = Object.create(this.config, newConfig)
    return this.config
  }
}
module.exports = ConfigManager
