/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-async-promise-executor */
const { readFileSync, writeFile } = require('fs')
const path = require('path')
const { readdir, readFile, mkdir } = require('fs/promises')
const { tmpdir } = require('os')
const { EventEmitter } = require('events')
const { getBlockDetails } = require('./registryUtils')
const { getBlockDirsIn } = require('./fileAndFolderHelpers')

function debounce(func, wait, immediate) {
  let timeout

  return function executedFunction() {
    const context = this
    // eslint-disable-next-line prefer-rest-params
    const args = arguments

    // eslint-disable-next-line func-names
    const later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }

    const callNow = immediate && !timeout

    clearTimeout(timeout)

    timeout = setTimeout(later, wait)

    if (callNow) func.apply(context, args)
  }
}
/**
 * Expects to find a webpack config at the given path, reads and returns port set in devServer or 300
 * @param {String} dir Directory path to block
 * @returns {Number} Port Number
 */
const getPortFromWebpack = async (dir) => {
  let wb = ''
  // NOTE: Since webpack is mostly ESM, only way to import to
  // CJS(this is CJS) is to use dynamic import, CAN'T USE REQUIRE
  try {
    wb = await import(path.resolve(dir, 'webpack.config.js'))
  } catch (err) {
    // console.log(err)
    wb = { default: { devServer: { port: 3000 } } }
  }
  return wb.default.devServer.port || 3000
}
class AppblockConfigManager {
  constructor() {
    // eslint-disable-next-line no-bitwise
    this.Id = Math.floor(Math.random() * 10 ** 18 + (1 << (Math.random() * 90)))
    this.blockConfigName = 'block.config.json'
    this.configName = 'block.config.json'
    this.liveConfigName = '.block.live.json'
    this.liveDetails = {}
    this.cwd = '.'
    this.events = new EventEmitter()
    // this.events.on('write', () => this._write())
    this.events.on('write', debounce(this._write, 800).bind(this))
    // this.events.on('liveChanged', () => this._writeLive())
    this.events.on('liveChanged', debounce(this._writeLive, 800).bind(this))

    // this.events.on('updateBlockWrite', debounce(this._updateBlockWrite, 800).bind(this))

    this.config = ''
  }

  async tempSetup() {
    const tempConfig = {
      name: path.dirname('.'),
      source: {},
      type: 'temp_group',
      dependencies: {},
    }
    // await readFromTempDir()

    // reading and setting in temp dir

    const tempPath = tmpdir()

    this.isTempGroup = true
    this.tempGroupConfigName = 'temp_block_group_config.json'
    this.tempGroupLiveConfigName = '.temp_block_group_config.live.json'
    this.tempGroupConfigPath = path.join(tempPath, path.resolve(), this.tempGroupConfigName)
    this.tempGroupLiveConfigPath = path.join(tempPath, path.resolve(), this.tempGroupLiveConfigName)

    await mkdir(path.join(tempPath, path.resolve()), { recursive: true })

    let tempGroupConfig = null

    try {
      const s = await readFile(this.tempGroupConfigPath)
      tempGroupConfig = JSON.parse(s)
      this.config = tempGroupConfig
    } catch (err) {
      console.log('could not find a temp config')
    }

    try {
      if (!tempGroupConfig) {
        this.config = tempConfig
        const pr = (...args) => path.resolve(args[0], args[1])
        const fm = (p) => pr.bind(null, p)
        const allDirsInRoot = await readdir('.').then((l) => l.map(fm('.')))
        const bdirs = await getBlockDirsIn(allDirsInRoot)
        if (bdirs.length === 0) {
          this.events.emit('write')
        }
        for (let i = 0; i < bdirs.length; i += 1) {
          const d = await readFile(path.join(bdirs[i], 'block.config.json'))
          this.addBlock({
            directory: path.relative('.', bdirs[i]),
            meta: JSON.parse(d),
          })
        }
      }
    } catch (err) {
      console.log(err)
      process.exit()
    }
  }
  // ------------------------------ //
  // -----------GETTERS------------ //
  // ------------------------------ //

  get appConfig() {
    return this.getAppConfig()
  }

  get prefix() {
    if (this.config?.blockPrefix) return this.config.blockPrefix
    return ''
  }

  set prefix(val) {
    this.config.blockPrefix = val
  }

  get liveBlocks() {
    const filter = (block) => block.isOn
    return this.getDependencies(true, filter)
  }

  get nonLiveBlocks() {
    const filter = (block) => !block.isOn
    return this.getDependencies(true, filter)
  }

  get uiBlocks() {
    const filter = (block) => ['ui-container', 'ui-elements'].includes(block.meta.type)
    return this.getDependencies(false, filter)
  }

