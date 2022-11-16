/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { existsSync, mkdirSync, writeFileSync, readFileSync } = require('fs')
const { homedir } = require('os')
const path = require('path')
const { EventEmitter } = require('stream')

class LocalRegistryManager {
  constructor() {
    this.localRegistryData = {}
    this.packagedBlockConfigs = {}

    this.home = homedir()
    this.appblockGlobalDir = path.join(this.home, '.appblocks')
    this.localRegistryDir = path.join(this.appblockGlobalDir, 'registry')
    this.localRegistryFile = path.join(this.localRegistryDir, 'registry.json')
    this.blockConfigFileName = 'block.config.json'

    this.events = new EventEmitter()
    this.events.on('write', () => {
      this._write()
    })
  }

  // =================== LOCAL FUNTIONS =================

  /**
   * Write this.localRegistryData content to the this.localRegistryFile file
   */
  _write() {
    const writePath = this.localRegistryFile
    const writeData = this.localRegistryData

    writeFileSync(writePath, JSON.stringify(writeData, null, 2), { encoding: 'utf8' })
  }

  _readLocalRegistry() {
    this.localRegistryData = JSON.parse(readFileSync(this.localRegistryFile)) || {}
  }

  async _readAllPackagedBlockConfig() {
    this.packagedBlockConfigs = await Object.entries(this.localRegistryData).reduce(async (promAcc, [pb, pbData]) => {
      const acc = await promAcc
      try {
        // TODO: If dependencies filed is an empty object in the read config, dont add it to acc.
        // This is to avoid getting error on bb ls -g.
        acc[pb] = await JSON.parse(readFileSync(path.join(pbData.rootPath, this.blockConfigFileName)))
      } catch (err) {
        if (err.code === 'ENOENT') {
          // remove entry
          delete this.localRegistryData[pb]
        }
      }
      return acc
    }, Promise.resolve({}))
    this.events.emit('write')
  }

  /**
   * Check whether the local registry path is present or creates it.
   * @returns boolean
   */
  _checkAndCreateLocalRegistryDir() {
    if (!existsSync(this.localRegistryFile)) {
      mkdirSync(this.localRegistryDir, { recursive: true })
      writeFileSync(this.localRegistryFile, '{}', { encoding: 'utf8' })
    }
  }

  // =================== FUNTIONS =================

  /**
   * Initialize
   */
  async init() {
    this._checkAndCreateLocalRegistryDir()

    if (Object.keys(this.localRegistryData).length < 1) {
      this._readLocalRegistry()
    }

    if (Object.keys(this.packagedBlockConfigs).length < 1) {
      await this._readAllPackagedBlockConfig()
    }
  }

  /**
   * Add new packaged to registry
   * @param {Object} packagedData  Name and RootPath of packaged block
   */
  set add(packagedData) {
    this._checkAndCreateLocalRegistryDir()

    const { name, rootPath } = packagedData
    this.localRegistryData[name] = { rootPath }
    this.packagedBlockConfigs[name] = JSON.parse(readFileSync(path.join(rootPath, this.blockConfigFileName)))

    this.events.emit('write')
  }

  /**
   * Remove packaged to registry
   * @param {String} name  Name of packaged block
   */
  set remove(name) {
    delete this.localRegistryData[name]
    delete this.packagedBlockConfigs[name]
    this.events.emit('write')
  }

  /**
   * Get local registry
   */
  get localRegistry() {
    return this.localRegistryData
  }

  /**
   * Get all packaged block configs
   */
  get allPackagedBlockConfigs() {
    return this.packagedBlockConfigs
  }

  /**
   * Get all dependecies
   */
  get allDependencies() {
    const allDeps = Object.entries(this.packagedBlockConfigs).reduce((acc, [pb, pbData]) => {
      const deps = pbData.dependencies || {}

      Object.values(deps).forEach((dep) => {
        deps[dep.meta.name] = {
          ...deps[dep.meta.name],
          packagedBlock: pb,
        }
      })

      // eslint-disable-next-line no-param-reassign

      return { ...acc, ...deps }
    }, {})

    return allDeps
  }

  /**
   * Get dependecies by name
   * @param {String} name  Name of packaged block
   */
  getPackageBlock(name) {
    return this.packagedBlockConfigs[name]
  }

  /**
   * Get dependecies by name
   * @param {String} name  Name of packaged block
   */
  getPackageBlockDependencies(name) {
    return this.packagedBlockConfigs[name]?.dependencies
  }
}

const lrManager = new LocalRegistryManager()
module.exports = { LocalRegistryManager, lrManager }
