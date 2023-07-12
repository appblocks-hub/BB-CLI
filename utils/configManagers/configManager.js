/* eslint-disable import/extensions */
const { EventEmitter } = require('stream')
const path = require('path')
const os = require('os')
const { writeFile, existsSync, mkdirSync } = require('fs')
const { readFile } = require('fs/promises')
const { readJsonAsync } = require('..')
const { BB_CONFIG_NAME } = require('../constants')
const { getBlockDetails } = require('../registryUtils')
const { getBBFolderPath, BB_FOLDERS } = require('../bbFolders')

class ConfigManager {
  constructor(config, configPath) {
    // eslint-disable-next-line no-bitwise
    this.id = Math.floor(Math.random() * 10 ** 18 + (1 << (Math.random() * 90)))
    this.events = new EventEmitter()
    this.configName = ConfigManager.CONFIG_NAME
    this.isWriting = false
    this.liveConfigName = ConfigManager.LIVE_CONFIG_NAME

    this._writeLiveSignal = null
    this._writeController = new AbortController()
    this._writeSignal = this._writeController.signal

    this.configPath = configPath
    this.config = config
    this.pathRelativeToParent = ''
    this.directory = path.dirname(configPath)
    this.liveConfigPath = path.join(
      ConfigManager.LIVE_CONFIG_FILE_ROOT_PATH,
      path.resolve(this.directory),
      '.block.live.json'
    )

    const logPath = getBBFolderPath(BB_FOLDERS.LOGS)
    const outLogPath = path.join(logPath, BB_FOLDERS.OUT, `${config.name}.log`)
    const errLogPath = path.join(logPath, BB_FOLDERS.ERR, `${config.name}.log`)

    this.liveDetails = {
      isOn: false,
      port: null,
      pid: null,
      log: { out: outLogPath, err: errLogPath },
    }

    this.events.on('write', () => this._write.call(this, this.configPath, this.config))
    this.events.on('writeLive', () => this._write.call(this, this.liveConfigPath, this.liveDetails))
  }

  static WRITE_COUNTER = 0

  static CONFIG_NAME = BB_CONFIG_NAME

  static LIVE_CONFIG_NAME = '.block.live.json'

  static LIVE_CONFIG_FILE_ROOT_PATH = path.join(os.tmpdir(), 'appblocks')

  async init() {
    try {
      const d = await readFile(this.liveConfigPath, 'utf8')
      const dc = JSON.parse(d)
      this.liveDetails = {
        ...dc,
      }
    } catch (err) {
      Promise.resolve()
    }
  }

  async getBlockId() {
    try {
      if (this.config.blockId) {
        return this.config.blockId
      }
      const resp = await getBlockDetails(this.config.name)
      if (resp.status === 204) throw new Error(`${this.config.name} doesn't exists in block repository`).message
      const { data } = resp
      if (data.err) {
        throw new Error('Something went wrong from our side\n', data.msg).message
      }
      return data.data.id
    } catch (err) {
      console.log(`Something went wrong while getting details of block:${this.config.name} -- ${err} `)
      return null
    }
  }

  _write(configPath, data) {
    ConfigManager.WRITE_COUNTER += 1
    if (this.writeLiveSignal && !this.writeLiveSignal.aborted) {
      this.writeController.abort()
    }
    // eslint-disable-next-line no-undef
    this.writeController = new AbortController()
    this.writeLiveSignal = this.writeController.signal

    const parentDir = path.dirname(configPath)
    if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true })

    writeFile(configPath, JSON.stringify(data, null, 2), { encoding: 'utf8', signal: this.writeLiveSignal }, (err) => {
      if (err && err.code !== 'ABORT_ERR') console.log(`Error writing live data \n ${err} \n`)
      if (err && err.name === 'AbortError') ConfigManager.WRITE_COUNTER -= 1
      if (!err) ConfigManager.WRITE_COUNTER -= 1
    })
  }

  findMyParentPackage = async () => {
    const filename = this.configName
    const { name } = this.config

    let parentPackageFound = false
    /**
     * @type {import('./configManager').PackageConfig?}
     */
    let parentPackageConfig
    /**
     * @type {string}
     */
    let currentPath = path.join(this.directory, this.configName)
    /**
     * @type {string} dir name of parent
     */
    let parent = path.dirname(currentPath)
    // Loop until path exhaustion or package block type hit
    for (; parent !== currentPath && !parentPackageFound; currentPath = parent, parent = path.dirname(parent)) {
      const { data, err } = await readJsonAsync(path.join(parent, filename))
      if (err) continue
      if (data.type !== 'package') continue
      if (!data.dependencies) continue
      if (!Object.prototype.hasOwnProperty.call(data.dependencies, name)) continue
      parentPackageFound = true
      parentPackageConfig = { ...data }
    }

    return {
      data: { parent, parentPackageConfig, parentPackageFound },
      err:
        currentPath === parent ? `Path exhausted! Couldn't find a package block with ${name} in dependencies` : false,
    }
  }

  /**
   *
   * @param {Number} tLevel
   * @returns
   */
  findMyParents = async (tLevel) => {
    let currentPath = path.join(this.directory)
    const parentManagers = []

    const { default: _DYNAMIC_CONFIG_FACTORY } = await import('./configFactory.js')

    let parent = path.dirname(currentPath)
    let err

    while (parent !== currentPath && !err) {
      const configPath = path.join(parent, this.configName)
      const { manager, error } = await _DYNAMIC_CONFIG_FACTORY.create(configPath)

      if (error && error.code !== 'ENOENT') {
        error.path = path.relative(path.resolve(), configPath)
        err = error
        continue
      }

      if (manager?.isPackageConfigManager) parentManagers.push(manager)

      parent = path.dirname(parent)

      if (tLevel != null && tLevel > 0) {
        // eslint-disable-next-line no-param-reassign
        if (Number.isNaN(tLevel)) tLevel -= 1
      }

      if ((tLevel != null && tLevel <= 0) || parent === '/') {
        currentPath = parent
      }
    }

    let rootManager = parentManagers.length > 0 ? parentManagers[0] : null
    if (!rootManager && this.isPackageConfigManager) rootManager = this

    return { err, parentManagers, rootManager }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    this.events.emit('write')
    return this.config
  }
}
module.exports = ConfigManager
