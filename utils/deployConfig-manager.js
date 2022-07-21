const { readFileSync, writeFileSync, existsSync } = require('fs')
const { EventEmitter } = require('events')
const path = require('path')

/**
 * DeployblockConfigManager
 */

class DeployblockConfigManager {
  constructor() {
    // eslint-disable-next-line no-bitwise
    this.configName = 'app.config.json'
    this.config = {}
    this.cwd = '.'

    this.events = new EventEmitter()
    this.events.on('write', () => this._write())

    // this.init()
  }

  // ------------------------------ //
  // -----------GETTERS------------ //
  // ------------------------------ //

  get deployAppConfig() {
    if (this.config) return this.config
    return null
  }

  get uiBlocks() {
    const filter = (block) => ['ui-container', 'ui-elements'].includes(block.meta.type)
    return this.getDependencies(false, filter)
  }

  get allBlockNames() {
    const picker = (block) => block.meta.name
    return this.getDependencies(false, null, picker)
  }

  get env() {
    if (this.config.env) return this.config.env
    return null
  }

  // ------------------------------ //
  // -----------SETTERS------------ //
  // ------------------------------ //

  set env(envObj) {
    if (typeof envObj === 'object') this.config.env = { ...envObj }
    else {
      throw new TypeError(`Expected env to be an Object, received env is of type ${typeof envObj}`)
    }
  }

  set createDeployConfig(data) {
    try {
      this.config = data
      this.events.emit('write')
    } catch (error) {
      console.log('Error creating app')
    }
  }

  init(cwd, configName) {
    if (Object.keys(this.config)?.length) return

    this.configName = configName || this.configName
    this.cwd = cwd || '.'

    try {
      this.readDeployAppConfig()
    } catch (err) {
      console.log(err.message)
      process.exit(1)
    }
  }

  set upsertDeployConfig({ name, data }) {
    if (!name) this.config = data
    else this.config = { ...this.config, [name]: data }
    this.events.emit('write')
  }

  readDeployAppConfig() {
    try {
      // console.log(`Trying to read config file from ${path.resolve(this.cwd)}`)
      this.config = JSON.parse(readFileSync(path.resolve(this.cwd, this.configName)))
    } catch (err) {
      if (err.code === 'ENOENT') {
        if (!existsSync(path.resolve(this.cwd, 'appblock.config.json'))) {
          throw new Error(`Please init block or run the command in root folder of your app `)
        }
      }
      this.events.emit('write')
    }
  }

  _write() {
    try {
      writeFileSync(path.resolve(this.cwd, this.configName), JSON.stringify(this.config, null, 2))
    } catch (err) {
      console.log('Error creating app.config.json')
    }
  }
}

const deployblockConfigManager = new DeployblockConfigManager()
module.exports = deployblockConfigManager