  get fnBlocks() {
    const filter = (block) => ['function'].includes(block.meta.type)
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

  set stopBlock(blockname) {
    const stop = {
      pid: null,
      isOn: false,
    }
    this.liveDetails[blockname] = { ...this.liveDetails[blockname], ...stop }
    this.events.emit('liveChanged')
  }

  set startedBlock({ name, pid, port, log }) {
    const start = {
      pid,
      port,
      isOn: true,
      ...(log && { log }),
    }
    this.liveDetails[name] = { ...this.liveDetails[name], ...start }
    this.events.emit('liveChanged')
  }

  async init(cwd, configName, subcmd) {
    if (this.config) {
      return
    }
    this.configName = configName || 'block.config.json'
    this.cwd = cwd || '.'
    this.subcmd = subcmd || null

    // console.log(path.resolve(this.cwd, this.configName))

    try {
      this.readAppblockConfig()
      // console.log('Config Read:')
      // console.log(this.config)
      // console.log('\n')

      if (!this.config) {
        await this.tempSetup()
      }

      await this.readLiveAppblockConfig()
      // console.log('Live Config Read:')
      // console.log(this.liveDetails)
      // console.log('\n')
    } catch (err) {
      console.log(err.message)
      process.exit(1)
    }
  }

  readAppblockConfig() {
    try {
      // console.log(`Trying to read config file from ${path.resolve(this.cwd)}`)
      this.config = JSON.parse(readFileSync(path.resolve(this.cwd, this.configName)))
      // console.log('Config read ')
    } catch (err) {
      if (err.code === 'ENOENT') {
        // if (this.subcmd === 'create' || this.subcmd === 'pull') {
        //   const eOutofContext = new Error(`Couldnt find config file in ${path.resolve(this.cwd)}`)
        //   eOutofContext.name = 'OUTOFCONTEXT'
        //   throw eOutofContext
        // } else {
        //   throw new Error(`Couldnt find config file in ${path.resolve(this.cwd)}`)
        // }
        this.isOutOfContext = true
      }
    }
  }

  async readLiveAppblockConfig() {
    try {
      let existingLiveConfig
      if (this.isTempGroup) {
        existingLiveConfig = JSON.parse(readFileSync(this.tempGroupLiveConfigPath))
      } else {
        existingLiveConfig = JSON.parse(readFileSync(path.resolve(this.cwd, this.liveConfigName)))
      }
      for (const block of this.dependencies) {
        // TODO -- if there are more blocks in liveconfig json,
        // Log the details and if they are on, kill the processes
        const {
          meta: { name, type },
        } = block
        if (existingLiveConfig[name]) {
          // console.log(`${name} exists in live as well:`)
          // console.log('\n')
          const { log, isOn, pid, port } = existingLiveConfig[name]
          this.liveDetails[name] = {
            log: log || {
              out: `./logs/out/${name}.log`,
              err: `./logs/err/${name}.log`,
            },
            isOn: isOn || false,
            pid: pid || null,
            port: port || null,
          }
        } else {
          // console.log(
          //   `Existing live config doesn't have details of ${block.meta.name}`
          // )
          let p = 3000
          if (this.isUiBlock(name)) {
            p = await getPortFromWebpack(this.getBlock(name).directory)
          }
          this.liveDetails[name] = {
            log: {
              out: `./logs/out/${name}.log`,
              err: `./logs/err/${name}.log`,
            },
            isOn: false,
            pid: null,
            port: p,
          }
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('Couldnt find live config')
        // throw new Error(`Couldnt find liveconfig file in ${this.cwd}`)
        let entryCount = 0
        for await (const blockname of this.allBlockNames) {
          entryCount += 1
          let p = 3000
          if (this.isUiBlock(blockname)) {
            p = await getPortFromWebpack(this.getBlock(blockname).directory)
          }
          // console.log(p)
          this.liveDetails[blockname] = {
            log: {
              out: `./logs/out/${blockname}.log`,
              err: `./logs/err/${blockname}.log`,
            },
            isOn: false,
            port: p,
            pid: null,
          }
        }
        if (entryCount) {
          console.log('formed livedata and updating to live data file...')
          await this._writeLive()
        }
      }
    }
  }

  _createLiveConfig() {
    const liveConfig = {}
    for (const block of this.dependencies) {
      liveConfig[block.meta.name] = {
        ...block,
        ...this.liveDetails[block.meta.name],
      }
    }
    return liveConfig
  }

  _writeLive() {
    // if (this.writeLiveSignal && !this.writeLiveSignal.aborted) {
    //   this.writeController.abort()
    // }
    // eslint-disable-next-line no-undef
    // this.writeController = new AbortController()
    // this.writeLiveSignal = this.writeController.signal
    const p = this.isTempGroup ? this.tempGroupLiveConfigPath : path.resolve(this.cwd, this.liveConfigName)
    writeFile(p, JSON.stringify(this._createLiveConfig(), null, 2), { encoding: 'utf8' }, (err) => {
      if (err && err.code !== 'ABORT_ERR') console.log('Error writing live data ', err)
    })
  }

  /**
   *
   */
  _write() {
    // if (this.writeSignal && !this.writeSignal.aborted) {
    //   // console.log('Previous write in progress, aborting')
    //   this.writeController.abort()
    // }
    // eslint-disable-next-line no-undef
    // this.writeController = new AbortController()
    // this.writeSignal = this.writeController.signal
    const p = this.isTempGroup ? this.tempGroupConfigPath : path.resolve(this.cwd, this.configName)
    writeFile(p, JSON.stringify(this.config, null, 2), { encoding: 'utf8' }, (_) => _)
  }

  /**
   * Write emiter for update block in block config and appblock config
   */
  async _updateBlockWrite(blockDir, blockMeta) {
    const p = this.isTempGroup ? this.tempGroupConfigPath : path.resolve(this.cwd, this.configName)
    // Update appblock config
    return new Promise((resolve) => {
      writeFile(p, JSON.stringify(this.config, null, 2), { encoding: 'utf8' }, () => {
        // Update block config
        writeFile(
          path.resolve(blockDir, this.blockConfigName),
          JSON.stringify(blockMeta, null, 2),
          { encoding: 'utf8' },
          () => {
            resolve(true)
          }
        )
      })
    })
  }

  /**
   *
   * @returns
   */
  getAppConfig() {
    return this.config
  }

  /**
   *
   * @param {*} blockConfig
   */
  addBlock(blockConfig) {
    // TODO -- use a validation function to validate blockObj
    this.config.dependencies = { ...this.config.dependencies } // to initialize object if it is undefined
    this.config.dependencies[blockConfig.meta.name] = { ...blockConfig }
    this.events.emit('write')
  }

  /**
   *
   * @param {*} updateConfigData
   */
  updateBlock(name, updateConfigData) {
    return new Promise(async (resolve) => {
      this.config.dependencies = { ...this.config.dependencies }
      const { directory, meta } = this.config.dependencies[name]
      const newBlockConfigData = { ...meta, ...updateConfigData }
      this.config.dependencies[name].meta = newBlockConfigData
      await this._updateBlockWrite(directory, newBlockConfigData)
      resolve(true)
    })
  }

  /**
   *
   * @param {String} blockName
   */
  // eslint-disable-next-line class-methods-use-this
  getBlockId(blockName) {
    return new Promise(async (resolve) => {
      try {
        const resp = await getBlockDetails(blockName)
        if (resp.status === 204) throw new Error(`${blockName} doesn't exists in block repository`).message

        const { data } = resp
        if (data.err) {
          throw new Error('Something went wrong from our side\n', data.msg).message
        }

        resolve(data.data.ID)
      } catch (err) {
        console.log(`Something went wrong while getting details of block:${blockName} -- ${err} `)
        resolve(null)
        process.exit(1)
      }
    })
  }

  /**
   *
   * @param {*} updateConfigData
   */
  updateAppBlock(updateConfigData) {
    this.config = { ...this.config, ...updateConfigData }
    this.events.emit('write')
  }

  get dependencies() {
    return this.getDependencies(false)
  }

  /**
   *
   * @param {Boolean} includeLive To include live details of block in final result
   * @param {Function} filter
   * @param {Function} picker
   * @returns
   */
  *getDependencies(includeLive, filter, picker) {
    if (this.config?.dependencies) {
      for (const block in this.config.dependencies) {
        if (Object.hasOwnProperty.call(this.config.dependencies, block)) {
          const blockDetails = includeLive ? this.getBlockWithLive(block) : this.getBlock(block)
          if (filter) {
            if (filter(blockDetails)) {
              if (picker) {
                yield picker(blockDetails)
              } else {
                yield blockDetails
              }
            }
          } else if (picker) {
            yield picker(blockDetails)
          } else {
            yield blockDetails
          }
        }
      }
    } else {
      return []
    }
    return []
  }

  /**
   * Returns Null if block is not found, else details
   * @param {String} blockName Name of block
   * @returns {Null|Object} Block details
   */
  getBlock(blockName) {
    if (!this.config?.dependencies) return null
    const {
      config: { dependencies },
    } = this
    if (dependencies[blockName]) {
      return dependencies[blockName]
    }
    return null
  }

  /**
   * To check if App has a block registered in given name
   * @param {String} block A block name
   * @returns {Boolean} True if block exists, else False
   */
  has(block) {
    return !!this.config.dependencies[block]
  }

  /**
   * To check if the given block is live or not
   * @param {String} block A block name
   * @returns {Boolean} True if block is live, else False
   */
  isLive(block) {
    return this.liveDetails[block]?.isOn
  }

  /**
   * To check if a block is a ui block or not (Doesn't check for existence)
   * @param {String} blockname Name of block to check if UI block
   * @returns {Boolean}
   */
  isUiBlock(blockname) {
    for (const block of this.uiBlocks) {
      if (block.meta.name === blockname) return true
    }
    return false
  }

  /**
   *
   * @param {String} blockname A block name
   * @returns {Object}
   */
  getBlockWithLive(blockname) {
    return { ...this.getBlock(blockname), ...this.getLiveDetailsof(blockname) }
  }

  /**
   *
   * @param {*} blockname
   * @returns
   */
  getLiveDetailsof(blockname) {
    return this.liveDetails[blockname]
  }

  /**
   * To get the current appblock
   * @returns {String} Name of Appblock
   */
  getName() {
    return this.config.name || ''
  }

  getStatus() {
    console.log(this)
  }
}

module.exports = { AppblockConfigManager }
