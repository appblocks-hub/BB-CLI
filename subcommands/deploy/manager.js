const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { EventEmitter } = require('events')
const path = require('path')
const { getOnPremConfigDetails } = require('./onPrem/util')
const { isEmptyObject } = require('../../utils')
const { BB_CONFIG_NAME } = require('../../utils/constants')

/**
 * DeployblockConfigManager
 */

class DeployblockConfigManager {
  constructor() {
    // eslint-disable-next-line no-bitwise
    this.configName = 'app.config.json'
    this.config = {}
    this.cwd = '.'

    this.onPremDeployContentBackupFolder = '.deploy/on_prem'
    this.onPremDeployConfigFile = 'deploy.config.json'
    this.onPremDeployedContentFile = '.deployed.config.json'

    this.events = new EventEmitter()
    this.events.on('write', (options) => this._write(options))

    // this.init()
  }

  async syncOnPremDeploymentConfig(options) {
    let onPremDeployConfig = await this.readOnPremDeployConfig
    if (!isEmptyObject(onPremDeployConfig) || options.configName) return onPremDeployConfig

    onPremDeployConfig = await getOnPremConfigDetails(options)
    this.writeOnPremDeployConfig({
      [onPremDeployConfig.name]: onPremDeployConfig,
    })

    return { [onPremDeployConfig.name]: onPremDeployConfig }
  }

  async createOnPremDeploymentConfig(options) {
    const onPremDeployConfig = await getOnPremConfigDetails(options)
    this.writeOnPremDeployConfig({
      ...this.onPremDeployConfig,
      [onPremDeployConfig.name]: onPremDeployConfig,
    })
    return onPremDeployConfig
  }

  get deployAppConfig() {
    if (this.config) return this.config
    return null
  }

  get readOnPremDeployConfig() {
    if (!isEmptyObject(this.onPremDeployConfig)) return this.onPremDeployConfig

    const filePath = path.resolve(this.cwd, this.onPremDeployConfigFile)
    if (!existsSync(filePath)) return {}
    this.onPremDeployConfig = JSON.parse(readFileSync(filePath))

    return this.onPremDeployConfig
  }

  writeOnPremDeployConfig(config) {
    this.onPremDeployConfig = config
    this.events.emit('write', { filePath: this.onPremDeployConfigFile, data: config })
  }

  get readOnPremDeployedConfig() {
    if (!isEmptyObject(this.onPremDeployedConfig)) return this.onPremDeployedConfig

    const filePath = path.resolve(this.cwd, this.onPremDeployedContentFile)
    if (!existsSync(filePath)) return {}
    this.onPremDeployedConfig = JSON.parse(readFileSync(filePath))

    return this.onPremDeployedConfig
  }

  writeOnPremDeployedConfig({ config, name }) {
    if (isEmptyObject(this.onPremDeployedConfig)) this.onPremDeployedConfig = this.readOnPremDeployedConfig

    if (!name) return

    this.onPremDeployedConfig = {
      ...this.onPremDeployedConfig,
      [name]: config,
    }

    this.events.emit('write', { filePath: this.onPremDeployedContentFile, data: this.onPremDeployedConfig })
  }

  get uiBlocks() {
    const filter = (block) => ['ui-container', 'ui-elements'].includes(block.meta.type)
    return this.getDependencies(false, filter)
  }

  get allBlockNames() {
    const picker = (block) => block.meta.name
    return this.getDependencies(false, null, picker)
  }

  getOnPremDeployContentBackupFolder(options) {
    const { suffix } = options
    let folderPath = path.resolve(this.cwd, this.onPremDeployContentBackupFolder)
    if (suffix) folderPath = path.join(folderPath, suffix)
    if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true })
    return folderPath
  }

  get env() {
    if (this.config.env) return this.config.env
    return null
  }

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
        if (!existsSync(path.resolve(this.cwd, BB_CONFIG_NAME))) {
          throw new Error(`Please init block or run the command in root folder of your app `)
        }
      }
      this.events.emit('write')
    }
  }

  _write(options) {
    try {
      const { filePath, data } = options || {}
      const filePathValue = filePath || this.configName
      const saveValue = data || this.config
      writeFileSync(path.resolve(this.cwd, filePathValue), JSON.stringify(saveValue, null, 2))
    } catch (err) {
      console.log('Error creating app.config.json')
    }
  }
}

const deployblockConfigManager = new DeployblockConfigManager()
module.exports = deployblockConfigManager
