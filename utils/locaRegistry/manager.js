/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { existsSync, mkdirSync, writeFileSync, readFileSync } = require('fs')
const { prompt } = require('inquirer')
const { homedir } = require('os')
const path = require('path')
const { EventEmitter } = require('stream')
const { configstore } = require('../../configstore')
const { getSpaceLinkedToBlock } = require('../api')
const { post } = require('../axios')
const { BB_CONFIG_NAME } = require('../constants')

class LocalRegistryManager {
  constructor() {
    this.localRegistryData = {}
    this.packagedBlockConfigs = {}

    this.home = homedir()
    this.appblockGlobalDir = path.join(this.home, '.appblocks')
    this.localRegistryDir = path.join(this.appblockGlobalDir, 'registry')
    this.localRegistryFile = path.join(this.localRegistryDir, 'registry.json')
    this.blockConfigFileName = BB_CONFIG_NAME

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
    this.packagedBlockConfigs = await Object.entries(this.localRegistryData).reduce(
      async (promAcc, [spaceName, spbDatas]) => {
        const acc = await promAcc
        const pbs = spbDatas.package_blocks || {}

        const spacedPbData = Object.entries(pbs).reduce(async (promPBAcc, [pb, pbData]) => {
          const accPB = await promPBAcc
          try {
            // If dependencies filed is an empty object in the read config, dont add it to acc.
            // This is to avoid getting error on bb ls -g.
            const _j = await JSON.parse(readFileSync(path.join(pbData.rootPath, this.blockConfigFileName)))
            if (Object.keys(_j.dependencies).length) accPB[pb] = _j
          } catch (err) {
            if (err.code === 'ENOENT') {
              // remove entry
              delete this.localRegistryData[spaceName]?.package_blocks?.[pb]
            }
          }
          return accPB
        }, Promise.resolve({}))

        acc[spaceName] = spacedPbData
        return acc
      },
      Promise.resolve({})
    )
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
   * @param {Object} packagedData  Name, space_id, space_name of packaged block
   */
  linkSpaceToPackageBlock(packagedData) {
    this._checkAndCreateLocalRegistryDir()

    const { name, blockId, space_id, space_name } = packagedData
    const curData = this.localRegistryData[space_name] || { space_id, space_name }
    const curPBsData = curData.package_blocks || {}
    const curBData = curPBsData[blockId] || { name, rootPath: path.resolve() }
    this.localRegistryData[space_name] = { ...curData, package_blocks: { ...curPBsData, [blockId]: { ...curBData } } }

    this.events.emit('write')
  }

  /**
   * isSpaceLinkedToPackageBlock
   */
  isSpaceLinkedToPackageBlock(blockId, spaceId) {
    return Object.values(this.localRegistryData).some((spbData) => {
      if (spbData.space_id !== spaceId) return false
      return !!spbData.package_blocks?.[blockId]
    })
  }

  /**
   *
   * @param {String} name
   */
  async setSpaceLinkedToPackage(name, blockId) {
    const { data, error } = await post(getSpaceLinkedToBlock, {
      block_id: blockId,
    })

    if (error) throw error

    const spDatas = data.data || []
    let { space_id, space_name } = spDatas[0] || {}

    if (spDatas.length > 1) {
      const question = [
        {
          type: 'list',
          message: 'Package Block is linked to multiple spaces. Choose a space to continue',
          choices: spDatas.map((v) => ({ name: v.space_name, value: { id: v.space_id, name: v.space_name } })),
          name: 'spaceSelect',
        },
      ]
      const { spaceSelect } = await prompt(question)
      space_id = spaceSelect.name
      space_name = spaceSelect.id
    }

    if (!space_id) throw new Error(`No linked space found for ${name}`)

    const packagedData = { name, space_id, space_name, blockId }
    this.linkSpaceToPackageBlock(packagedData)

    return packagedData
  }

  /**
   * linkedSpaceOfPackageBlock
   */
  async linkedSpaceOfPackageBlock(name, blockId) {
    const spaceName = configstore.get('currentSpaceName')
    let curData = this.localRegistryData[spaceName]?.package_blocks?.[blockId]

    if (!curData) {
      curData = await this.setSpaceLinkedToPackage(name, blockId)
    }

    this.add = { ...curData, rootPath: path.resolve() }

    return {
      space_id: curData.space_id,
      space_name: curData.space_name,
    }
  }

  /**
   * Add new packaged to registry
   * @param {Object} packagedData  Name and RootPath of packaged block
   */
  set add(packagedData) {
    this._checkAndCreateLocalRegistryDir()

    const dSpaceId = configstore.get('currentSpaceId')
    const dSpaceName = configstore.get('currentSpaceName')

    const { name, blockId, rootPath, space_id = dSpaceId, space_name = dSpaceName } = packagedData

    const curData = this.localRegistryData[space_name] || { space_id, space_name }
    const curPBsData = curData.package_blocks || {}
    const curBData = curPBsData[blockId] || { rootPath, name }
    this.localRegistryData[space_name] = {
      ...curData,
      package_blocks: { ...curPBsData, [blockId]: { ...curBData, rootPath } },
    }

    if (!this.packagedBlockConfigs[space_name]) {
      this.packagedBlockConfigs[space_name] = {}
    }

    this.packagedBlockConfigs[space_name][blockId] = JSON.parse(
      readFileSync(path.join(rootPath, this.blockConfigFileName))
    )

    this.events.emit('write')
  }

  /**
   * Remove packaged to registry
   * @param {String} name  Name of packaged block
   */
  remove(blockId, spaceName) {
    const space_name = spaceName || configstore.get('currentSpaceName')
    delete this.localRegistryData[space_name].package_blocks?.[blockId]
    delete this.packagedBlockConfigs[space_name]?.[blockId]
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
    const allDeps = Object.entries(this.packagedBlockConfigs).reduce((acc, [spaceName, spbData]) => {
      const depDatas = {}
      Object.entries(spbData).forEach((pb, pbData) => {
        const pbName = pbData.name
        const deps = pbData.dependencies || {}
        Object.values(deps).forEach((dep) => {
          depDatas[dep.meta.blockId] = {
            ...deps[dep.meta.name],
            packagedBlock: pbName,
            packagedBlockId: pb,
            spaceName,
          }
        })
        // eslint-disable-next-line no-param-reassign
      })
      return { ...acc, ...depDatas }
    }, {})

    return allDeps
  }

  /**
   * Get dependecies by name
   * @param {String} name  Name of packaged block
   */
  getPackageBlock(blockId, spaceName) {
    const space_name = spaceName || configstore.get('currentSpaceName')
    return this.packagedBlockConfigs[space_name]?.[blockId]
  }

  /**
   * Get dependecies by name
   * @param {String} name  Name of packaged block
   */
  getPackageBlockDependencies(blockId, spaceName) {
    const space_name = spaceName || configstore.get('currentSpaceName')
    return this.packagedBlockConfigs[space_name]?.[blockId]?.dependencies
  }
}

const lrManager = new LocalRegistryManager()
module.exports = { LocalRegistryManager, lrManager }
