/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-async-promise-executor */
const { readFileSync, writeFile, existsSync } = require('fs')
const path = require('path')
const { readdir, readFile, mkdir } = require('fs/promises')
const { tmpdir } = require('os')
const { EventEmitter } = require('events')
const isRunning = require('is-running')
const { getBlockDetails } = require('./registryUtils')
const { getBlockDirsIn } = require('./fileAndFolderHelpers')
const { lrManager } = require('./locaRegistry/manager')

// eslint-disable-next-line no-unused-vars
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
    this.lrManager = lrManager

    this.isGlobal = false

    // this.events.on('write', () => this._write())
    this.events.on('write', () => {
      this._write()
      // debounce(this._write, 800).bind(this)
    })
    // this.events.on('liveChanged', () => this._writeLive())
    this.events.on('liveChanged', () => {
      // debounce(this._writeLive, 800).bind(this)
      this._writeLive()
    })

    // this.events.on('updateBlockWrite', debounce(this._updateBlockWrite, 800).bind(this))

    this.config = ''

    // tmp
    // this.tempGroupConfigName = 'temp_block_group_config.json'
    // this.tempGroupLiveConfigName = '.temp_block_group_config.live.json'
  }

  /**
   * Set up the live config path, based on cwd.
   * This is only called if command has no global flag
   */
  async liveConfigSetup() {
    const _p = path.join(tmpdir(), path.resolve(this.cwd))
    this.liveConfigPath = path.join(_p, this.liveConfigName)
    await mkdir(_p, { recursive: true })
  }

  /**
   * @deprecated
   */
  async tempSetup() {
    const tempConfig = {
      name: path.dirname(path.resolve()),
      source: {},
      type: 'temp_group',
      dependencies: {},
    }
    // await readFromTempDir()

    // reading and setting in temp dir

    const tempPath = tmpdir()

    this.isTempGroup = !this.isInAppblockContext
    this.tempGroupConfigPath = path.join(tempPath, path.resolve(), this.tempGroupConfigName)
    this.tempGroupLiveConfigPath = path.join(tempPath, path.resolve(), this.tempGroupLiveConfigName)

    await mkdir(path.join(tempPath, path.resolve()), { recursive: true })

    let tempGroupConfig = null

    try {
      const s = await readFile(this.tempGroupConfigPath)
      tempGroupConfig = JSON.parse(s)
      this.config = tempGroupConfig
    } catch (err) {
      // error
    }

    try {
      if (!tempGroupConfig && !this.isInAppblockContext) {
        this.config = tempConfig
        const pr = (...args) => path.resolve(args[0], args[1])
        const fm = (p) => pr.bind(null, p)
        let bdirs
        if (this.isOutOfContext) {
          // if we are out of any block context, scan and create group config in /tmp
          // If we are running push from inside the block we want to push
          // set the directory list to contain only current directory
          const allDirsInRoot = await readdir('.').then((l) => l.map(fm('.')))
          bdirs = await getBlockDirsIn(allDirsInRoot)
        } else {
          // if we are in a context, since tempGroup is called only if enclosing
          // block is not package, we can be sure the user is calling from inside a
          // block and the action needs to be done on it.
          // Eg: bb push from inside a block directory */blockname
          bdirs = [path.resolve()]
        }
        if (bdirs.length === 0) {
          this.events.emit('write')
        }
        for (let i = 0; i < bdirs.length; i += 1) {
          const d = await readFile(path.join(bdirs[i], 'block.config.json'))
          this.addBlock({
            directory: path.relative('.', bdirs[i]) || '.',
            meta: JSON.parse(d),
          })
        }
      } else {
        await this.refreshConfig()
      }
    } catch (err) {
      console.log(err)
      process.exit()
    }
  }
  // ------------------------------ //
  // -----------GETTERS------------ //
  // ------------------------------ //

  /**
   * @deprecated
   * Use appConfig.config instead
   */
  get appConfig() {
    return this.config
    // return this.getAppConfig()
  }

  /**
   */
  get packageBlockId() {
    return this.config.blockId
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

  get liveJobBlocks() {
    const filter = (block) => block.isJobOn
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
    if (this.isGlobal) {
      const bId = this.getBlockId(this.currentPackageBlox)
      const pbId = lrManager.allDependencies[bId].packagedBlockId
      const rootPath = lrManager.localRegistry[pbId]?.rootPath
      const tempPath = tmpdir()
      this.liveConfigPath = path.join(tempPath, rootPath, this.liveConfigName)
    }
    this.events.emit('liveChanged')
  }

  set stopJobBlock(blockname) {
    const stop = { job_cmd: null, isJobOn: false }
    this.liveDetails[blockname] = { ...this.liveDetails[blockname], ...stop }
    if (this.isGlobal) {
      const bId = this.getBlockId(this.currentPackageBlox)
      const pbId = lrManager.allDependencies[bId].packagedBlockId
      const rootPath = lrManager.localRegistry[pbId]?.rootPath
      const tempPath = tmpdir()
      this.liveConfigPath = path.join(tempPath, rootPath, this.liveConfigName)
    }
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

  set startedJobBlock({ name, job_cmd }) {
    const start = { job_cmd, isJobOn: true }
    this.liveDetails[name] = { ...this.liveDetails[name], ...start }
    this.events.emit('liveChanged')
  }

  async refreshConfig() {
    const picker = (b) => ({ name: b.meta.name, directory: b.directory })
    for (const { name, directory } of this.getDependencies(false, null, picker)) {
      if (!existsSync(path.join(this.cwd, directory, 'block.config.json'))) {
        // check if atleast package json and config json exists and the directory exists
        // assume all errors are ENOENT, no permission error occurs-hope
        this.removeBlock(name)
      }
    }
  }

  /**
   * Initialzes the config on the current given dir or '.'
   * @param {import('fs').PathLike} cwd Dir to init
   * @param {String} configName Default is block.config.json
   * @param {String} subcmd Which command is calling init
   * @param {import('./jsDoc/types').appConfigInitOptions} options
   * @returns {Promise<undefined>}
   */
  async init(cwd, configName, subcmd, options = { reConfig: true, isGlobal: false }) {
    this.configName = configName || 'block.config.json'
    this.cwd = cwd || '.'
    this.subcmd = subcmd || null

    const { isGlobal, reConfig } = options

    this.isGlobal = isGlobal

    if (this.config && !reConfig) {
      return
    }
    /**
     * If global don't collect live details,
     * user can loop through localregistry and call init with reconfig and get
     * the live details.
     */
    if (isGlobal) {
      await lrManager.init()
      this.lrManager = lrManager

      const deps = lrManager.allDependencies
      this.config = {
        name: 'local_registry',
        source: {},
        type: 'all',
        dependencies: deps,
      }

      // await this.readLiveAppblockConfig()

      return
    }
    // If not global, set live details as well
    try {
      await this.readAppblockConfig()

      if (this.config.type !== 'package') {
        this.isInAppblockContext = false
      } else {
        this.isInAppblockContext = true
      }
      // await this.tempSetup()
      await this.liveConfigSetup()
    } catch (err) {
      console.log(err.message)
      process.exit(1)
    }

    await this.readLiveAppblockConfig()
  }

  async readAppblockConfig() {
    try {
      this.config = JSON.parse(readFileSync(path.resolve(this.cwd, this.configName)))
      await this.refreshConfig()
      this.isInBlockContext = true
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.isOutOfContext = true
        // this.isGlobal = true
      } else {
        throw new Error(err.message)
      }
    }
  }

  async readLiveAppblockConfig() {
    try {
      let existingLiveConfig
      if (this.isGlobal) {
        // console.log('ISGLOBAL:LRMAGERLOOP:', lrManager.localRegistry)
        // const tempPath = tmpdir()
        // await Promise.all(
        //   Object.values(lrManager.localRegistry).map(async (pbData) => {
        //     let fileData = readFileSync(path.join(tempPath, pbData.rootPath, this.liveConfigName))
        //     if (fileData?.toString().length <= 0) fileData = '{}'
        //     const liveData = await JSON.parse(fileData)
        //     if (liveData) {
        //       existingLiveConfig = {
        //         ...existingLiveConfig,
        //         ...liveData,
        //       }
        //     }
        //     return true
        //   })
        // )
      } else {
        let fileData = readFileSync(this.liveConfigPath)
        if (fileData?.toString().length <= 0) fileData = '{}'
        existingLiveConfig = JSON.parse(fileData)
      }
      // let existingLiveConfig;
      // if (this.isTempGroup) {
      // } else {
      // existingLiveConfig = JSON.parse(readFileSync(path.resolve(this.cwd, this.liveConfigName)))
      // }
      for (const block of this.dependencies) {
        // TODO -- if there are more blocks in liveconfig json,
        // Log the details and if they are on, kill the processes
        const {
          meta: { name, type },
        } = block
        if (existingLiveConfig[name]) {
          const { log, pid, port, isJobOn, job_cmd } = existingLiveConfig[name]

          const blockRunning = isRunning(pid)
          // console.log(`${name} with ${pid} is running: ${blockRunning}`)

          const liveData = {
            log: log || {
              out: `./logs/out/${name}.log`,
              err: `./logs/err/${name}.log`,
            },
            isOn: !!blockRunning,
            pid: blockRunning ? pid : null,
            port: port || null,
          }

          if (type === 'job') {
            liveData.isJobOn = isJobOn || false
            liveData.job_cmd = job_cmd || null
          }

          this.liveDetails[name] = liveData
          if (!blockRunning) {
            this.stopBlock = name
          }
        } else {
          // console.log(
          //   `Existing live config doesn't have details of ${block.meta.name}`
          // )
          let p = 3000
          if (this.isUiBlock(name)) {
            p = await getPortFromWebpack(this.getBlock(name).directory)
          }

          const liveData = {
            log: {
              out: `./logs/out/${name}.log`,
              err: `./logs/err/${name}.log`,
            },
            isOn: false,
            pid: null,
            port: p,
          }
          if (type === 'job') {
            liveData.isJobOn = false
            liveData.job_cmd = null
          }

          this.liveDetails[name] = liveData
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        // console.log('Couldnt find live config')
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
          // console.log('formed livedata and updating to live data file...')
          await this._writeLive()
        }
      }
    }
  }

  _createLiveConfig() {
    const liveConfig = {}

    if (this.isGlobal && this.liveConfigPath) {
      const pbName = this.liveConfigPath?.split('/').at(-2)
      const id = this.getBlockId(pbName)
      const { dependencies: deps } = lrManager.getPackageBlock(id) || {}
      if (!deps) return {}
      for (const block of Object.values(deps)) {
        liveConfig[block.meta.name] = {
          ...block,
          ...this.liveDetails[block.meta.name],
        }
      }
    } else {
      for (const block of this.dependencies) {
        liveConfig[block.meta.name] = {
          ...block,
          ...this.liveDetails[block.meta.name],
        }
      }
    }

    return liveConfig
  }

  _writeLive() {
    if (this.writeLiveSignal && !this.writeLiveSignal.aborted) {
      this.writeController.abort()
    }
    // eslint-disable-next-line no-undef
    this.writeController = new AbortController()
    this.writeLiveSignal = this.writeController.signal
    // const p = this.isTempGroup ? this.tempGroupLiveConfigPath : path.resolve(this.cwd, this.liveConfigName)
    const p = this.liveConfigPath || path.join(tmpdir(), path.resolve(), this.liveConfigName)
    writeFile(
      p,
      JSON.stringify(this._createLiveConfig(), null, 2),
      { encoding: 'utf8', signal: this.writeLiveSignal },
      (err) => {
        if (err && err.code !== 'ABORT_ERR') console.log('Error writing live data ', err)
      }
    )
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

    let writeData = this.config
    // let p = this.isTempGroup ? this.tempGroupConfigPath : path.resolve(this.cwd, this.configName)
    let p = path.resolve(this.cwd, this.configName)

    if (this.isGlobal && this.currentPackageBlox) {
      const deps = Object.entries(this.config.dependencies).reduce((acc, [dKey, dVal]) => {
        if (dVal.packagedBlock !== this.currentPackageBlox) return acc

        const depVal = dVal
        delete depVal.packagedBlock
        acc[dKey] = depVal

        return acc
      }, {})

      const id = this.getBlockId(this.currentPackageBlox)
      const rootPath = lrManager.localRegistry[id]?.rootPath
      const pbConfig = lrManager.getPackageBlock(id)
      writeData = { ...pbConfig, dependencies: deps }

      p = path.resolve(rootPath, this.configName)
    }
    writeFile(p, JSON.stringify(writeData, null, 2), { encoding: 'utf8' }, (_) => _)
  }

  /**
   * Write emiter for update block in block config and appblock config
   */
  async _updateBlockWrite(blockDir, blockMeta) {
    // const p = this.isTempGroup ? this.tempGroupConfigPath : path.resolve(this.cwd, this.configName)
    const p = path.resolve(this.cwd, this.configName)
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
   * Use appConfig.config instead
   * @deprecated
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

  removeBlock(name) {
    if (!this.has(name)) {
      return
    }
    this.currentPackageBlox = this.config.dependencies[name].packagedBlock
    delete this.config.dependencies[name]
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
        const blockData = await this.getBlock(blockName)
        const localBlockId = blockData?.meta?.blockId || blockData?.blockId

        if (localBlockId) {
          resolve(localBlockId)
          return
        }

        const resp = await getBlockDetails(blockName)
        if (resp.status === 204) throw new Error(`${blockName} doesn't exists in block repository`).message

        const { data } = resp
        if (data.err) {
          throw new Error('Something went wrong from our side\n', data.msg).message
        }

        resolve(data.data.id)
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
   * @param {Boolean} includeLive To include live details of block in final result
   * @param {Function} filter
   * @param {Function} picker
   * @returns {Generator<import('./jsDoc/types').blockDetailsWithLive>}
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
    return !!this.config.dependencies?.[block]
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
   * @returns {import('./jsDoc/types').dependencyShape & import('./jsDoc/types').blockLiveDetails}
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
